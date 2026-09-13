import Foundation

/// Loads the bundled phrase database from the widget extension's own copy of
/// phrases.json (added as a resource to the DailyHanziWidget target — the
/// exact same dataset shipped in src/data/phrases.json and
/// android/app/src/main/assets/phrases.json, so all three surfaces agree on
/// content). `Bundle.main` here resolves to the extension's bundle, not the
/// host app's, since each is a separate process with its own main bundle.
enum PhraseRepository {
    static let all: [Phrase] = {
        guard
            let url = Bundle.main.url(forResource: "phrases", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let phrases = try? JSONDecoder().decode([Phrase].self, from: data)
        else {
            return []
        }
        return phrases
    }()

    static func byId(_ id: String) -> Phrase? {
        all.first { $0.id == id }
    }
}
