# Daily Hanzi

A polished, passive Chinese-learning app. A new phrase — Chinese, pinyin, English —
appears on your phone's **home screen widget** every few hours. No app to open,
nothing to study. Just glance and learn.

This is a real, from-scratch React Native app with genuine native iOS
(WidgetKit) and Android (App Widget) home-screen widgets — not a simulation
inside the app. It works fully offline from a bundled 120-phrase HSK 1–6
dataset.

---

## 1. Product overview

- **Core loop:** pick your HSK level and refresh frequency once, add the
  widget to your home screen, then forget about the app. Every 1/2/4/6 hours
  (or once a day), the widget shows a new phrase.
- **Main app:** a simple dashboard (today's phrase + "show me another"),
  History, Favorites, and Settings — all secondary to the widget.
- **Offline-first:** the phrase database is bundled at build time. There is no
  backend, no network calls, no accounts.

## 2. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Cross-platform app | React Native 0.87 + TypeScript | One codebase for both app UIs; still compiles to fully native iOS/Android apps distributable on the App Store/Play Store. |
| Navigation | React Navigation (bottom tabs + stack) | Standard, well-maintained, native-feeling navigation. |
| State | Zustand | Minimal boilerplate, no Redux ceremony, trivial to unit test. |
| Local persistence | `@react-native-async-storage/async-storage` | Simple key/value store for settings, history, favorites — no need for SQL given the data shapes involved. |
| Phrase database | Bundled JSON (`src/data/phrases.json`) | No backend needed for an offline-first MVP; trivially query-able in memory (120 phrases is tiny). |
| iOS widget | WidgetKit (Swift/SwiftUI), App Group–shared `UserDefaults` | The only supported way to put real content on an iOS home screen. |
| Android widget | AppWidgetProvider + RemoteViews (Kotlin), WorkManager | The standard, stable App Widget APIs; WorkManager is Android's recommended mechanism for reliable-but-deferrable background work. |

**Why not Flutter or fully-separate native apps?** React Native was chosen
because it gives one shared codebase for the (larger) in-app UI while still
allowing fully native widget extensions written in each platform's own
language — the pattern most production RN apps use for OS-level surfaces
(widgets, Live Activities, etc.) that RN itself cannot render into. A fully
native (Swift + Kotlin, two codebases) approach would also work, but doubles
the maintenance surface for a solo developer without adding widget
capability RN can't already reach via this pattern.

## 3. Architecture

```
┌─────────────────────────────── React Native app (TS) ───────────────────────────────┐
│  Screens (Onboarding, Home, History, Favorites, Settings)                            │
│           │                                                                          │
│  Zustand store (useAppStore) ── phraseSelector.ts (weighted random selection)        │
│           │                                                                          │
│  AsyncStorage (settings, history, favorites, learned, reports)                       │
│           │                                                                          │
│  WidgetBridge.ts  ─────────────────────────────────────────────────┐                │
└──────────────────────────────────────────────────────────────────┼─────────────────┘
                                                                     │ syncState() / reloadWidgets() / getWidgetHistory()
                     ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
                     │ iOS                                           │ Android                                       │
                     │                                                │                                              │
                     │ DailyHanziWidgetBridge.swift (native module)   │ DailyHanziWidgetBridgeModule.kt (native module)│
                     │        │ writes                                │        │ writes                              │
                     │ App Group UserDefaults (shared container)      │ SharedPreferences (same process)              │
                     │        │ read by                                │        │ read by                              │
                     │ PhraseTimelineProvider.swift (WidgetKit)        │ PhraseRefreshWorker.kt (WorkManager)          │
                     │        │ renders                                │        │ renders                             │
                     │ SwiftUI widget views (small/medium/large)       │ RemoteViews (widget_daily_hanzi.xml)          │
                     └────────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

Both native sides carry their **own copy** of the phrase database and a
**Swift/Kotlin port of the same weighted-selection algorithm**
(`phraseSelector.ts` ↔ `PhraseSelector.swift` ↔ `PhraseSelector.kt`). This is
the key architectural decision: neither widget depends on the JS/RN runtime
being alive to pick a new phrase. iOS's WidgetKit extension and Android's
WorkManager job are lightweight, independent processes/components that can
run — and pick a genuinely new phrase — even if you haven't opened the app in
days. Whenever the app *is* opened, it reads back anything the widget picked
on its own (`getWidgetHistory()`) and merges it into the in-app History, so
that screen reflects the complete passive-learning experience either way.

## 4. Data model

`src/types/phrase.ts`:

```ts
interface Phrase {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  definition: string;
  exampleSentence: string;
  exampleSentencePinyin: string;
  exampleSentenceTranslation: string;
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6;
  topic: string;
  tags: string[];
}
```

`src/data/phrases.json` bundles **120 phrases, 20 per HSK level**, each with
the full field set above. The same file is copied verbatim into
`android/app/src/main/assets/phrases.json` and
`ios/DailyHanziWidget/phrases.json` so all three runtimes read identical
content — if you edit the phrase set, re-copy the file to those two
locations (or wire a small `cp` step into your build if you plan to edit it
often).

Per-user state (`src/types/state.ts`) is separate from the phrase content:
history (phraseId + timestamp, capped at 500 entries), favorites, "learned"
marks, and locally-stored issue reports — all in `AsyncStorage`, merged with
whatever the widget selected independently via the App Group / SharedPreferences
channel described above.

## 5. Phrase selection algorithm

`selectNextPhrase` (`src/engine/phraseSelector.ts`, ported to
`PhraseSelector.swift` / `PhraseSelector.kt`):

1. Filter the 120-phrase pool down to the user's selected HSK level (or the
   full pool for "Mixed").
2. Compute a **cooldown window** sized to ~60% of the filtered pool (capped at
   30), and exclude any phrase shown that recently — this is what prevents
   the same phrase from repeating too often, while still shrinking gracefully
   on small pools instead of ever getting stuck.
3. From what's left, run a **weighted random pick**: favorites get a 1.5×
   weight (shown somewhat more often, never exclusively), phrases marked
   "learned" get 0.5× (reinforcement — still shown sometimes, just less), and
   never-yet-seen phrases get 1.3× (encourages full coverage of a level
   before it starts repeating).
4. The current on-screen phrase is always excluded when an alternative
   exists.

This is intentionally a simple, fully-tested weighted model rather than a
strict queue — and it's designed as the extension point for a future
spaced-repetition scheduler: `history[].shownAt` and `learnedIds` already
carry everything an SM-2-style scorer would need, without changing this
function's signature.

## 6. iOS widget strategy & limitations

- Built with **WidgetKit** (`ios/DailyHanziWidget/`), the only Apple-supported
  way to put live content on the home screen.
- `PhraseTimelineProvider` precomputes a **batch of future, dated entries**
  (rather than one at a time) covering roughly the next 24 hours at the
  user's chosen frequency, skipping any slot outside their "active hours."
  WidgetKit displays each entry at its target time on its own.
- **Apple does not guarantee an exact refresh minute.** Once the precomputed
  batch is exhausted, the `TimelineReloadPolicy.after(...)` tells iOS *when
  we'd like* the next refresh, but the OS uses its own daily-refresh budget
  and system-health heuristics (battery, whether the app is in active use,
  low power mode, etc.) to decide exactly when it actually re-invokes the
  provider. In practice this means: usually close to on-time, sometimes
  delayed, and there is no API to override that. Precomputing a day's worth
  of entries up front is the standard, Apple-recommended mitigation.
- Data flows from the app to the widget via an **App Group–shared
  `UserDefaults`** suite (`group.com.dailyhanzi.shared`) — the standard
  mechanism for sharing data between an app and its extensions, which run as
  separate processes.
- **Manual Xcode step required:** Apple's project format (`.pbxproj`) is not
  reliably hand-editable outside Xcode. All the Swift source is written and
  ready; you add the actual Widget Extension *target* once via Xcode's GUI
  (5 minutes — see §10 below). This is the one part of this project that
  cannot be scripted end-to-end without Xcode itself.

## 7. Android widget strategy & limitations

- Built with the classic **AppWidgetProvider + RemoteViews** APIs
  (`android/app/src/main/java/com/dailyhanzi/widget/`) — the long-standing,
  fully-supported way to build a home-screen widget. (Jetpack Glance was
  considered but adds a Compose build-config dependency for no reliability
  benefit here.)
- The actual scheduled refresh is driven by **WorkManager**
  (`PhraseRefreshWorker`), Android's recommended API for deferrable
  background work — not `AlarmManager`, and not only the widget's own
  `updatePeriodMillis` (the OS enforces a ~30 minute floor on that regardless
  of what's declared, and it only re-renders the already-stored phrase as a
  defensive fallback; it never picks a new one).
- **Android does not guarantee exact-minute execution either.** WorkManager's
  periodic interval is a *minimum* spacing, not a schedule: Doze mode, App
  Standby buckets, and battery optimization can and will delay a run,
  sometimes by several minutes. There is no supported Android API for
  guaranteed exact-time background execution outside of user-visible alarms.
- Because Android widgets run in the **same process** as the host app, no
  App-Group-style shared container is needed — `SharedPreferences` is enough
  (`WidgetPrefs.kt`).
- Fully wired via Gradle/manifest edits already applied in this repo — no
  manual Android Studio step is required (unlike iOS).

## 8. Offline behavior

Every phrase, and the entire selection algorithm, is bundled at build time.
The app never makes a network call. Settings, history, and favorites persist
locally via `AsyncStorage` (app) and `UserDefaults`/`SharedPreferences`
(widgets). Reinstalling the app resets local state, same as any offline-first
app with no backend — there is nothing to sync.

## 9. Project structure

```
DailyHanzi/
├── App.tsx                          # Root: theme, navigation, app-resume widget-history sync
├── src/
│   ├── types/                       # Phrase, Settings, UserData models
│   ├── data/phrases.json + .ts      # 120-phrase seed dataset (source of truth)
│   ├── engine/phraseSelector.ts     # Weighted selection algorithm (+ tests)
│   ├── storage/                     # AsyncStorage repositories + pure state-mutation helpers (+ tests)
│   ├── store/useAppStore.ts         # Zustand store wiring engine + storage + widget bridge
│   ├── native/WidgetBridge.ts       # JS-side contract for the native widget bridge module
│   ├── theme/                       # Colors, typography, light/dark ThemeProvider
│   ├── components/                  # PhraseCard, HskBadge, OptionList, ReportIssueModal, ...
│   ├── screens/                     # Onboarding, Home, History, Favorites, Settings
│   └── navigation/                  # Bottom tabs + root stack
├── ios/
│   ├── DailyHanzi/                  # Main app target
│   │   ├── DailyHanziWidgetBridge.swift / .m   # RN native module (App Group I/O + reload trigger)
│   │   ├── DailyHanzi.entitlements             # App Group capability (reference)
│   │   └── Shared/SharedStore.swift            # App-Group UserDefaults wrapper (add to BOTH targets)
│   └── DailyHanziWidget/            # Widget extension (add as a new Xcode target — see §10)
│       ├── DailyHanziWidget.swift              # Widget + WidgetBundle entry point
│       ├── PhraseTimelineProvider.swift         # TimelineProvider (the refresh scheduler)
│       ├── PhraseWidgetView.swift               # SwiftUI views: small/medium/large
│       ├── Phrase.swift / PhraseRepository.swift / PhraseSelector.swift
│       ├── phrases.json                         # Bundled copy of the seed dataset
│       └── Info.plist, DailyHanziWidget.entitlements
└── android/app/src/main/
    ├── assets/phrases.json          # Bundled copy of the seed dataset
    └── java/com/dailyhanzi/widget/
        ├── DailyHanziWidgetProvider.kt          # AppWidgetProvider (renders RemoteViews)
        ├── PhraseRefreshWorker.kt               # WorkManager job (the refresh scheduler)
        ├── DailyHanziWidgetBridgeModule/Package.kt  # RN native module
        ├── WidgetPrefs.kt / PhraseRepository.kt / PhraseSelector.kt
```

## 10. Running & building

### Install dependencies

```bash
cd DailyHanzi
npm install

# iOS only, from a Mac with Xcode + CocoaPods installed:
cd ios && pod install && cd ..
```

### Run locally (JS layer only — Metro + type-check + tests)

```bash
npm test          # Jest: phraseSelector, storage, App smoke test
npx tsc --noEmit   # Type-check
npm start          # Metro bundler
```

### Run on iOS (simulator or device)

Requires a Mac with Xcode installed.

```bash
npm run ios
# or open ios/DailyHanzi.xcworkspace in Xcode (after `pod install`) and hit Run
```

**Before the widget will build**, do the one manual Xcode step:

1. Open `ios/DailyHanzi.xcworkspace` in Xcode.
2. Select the `DailyHanzi` target → **Signing & Capabilities** → **+ Capability**
   → **App Groups** → add `group.com.dailyhanzi.shared`.
3. **File → New → Target… → Widget Extension.** Name it `DailyHanziWidget`,
   uncheck "Include Configuration Intent" (this project uses a static
   timeline, no user-facing widget config screen), uncheck "Include Live
   Activity". Xcode creates the target with template files.
4. Delete the template's auto-generated Swift files (keep its `Info.plist`
   and `Assets.xcassets` unless you're using the ones in this repo).
5. Drag the files from `ios/DailyHanziWidget/` in this repo into the new
   target in Xcode (make sure **Target Membership** is checked for
   `DailyHanziWidget` only), including `phrases.json` (as a resource, not
   source — Xcode should offer this automatically for a `.json` file).
6. Drag `ios/DailyHanzi/Shared/SharedStore.swift` into the project and check
   **both** target memberships (`DailyHanzi` app target *and*
   `DailyHanziWidget`).
7. Select the new `DailyHanziWidget` target → **Signing & Capabilities** →
   **+ Capability** → **App Groups** → add the *same*
   `group.com.dailyhanzi.shared` ID.
8. Drag `ios/DailyHanzi/DailyHanziWidgetBridge.swift` and `.m` into the
   `DailyHanzi` app target (target membership: app target only).
9. Build & run. Long-press the home screen on your simulator/device → tap
   **+** → search "Daily Hanzi" → add the widget.

### Run on Android

Requires Android Studio (or the Android SDK command-line tools) + a device
or emulator running API 24+.

```bash
npm run android
```

No manual IDE step is required — the widget provider, receiver, and
WorkManager job are already wired into the Gradle project and manifest. Once
installed, long-press the home screen → **Widgets** → find "Daily Hanzi" →
drag it onto the home screen.

### Production builds

**iOS:** In Xcode, select the `DailyHanzi` scheme → **Product → Archive**,
then distribute via App Store Connect as usual. Make sure both the app
target and the `DailyHanziWidget` target have a valid signing team selected,
and that the App Group entitlement is present on both (App Store Connect
will reject a build where the widget extension's entitlements don't match a
registered App Group).

**Android:**

```bash
cd android
./gradlew bundleRelease   # AAB for Play Store
# or: ./gradlew assembleRelease   # APK
```

Generate your own upload keystore for a real release (`android/app/debug.keystore`
is a debug-only key and must not be used for a Play Store submission) — see
the [React Native signed APK guide](https://reactnative.dev/docs/signed-apk-android).

## 11. Testing

- **Unit tests** (`npm test`, Jest): `src/engine/__tests__/phraseSelector.test.ts`
  covers HSK-level filtering, "mixed" pooling, recent-repeat avoidance
  (including graceful fallback on tiny pools), favorite/learned weighting
  (deterministic via an injectable RNG), and reinforcement repetition.
  `src/storage/__tests__/` covers settings persistence/merge-on-upgrade and
  the pure history/favorite/learned/report state-mutation helpers.
- **Widget testing strategy** (native UI can't run under Jest):
  - iOS: use Xcode's Widget preview canvas (`#Preview` in
    `PhraseWidgetView.swift`) for visual iteration, and the Widget Extension
    scheme's own Run action (pick "DailyHanziWidget" as the scheme, run on a
    simulator) to exercise the real `PhraseTimelineProvider` end to end.
  - Android: `./gradlew :app:assembleDebug`, install, then use Android
    Studio's "Widget Preview" or simply add the widget on an emulator/device
    and use `adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE`
    to force a redraw while iterating.
  - Both: verify the app→widget data path by changing a setting in-app, then
    confirming the widget reflects it after `reloadWidgets()` fires; verify
    the widget→app path by leaving the app closed past one refresh interval,
    reopening it, and confirming the new phrase(s) appear in History.
- **Manual UI pass:** onboarding flow end-to-end, HSK level and frequency
  changes reflected immediately in the widget, light/dark mode, favorite/mark
  learned/report affordances, and the empty states (no favorites yet, no
  history yet).

## 12. Notes on scope

Per the MVP spec, this intentionally excludes accounts, social features,
leaderboards, subscriptions, and AI tutors. "Report an issue" stores reports
locally only (`userData.reports`) since there is no backend — a real
production version would sync these somewhere, which the data shape already
anticipates.
