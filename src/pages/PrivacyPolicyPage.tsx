import { useLanguage } from "@/contexts/LanguageContext";
import PageHeader from "@/components/PageHeader";

const PrivacyPolicyPage = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="pb-24">
      <PageHeader title={isRTL ? "سياسة الخصوصية" : "Privacy Policy"} showBack />
      <div className="px-4 space-y-4">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4 text-foreground text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold mb-2">{isRTL ? "مقدمة" : "Introduction"}</h2>
            <p>{isRTL
              ? "تطبيق Dawaa+ (دواء بلس) يحترم خصوصيتك بشكل كامل. هذا التطبيق لا يجمع أي بيانات ولا يرسلها لأي جهة خارجية. جميع بياناتك تبقى على جهازك فقط."
              : "Dawaa+ fully respects your privacy. This app does not collect any data and does not send it to any external party. All your data stays on your device only."
            }</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">{isRTL ? "تخزين البيانات" : "Data Storage"}</h2>
            <p>{isRTL
              ? "جميع البيانات التي تدخلها في التطبيق (الأدوية، قراءات ضغط الدم، المواعيد، التحاليل، الإعدادات) تُحفظ محلياً على جهازك فقط باستخدام ذاكرة المتصفح. لا يوجد خادم أو قاعدة بيانات سحابية. التطبيق لا يتصل بالإنترنت لإرسال أو استقبال بياناتك الشخصية."
              : "All data you enter in the app (medications, blood pressure readings, appointments, lab tests, settings) is stored locally on your device only using browser storage. There is no server or cloud database. The app does not connect to the internet to send or receive your personal data."
            }</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">{isRTL ? "لا نجمع بيانات" : "We Do Not Collect Data"}</h2>
            <p>{isRTL
              ? "التطبيق لا يجمع أي معلومات شخصية أو صحية أو تحليلات استخدام. لا نستخدم أي أدوات تتبع أو تحليلات أو إعلانات. خصوصيتك مضمونة بالكامل."
              : "The app does not collect any personal information, health data, or usage analytics. We do not use any tracking tools, analytics, or advertisements. Your privacy is fully guaranteed."
            }</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">{isRTL ? "الإشعارات" : "Notifications"}</h2>
            <p>{isRTL
              ? "يستخدم التطبيق الإشعارات المحلية فقط لتذكيرك بمواعيد أدويتك. هذه الإشعارات تعمل على جهازك ولا تمر عبر أي خادم خارجي. يمكنك تفعيلها أو تعطيلها في أي وقت."
              : "The app uses local notifications only to remind you of your medication schedules. These notifications run on your device and do not pass through any external server. You can enable or disable them at any time."
            }</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">{isRTL ? "حذف البيانات" : "Data Deletion"}</h2>
            <p>{isRTL
              ? "يمكنك حذف جميع بياناتك في أي وقت من خلال خيار 'حذف الحساب وجميع البيانات' في الإعدادات، أو بحذف التطبيق من جهازك. عند الحذف تُمسح جميع البيانات نهائياً ولا يمكن استرجاعها."
              : "You can delete all your data at any time through 'Delete Account & All Data' in Settings, or by deleting the app from your device. All data is permanently erased and cannot be recovered."
            }</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">{isRTL ? "التواصل معنا" : "Contact Us"}</h2>
            <p>{isRTL
              ? "إذا كان لديك أي استفسار حول سياسة الخصوصية، يرجى التواصل معنا عبر صفحة \"تواصل معنا\" داخل التطبيق."
              : "If you have any questions about this privacy policy, please reach us via the \"Contact us\" page inside the app."
            }</p>
          </section>

          <p className="text-muted-foreground text-xs pt-2">
            {isRTL ? "آخر تحديث: مارس 2026" : "Last updated: March 2026"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
