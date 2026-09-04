import { supabase } from "@/integrations/supabase/client";

export type MessageStatus = "new" | "read" | "handled";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  body: string;
  status: MessageStatus;
  internalNote: string | null;
  createdAt: number;
};

export type NewMessage = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  body: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateMessage(input: NewMessage): string | null {
  const name = input.name.trim();
  const email = input.email.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (name.length < 2 || name.length > 100) return "Please enter your name (2–100 characters).";
  if (!EMAIL_RE.test(email) || email.length > 255) return "Please enter a valid email address.";
  if ((input.phone ?? "").length > 40) return "Phone number is too long.";
  if (subject.length < 2 || subject.length > 150) return "Please enter a subject (2–150 characters).";
  if (body.length < 5 || body.length > 2000) return "Please write your message (5–2000 characters).";
  return null;
}

export async function sendMessage(input: NewMessage) {
  const problem = validateMessage(input);
  if (problem) throw new Error(problem);
  const { error } = await supabase.from("messages").insert({
    name: input.name.trim().slice(0, 100),
    email: input.email.trim().slice(0, 255),
    phone: input.phone?.trim().slice(0, 40) || null,
    subject: input.subject.trim().slice(0, 150),
    body: input.body.trim().slice(0, 2000),
  });
  if (error) throw error;
}

export async function loadMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    subject: m.subject,
    body: m.body,
    status: m.status as MessageStatus,
    internalNote: m.internal_note,
    createdAt: new Date(m.created_at).getTime(),
  }));
}

export async function setMessageStatus(id: string, status: MessageStatus) {
  const { error } = await supabase.from("messages").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function saveMessageNote(id: string, note: string) {
  const { error } = await supabase
    .from("messages")
    .update({ internal_note: note.slice(0, 2000) || null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMessage(id: string) {
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) throw error;
}

/** Opens the staff member's own mail app with a pre-filled reply. */
export function replyMailto(m: ContactMessage): string {
  const subject = `Re: ${m.subject}`;
  const bodyText = `\n\n---\nOn ${new Date(m.createdAt).toLocaleString()} ${m.name} wrote:\n${m.body}`;
  return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(bodyText)}`;
}
