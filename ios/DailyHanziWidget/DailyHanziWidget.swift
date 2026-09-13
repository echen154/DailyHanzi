import WidgetKit
import SwiftUI

struct DailyHanziWidget: Widget {
    let kind: String = "DailyHanziWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PhraseTimelineProvider()) { entry in
            PhraseWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily Hanzi")
        .description("A new Chinese phrase, right on your home screen.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct DailyHanziWidgetBundle: WidgetBundle {
    var body: some Widget {
        DailyHanziWidget()
    }
}
