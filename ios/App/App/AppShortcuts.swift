import Foundation
#if canImport(AppIntents)
import AppIntents
import UIKit

// MARK: - App Intents (iOS 16+) — exposes app actions to Siri and the Shortcuts app.

@available(iOS 16.0, *)
struct OpenAddMedicationIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Medication"
    static var description = IntentDescription("Open the Add Medication screen in Dawaa+")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        AppDelegate.pendingRoute = "/medications/add"
        AppDelegate.dispatchPendingRoute(window: UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.windows.first }.first)
        return .result()
    }
}

@available(iOS 16.0, *)
struct LogBloodPressureIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Blood Pressure"
    static var description = IntentDescription("Open the Blood Pressure screen in Dawaa+")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        AppDelegate.pendingRoute = "/blood-pressure"
        AppDelegate.dispatchPendingRoute(window: UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.windows.first }.first)
        return .result()
    }
}

@available(iOS 16.0, *)
struct LogBloodSugarIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Blood Sugar"
    static var description = IntentDescription("Open the Blood Sugar screen in Dawaa+")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        AppDelegate.pendingRoute = "/blood-sugar"
        AppDelegate.dispatchPendingRoute(window: UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.windows.first }.first)
        return .result()
    }
}

@available(iOS 16.0, *)
struct TodayDosesIntent: AppIntent {
    static var title: LocalizedStringResource = "Today's Doses"
    static var description = IntentDescription("Show today's medication doses in Dawaa+")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        AppDelegate.pendingRoute = "/"
        AppDelegate.dispatchPendingRoute(window: UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.windows.first }.first)
        return .result()
    }
}

@available(iOS 16.0, *)
struct AppointmentIntent: AppIntent {
    static var title: LocalizedStringResource = "Medical Appointment"
    static var description = IntentDescription("Open the Appointments screen in Dawaa+")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        AppDelegate.pendingRoute = "/appointments"
        AppDelegate.dispatchPendingRoute(window: UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.windows.first }.first)
        return .result()
    }
}

@available(iOS 16.0, *)
struct DawaaPlusShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenAddMedicationIntent(),
            phrases: [
                "Add medication in \(.applicationName)",
                "أضف دواء في \(.applicationName)"
            ],
            shortTitle: "Add Medication",
            systemImageName: "pills.fill"
        )
        AppShortcut(
            intent: LogBloodPressureIntent(),
            phrases: [
                "Log blood pressure in \(.applicationName)",
                "سجل ضغط في \(.applicationName)"
            ],
            shortTitle: "Log Blood Pressure",
            systemImageName: "heart.fill"
        )
        AppShortcut(
            intent: LogBloodSugarIntent(),
            phrases: [
                "Log blood sugar in \(.applicationName)",
                "سجل سكر في \(.applicationName)"
            ],
            shortTitle: "Log Blood Sugar",
            systemImageName: "drop.fill"
        )
        AppShortcut(
            intent: TodayDosesIntent(),
            phrases: [
                "Today's doses in \(.applicationName)",
                "جرعات اليوم في \(.applicationName)"
            ],
            shortTitle: "Today's Doses",
            systemImageName: "clock.fill"
        )
        AppShortcut(
            intent: AppointmentIntent(),
            phrases: [
                "Medical appointment in \(.applicationName)",
                "موعد طبي في \(.applicationName)"
            ],
            shortTitle: "Medical Appointment",
            systemImageName: "calendar"
        )
    }
}
#endif
