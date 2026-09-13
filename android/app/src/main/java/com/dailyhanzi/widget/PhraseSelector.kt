package com.dailyhanzi.widget

import kotlin.random.Random

/**
 * Kotlin port of src/engine/phraseSelector.ts. Kept in lockstep with the JS
 * version deliberately: same constants, same cooldown formula, same
 * weighting. This is what lets the widget pick a fresh, sensible phrase on
 * its own (via [PhraseRefreshWorker]) when the RN app isn't running at all,
 * without needing to boot the JS engine just to run this one function.
 *
 * If you change the algorithm here, mirror the change in phraseSelector.ts
 * (and vice versa) — see that file for the full rationale.
 */
object PhraseSelector {
    private const val FAVORITE_WEIGHT_MULTIPLIER = 1.5
    private const val LEARNED_WEIGHT_MULTIPLIER = 0.5
    private const val UNSEEN_WEIGHT_MULTIPLIER = 1.3
    private const val MAX_COOLDOWN_IDS = 30

    fun filterByLevel(phrases: List<Phrase>, hskLevel: String): List<Phrase> {
        if (hskLevel == "mixed") return phrases
        val level = hskLevel.toIntOrNull() ?: return phrases
        return phrases.filter { it.hskLevel == level }
    }

    private fun cooldownSize(poolSize: Int): Int {
        val scaled = (poolSize * 0.6).toInt()
        return maxOf(0, minOf(MAX_COOLDOWN_IDS, minOf(scaled, poolSize - 1)))
    }

    fun selectNext(
        phrases: List<Phrase>,
        hskLevel: String,
        recentIds: List<String>,
        favoriteIds: List<String>,
        learnedIds: List<String>,
        excludeId: String?,
        random: Random = Random.Default,
    ): Phrase? {
        val pool = filterByLevel(phrases, hskLevel)
        if (pool.isEmpty()) return null
        if (pool.size == 1) return pool[0]

        val cooldown = recentIds.take(cooldownSize(pool.size)).toSet()
        val favorites = favoriteIds.toSet()
        val learned = learnedIds.toSet()
        val shownBefore = recentIds.toSet()

        var eligible = pool.filter { it.id != excludeId && !cooldown.contains(it.id) }
        if (eligible.isEmpty()) eligible = pool.filter { it.id != excludeId }
        if (eligible.isEmpty()) eligible = pool

        val weights = eligible.map { phrase ->
            var w = 1.0
            if (favorites.contains(phrase.id)) w *= FAVORITE_WEIGHT_MULTIPLIER
            if (learned.contains(phrase.id)) w *= LEARNED_WEIGHT_MULTIPLIER
            if (!shownBefore.contains(phrase.id)) w *= UNSEEN_WEIGHT_MULTIPLIER
            w
        }

        val total = weights.sum()
        var target = random.nextDouble() * total
        for (i in eligible.indices) {
            target -= weights[i]
            if (target <= 0) return eligible[i]
        }
        return eligible.last()
    }
}
