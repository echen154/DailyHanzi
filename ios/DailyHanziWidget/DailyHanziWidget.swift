import WidgetKit
import SwiftUI

/// This widget is Lock Screen–only by design — see PhraseWidgetView.swift
/// for why `supportedFamilies` lists only the accessory (Lock Screen)
/// families, never the Home Screen sizes.
struct DailyHanziWidget: Widget {
    let kind: String = "DailyHanziWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PhraseTimelineProvider()) { entry in
            PhraseWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily Hanzi")
        .description("A new Chinese phrase, right on your Lock Screen.")
        .supportedFamilies([.accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

@main
struct DailyHanziWidgetBundle: WidgetBundle {
    var body: some Widget {
        DailyHanziWidget()
    }
}
