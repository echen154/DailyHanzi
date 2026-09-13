import SwiftUI
import UIKit

/// Mirrors src/theme/colors.ts so the widget's accent color matches the
/// in-app palette in both light and dark mode without needing an asset
/// catalog color set.
extension Color {
    static let hanziAccent = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.435, green: 0.749, blue: 0.620, alpha: 1) // #6FBF9E
            : UIColor(red: 0.184, green: 0.435, blue: 0.373, alpha: 1) // #2F6F5E
    })

    static let hanziAccentSoft = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.118, green: 0.180, blue: 0.161, alpha: 1) // #1E2E29
            : UIColor(red: 0.894, green: 0.941, blue: 0.922, alpha: 1) // #E4F0EB
    })
}
