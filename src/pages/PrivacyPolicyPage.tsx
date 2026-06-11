import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const Back = isRTL ? ChevronRight : ChevronLeft;

  const sections = ar
    ? [
        {
          h: "مقدمة",
          body: (
            <p>
              مرحباً بكم في تطبيق <strong>دواء+</strong>. نحن نحترم خصوصيتكم ونلتزم بحماية بياناتكم الصحية والشخصية.
              توضح هذه السياسة كيف نجمع ونستخدم ونحمي معلوماتكم.
            </p>
          ),
        },
        {
          h: "الحساب وتسجيل الدخول",
          body: (
            <p>
              يدعم التطبيق الاستخدام كزائر دون حساب، أو إنشاء حساب وتسجيل الدخول لمزامنة بياناتكم بين أجهزتكم.
              نقوم بجمع بريدكم الإلكتروني وكلمة المرور (مُشفّرة) لأغراض المصادقة فقط.
            </p>
          ),
        },
        {
          h: "البيانات التي نجمعها",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>بيانات الحساب: البريد الإلكتروني</li>
              <li>قائمة الأدوية والجرعات والمواعيد والمخزون</li>
              <li>قراءات ضغط الدم ونبض القلب</li>
              <li>المواعيد الطبية والتحاليل المُدخلة يدوياً</li>
              <li>صور الأدوية (اختيارية، تُحفظ مشفّرة)</li>
              <li>إعدادات التطبيق والتفضيلات (اللغة، التنبيهات…)</li>
            </ul>
          ),
        },
        {
          h: "الكاميرا ومكتبة الصور",
          body: (
            <p>
              يستخدم التطبيق الكاميرا أو مكتبة الصور (باختياركم فقط) لإضافة صورة للدواء بهدف التعرف عليه بسهولة.
              تُحفظ الصور بشكل مشفّر ضمن بيانات حسابك، ولا تُستخدم لأي غرض آخر.
            </p>
          ),
        },
        {
          h: "كيفية تخزين البيانات",
          body: (
            <>
              <p>
                عند تسجيل الدخول، تُخزَّن بياناتكم بشكل آمن في قاعدة بيانات سحابية لتمكين المزامنة الفورية بين أجهزتكم.
                لا يستطيع أي مستخدم الوصول إلا إلى بياناته الخاصة فقط عبر سياسات أمان صارمة (Row-Level Security).
              </p>
              <p>
                في وضع الزائر، تُخزَّن جميع البيانات محلياً على جهازكم فقط، ويمكن ترحيلها لاحقاً إلى الحساب عند تسجيل الدخول.
              </p>
            </>
          ),
        },
        {
          h: "الخدمات الخارجية (أطراف ثالثة)",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li><strong>Supabase</strong>: مزوّد قاعدة البيانات السحابية والمصادقة. يلتزم بمعايير حماية البيانات الدولية (GDPR/SOC2).</li>
              
              <li><strong>Apple Push Notifications</strong>: لتسليم تنبيهات الأدوية على iOS.</li>
            </ul>
          ),
        },
        {
          h: "التنبيهات",
          body: (
            <p>
              يستخدم التطبيق التنبيهات المحلية فقط لتذكيركم بمواعيد الأدوية وقياسات الضغط والمواعيد الطبية.
              لا تُرسَل أي بيانات صحية مع التنبيهات، ويمكن إيقاف التنبيهات من شاشة الإعدادات في أي وقت.
            </p>
          ),
        },
        {
          h: "حماية البيانات",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>تشفير الاتصال بين التطبيق والخادم (HTTPS / TLS 1.3)</li>
              <li>عزل بيانات كل مستخدم عبر سياسات أمان على مستوى الصف (RLS)</li>
              <li>عدم مشاركة البيانات مع أي طرف ثالث لأغراض تسويقية أو إعلانية</li>
              <li>إمكانية حذف بياناتكم أو حسابكم بالكامل في أي وقت</li>
            </ul>
          ),
        },
        {
          h: "حقوقكم",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>الوصول إلى بياناتكم ومراجعتها داخل التطبيق</li>
              <li>تعديل أو حذف أي بيانات مُخزّنة</li>
              <li><strong>تصدير بياناتكم</strong> كملف PDF (التقارير، الأدوية، ضغط الدم، التحاليل) من شاشة التقارير</li>
              <li>طلب حذف الحساب وجميع البيانات المرتبطة به نهائياً من الإعدادات</li>
              <li>سحب الموافقة على أي إذن (الموقع، الكاميرا، التنبيهات) من إعدادات الجهاز</li>
            </ul>
          ),
        },
        {
          h: "إخلاء المسؤولية الطبية",
          body: (
            <p>
              تطبيق دواء+ أداة مساعدة لتنظيم الأدوية والقياسات فقط، ولا يُعتبر بديلاً عن استشارة الطبيب أو
              الصيدلي. يجب دائماً مراجعة المختص قبل اتخاذ أي قرار يتعلق بصحتكم أو علاجكم.
            </p>
          ),
        },
        {
          h: "التواصل",
          body: (
            <p>
              لأي استفسارات حول سياسة الخصوصية، يرجى التواصل عبر{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                صفحة تواصل معنا
              </Link>
              .
            </p>
          ),
        },
        {
          h: "تحديثات السياسة",
          body: (
            <p>
              قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ آخر تعديل.
            </p>
          ),
        },
      ]
    : [
        {
          h: "Introduction",
          body: (
            <p>
              Welcome to <strong>Dawaa+</strong>. We respect your privacy and are committed to protecting your
              health and personal data. This policy explains how we collect, use, and safeguard your information.
            </p>
          ),
        },
        {
          h: "Account & sign-in",
          body: (
            <p>
              The app supports guest use without an account, or creating an account to sync your data across
              devices. We collect your email and password (hashed) for authentication only.
            </p>
          ),
        },
        {
          h: "Data we collect",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>Account data: email address</li>
              <li>Medication list, doses, schedules, and stock</li>
              <li>Blood pressure and heart rate readings</li>
              <li>Medical appointments and manually entered lab results</li>
              <li>Optional medication photos (stored encrypted)</li>
              <li>App settings and preferences (language, notifications…)</li>
            </ul>
          ),
        },
        {
          h: "Camera & photo library",
          body: (
            <p>
              The app uses the camera or photo library (only when you choose) to attach a photo to a medication
              for easier identification. Photos are stored encrypted within your account data and are never used
              for any other purpose.
            </p>
          ),
        },
        {
          h: "How data is stored",
          body: (
            <>
              <p>
                When signed in, your data is securely stored in a cloud database to enable instant sync across
                your devices. Each user can only access their own data via strict Row-Level Security policies.
              </p>
              <p>
                In guest mode, all data stays local on your device and can later be migrated to your account on
                sign-in.
              </p>
            </>
          ),
        },
        {
          h: "Third-party services",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li><strong>Supabase</strong>: cloud database and authentication provider, compliant with GDPR/SOC2 standards.</li>
              <li><strong>Google Maps</strong>: opened only when you tap the nearby-facilities button; your coordinates are passed to Google Maps (not stored by us) and subject to Google's privacy policy.</li>
              <li><strong>Apple Push Notifications</strong>: used to deliver medication reminders on iOS.</li>
            </ul>
          ),
        },
        {
          h: "Notifications",
          body: (
            <p>
              The app uses local notifications only to remind you about medications, blood pressure
              measurements, and appointments. No health data is sent with the notifications, and notifications
              can be disabled from Settings at any time.
            </p>
          ),
        },
        {
          h: "Data protection",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>Encrypted communication between app and server (HTTPS / TLS 1.3)</li>
              <li>Per-user isolation via Row-Level Security policies</li>
              <li>No sharing of data with third parties for marketing or ads</li>
              <li>Ability to delete your data or full account at any time</li>
            </ul>
          ),
        },
        {
          h: "Your rights",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>Access and review your data inside the app</li>
              <li>Edit or delete any stored data</li>
              <li><strong>Export your data</strong> as a PDF report (medications, BP, lab results) from the Reports screen</li>
              <li>Request permanent deletion of your account and all related data from Settings</li>
              <li>Revoke any permission (location, camera, notifications) from your device settings</li>
            </ul>
          ),
        },
        {
          h: "Medical disclaimer",
          body: (
            <p>
              Dawaa+ is an aid for organizing medications and measurements only and is not a substitute for
              consultation with your doctor or pharmacist. Always consult a qualified professional before making
              any decision about your health or treatment.
            </p>
          ),
        },
        {
          h: "Contact",
          body: (
            <p>
              For any questions about this privacy policy, please reach us via the{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                contact page
              </Link>
              .
            </p>
          ),
        },
        {
          h: "Policy updates",
          body: (
            <p>
              We may update this policy from time to time. Any changes will be posted on this page along with an
              updated last-modified date.
            </p>
          ),
        },
      ];

  return (
    <div className="min-h-[100dvh] bg-background pb-28">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <Back size={20} />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            {ar ? "سياسة الخصوصية" : "Privacy Policy"}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6 text-sm leading-relaxed text-foreground">
        <p className="text-muted-foreground">
          {ar ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
        </p>
        {sections.map((s) => (
          <section key={s.h} className="space-y-2">
            <h2 className="text-lg font-bold">{s.h}</h2>
            {s.body}
          </section>
        ))}
      </main>
    </div>
  );
}
