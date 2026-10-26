import AppIntents
import UIKit

// Siri and the Shortcuts app. Starting and stopping open Nuzzle so the feed is saved exactly as a tap
// would save it; asking about the last feed answers straight away from the copy the app keeps for Siri.

private func openNuzzle(_ path: String) async {
  guard let url = URL(string: "nuzzle://\(path)") else { return }
  await MainActor.run { UIApplication.shared.open(url) }
}

enum FeedSide: String, AppEnum {
  case left = "L"
  case right = "R"

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Side")
  static var caseDisplayRepresentations: [FeedSide: DisplayRepresentation] = [
    .left: "Left",
    .right: "Right",
  ]
}

struct StartFeedIntent: AppIntent {
  static var title: LocalizedStringResource = "Start a feed"
  static var description = IntentDescription("Starts timing a feed on the left or right.")
  static var openAppWhenRun = true

  @Parameter(title: "Side")
  var side: FeedSide

  static var parameterSummary: some ParameterSummary {
    Summary("Start a feed on the \(\.$side)")
  }

  func perform() async throws -> some IntentResult {
    await openNuzzle("action?do=\(side.rawValue)")
    return .result()
  }
}

struct StartLeftIntent: AppIntent {
  static var title: LocalizedStringResource = "Start on the left"
  static var openAppWhenRun = true
  func perform() async throws -> some IntentResult {
    await openNuzzle("action?do=L")
    return .result()
  }
}

struct StartRightIntent: AppIntent {
  static var title: LocalizedStringResource = "Start on the right"
  static var openAppWhenRun = true
  func perform() async throws -> some IntentResult {
    await openNuzzle("action?do=R")
    return .result()
  }
}

struct StopFeedIntent: AppIntent {
  static var title: LocalizedStringResource = "Stop and save the feed"
  static var openAppWhenRun = true
  func perform() async throws -> some IntentResult {
    await openNuzzle("action?do=done")
    return .result()
  }
}

struct LastFeedIntent: AppIntent {
  static var title: LocalizedStringResource = "When was the last feed"
  static var description = IntentDescription("Says how long ago the last feed started and which side to start on.")

  private struct Glance: Decodable {
    let name: String
    let lastStart: Double
    let lastLine: String
    let next: String
    let feeding: String
    let timerFrom: Double
    let pausedAt: Double
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    guard
      let json = UserDefaults(suiteName: "group.com.quickquotegroup.nuzzle")?.string(forKey: "nuzzle.glance"),
      let g = try? JSONDecoder().decode(Glance.self, from: Data(json.utf8))
    else {
      return .result(dialog: "Open Nuzzle once, then ask again.")
    }
    let words = DateComponentsFormatter()
    words.unitsStyle = .full
    words.allowedUnits = [.hour, .minute]
    let now = Date().timeIntervalSince1970 * 1000
    if !g.feeding.isEmpty {
      let fed = (g.pausedAt > 0 ? g.pausedAt : now) - g.timerFrom
      let span = words.string(from: max(60, fed / 1000)) ?? ""
      return .result(dialog: "\(g.feeding), for \(span) so far.")
    }
    if g.lastStart <= 0 {
      return .result(dialog: "There are no feeds yet.")
    }
    let since = (now - g.lastStart) / 1000
    let ago = since < 60 ? "just now" : "\(words.string(from: since) ?? "") ago"
    let next = g.next.isEmpty ? "" : " Next, start on the \(g.next.lowercased())."
    return .result(dialog: "\(g.name)'s last feed started \(ago). \(g.lastLine).\(next)")
  }
}

struct NuzzleShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: LastFeedIntent(),
      phrases: [
        "When was the last feed in \(.applicationName)",
        "Last feed in \(.applicationName)",
        "Which side in \(.applicationName)",
      ]
    )
    AppShortcut(
      intent: StartLeftIntent(),
      phrases: ["Start left in \(.applicationName)", "Start a feed on the left in \(.applicationName)"]
    )
    AppShortcut(
      intent: StartRightIntent(),
      phrases: ["Start right in \(.applicationName)", "Start a feed on the right in \(.applicationName)"]
    )
    AppShortcut(
      intent: StopFeedIntent(),
      phrases: ["Stop the feed in \(.applicationName)", "Save the feed in \(.applicationName)"]
    )
  }
}
