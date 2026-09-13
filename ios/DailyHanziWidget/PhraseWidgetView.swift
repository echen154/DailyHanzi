import SwiftUI
import WidgetKit

struct PhraseWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PhraseEntry

    var body: some View {
        Group {
            switch family {
            case .systemMedium:
                MediumPhraseView(entry: entry)
            case .systemLarge, .systemExtraLarge:
                LargePhraseView(entry: entry)
            default:
                SmallPhraseView(entry: entry)
            }
        }
        .background(Color(UIColor.systemBackground))
    }
}

private func hanzi(for phrase: Phrase, scriptMode: String) -> String {
    scriptMode == "traditional" ? phrase.traditional : phrase.simplified
}

private struct HskBadge: View {
    let level: Int

    var body: some View {
        Text("HSK \(level)")
            .font(.system(size: 11, weight: .bold))
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background(Capsule().fill(Color.hanziAccentSoft))
            .foregroundStyle(Color.hanziAccent)
    }
}

private struct PlaceholderView: View {
    var body: some View {
        Text("Open Daily Hanzi\nto get started")
            .font(.system(size: 13))
            .multilineTextAlignment(.center)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct SmallPhraseView: View {
    let entry: PhraseEntry

    var body: some View {
        guard let phrase = entry.phrase else {
            return AnyView(PlaceholderView())
        }
        return AnyView(
            VStack(spacing: 6) {
                Text(hanzi(for: phrase, scriptMode: entry.scriptMode))
                    .font(.system(size: 30, weight: .semibold))
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)

                if entry.showPinyin {
                    Text(phrase.pinyin)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.hanziAccent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                if entry.showDefinition {
                    Text(phrase.definition)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        )
    }
}

private struct MediumPhraseView: View {
    let entry: PhraseEntry

    var body: some View {
        guard let phrase = entry.phrase else {
            return AnyView(PlaceholderView())
        }
        return AnyView(
            HStack(alignment: .center, spacing: 18) {
                Text(hanzi(for: phrase, scriptMode: entry.scriptMode))
                    .font(.system(size: 40, weight: .semibold))
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: 6) {
                    HskBadge(level: phrase.hskLevel)

                    if entry.showPinyin {
                        Text(phrase.pinyin)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(Color.hanziAccent)
                            .lineLimit(1)
                    }

                    if entry.showDefinition {
                        Text(phrase.definition)
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(16)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        )
    }
}

private struct LargePhraseView: View {
    let entry: PhraseEntry

    var body: some View {
        guard let phrase = entry.phrase else {
            return AnyView(PlaceholderView())
        }
        return AnyView(
            VStack(spacing: 12) {
                HskBadge(level: phrase.hskLevel)

                Spacer()

                Text(hanzi(for: phrase, scriptMode: entry.scriptMode))
                    .font(.system(size: 48, weight: .semibold))
                    .minimumScaleFactor(0.5)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)

                if entry.showPinyin {
                    Text(phrase.pinyin)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Color.hanziAccent)
                        .multilineTextAlignment(.center)
                }

                Spacer()

                if entry.showDefinition {
                    Text(phrase.definition)
                        .font(.system(size: 16))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        )
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
    showDefinition: true
)

#Preview("Small", as: .systemSmall) {
    DailyHanziWidget()
} timeline: {
    previewEntry
}

#Preview("Medium", as: .systemMedium) {
    DailyHanziWidget()
} timeline: {
    previewEntry
}

#Preview("Large", as: .systemLarge) {
    DailyHanziWidget()
} timeline: {
    previewEntry
}
#endif
