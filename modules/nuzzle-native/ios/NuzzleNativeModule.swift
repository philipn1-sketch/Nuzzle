import ExpoModulesCore
import WatchConnectivity

/// The app group shared with the widget and the Siri shortcuts.
let nuzzleGroup = "group.com.philipnader.nuzzleapp"
let glanceKey = "nuzzle.glance"

/**
 Two small jobs the app's JavaScript can't do by itself:
 - keep a copy of the latest feed where Siri and the Watch can read it
 - hand taps made on the Watch to the app, with the time they were made
 */
public class NuzzleNativeModule: Module {
  private let bridge = WatchBridge()

  public func definition() -> ModuleDefinition {
    Name("NuzzleNative")

    Events("onWatchAction")

    OnCreate {
      bridge.start()
    }

    // Taps are passed on only while the app is listening; before that they wait in the queue,
    // so one made while the iPhone app was closed is not lost.
    OnStartObserving {
      self.bridge.listen { [weak self] action in
        self?.sendEvent("onWatchAction", action)
      }
    }

    OnStopObserving {
      self.bridge.listen(nil)
    }

    /// Saves the latest feed for Siri and sends it to the Watch.
    Function("setGlance") { (json: String) in
      UserDefaults(suiteName: nuzzleGroup)?.set(json, forKey: glanceKey)
      self.bridge.send(json)
    }

    /// Watch taps that arrived while the app wasn't listening yet, oldest first. Clears them.
    Function("takePendingActions") { () -> [[String: Any]] in
      return self.bridge.takePending()
    }
  }
}

final class WatchBridge: NSObject, WCSessionDelegate {
  private var onAction: (([String: Any]) -> Void)?

  func listen(_ handler: (([String: Any]) -> Void)?) {
    lock.lock(); defer { lock.unlock() }
    onAction = handler
  }
  private var pending: [[String: Any]] = []
  private var lastSent = ""
  private let lock = NSLock()

  func start() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  func send(_ json: String) {
    guard WCSession.isSupported(), json != lastSent else { return }
    let session = WCSession.default
    guard session.activationState == .activated, session.isPaired, session.isWatchAppInstalled else { return }
    lastSent = json
    try? session.updateApplicationContext(["glance": json])
  }

  func takePending() -> [[String: Any]] {
    lock.lock(); defer { lock.unlock() }
    let out = pending
    pending = []
    return out
  }

  private func handle(_ message: [String: Any]) {
    guard let action = message["action"] as? String else { return }
    let at = (message["at"] as? Double) ?? Date().timeIntervalSince1970 * 1000
    let event: [String: Any] = ["action": action, "at": at]
    lock.lock()
    let handler = onAction
    if handler == nil { pending.append(event) }
    lock.unlock()
    handler?(event)
  }

  // MARK: WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if let json = UserDefaults(suiteName: nuzzleGroup)?.string(forKey: glanceKey) {
      lastSent = ""
      send(json)
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    // a new Watch was paired
    WCSession.default.activate()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handle(message)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    handle(message)
    replyHandler(["ok": true])
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    handle(userInfo)
  }
}
