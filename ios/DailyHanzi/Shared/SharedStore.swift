import Foundation

/// Shared, cross-process storage for everything the widget needs, backed by
/// an App Group so both the main app process and the WidgetKit extension
/// process can read and write the same data. This is the iOS equivalent of
/// WidgetPrefs.kt on Android (Android doesn't need an App Group because its
/// widgets run inside the host app's own process; iOS widget extensions are
/// a genuinely separate process).
///
/// SETUP REQUIRED: "group.com.dailyhanzi.shared" must be added as an App
/// Group capability to BOTH the main app target and the DailyHanziWidget
/// extension target in Xcode (Signing & Capabilities -> + Capability ->
/// App Groups) before this will work. See the iOS setup steps in README.md.
enum SharedStore {
    private static let appGroupId = "group.com.dailyhanzi.shared"

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroupId) ?? .standard
    }

    private enum Key {
        static let hskLevel = "hskLevel"
        static let frequencyMinutes = "frequencyMinutes"
        static let scriptMode = "scriptMode"
        static let showPinyin = "showPinyin"
        static let showDefinition = "showDefinition"
        static let activeHoursStart = "activeHoursStart"
        static let activeHoursEnd = "activeHoursEnd"
        static let widgetEnabled = "widgetEnabled"
        static let favoriteIds = "favoriteIds"
        static let learnedIds = "learnedIds"
        static let recentIds = "recentIds"
        static let currentPhraseId = "currentPhraseId"
        static let currentPhraseShownAt = "currentPhraseShownAt"
        static let widgetHistoryLog = "widgetHistoryLog"
    }

    struct Settings {
        var hskLevel: String
        var frequencyMinutes: Int
        var scriptMode: String
        var showPinyin: Bool
        var showDefinition: Bool
        var activeHoursStart: Int
        var activeHoursEnd: Int
        var widgetEnabled: Bool
    }

    static func readSettings() -> Settings {
        let d = defaults
        return Settings(
            hskLevel: d.string(forKey: Key.hskLevel) ?? "mixed",
            frequencyMinutes: (d.object(forKey: Key.frequencyMinutes) as? Int) ?? 240,
            scriptMode: d.string(forKey: Key.scriptMode) ?? "simplified",
            showPinyin: (d.object(forKey: Key.showPinyin) as? Bool) ?? true,
            showDefinition: (d.object(forKey: Key.showDefinition) as? Bool) ?? true,
            activeHoursStart: (d.object(forKey: Key.activeHoursStart) as? Int) ?? 8,
            activeHoursEnd: (d.object(forKey: Key.activeHoursEnd) as? Int) ?? 22,
            widgetEnabled: (d.object(forKey: Key.widgetEnabled) as? Bool) ?? true
        )
    }

    static var favoriteIds: [String] { defaults.stringArray(forKey: Key.favoriteIds) ?? [] }
    static var learnedIds: [String] { defaults.stringArray(forKey: Key.learnedIds) ?? [] }
    static var recentIds: [String] { defaults.stringArray(forKey: Key.recentIds) ?? [] }
    static var currentPhraseId: String? { defaults.string(forKey: Key.currentPhraseId) }

    /// Applies a full snapshot pushed from JS. See src/native/WidgetBridge.ts (WidgetSyncPayload).
    static func applySync(
        hskLevel: String,
        frequencyMinutes: Int,
        scriptMode: String,
        showPinyin: Bool,
        showDefinition: Bool,
        activeHoursStart: Int,
        activeHoursEnd: Int,
        widgetEnabled: Bool,
        favoriteIds: [String],
        learnedIds: [String],
        recentIds: [String],
        currentPhraseId: String?
    ) {
        let d = defaults
        d.set(hskLevel, forKey: Key.hskLevel)
        d.set(frequencyMinutes, forKey: Key.frequencyMinutes)
        d.set(scriptMode, forKey: Key.scriptMode)
        d.set(showPinyin, forKey: Key.showPinyin)
        d.set(showDefinition, forKey: Key.showDefinition)
        d.set(activeHoursStart, forKey: Key.activeHoursStart)
        d.set(activeHoursEnd, forKey: Key.activeHoursEnd)
        d.set(widgetEnabled, forKey: Key.widgetEnabled)
        d.set(favoriteIds, forKey: Key.favoriteIds)
        d.set(learnedIds, forKey: Key.learnedIds)
        d.set(Array(recentIds.prefix(30)), forKey: Key.recentIds)
        if let currentPhraseId {
            d.set(currentPhraseId, forKey: Key.currentPhraseId)
        }
    }

    /// Called by the widget's timeline provider after it autonomously selects new phrases.
    static func recordWidgetSelectedPhrases(_ entries: [(phraseId: String, shownAt: Date)]) {
        guard !entries.isEmpty else { return }
        let d = defaults

        var recent = recentIds
        var log = readHistoryLogRaw()
        for entry in entries {
            recent.insert(entry.phraseId, at: 0)
            log.insert(
                ["phraseId": entry.phraseId, "shownAt": entry.shownAt.timeIntervalSince1970 * 1000],
                at: 0
            )
        }

        d.set(Array(dedupPreservingOrder(recent).prefix(30)), forKey: Key.recentIds)
        d.set(Array(log.prefix(50)), forKey: Key.widgetHistoryLog)

        if let last = entries.last {
            d.set(last.phraseId, forKey: Key.currentPhraseId)
            d.set(last.shownAt.timeIntervalSince1970 * 1000, forKey: Key.currentPhraseShownAt)
        }
    }

    /// Returns and clears the log of phrases the widget selected while the app wasn't running.
    static func drainWidgetHistoryLog() -> [(phraseId: String, shownAt: Double)] {
        let log = readHistoryLogRaw()
        defaults.set([[String: Any]](), forKey: Key.widgetHistoryLog)
        return log.compactMap { entry in
            guard let phraseId = entry["phraseId"] as? String,
                  let shownAt = entry["shownAt"] as? Double else { return nil }
            return (phraseId, shownAt)
        }
    }

    private static func readHistoryLogRaw() -> [[String: Any]] {
        defaults.array(forKey: Key.widgetHistoryLog) as? [[String: Any]] ?? []
    }

    private static func dedupPreservingOrder(_ items: [String]) -> [String] {
        var seen = Set<String>()
        return items.filter { seen.insert($0).inserted }
    }
}
