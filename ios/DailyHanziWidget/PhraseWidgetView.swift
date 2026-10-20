import SwiftUI
import WidgetKit
import AppIntents

/// This widget is Lock Screen–only by design (no Home Screen presence at
/// all) — see DailyHanziWidget.swift for why the accessory families are the
/// *entire* `supportedFamilies` list, not one option among several.
struct PhraseWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family

    let entry: PhraseEntry

    // `family` is never matched against an accessory (Lock Screen) case
    // directly here — those enum cases only exist on iOS 16+, and this
    // file's deployment target is 15.1, so doing so would fail to compile.
    // Everything real lives in `accessoryBody`, gated by `#available`; on
    // iOS 15 `supportedFamilies` is empty anyway (see DailyHanziWidget.swift),
    // so no family ever actually reaches this view on that OS version.
    var body: some View {
        accessoryBody
    }

    @ViewBuilder
    private var accessoryBody: some View {
        if #available(iOS 16.0, *) {
            switch family {
            case .accessoryRectangular:
                AccessoryRectangularView(entry: entry)
            case .accessoryCircular:
                AccessoryCircularView(entry: entry)
            case .accessoryInline:
                AccessoryInlineView(entry: entry)
            default:
                EmptyView()
            }
        } else {
            EmptyView()
        }
    }
}

private func hanzi(for phrase: Phrase, scriptMode: String) -> String {
    scriptMode == "traditional" ? phrase.traditional : phrase.simplified
}

// MARK: - Lock Screen ("accessory") widgets, iOS 16+
//
// The system renders these itself in a tinted/monochrome style based on the
// user's Lock Screen personalization — apps don't control color here, so
// these views deliberately stick to plain text and `.widgetAccentable()`
// rather than the app's own accent color, and never add a background/shape.
//
// Real constraint worth being upfront about: these surfaces are genuinely
// too small to show everything the app does, and their *size* is entirely
// fixed by iOS — there is no API to make `accessoryRectangular` (~160x56pt)
// taller or otherwise request more space. It fits the phrase, its HSK
// level, pinyin or definition, and one real interactive control in the
// bottom-trailing corner: a "show me another phrase" button
// (NextPhraseCorner / NextPhraseIntent.swift), which works because it's a
// small icon overlaid on top of the existing content rather than something
// that needs its own extra room. There is still no "mark learned" or
// "favorite" button here — those specifically need to know which phrase
// they're acting on and toggle per-phrase state, which is a worse fit for a
// tap target this small than a single stateless "get a new one" action;
// favoriting and marking learned stay in-app.
//
// Placement on the real Lock Screen is entirely user-controlled via drag-
// and-drop in iOS's Lock Screen customization UI, not something the app can
// dictate — there's no API to pin a widget to a specific corner. The closest
// real equivalent to "near the clock, out of its way" is `accessoryCircular`,
// which iOS lets the user drop directly beside the clock digits.

@available(iOS 16.0, *)
private struct AccessoryRectangularView: View {
    let entry: PhraseEntry

    var body: some View {
        guard let phrase = entry.phrase else {
            return AnyView(
                Text("Open Daily Hanzi")
                    .font(.system(size: 13))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(5)
                    .containerBackground(.clear, for: .widget)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(Color.white, lineWidth: 1)
                    )
            )
        }
        return AnyView(
            ZStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text(hanzi(for: phrase, scriptMode: entry.scriptMode))
                        .font(.system(size: 15, weight: .semibold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    if entry.showPinyin {
                        Text("HSK \(phrase.hskLevel) · \(phrase.pinyin)")
                            .font(.system(size: 10))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                            .widgetAccentable()
                    }
                    if entry.showDefinition {
                        Text(phrase.definition)
                            .font(.system(size: 10))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                }
                // Reserves room on the bottom-right so text never runs under
                // the reroll button rather than relying on precise measurement.
                .padding(.bottom, 10)
                .padding(.trailing, 12)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

                NextPhraseCorner()
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            }
            .padding(5)
            .containerBackground(.clear, for: .widget)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Color.white, lineWidth: 1)
            )
        )
    }
}

/// The one interactive element on this whole surface: fetches a new phrase
/// immediately, without waiting for the next scheduled refresh. Requires
/// iOS 17+ (WidgetKit button interactivity, same requirement as the rest of
/// this file's `#available(iOS 16.0, *)` accessory views needing a further
/// gate for this one control) — on iOS 16 this simply renders nothing, and
/// the widget still updates on its normal schedule.
@available(iOS 16.0, *)
private struct NextPhraseCorner: View {
    var body: some View {
        if #available(iOS 17.0, *) {
            Button(intent: NextPhraseIntent()) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 9, weight: .semibold))
            }
            .buttonStyle(.plain)
        } else {
            EmptyView()
        }
    }
}

@available(iOS 16.0, *)
private struct AccessoryCircularView: View {
    let entry: PhraseEntry

    var body: some View {
        guard let phrase = entry.phrase else {
            return AnyView(
                Image(systemName: "character.book.closed")
                    .containerBackground(.clear, for: .widget)
            )
        }
        return AnyView(
            VStack(spacing: 0) {
                Text(hanzi(for: phrase, scriptMode: entry.scriptMode))
                    .font(.system(size: 20, weight: .semibold))
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                Text("HSK \(phrase.hskLevel)")
                    .font(.system(size: 9, weight: .medium))
                    .widgetAccentable()
            }
            .padding(4)
            .containerBackground(.clear, for: .widget)
        )
    }
}

@available(iOS 16.0, *)
private struct AccessoryInlineView: View {
    let entry: PhraseEntry

    var body: some View {
        Group {
            if let phrase = entry.phrase {
                Text("\(hanzi(for: phrase, scriptMode: entry.scriptMode))  ·  \(phrase.pinyin)")
            } else {
                Text("Open Daily Hanzi")
            }
        }
        .containerBackground(.clear, for: .widget)
    }
}

#if DEBUG
private let previewPhrase = Phrase(
    id: "preview",
    simplified: "你好",
    traditional: "你好",
    pinyin: "Nǐ hǎo",
    definition: "Hello",
    hskLevel: 1
)

private let previewEntry = PhraseEntry(
    date: Date(),
    phrase: previewPhrase,
    scriptMode: "simplified",
    showPinyin: true,
    showDefinition: true,
    isFavorite: true,
    isLearned: false
)

@available(iOS 16.0, *)
#Preview("Lock Screen — Rectangular", as: .accessoryRectangular) {
    DailyHanziWidget()
} timeline: {
    previewEntry
}

@available(iOS 16.0, *)
#Preview("Lock Screen — Circular", as: .accessoryCircular) {
    DailyHanziWidget()
} timeline: {
    previewEntry
}

@available(iOS 16.0, *)
#Preview("Lock Screen — Inline", as: .accessoryInline) {
    DailyHanziWidget()
} timeline: {
    previewEntry
}
#endif
