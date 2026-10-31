import UIKit
import Capacitor
import HealthKit

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

// MARK: - PERSONAL BUILD ONLY (branch: personal-healthkit) — do not merge into main.
// Reads Apple Watch ECG recordings from Apple Health (read-only). The shared
// health plugin does not support ECG, so this small local plugin does.

@objc(EcgPlugin)
public class EcgPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EcgPlugin"
    public let jsName = "Ecg"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "list", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "waveform", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()
    private let ecgType = HKObjectType.electrocardiogramType()

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device")
            return
        }
        healthStore.requestAuthorization(toShare: nil, read: [ecgType]) { success, error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve(["granted": success])
            }
        }
    }

    @objc func list(_ call: CAPPluginCall) {
        let limit = call.getInt("limit") ?? 30
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: ecgType, predicate: nil, limit: limit, sortDescriptors: [sort]) { _, samples, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            let iso = ISO8601DateFormatter()
            let bpm = HKUnit.count().unitDivided(by: HKUnit.minute())
            let items: [[String: Any]] = (samples as? [HKElectrocardiogram] ?? []).map { ecg in
                var item: [String: Any] = [
                    "id": ecg.uuid.uuidString,
                    "startDate": iso.string(from: ecg.startDate),
                    "classification": EcgPlugin.classificationName(ecg.classification),
                    "symptoms": ecg.symptomsStatus == .present,
                    "sourceName": ecg.sourceRevision.source.name
                ]
                if let hr = ecg.averageHeartRate?.doubleValue(for: bpm) { item["averageHeartRate"] = hr }
                return item
            }
            call.resolve(["items": items])
        }
        healthStore.execute(query)
    }

    /// Voltage samples (microvolts, lead I) for one recording, downsampled by `step`.
    @objc func waveform(_ call: CAPPluginCall) {
        guard let idString = call.getString("id"), let uuid = UUID(uuidString: idString) else {
            call.reject("Missing or invalid id")
            return
        }
        let step = max(1, call.getInt("step") ?? 4)
        let predicate = HKQuery.predicateForObject(with: uuid)
        let lookup = HKSampleQuery(sampleType: ecgType, predicate: predicate, limit: 1, sortDescriptors: nil) { [weak self] _, samples, error in
            guard let self = self else { return }
            guard let ecg = samples?.first as? HKElectrocardiogram else {
                call.reject(error?.localizedDescription ?? "Recording not found")
                return
            }
            let microvolts = HKUnit.voltUnit(with: .micro)
            var values: [Double] = []
            values.reserveCapacity(ecg.numberOfVoltageMeasurements / step + 1)
            var index = 0
            let voltageQuery = HKElectrocardiogramQuery(ecg) { _, result in
                switch result {
                case .measurement(let measurement):
                    if index % step == 0,
                       let v = measurement.quantity(for: .appleWatchSimilarToLeadI)?.doubleValue(for: microvolts) {
                        values.append(v)
                    }
                    index += 1
                case .done:
                    let hz = ecg.samplingFrequency?.doubleValue(for: HKUnit.hertz()) ?? 512
                    call.resolve(["values": values, "samplingFrequency": hz / Double(step)])
                case .error(let error):
                    call.reject(error.localizedDescription)
                @unknown default:
                    break
                }
            }
            self.healthStore.execute(voltageQuery)
        }
        healthStore.execute(lookup)
    }

    static func classificationName(_ c: HKElectrocardiogram.Classification) -> String {
        switch c {
        case .sinusRhythm: return "sinusRhythm"
        case .atrialFibrillation: return "atrialFibrillation"
        case .inconclusiveLowHeartRate: return "inconclusiveLowHeartRate"
        case .inconclusiveHighHeartRate: return "inconclusiveHighHeartRate"
        case .inconclusivePoorReading: return "inconclusivePoorReading"
        case .inconclusiveOther: return "inconclusiveOther"
        case .unrecognized: return "unrecognized"
        case .notSet: return "notSet"
        @unknown default: return "unknown"
        }
    }
}

/// Bridge view controller that registers the local ECG plugin.
class DawaaBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(EcgPlugin())
    }
}
