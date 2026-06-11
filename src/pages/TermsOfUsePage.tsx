import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TermsOfUsePage() {
  const navigate = useNavigate();
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const Back = isRTL ? ChevronRight : ChevronLeft;

  const sections = ar
    ? [
        {
          h: "القبول بالشروط",
          body: (
            <p>
              باستخدامك لتطبيق <strong>دواء+</strong>، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا لم
              توافق على أي منها، يرجى عدم استخدام التطبيق.
            </p>
          ),
        },
        {
          h: "وصف الخدمة",
          body: (
            <>
              <p>دواء+ تطبيق لإدارة الصحة الشخصية يتيح لك:</p>
              <ul className="list-disc ps-6 space-y-1">
                <li>تنظيم قائمة الأدوية وجداول الجرعات وتذكيرها في الوقت المحدد</li>
                <li>تسجيل قراءات ضغط الدم ونبض القلب وعرض التقارير</li>
                <li>إدارة المواعيد الطبية مع تذكير مسبق</li>
                <li>حفظ نتائج التحاليل المُدخلة يدوياً ومتابعتها مع المعدلات المرجعية</li>
                <li>متابعة المخزون الدوائي والتنبيه عند انخفاضه</li>
              </ul>
            </>
          ),
        },
        {
          h: "الحساب وتسجيل الدخول",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>يمكن استخدام التطبيق كزائر دون حساب، مع حفظ البيانات محلياً</li>
              <li>عند إنشاء حساب وتسجيل الدخول، تتم مزامنة بياناتك سحابياً بين أجهزتك</li>
              <li>أنت مسؤول عن الحفاظ على سرية بيانات حسابك</li>
            </ul>
          ),
        },
        {
          h: "إخلاء المسؤولية الطبية",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>دواء+ أداة مساعدة لتنظيم الأدوية والقياسات، وليس بديلاً عن استشارة الطبيب أو الصيدلي</li>
              <li>يجب دائماً مراجعة المختص قبل البدء بأي دواء أو تعديل جرعته أو إيقافه</li>
              <li>لا نتحمل أي مسؤولية عن قرارات صحية تُتخذ بناءً على بيانات التطبيق وحدها</li>
              <li>التنبيهات قد تتأثر بإعدادات الجهاز أو نظام التشغيل، ولا نضمن وصولها في جميع الحالات</li>
            </ul>
          ),
        },
        {
          h: "مسؤولية المستخدم",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>أنت المسؤول الوحيد عن دقة البيانات المُدخلة (الأدوية، الجرعات، القراءات…)</li>
              <li>يجب التحقق من إعدادات التنبيهات والسماح بها من إعدادات الجهاز</li>
              <li>يجب استخدام التطبيق للأغراض الشخصية فقط</li>
            </ul>
          ),
        },
        {
          h: "حذف الحساب والبيانات",
          body: (
            <p>
              يمكنك في أي وقت حذف حسابك وجميع بياناتك بشكل نهائي من شاشة الإعدادات. عملية الحذف لا يمكن
              التراجع عنها.
            </p>
          ),
        },
        {
          h: "إخلاء الضمانات وحدود المسؤولية",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>يُقدَّم التطبيق "كما هو" دون أي ضمانات صريحة أو ضمنية بشأن الدقة أو الملاءمة لأي غرض معين</li>
              <li>لا نضمن خلو التطبيق من الأخطاء أو الانقطاع، ولا نضمن تسليم التنبيهات في جميع الظروف</li>
              <li>في أقصى حد يسمح به القانون، لا نتحمل المسؤولية عن أي أضرار مباشرة أو غير مباشرة أو عرضية أو تبعية ناتجة عن استخدام التطبيق</li>
              <li>الحد الأقصى لمسؤوليتنا الإجمالية في أي حال لا يتجاوز المبلغ المدفوع (إن وُجد) لاستخدام التطبيق</li>
            </ul>
          ),
        },
        {
          h: "القانون الحاكم وتسوية النزاعات",
          body: (
            <p>
              تخضع هذه الشروط لقوانين <strong>المملكة العربية السعودية</strong>، وتختص محاكم المملكة بالنظر في أي نزاع
              ينشأ عن استخدام التطبيق أو يتعلق بهذه الشروط.
            </p>
          ),
        },
        {
          h: "الملكية الفكرية",
          body: (
            <p>
              جميع حقوق الملكية الفكرية للتطبيق محفوظة. لا يجوز نسخ أو تعديل أو توزيع التطبيق أو أي جزء منه
              دون إذن كتابي مسبق.
            </p>
          ),
        },
        {
          h: "تعديل الشروط",
          body: (
            <p>
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. ستُنشر التعديلات على هذه الصفحة مع تحديث التاريخ.
            </p>
          ),
        },
        {
          h: "التواصل",
          body: (
            <p>
              لأي استفسارات حول شروط الاستخدام، يرجى زيارة{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                صفحة تواصل معنا
              </Link>
              .
            </p>
          ),
        },
      ]
    : [
        {
          h: "Acceptance of terms",
          body: (
            <p>
              By using <strong>Dawaa+</strong>, you agree to be bound by these terms. If you do not agree with
              any of them, please do not use the app.
            </p>
          ),
        },
        {
          h: "Service description",
          body: (
            <>
              <p>Dawaa+ is a personal health management app that lets you:</p>
              <ul className="list-disc ps-6 space-y-1">
                <li>Organize medications, dose schedules, and timely reminders</li>
                <li>Log blood pressure and heart rate readings and view reports</li>
                <li>Manage medical appointments with advance reminders</li>
                <li>Save manually entered lab results and track them against reference ranges</li>
                <li>Track medication stock and get alerts when it runs low</li>
              </ul>
            </>
          ),
        },
        {
          h: "Account & sign-in",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>The app can be used as a guest without an account, with data stored locally</li>
              <li>Creating an account and signing in syncs your data across devices via the cloud</li>
              <li>You are responsible for keeping your account credentials confidential</li>
            </ul>
          ),
        },
        {
          h: "Medical disclaimer",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>Dawaa+ is an aid for organizing medications and measurements, not a substitute for a doctor or pharmacist</li>
              <li>Always consult a qualified professional before starting, changing, or stopping any medication</li>
              <li>We accept no responsibility for health decisions made based on app data alone</li>
              <li>Notifications can be affected by device or OS settings and may not always be delivered</li>
            </ul>
          ),
        },
        {
          h: "User responsibility",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>You are solely responsible for the accuracy of entered data (medications, doses, readings…)</li>
              <li>You should verify notification settings and grant the required device permissions</li>
              <li>The app must be used for personal purposes only</li>
            </ul>
          ),
        },
        {
          h: "Account & data deletion",
          body: (
            <p>
              You can permanently delete your account and all data at any time from the Settings screen. This
              action cannot be undone.
            </p>
          ),
        },
        {
          h: "Disclaimer of warranties & limitation of liability",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>The app is provided "AS IS" without any warranties, express or implied, regarding accuracy or fitness for a particular purpose</li>
              <li>We do not warrant that the app will be error-free or uninterrupted, nor guarantee delivery of every notification</li>
              <li>To the maximum extent permitted by law, we are not liable for any direct, indirect, incidental, or consequential damages arising from use of the app</li>
              <li>Our total aggregate liability shall not exceed the amount paid (if any) for use of the app</li>
            </ul>
          ),
        },
        {
          h: "Governing law & dispute resolution",
          body: (
            <p>
              These terms are governed by the laws of the <strong>Kingdom of Saudi Arabia</strong>, and the courts
              of the Kingdom shall have exclusive jurisdiction over any dispute arising from use of the app
              or relating to these terms.
            </p>
          ),
        },
        {
          h: "Intellectual property",
          body: (
            <p>
              All intellectual property rights in the app are reserved. The app or any part of it may not be
              copied, modified, or distributed without prior written permission.
            </p>
          ),
        },
        {
          h: "Changes to terms",
          body: (
            <p>
              We reserve the right to modify these terms at any time. Updates will be posted on this page with
              a revised date.
            </p>
          ),
        },
        {
          h: "Contact",
          body: (
            <p>
              For any questions about these terms, please visit the{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                contact page
              </Link>
              .
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
            {ar ? "شروط الاستخدام" : "Terms of Use"}
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
