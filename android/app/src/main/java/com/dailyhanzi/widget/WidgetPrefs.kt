package com.dailyhanzi.widget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Shared, process-wide storage for everything the widget needs to render and
 * refresh itself independently of the RN JS layer. Written by
 * [DailyHanziWidgetBridgeModule] (on behalf of the app) and by
 * [PhraseRefreshWorker] (when it autonomously picks a new phrase).
 *
 * Android widgets run in the same process/package as the host app, so a
 * plain SharedPreferences file is all that's needed here — unlike iOS, there
 * is no separate "extension process" requiring an App-Group-style shared
 * container.
 */
object WidgetPrefs {
    private const val PREFS_NAME = "dailyhanzi_widget_prefs"

    private const val KEY_HSK_LEVEL = "hskLevel" // "mixed" or "1".."6"
    private const val KEY_FREQUENCY_MINUTES = "frequencyMinutes"
    private const val KEY_SCRIPT_MODE = "scriptMode" // "simplified" | "traditional"
    private const val KEY_SHOW_PINYIN = "showPinyin"
    private const val KEY_SHOW_DEFINITION = "showDefinition"
    private const val KEY_ACTIVE_HOURS_START = "activeHoursStart"
    private const val KEY_ACTIVE_HOURS_END = "activeHoursEnd"
    private const val KEY_WIDGET_ENABLED = "widgetEnabled"

    private const val KEY_FAVORITE_IDS = "favoriteIds" // JSON array of strings
    private const val KEY_LEARNED_IDS = "learnedIds" // JSON array of strings
    private const val KEY_RECENT_IDS = "recentIds" // JSON array of strings, most recent first
    private const val KEY_CURRENT_PHRASE_ID = "currentPhraseId"
    private const val KEY_CURRENT_PHRASE_SHOWN_AT = "currentPhraseShownAt"

    /** Append-only log of phrases the widget selected on its own; drained by getWidgetHistory(). */
    private const val KEY_WIDGET_HISTORY_LOG = "widgetHistoryLog" // JSON array of {phraseId, shownAt}

    private const val MAX_RECENT_IDS = 30
    private const val MAX_HISTORY_LOG = 50

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    data class Settings(
        val hskLevel: String,
        val frequencyMinutes: Int,
        val scriptMode: String,
        val showPinyin: Boolean,
        val showDefinition: Boolean,
        val activeHoursStart: Int,
        val activeHoursEnd: Int,
        val widgetEnabled: Boolean,
    )

    fun readSettings(context: Context): Settings {
        val p = prefs(context)
        return Settings(
            hskLevel = p.getString(KEY_HSK_LEVEL, "mixed") ?: "mixed",
            frequencyMinutes = p.getInt(KEY_FREQUENCY_MINUTES, 240),
            scriptMode = p.getString(KEY_SCRIPT_MODE, "simplified") ?: "simplified",
            showPinyin = p.getBoolean(KEY_SHOW_PINYIN, true),
            showDefinition = p.getBoolean(KEY_SHOW_DEFINITION, true),
            activeHoursStart = p.getInt(KEY_ACTIVE_HOURS_START, 8),
            activeHoursEnd = p.getInt(KEY_ACTIVE_HOURS_END, 22),
            widgetEnabled = p.getBoolean(KEY_WIDGET_ENABLED, true),
        )
    }

    private fun readStringList(context: Context, key: String): List<String> {
        val raw = prefs(context).getString(key, null) ?: return emptyList()
        val array = JSONArray(raw)
        return (0 until array.length()).map { array.getString(it) }
    }

    private fun writeStringList(editor: SharedPreferences.Editor, key: String, values: List<String>) {
        val array = JSONArray()
        values.forEach { array.put(it) }
        editor.putString(key, array.toString())
    }

    fun readFavoriteIds(context: Context): List<String> = readStringList(context, KEY_FAVORITE_IDS)
    fun readLearnedIds(context: Context): List<String> = readStringList(context, KEY_LEARNED_IDS)
    fun readRecentIds(context: Context): List<String> = readStringList(context, KEY_RECENT_IDS)
    fun readCurrentPhraseId(context: Context): String? = prefs(context).getString(KEY_CURRENT_PHRASE_ID, null)

    /**
     * Applies a full state snapshot pushed from JS (see WidgetBridge.ts /
     * WidgetSyncPayload). Does not touch the widget-history log.
     */
    fun applySync(
        context: Context,
        hskLevel: String,
        frequencyMinutes: Int,
        scriptMode: String,
        showPinyin: Boolean,
        showDefinition: Boolean,
        activeHoursStart: Int,
        activeHoursEnd: Int,
        widgetEnabled: Boolean,
        favoriteIds: List<String>,
        learnedIds: List<String>,
        recentIds: List<String>,
        currentPhraseId: String?,
    ) {
        val editor = prefs(context).edit()
        editor.putString(KEY_HSK_LEVEL, hskLevel)
        editor.putInt(KEY_FREQUENCY_MINUTES, frequencyMinutes)
        editor.putString(KEY_SCRIPT_MODE, scriptMode)
        editor.putBoolean(KEY_SHOW_PINYIN, showPinyin)
        editor.putBoolean(KEY_SHOW_DEFINITION, showDefinition)
        editor.putInt(KEY_ACTIVE_HOURS_START, activeHoursStart)
        editor.putInt(KEY_ACTIVE_HOURS_END, activeHoursEnd)
        editor.putBoolean(KEY_WIDGET_ENABLED, widgetEnabled)
        writeStringList(editor, KEY_FAVORITE_IDS, favoriteIds)
        writeStringList(editor, KEY_LEARNED_IDS, learnedIds)
        writeStringList(editor, KEY_RECENT_IDS, recentIds.take(MAX_RECENT_IDS))
        if (currentPhraseId != null) editor.putString(KEY_CURRENT_PHRASE_ID, currentPhraseId)
        editor.apply()
    }

    /** Called by [PhraseRefreshWorker] after it autonomously selects a new phrase. */
    fun recordWidgetSelectedPhrase(context: Context, phraseId: String, shownAt: Long) {
        val recent = listOf(phraseId) + readRecentIds(context)
        val editor = prefs(context).edit()
        writeStringList(editor, KEY_RECENT_IDS, recent.distinct().take(MAX_RECENT_IDS))
        editor.putString(KEY_CURRENT_PHRASE_ID, phraseId)
        editor.putLong(KEY_CURRENT_PHRASE_SHOWN_AT, shownAt)

        val existingLog = readWidgetHistoryLogRaw(context)
        val newLog = JSONArray()
        newLog.put(JSONObject().put("phraseId", phraseId).put("shownAt", shownAt))
        for (i in 0 until existingLog.length()) {
            if (newLog.length() >= MAX_HISTORY_LOG) break
            newLog.put(existingLog.getJSONObject(i))
        }
        editor.putString(KEY_WIDGET_HISTORY_LOG, newLog.toString())
        editor.apply()
    }

    private fun readWidgetHistoryLogRaw(context: Context): JSONArray {
        val raw = prefs(context).getString(KEY_WIDGET_HISTORY_LOG, null) ?: return JSONArray()
        return JSONArray(raw)
    }

    /** Returns and clears the log of phrases the widget selected while the app wasn't running. */
    fun drainWidgetHistoryLog(context: Context): List<Pair<String, Long>> {
        val log = readWidgetHistoryLogRaw(context)
        val result = ArrayList<Pair<String, Long>>(log.length())
        for (i in 0 until log.length()) {
            val entry = log.getJSONObject(i)
            result.add(entry.getString("phraseId") to entry.getLong("shownAt"))
        }
        prefs(context).edit().putString(KEY_WIDGET_HISTORY_LOG, JSONArray().toString()).apply()
        return result
    }
}
