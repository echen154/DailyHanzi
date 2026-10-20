# Daily Hanzi

A polished, passive Chinese-learning app. A new phrase — Chinese, pinyin, English —
appears on your **iPhone's Lock Screen** every few hours. No app to open, nothing
to study. Just glance and learn.

This is a real, from-scratch React Native app with a genuine native iOS
(WidgetKit) Lock Screen widget — not a simulation inside the app. It works
fully offline from a bundled 120-phrase HSK 1–6 dataset.

**There is no Home Screen widget, on either platform, by design.** The widget
is Lock Screen only. Android has no widget of any kind: Android's Lock Screen
widget API was removed in Android 5.0 (2014) and never came back, so there is
no platform-supported way to put this app's content anywhere but inside the
app itself on Android — that's a real OS limitation, not a gap in this
implementation. The in-app "Home" tab exists on both platforms as a
supplementary way to learn; on iOS it's secondary to the Lock Screen widget,
and on Android it's the whole experience.

---

## 1. Product overview

- **Core loop (iOS):** pick your HSK level(s) and refresh frequency once, add
  the widget to your Lock Screen, then forget about the app. Every 1/2/4/6
  hours (or once a day), the widget shows a new phrase. The widget is the
  point of the app on iOS — learning happens there.
- **Core loop (Android):** open the app to see today's phrase, tap "show me
  another" whenever you want a new one. There is no passive/background
  surface on Android — see the note above on why.
- **Main app (both platforms):** a simple dashboard (today's phrase + "show
  me another"), History, Favorites, and Settings.
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
| iOS Lock Screen widget | WidgetKit (Swift/SwiftUI), App Group–shared `UserDefaults` | The only supported way to put real content on an iOS Lock Screen. |

**Why not Flutter or a fully-separate native app?** React Native was chosen
because it gives one shared codebase for the in-app UI while still allowing a
fully native widget extension written in Swift — the pattern most production
RN apps use for OS-level surfaces (widgets, Live Activities, etc.) that RN
itself cannot render into.

## 3. Architecture

```
┌─────────────────────────────── React Native app (TS) ────────────────────────────────┐
│  Screens (Onboarding, Home, History, Favorites, Settings)                             │
│           │                                                                           │
│  Zustand store (useAppStore) ── phraseSelector.ts (weighted random selection)         │
│           │                                                                           │
│  AsyncStorage (settings, history, favorites, learned)                                 │
│           │                                                                           │
│  WidgetBridge.ts  ─────────────────────────────────────────────────┐                 │
└──────────────────────────────────────────────────────────────────┼──────────────────┘
                                                                     │ syncState() / reloadWidgets() /
                                                                     │ getWidgetHistory()
                                                                     │
                                                        iOS only — NativeModules
                                                        .DailyHanziWidgetBridge is
                                                        undefined on Android, so every
                                                        call above is a silent no-op there
                                                                     │
                     DailyHanziWidgetBridge.swift (native module, iOS app target)
                                    │ writes
                     App Group UserDefaults (shared container)
                                    │ read by
                     PhraseTimelineProvider.swift (WidgetKit, Lock Screen only)
                                    │ renders
                     SwiftUI accessory views: Rectangular / Circular / Inline
```

The iOS widget extension carries its **own copy** of the phrase database and
a **Swift port of the same weighted-selection algorithm**
(`phraseSelector.ts` ↔ `PhraseSelector.swift`). This is the key architectural
decision: the widget doesn't depend on the JS/RN runtime being alive to pick
a new phrase. WidgetKit's timeline mechanism is a lightweight, independent
process that can run — and pick a genuinely new phrase — even if you haven't
opened the app in days. Whenever the app *is* opened (or comes back to the
foreground), it reads back any phrases the widget picked on its own
(`getWidgetHistory()`) and merges them into the in-app History, so that
screen reflects the complete passive-learning experience.

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
`ios/DailyHanziWidget/phrases.json` so both runtimes read identical content —
if you edit the phrase set, re-copy the file to that location too (or wire a
small `cp` step into your build if you plan to edit it often).

Per-user state (`src/types/state.ts`) is separate from the phrase content:
history (phraseId + timestamp, capped at 500 entries), favorites, and
"learned" marks — all in `AsyncStorage`, merged on iOS with phrases the
widget showed on its own via the App Group channel described above.

## 5. Phrase selection algorithm

`selectNextPhrase` (`src/engine/phraseSelector.ts`, ported to
`PhraseSelector.swift` for the iOS widget):

1. Filter the 120-phrase pool down to the user's selected HSK level(s) — any
   combination of HSK 1–6, or the full pool for "Mixed / All levels".
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

## 6. iOS Lock Screen widget strategy & limitations

- Built with **WidgetKit** (`ios/DailyHanziWidget/`), declaring only the
  three Lock Screen "accessory" families — `.accessoryRectangular`,
  `.accessoryCircular`, `.accessoryInline` — and deliberately **none** of the
  Home Screen sizes (`.systemSmall/.systemMedium/.systemLarge`). This widget
  never appears in the Home Screen widget gallery at all.
- **The three styles, and what each can show:**
  - `accessoryRectangular` (the largest, ~160×56pt) — the phrase, its HSK
    level, pinyin or the definition, a small favorite/learned status
    indicator in one corner mirroring the app card (read-only — see below),
    and a small "show me another phrase" (↻) button in the opposite corner.
    This is the closest this app gets to "the same information as the app,"
    and it's a real, hard Apple size limit: there is no configuration that
    fits the example sentence or any actions in here too, and **there is no
    API to make this size taller or otherwise request more room** — the
    system fixes it. The ↻ button works within that fixed size because it's
    a small icon overlaid on the existing content, not something that needs
    its own extra space.
  - `accessoryCircular` — a single character plus the HSK level, in a small
    circle. iOS lets the user place this one directly beside the clock
    digits, which is the closest real equivalent to "near the clock, out of
    its way."
  - `accessoryInline` — one line of plain text next to the system clock: the
    phrase and its pinyin.
- **Mostly display-only, with one real interactive exception.** None of the
  three has a "mark learned" or "favorite" tap target — those need to know
  *which* phrase they're acting on and toggle per-phrase state, which is a
  poor fit for a target this small, so favoriting and marking learned stay
  in-app. `accessoryRectangular` does have one working button: ↻
  ("show me another phrase" — `NextPhraseIntent.swift`), a stateless action
  that just asks for a new phrase right now. It requires iOS 17+ for
  WidgetKit button interactivity (see below) — on iOS 16 the ↻ button simply
  isn't shown, and the widget still updates on its normal schedule.
- **System-tinted, not app-colored.** The system renders these views itself
  in a monochrome/tinted style based on the user's Lock Screen
  personalization; the app doesn't control their color. The SwiftUI views
  deliberately stick to plain text and `.widgetAccentable()` rather than the
  app's own accent color, and never set a custom background — Apple's
  guidance for accessory widgets.
- **Placement is user-controlled, not app-controlled.** There is no API for
  an app to pin a widget to a specific spot on the Lock Screen — the user
  drags it into a slot via iOS's Lock Screen customization UI. `accessoryCircular`
  beside the clock is the only "near a fixed landmark" placement iOS itself
  offers.
- **Requires iOS 16+.** The accessory `WidgetFamily` cases don't exist before
  iOS 16, so they're added to `supportedFamilies` behind a runtime
  `#available(iOS 16.0, *)` check (`DailyHanziWidget.swift`) rather than
  raising this project's 15.1 app-wide deployment target. On iOS 15,
  `supportedFamilies` resolves to an empty list and the widget simply isn't
  offered anywhere — there is no Home Screen fallback, by design.
- `PhraseTimelineProvider` precomputes a **batch of future, dated entries**
  (rather than one at a time) covering roughly the next 24 hours at the
  user's chosen frequency, skipping any slot outside their "active hours."
  WidgetKit displays each entry at its target time on its own.
- **Apple does not guarantee an exact refresh minute.** Once the precomputed
  batch is exhausted, `TimelineReloadPolicy.after(...)` tells iOS *when we'd
  like* the next refresh, but the OS uses its own daily-refresh budget and
  system-health heuristics (battery, whether the app is in active use, low
  power mode, etc.) to decide exactly when it actually re-invokes the
  provider. In practice: usually close to on-time, sometimes delayed, and
  there is no API to override that. Precomputing a day's worth of entries up
  front is the standard, Apple-recommended mitigation.
- Data flows from the app to the widget via an **App Group–shared
  `UserDefaults`** suite (`group.com.dailyhanzi.shared`) — the standard
  mechanism for sharing data between an app and its extensions, which run as
  separate processes.
- **Manual Xcode step required:** Apple's project format (`.pbxproj`) is not
  reliably hand-editable outside Xcode. All the Swift source is written and
  ready; you add the actual Widget Extension *target* once via Xcode's GUI
  (5 minutes — see §9 below). This is the one part of this project that
  cannot be scripted end-to-end without Xcode itself.

## 7. Why Android has no widget

Android's Lock Screen ("keyguard") widgets existed only through Android 4.4
(KitKat) and were removed entirely in Android 5.0 (Lollipop) in 2014 — there
is no supported API to bring them back, on any modern Android version, from
any app. Since this app's widget is deliberately Lock Screen–only (see §1),
and Android has no Lock Screen widget surface at all, the Android build has
no widget, no background refresh job, and no native bridge module —
`NativeModules.DailyHanziWidgetBridge` is simply `undefined` at runtime, and
`WidgetBridge.ts` treats that as a normal, expected state rather than an
error. Android users get the in-app experience only (§1). If Google ever
reintroduces a Lock Screen widget API, or if the product direction changes
back to wanting a Home Screen presence, `PhraseSelector.kt`-style native
Kotlin code is a well-understood pattern to reintroduce — but nothing in this
build assumes that will happen.

## 8. Offline behavior

Every phrase, and the entire selection algorithm, is bundled at build time.
The app never makes a network call. Settings, history, and favorites persist
locally via `AsyncStorage` (app) and `UserDefaults` (iOS widget). Reinstalling
the app resets local state, same as any offline-first app with no backend —
there is nothing to sync.

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
│   ├── native/WidgetBridge.ts       # JS-side contract for the native widget bridge module (iOS only)
│   ├── theme/                       # Colors, typography, light/dark ThemeProvider
│   ├── components/                  # PhraseCard, HskBadge, HskMultiSelect, OptionList, ...
│   ├── screens/                     # Onboarding, Home, History, Favorites, Settings
│   └── navigation/                  # Bottom tabs + root stack
├── ios/
│   ├── DailyHanzi/                  # Main app target
│   │   ├── DailyHanziWidgetBridge.swift / .m   # RN native module (App Group I/O + reload trigger)
│   │   ├── DailyHanzi.entitlements             # App Group capability (reference)
│   │   └── Shared/SharedStore.swift            # App-Group UserDefaults wrapper (add to BOTH targets)
│   └── DailyHanziWidget/            # Widget extension, Lock Screen only (add as a new Xcode target — see §9)
│       ├── DailyHanziWidget.swift              # Widget + WidgetBundle entry point (accessory families only)
│       ├── PhraseTimelineProvider.swift         # TimelineProvider (the refresh scheduler)
│       ├── PhraseWidgetView.swift               # SwiftUI accessory views: Rectangular / Circular / Inline
│       ├── NextPhraseIntent.swift               # iOS 17+ App Intent behind the ↻ "show another phrase" button
│       ├── Phrase.swift / PhraseRepository.swift / PhraseSelector.swift
│       ├── phrases.json                         # Bundled copy of the seed dataset
│       └── Info.plist, DailyHanziWidget.entitlements
└── android/                          # No widget — see §7. Otherwise a standard RN Android project.
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

Requires a Mac with Xcode installed. **A Lock Screen widget needs a
simulator or device running iOS 16+** — on iOS 15 the app still runs fine,
it just has no widget to offer (§6).

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
9. Build & run. **To add the widget** (device/simulator running iOS 16+):
   lock the device, then touch and hold the Lock Screen → **Customize** →
   **Lock Screen** → tap a widget area → find "Daily Hanzi" → pick
   Rectangular, Circular, or Inline.

### Run on Android

Requires Android Studio (or the Android SDK command-line tools) + a device
or emulator running API 24+.

```bash
npm run android
```

No manual IDE step is required, and there is no widget to add (§7) — the app
runs as a standard in-app experience.

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
  covers HSK-level filtering (single and multi-level), "mixed" pooling,
  recent-repeat avoidance (including graceful fallback on tiny pools),
  favorite/learned weighting (deterministic via an injectable RNG), and
  reinforcement repetition. `src/storage/__tests__/` covers settings
  persistence/merge-on-upgrade and the pure history/favorite/learned
  state-mutation helpers.
- **Widget testing strategy** (native UI can't run under Jest): use Xcode's
  Widget preview canvas (`#Preview` in `PhraseWidgetView.swift` — the three
  Lock Screen accessory previews, iOS 16+ simulator/canvas required) for
  visual iteration, and the Widget Extension scheme's own Run action (pick
  "DailyHanziWidget" as the scheme, run on a simulator) to exercise the real
  `PhraseTimelineProvider` end to end. Verify the app→widget data path by
  changing a setting in-app, then confirming the widget reflects it after
  `reloadWidgets()` fires; verify the widget→app path by leaving the app
  closed past one refresh interval, reopening it, and confirming the new
  phrase(s) appear in History.
- **Manual UI pass:** onboarding flow end-to-end on both platforms (iOS gets
  the frequency + "add to Lock Screen" steps, Android skips straight to the
  level step since there's nothing else to configure), HSK level (single and
  multi-select) changes reflected in the phrase pool, light/dark mode,
  favorite/mark-learned affordances, and the empty states (no favorites yet,
  no history yet, no phrases match the selected levels).

## 12. Notes on scope

Per the MVP spec, this intentionally excludes accounts, social features,
leaderboards, subscriptions, and AI tutors.
