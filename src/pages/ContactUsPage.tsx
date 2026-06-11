import { ChevronLeft, ChevronRight, MessageCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mbdeyvrp";

export default function ContactUsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, isRTL } = useLanguage();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tx = {
    title: lang === "ar" ? "تواصل معنا" : "Contact us",
    heading: lang === "ar" ? "نسعد بتواصلكم" : "We're glad to hear from you",
    intro:
      lang === "ar"
        ? "شاركنا اقتراحاتك أو ملاحظاتك حول تطبيق دواء+. نقرأ كل رسالة ونحرص على الرد في أقرب وقت."
        : "Share your suggestions or feedback about Dawaa+. We read every message and reply as soon as possible.",
    emailLabel: lang === "ar" ? "البريد الإلكتروني" : "Email",
    msgLabel: lang === "ar" ? "اقتراحك أو ملاحظتك" : "Your suggestion or note",
    msgPh: lang === "ar" ? "اكتب رسالتك هنا..." : "Write your message here...",
    send: lang === "ar" ? "إرسال" : "Send",
    sending: lang === "ar" ? "جاري الإرسال..." : "Sending...",
    needMsg: lang === "ar" ? "الرجاء كتابة رسالتك" : "Please write your message",
    success: lang === "ar" ? "تم إرسال اقتراحك بنجاح، شكراً لك!" : "Your message was sent. Thank you!",
    failed: lang === "ar" ? "تعذر الإرسال، حاول مرة أخرى" : "Failed to send. Please try again",
  };

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error(tx.needMsg);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, message }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(tx.success);
      setMessage("");
    } catch {
      toast.error(tx.failed);
    } finally {
      setSubmitting(false);
    }
  };

  const Back = isRTL ? ChevronRight : ChevronLeft;

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
          <h1 className="text-xl font-bold text-foreground">{tx.title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle size={24} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">{tx.heading}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{tx.intro}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground block">
                {tx.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-semibold text-foreground block">
                {tx.msgLabel}
              </label>
              <textarea
                id="message"
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={tx.msgPh}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              <Send size={16} />
              {submitting ? tx.sending : tx.send}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
