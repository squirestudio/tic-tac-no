import Foundation
import Capacitor
import FirebaseAnalytics

@objc(AnalyticsPlugin)
public class AnalyticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AnalyticsPlugin"
    public let jsName = "Analytics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "logEvent", returnType: CAPPluginReturnPromise)
    ]

    @objc func logEvent(_ call: CAPPluginCall) {
        guard let name = call.getString("name") else {
            call.reject("Event name required")
            return
        }
        let params = call.getObject("params")
        Analytics.logEvent(name, parameters: params)
        call.resolve()
    }
}
