package com.dailyhanzi.widget

/**
 * Native-side mirror of src/types/phrase.ts. Kept intentionally minimal —
 * the widget only ever needs enough to render itself, not the full example
 * sentence metadata the in-app screens show.
 */
data class Phrase(
    val id: String,
    val simplified: String,
    val traditional: String,
    val pinyin: String,
    val definition: String,
    val hskLevel: Int,
)
