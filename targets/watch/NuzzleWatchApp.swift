import SwiftUI
import WatchConnectivity

// Nuzzle on the Apple Watch: the time since the last feed, the side to start on, and Left, Right and Done.
// The iPhone keeps the feeds; the Watch shows the latest copy it was sent and passes taps back,
// with the time of each tap, so a feed starts when she tapped even if the phone hears a moment later.

struct Glance: Codable, Equatable {
  var name: String
  var lastStart: Double
  var lastLine: String
  var next: String
  var letter: String
  var feeding: String
  var timerFrom: Double
  var pausedAt: Double

  static let empty = Glance(name: "Baby", lastStart: 0, lastLine: "", next: "", letter: "", feeding: "", timerFrom: 0, pausedAt: 0)
}

enum Palette {
  static let bg = Color(red: 0x1A / 255, green: 0x12 / 255, blue: 0x21 / 255)
  static let surface = Color(red: 0x2A / 255, green: 0x1E / 255, blue: 0x33 / 255)
  static let ink = Color(red: 0xF4 / 255, green: 0xE9 / 255, blue: 0xEF / 255)
  static let muted = Color(red: 0xBB / 255, green: 0xA9 / 255, blue: 0xC2 / 255)
  static let left = Color(red: 0xEB / 255, green: 0xA3 / 255, blue: 0xB9 / 255)
  static let right = Color(red: 0xF4 / 255, green: 0xBC / 255, blue: 0x9C / 255)
}

final class PhoneLink: NSObject, ObservableObject, WCSessionDelegate {
  @Published var glance: Glance
  @Published var waiting = false

  private static let saved = "nuzzle.glance"

  override init() {
    if let data = UserDefaults.standard.data(forKey: Self.saved), let g = try? JSONDecoder().decode(Glance.self, from: data) {
      glance = g
    } else {
      glance = .empty
    }
    super.init()
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }

  func tap(_ action: String) {
    let message: [String: Any] = ["action": action, "at": Date().timeIntervalSince1970 * 1000]
    waiting = true
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(message, replyHandler: nil) { _ in
        // not reachable after all: queue it, it arrives when the phone wakes
        session.transferUserInfo(message)
      }
    } else {
      session.transferUserInfo(message)
    }
  }

  private func apply(_ context: [String: Any]) {
    guard let json = context["glance"] as? String, let g = try? JSONDecoder().decode(Glance.self, from: Data(json.utf8)) else { return }
    DispatchQueue.main.async {
      self.glance = g
      self.waiting = false
      if let data = try? JSONEncoder().encode(g) { UserDefaults.standard.set(data, forKey: Self.saved) }
    }
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    apply(session.receivedApplicationContext)
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    apply(applicationContext)
  }
}

struct SideButton: View {
  let label: String
  let color: Color
  let highlighted: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Text(label)
        .font(.system(size: 18, weight: .bold, design: .rounded))
        .frame(maxWidth: .infinity, minHeight: 44)
        .foregroundStyle(highlighted ? Palette.bg : Palette.ink)
        .background(RoundedRectangle(cornerRadius: 14).fill(highlighted ? color : Palette.surface))
    }
    .buttonStyle(.plain)
  }
}

struct ContentView: View {
  @EnvironmentObject var link: PhoneLink

  var body: some View {
    let g = link.glance
    let feeding = !g.feeding.isEmpty
    ScrollView {
      VStack(alignment: .leading, spacing: 8) {
        Text(g.name)
          .font(.system(size: 15, weight: .bold, design: .rounded))
          .foregroundStyle(Palette.ink)
        if feeding {
          Text(g.feeding)
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .foregroundStyle(g.letter == "L" ? Palette.left : Palette.right)
          Text(
            timerInterval: Date(timeIntervalSince1970: g.timerFrom / 1000)...Date(timeIntervalSince1970: g.timerFrom / 1000 + 86_400),
            pauseTime: g.pausedAt > 0 ? Date(timeIntervalSince1970: g.pausedAt / 1000) : nil,
            countsDown: false
          )
          .font(.system(size: 34, weight: .bold, design: .rounded).monospacedDigit())
          .foregroundStyle(Palette.ink)
        } else if g.lastStart > 0 {
          Text("Since the last feed started")
            .font(.system(size: 13, weight: .medium, design: .rounded))
            .foregroundStyle(Palette.muted)
          Text(Date(timeIntervalSince1970: g.lastStart / 1000), style: .relative)
            .font(.system(size: 22, weight: .bold, design: .rounded))
            .foregroundStyle(Palette.ink)
            .minimumScaleFactor(0.6)
          Text(g.lastLine)
            .font(.system(size: 13, weight: .medium, design: .rounded))
            .foregroundStyle(Palette.muted)
        } else {
          Text("No feeds yet")
            .font(.system(size: 15, weight: .medium, design: .rounded))
            .foregroundStyle(Palette.muted)
        }

        HStack(spacing: 8) {
          SideButton(label: "Left", color: Palette.left, highlighted: feeding ? g.letter == "L" : g.next == "Left") { link.tap("L") }
          SideButton(label: "Right", color: Palette.right, highlighted: feeding ? g.letter == "R" : g.next == "Right") { link.tap("R") }
        }
        if feeding {
          Button { link.tap("done") } label: {
            Text("Done")
              .font(.system(size: 18, weight: .bold, design: .rounded))
              .frame(maxWidth: .infinity, minHeight: 44)
              .foregroundStyle(Palette.bg)
              .background(RoundedRectangle(cornerRadius: 14).fill(Palette.muted))
          }
          .buttonStyle(.plain)
        }
        if link.waiting {
          Text("Sent to your iPhone")
            .font(.system(size: 12, weight: .medium, design: .rounded))
            .foregroundStyle(Palette.muted)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .background(Palette.bg)
  }
}

@main
struct NuzzleWatchApp: App {
  @StateObject private var link = PhoneLink()

  var body: some Scene {
    WindowGroup {
      ContentView().environmentObject(link)
    }
  }
}
