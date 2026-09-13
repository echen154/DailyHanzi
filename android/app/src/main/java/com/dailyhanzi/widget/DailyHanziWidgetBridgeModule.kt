package com.dailyhanzi.widget

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import org.json.JSONArray
import org.json.JSONObject

private fun JSONArray.toStringList(): List<String> = (0 until length()).map { getString(it) }

/**
 * JS-facing native module backing src/native/WidgetBridge.ts on Android.
 * See that file for the cross-platform contract; see WidgetPrefs for where
 * this data actually lives.
 */
class DailyHanziWidgetBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DailyHanziWidgetBridge"

    @ReactMethod
    fun syncState(payloadJson: String) {
        val context = reactApplicationContext
        val payload = JSONObject(payloadJson)
        val settings = payload.getJSONObject("settings")
        val currentPhraseId = if (payload.isNull("currentPhraseId")) null else payload.optString("currentPhraseId")

        WidgetPrefs.applySync(
            context = context,
            hskLevel = settings.get("hskLevel").toString(),
            frequencyMinutes = settings.getInt("frequencyMinutes"),
            scriptMode = settings.getString("scriptMode"),
            showPinyin = settings.getBoolean("showPinyin"),
            showDefinition = settings.getBoolean("showDefinition"),
            activeHoursStart = settings.getInt("activeHoursStart"),
            activeHoursEnd = settings.getInt("activeHoursEnd"),
            widgetEnabled = settings.getBoolean("widgetEnabled"),
            favoriteIds = payload.getJSONArray("favoriteIds").toStringList(),
            learnedIds = payload.getJSONArray("learnedIds").toStringList(),
            recentIds = payload.getJSONArray("recentIds").toStringList(),
            currentPhraseId = currentPhraseId,
        )

        if (settings.getBoolean("widgetEnabled")) {
            PhraseRefreshWorker.schedule(context, settings.getInt("frequencyMinutes"))
        } else {
            PhraseRefreshWorker.cancel(context)
        }

        DailyHanziWidgetProvider.updateAllWidgets(context)
    }

    @ReactMethod
    fun reloadWidgets() {
        DailyHanziWidgetProvider.updateAllWidgets(reactApplicationContext)
    }

    @ReactMethod
    fun getWidgetHistory(promise: Promise) {
        val entries = WidgetPrefs.drainWidgetHistoryLog(reactApplicationContext)
        val array: WritableArray = Arguments.createArray()
        entries.forEach { (phraseId, shownAt) ->
            val map = Arguments.createMap()
            map.putString("phraseId", phraseId)
            map.putDouble("shownAt", shownAt.toDouble())
            array.pushMap(map)
        }
        promise.resolve(array)
    }
}
