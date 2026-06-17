import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    static var pendingRoute: String?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if let shortcut = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            AppDelegate.pendingRoute = AppDelegate.route(for: shortcut.type)
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        AppDelegate.dispatchPendingRoute(window: window)
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        AppDelegate.pendingRoute = AppDelegate.route(for: shortcutItem.type)
        AppDelegate.dispatchPendingRoute(window: window)
        completionHandler(true)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if url.scheme == "dawaaplus" {
            let route = "/" + (url.host ?? "") + url.path
            AppDelegate.pendingRoute = route
            AppDelegate.dispatchPendingRoute(window: window)
            return true
        }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    static func route(for type: String) -> String {
        switch type {
        case "add-medication": return "/medications/add"
        case "blood-pressure": return "/blood-pressure"
        case "blood-sugar":    return "/blood-sugar"
        case "appointment":    return "/appointments"
        case "today-doses":    return "/"
        default:               return "/"
        }
    }

    static func dispatchPendingRoute(window: UIWindow?) {
        guard let route = pendingRoute else { return }
        guard let bridgeVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = bridgeVC.bridge?.webView else { return }
        let escaped = route.replacingOccurrences(of: "'", with: "\\'")
        let js = "window.dispatchEvent(new CustomEvent('app-shortcut', { detail: '\(escaped)' }))"
        // Delay slightly to ensure JS listener is registered after cold launch.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
        pendingRoute = nil
    }
}
