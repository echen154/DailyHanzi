package com.dailyhanzi.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import com.dailyhanzi.R

class DailyHanziWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val views = buildRemoteViews(context)
        appWidgetIds.forEach { id -> appWidgetManager.updateAppWidget(id, views) }
        // Defensive: make sure the periodic refresh job is running even if it
        // was somehow cleared (e.g. after certain OS-level app resets).
        PhraseRefreshWorker.schedule(context, WidgetPrefs.readSettings(context).frequencyMinutes)
    }

    override fun onEnabled(context: Context) {
        PhraseRefreshWorker.schedule(context, WidgetPrefs.readSettings(context).frequencyMinutes)
        PhraseRefreshWorker.runOnce(context)
    }

    override fun onDisabled(context: Context) {
        PhraseRefreshWorker.cancel(context)
    }

    companion object {
        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, DailyHanziWidgetProvider::class.java))
            if (ids.isEmpty()) return
            val views = buildRemoteViews(context)
            manager.updateAppWidget(ids, views)
        }

        private fun buildRemoteViews(context: Context): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_daily_hanzi)
            val settings = WidgetPrefs.readSettings(context)
            val phrase = WidgetPrefs.readCurrentPhraseId(context)?.let { PhraseRepository.byId(context, it) }

            if (phrase == null) {
                views.setTextViewText(R.id.widget_hsk_badge, "")
                views.setTextViewText(R.id.widget_hanzi, "你好")
                views.setTextViewText(R.id.widget_pinyin, "Nǐ hǎo")
                views.setTextViewText(R.id.widget_definition, "Open Daily Hanzi to get started")
                return views
            }

            val hanzi = if (settings.scriptMode == "traditional") phrase.traditional else phrase.simplified
            views.setTextViewText(R.id.widget_hsk_badge, "HSK ${phrase.hskLevel}")
            views.setTextViewText(R.id.widget_hanzi, hanzi)

            views.setViewVisibility(R.id.widget_pinyin, if (settings.showPinyin) View.VISIBLE else View.GONE)
            if (settings.showPinyin) views.setTextViewText(R.id.widget_pinyin, phrase.pinyin)

            views.setViewVisibility(R.id.widget_definition, if (settings.showDefinition) View.VISIBLE else View.GONE)
            if (settings.showDefinition) views.setTextViewText(R.id.widget_definition, phrase.definition)

            return views
        }
    }
}
