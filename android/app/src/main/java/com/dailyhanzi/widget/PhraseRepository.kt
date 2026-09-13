package com.dailyhanzi.widget

import android.content.Context
import org.json.JSONArray

/**
 * Loads the bundled phrase database from android/app/src/main/assets/phrases.json.
 * This is the exact same dataset shipped to the JS bundle (src/data/phrases.json)
 * and to the iOS widget extension, so all three surfaces agree on content.
 *
 * The result is cached in memory for the lifetime of the process — the widget
 * process is short-lived (spun up to handle a WorkManager run or an
 * AppWidgetProvider callback), so there's no real staleness concern, and a
 * fresh app install always ships a fresh copy of this file.
 */
object PhraseRepository {
    @Volatile
    private var cached: List<Phrase>? = null

    fun loadAll(context: Context): List<Phrase> {
        cached?.let { return it }
        synchronized(this) {
            cached?.let { return it }
            val json = context.assets.open("phrases.json").bufferedReader().use { it.readText() }
            val array = JSONArray(json)
            val result = ArrayList<Phrase>(array.length())
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                result.add(
                    Phrase(
                        id = obj.getString("id"),
                        simplified = obj.getString("simplified"),
                        traditional = obj.getString("traditional"),
                        pinyin = obj.getString("pinyin"),
                        definition = obj.getString("definition"),
                        hskLevel = obj.getInt("hskLevel"),
                    ),
                )
            }
            cached = result
            return result
        }
    }

    fun byId(context: Context, id: String): Phrase? = loadAll(context).firstOrNull { it.id == id }
}
