import Foundation
import WidgetKit

/// JS-facing native module backing src/native/WidgetBridge.ts on iOS.
///
/// Deliberately avoids importing React's Objective-C headers (RCTBridgeModule,
/// RCTPromiseResolveBlock, etc.) directly into Swift, which would require
/// setting up a bridging header. Instead, the promise callback types are
/// plain Swift closures, and DailyHanziWidgetBridge.m (the Objective-C
/// exporter) handles the RCTPromiseResolveBlock/RCTPromiseRejectBlock
/// boundary — Swift closures of matching shape bridge to those block types
/// automatically. This is the standard way to write a Swift RN native module
/// without any extra Xcode bridging-header configuration.
@objc(DailyHanziWidgetBridge)
class DailyHanziWidgetBridge: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool { false }

    @objc(syncState:)
    func syncState(_ payloadJson: String) {
        guard
            let data = payloadJson.data(using: .utf8),
            let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let settings = payload["settings"] as? [String: Any]
        else { return }

        let hskLevel: String
        if let raw = settings["hskLevel"] as? String {
            hskLevel = raw
        } else if let raw = settings["hskLevel"] as? NSNumber {
            hskLevel = raw.stringValue
        } else {
            hskLevel = "mixed"
        }

        SharedStore.applySync(
            hskLevel: hskLevel,
            frequencyMinutes: settings["frequencyMinutes"] as? Int ?? 240,
            scriptMode: settings["scriptMode"] as? String ?? "simplified",
            showPinyin: settings["showPinyin"] as? Bool ?? true,
            showDefinition: settings["showDefinition"] as? Bool ?? true,
            activeHoursStart: settings["activeHoursStart"] as? Int ?? 8,
            activeHoursEnd: settings["activeHoursEnd"] as? Int ?? 22,
            widgetEnabled: settings["widgetEnabled"] as? Bool ?? true,
            favoriteIds: payload["favoriteIds"] as? [String] ?? [],
            learnedIds: payload["learnedIds"] as? [String] ?? [],
            recentIds: payload["recentIds"] as? [String] ?? [],
            currentPhraseId: payload["currentPhraseId"] as? String
        )

        DispatchQueue.main.async {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    @objc(reloadWidgets)
    func reloadWidgets() {
        DispatchQueue.main.async {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    @objc(getWidgetHistory:reject:)
    func getWidgetHistory(
        resolve: @escaping (Any?) -> Void,
        reject: @escaping (String?, String?, Error?) -> Void
    ) {
        let entries = SharedStore.drainWidgetHistoryLog()
        let result = entries.map { ["phraseId": $0.phraseId, "shownAt": $0.shownAt] as [String: Any] }
        resolve(result)
    }
}
