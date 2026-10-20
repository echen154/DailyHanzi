import AppIntents
import WidgetKit

/// Backs the small "next phrase" button on the widget's `accessoryRectangular`
/// style (see PhraseWidgetView.swift). Runs entirely inside the widget
/// extension's own process — no host-app launch required. Requires iOS 17+
/// (WidgetKit button interactivity); on iOS 16 the button isn't shown and
/// the widget just displays whatever the timeline already has queued.
@available(iOS 17.0, *)
struct NextPhraseIntent: AppIntent {
    static var title: LocalizedStringResource = "Show another phrase"
    static var description = IntentDescription(
        "Picks a new phrase for the Daily Hanzi widget right now, instead of waiting for the next scheduled refresh."
    )

    func perform() async throws -> some IntentResult {
        let settings = SharedStore.readSettings()
        let picked = PhraseSelector.selectNext(
            phrases: PhraseRepository.all,
            hskLevel: settings.hskLevel,
            recentIds: SharedStore.recentIds,
            favoriteIds: SharedStore.favoriteIds,
            learnedIds: SharedStore.learnedIds,
            excludeId: SharedStore.currentPhraseId
        )
        if let picked {
            SharedStore.recordWidgetSelectedPhrases([(picked.id, Date())])
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "DailyHanziWidget")
        return .result()
    }
}
