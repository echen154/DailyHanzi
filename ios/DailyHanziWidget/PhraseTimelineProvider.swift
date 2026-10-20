import WidgetKit

struct PhraseEntry: TimelineEntry {
    let date: Date
    let phrase: Phrase?
    let scriptMode: String
    let showPinyin: Bool
    let showDefinition: Bool
    /// Display-only, for the small status glyphs in AccessoryRectangularView —
    /// there is no way to toggle these from the widget itself (see that
    /// view's doc comment for why).
    let isFavorite: Bool
    let isLearned: Bool
}

/// Drives the widget's content and refresh schedule.
///
/// HOW REFRESH TIMING ACTUALLY WORKS ON iOS (read before changing this file):
/// WidgetKit does not let an app pick an exact wall-clock refresh minute.
/// Instead, a TimelineProvider hands back a batch of dated entries up front;
/// the OS displays each one at its target date entirely on its own, and only
/// calls `getTimeline` again once that batch is exhausted (per the
/// `TimelineReloadPolicy`) — and even then, iOS uses its own budget and
/// system-health heuristics to decide exactly when that reload actually
/// happens (typically within a reasonable window of the requested time, more
/// generously when the device is charging / on Wi-Fi, more conservatively
/// otherwise). Precomputing several future entries here (rather than one at
/// a time) is what keeps the widget feeling like it updates on the user's
/// chosen cadence despite that.
struct PhraseTimelineProvider: TimelineProvider {
    private let maxEntriesPerBatch = 24

    func placeholder(in context: Context) -> PhraseEntry {
        makeEntry(for: PhraseRepository.all.first, at: Date(), settings: SharedStore.readSettings())
    }

    func getSnapshot(in context: Context, completion: @escaping (PhraseEntry) -> Void) {
        let settings = SharedStore.readSettings()
        let phrase = SharedStore.currentPhraseId.flatMap(PhraseRepository.byId) ?? PhraseRepository.all.first
        completion(makeEntry(for: phrase, at: Date(), settings: settings))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PhraseEntry>) -> Void) {
        let settings = SharedStore.readSettings()
        let now = Date()

        guard settings.widgetEnabled else {
            // The app calls WidgetCenter.shared.reloadAllTimelines() the moment
            // the user re-enables the widget in Settings, which regenerates a
            // live timeline immediately — so `.never` here is safe rather than
            // leaving the widget frozen forever.
            let phrase = SharedStore.currentPhraseId.flatMap(PhraseRepository.byId)
            let entry = makeEntry(for: phrase, at: now, settings: settings)
            completion(Timeline(entries: [entry], policy: .never))
            return
        }

        let phrases = PhraseRepository.all
        let minutesPerDay = 24 * 60
        let rawCount = Int(ceil(Double(minutesPerDay) / Double(max(settings.frequencyMinutes, 1))))
        let targetCount = min(maxEntriesPerBatch, max(1, rawCount))

        var recentIds = SharedStore.recentIds
        var currentId = SharedStore.currentPhraseId
        var entries: [PhraseEntry] = []
        var newlySelected: [(phraseId: String, shownAt: Date)] = []

        for step in 0..<targetCount {
            guard
                let entryDate = Calendar.current.date(
                    byAdding: .minute,
                    value: step * settings.frequencyMinutes,
                    to: now
                )
            else { break }

            guard isWithinActiveHours(date: entryDate, start: settings.activeHoursStart, end: settings.activeHoursEnd) else {
                continue
            }

            guard let picked = PhraseSelector.selectNext(
                phrases: phrases,
                hskLevel: settings.hskLevel,
                recentIds: recentIds,
                favoriteIds: SharedStore.favoriteIds,
                learnedIds: SharedStore.learnedIds,
                excludeId: currentId
            ) else {
                break
            }

            entries.append(makeEntry(for: picked, at: entryDate, settings: settings))
            newlySelected.append((picked.id, entryDate))
            recentIds = [picked.id] + recentIds
            currentId = picked.id
        }

        if entries.isEmpty {
            // Every candidate slot fell outside the active-hours window (e.g.
            // a "once per day" cadence that happened to land at 3am). Show
            // whatever is currently stored and try again in an hour.
            let phrase = SharedStore.currentPhraseId.flatMap(PhraseRepository.byId)
            entries = [makeEntry(for: phrase, at: now, settings: settings)]
        } else {
            SharedStore.recordWidgetSelectedPhrases(newlySelected)
        }

        let reloadAfter = entries.last?.date ?? now.addingTimeInterval(60 * 60)
        completion(Timeline(entries: entries, policy: .after(reloadAfter)))
    }

    private func makeEntry(for phrase: Phrase?, at date: Date, settings: SharedStore.Settings) -> PhraseEntry {
        PhraseEntry(
            date: date,
            phrase: phrase,
            scriptMode: settings.scriptMode,
            showPinyin: settings.showPinyin,
            showDefinition: settings.showDefinition,
            isFavorite: phrase.map { SharedStore.favoriteIds.contains($0.id) } ?? false,
            isLearned: phrase.map { SharedStore.learnedIds.contains($0.id) } ?? false
        )
    }

    private func isWithinActiveHours(date: Date, start: Int, end: Int) -> Bool {
        if start <= 0 && end >= 24 { return true }
        let hour = Calendar.current.component(.hour, from: date)
        return start <= end ? (hour >= start && hour < end) : (hour >= start || hour < end)
    }
}
