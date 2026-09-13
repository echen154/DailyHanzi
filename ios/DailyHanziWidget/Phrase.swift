import Foundation

/// Native-side mirror of src/types/phrase.ts. Kept intentionally minimal —
/// the widget only ever needs enough to render itself. JSONDecoder ignores
/// the extra fields present in phrases.json (exampleSentence, topic, tags,
/// ...) that aren't listed here, so no custom decoding logic is needed.
struct Phrase: Codable, Identifiable, Equatable {
    let id: String
    let simplified: String
    let traditional: String
    let pinyin: String
    let definition: String
    let hskLevel: Int
}
