package com.dailyhanzi.widget

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Background job that autonomously picks a new phrase and pushes it to the
 * home-screen widget, entirely independent of whether the RN/JS app is
 * running. This is what makes "passive learning" actually work: WorkManager
 * is Android's officially recommended mechanism for deferrable, guaranteed
 * (eventually) background work, and it transparently handles Doze/App
 * Standby for us rather than us fighting the OS directly with alarms.
 *
 * Important, honest caveat: WorkManager's periodic interval is a *minimum*
 * spacing, not an exact schedule. The system can and will delay a run —
 * sometimes by several minutes, occasionally longer under aggressive battery
 * optimization or when the device is in deep Doze — to batch work across
 * apps for battery life. There is no supported Android API that guarantees
 * background execution at an exact wall-clock time.
 */
class PhraseRefreshWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        val appContext = applicationContext
        val settings = WidgetPrefs.readSettings(appContext)

        if (!settings.widgetEnabled) {
            return Result.success()
        }
        if (!isWithinActiveHours(settings.activeHoursStart, settings.activeHoursEnd)) {
            // Outside the user's preferred hours: skip silently. The periodic
            // job keeps firing on schedule; the next run inside the window
            // will pick a phrase.
            return Result.success()
        }

        val phrases = PhraseRepository.loadAll(appContext)
        val next = PhraseSelector.selectNext(
            phrases = phrases,
            hskLevel = settings.hskLevel,
            recentIds = WidgetPrefs.readRecentIds(appContext),
            favoriteIds = WidgetPrefs.readFavoriteIds(appContext),
            learnedIds = WidgetPrefs.readLearnedIds(appContext),
            excludeId = WidgetPrefs.readCurrentPhraseId(appContext),
        ) ?: return Result.success()

        WidgetPrefs.recordWidgetSelectedPhrase(appContext, next.id, System.currentTimeMillis())
        DailyHanziWidgetProvider.updateAllWidgets(appContext)

        return Result.success()
    }

    private fun isWithinActiveHours(startHour: Int, endHour: Int): Boolean {
        if (startHour <= 0 && endHour >= 24) return true
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return if (startHour <= endHour) hour in startHour until endHour else hour >= startHour || hour < endHour
    }

    companion object {
        private const val PERIODIC_WORK_NAME = "daily_hanzi_phrase_refresh"
        private const val ONE_TIME_WORK_NAME = "daily_hanzi_phrase_refresh_now"

        /** (Re)schedules the periodic job at the given cadence. Safe to call repeatedly. */
        fun schedule(context: Context, frequencyMinutes: Int) {
            // WorkManager enforces a 15-minute floor on periodic work; every
            // frequency option we expose (60/120/240/360/1440) clears it.
            val interval = frequencyMinutes.coerceAtLeast(15).toLong()
            val request = PeriodicWorkRequestBuilder<PhraseRefreshWorker>(interval, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().build())
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_WORK_NAME)
        }

        /** Fire-and-forget immediate run — used right after onboarding and on manual widget re-enable. */
        fun runOnce(context: Context) {
            val request = OneTimeWorkRequestBuilder<PhraseRefreshWorker>().build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONE_TIME_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request,
            )
        }
    }
}
