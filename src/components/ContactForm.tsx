import { useState } from "react";
import { sendMessage } from "@/lib/messages";

const FIELD = "mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5";
const LABEL = "block text-xs font-bold uppercase tracking-widest text-navy";

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    body: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="surface p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setBusy(true);
        try {
          await sendMessage(form);
          setSent(true);
          setForm({ name: "", email: "", phone: "", subject: "", body: "" });
        } catch (e2) {
          setErr(e2 instanceof Error ? e2.message : "Your message could not be sent.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-display text-2xl font-bold text-navy">Write to TABITO</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask about a tour, a site or a booking. Our team answers by email.
      </p>

      {sent && (
        <div className="mt-5 rounded-xl border border-palm/40 bg-palm/15 p-3 text-sm">
          Thank you — your message reached the TABITO desk. We will reply to you by email.
        </div>
      )}
      {err && (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="cf-name">Full name</label>
          <input
            id="cf-name"
            className={FIELD}
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="cf-email">Email</label>
          <input
            id="cf-email"
            type="email"
            className={FIELD}
            required
            maxLength={255}
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="cf-phone">Phone (optional)</label>
          <input
            id="cf-phone"
            className={FIELD}
            maxLength={40}
            value={form.phone}
            onChange={(e) => set("phone")(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="cf-subject">Subject</label>
          <input
            id="cf-subject"
            className={FIELD}
            required
            maxLength={150}
            value={form.subject}
            onChange={(e) => set("subject")(e.target.value)}
          />
        </div>
      </div>

      <label className={`${LABEL} mt-4`} htmlFor="cf-body">Message</label>
      <textarea
        id="cf-body"
        className={FIELD}
        rows={5}
        required
        maxLength={2000}
        value={form.body}
        onChange={(e) => set("body")(e.target.value)}
      />

      <button
        type="submit"
        disabled={busy}
        className="mt-6 rounded-full bg-sunset px-6 py-3 font-semibold text-white shadow-sea transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
