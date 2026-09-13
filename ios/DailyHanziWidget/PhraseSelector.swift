import Foundation

/// Swift port of src/engine/phraseSelector.ts (see also PhraseSelector.kt on
/// Android). Kept in lockstep deliberately: same constants, same cooldown
/// formula, same weighting. This is what lets the widget pick a fresh,
/// sensible phrase entirely on its own — WidgetKit extensions can't run the
/// RN/JS engine, so this is a from-scratch native reimplementation rather
/// than a shared code module.
///
/// If you change the algorithm here, mirror the change in phraseSelector.ts
/// and PhraseSelector.kt (and vice versa).
enum PhraseSelector {
    private static let favoriteWeightMultiplier = 1.5
    private static let learnedWeightMultiplier = 0.5
    private static let unseenWeightMultiplier = 1.3
    private static let maxCooldownIds = 30

    static func filterByLevel(_ phrases: [Phrase], hskLevel: String) -> [Phrase] {
        guard hskLevel != "mixed" else { return phrases }
        guard let level = Int(hskLevel) else { return phrases }
        return phrases.filter { $0.hskLevel == level }
    }

    private static func cooldownSize(poolSize: Int) -> Int {
        let scaled = Int(Double(poolSize) * 0.6)
        return max(0, min(maxCooldownIds, min(scaled, poolSize - 1)))
    }

    static func selectNext(
        phrases: [Phrase],
        hskLevel: String,
        recentIds: [String],
        favoriteIds: [String],
        learnedIds: [String],
        excludeId: String?,
        random: () -> Double = { Double.random(in: 0..<1) }
    ) -> Phrase? {
        let pool = filterByLevel(phrases, hskLevel: hskLevel)
        guard !pool.isEmpty else { return nil }
        if pool.count == 1 { return pool[0] }

        let cooldown = Set(recentIds.prefix(cooldownSize(poolSize: pool.count)))
        let favorites = Set(favoriteIds)
        let learned = Set(learnedIds)
        let shownBefore = Set(recentIds)

        var eligible = pool.filter { $0.id != excludeId && !cooldown.contains($0.id) }
        if eligible.isEmpty { eligible = pool.filter { $0.id != excludeId } }
        if eligible.isEmpty { eligible = pool }

        let weights: [Double] = eligible.map { phrase in
            var w = 1.0
            if favorites.contains(phrase.id) { w *= favoriteWeightMultiplier }
            if learned.contains(phrase.id) { w *= learnedWeightMultiplier }
            if !shownBefore.contains(phrase.id) { w *= unseenWeightMultiplier }
            return w
        }

        let total = weights.reduce(0, +)
        var target = random() * total
        for (index, weight) in weights.enumerated() {
            target -= weight
            if target <= 0 { return eligible[index] }
        }
        return eligible.last
    }
}
