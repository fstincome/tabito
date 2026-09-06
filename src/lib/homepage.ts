import { supabase } from "@/integrations/supabase/client";

/** Editable homepage copy — managed from the admin desk, read by everyone. */
export type HomeFeature = { title: string; text: string };

export type HomeContent = {
  badge: string;
  titleLead: string;
  titleHighlight: string;
  welcome: string;
  tagline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  exploreHeading: string;
  exploreIntro: string;
  features: HomeFeature[];
};

export const DEFAULT_HOME: HomeContent = {
  badge: "Karibu · Welcome",
  titleLead: "A word of welcome from",
  titleHighlight: "TABITO travel",
  welcome:
    "We are Tanganyika e-Bridge International Tours. From the shores of Lake Tanganyika to every corner of the region, our mission is simple: to be the bridge between you and the places, people and stories worth travelling for. This guide gathers our curated attractions, historic monuments, cultural houses, road stations and flight ticket desks — and walks beside you, live, while you travel.",
  tagline: "Travel well, travel curious. Our team is with you at every stop.",
  ctaPrimary: "Explore the guide",
  ctaSecondary: "Start live tracking",
  exploreHeading: "What you can explore",
  exploreIntro:
    "Every category below is maintained by the TABITO travel team. Tourist services appear automatically around you as you travel — they are never added by hand.",
  features: [
    {
      title: "Curated by our guides",
      text: "Each point carries up to five photos and a description of what takes place there.",
    },
    {
      title: "Live companion",
      text: "Turn on GPS and TABITO travel alerts you when a listed site is within your chosen radius.",
    },
    {
      title: "Works offline",
      text: "Your guide data stays on your device, so it keeps working in low-network areas.",
    },
  ],
};

const ROW_ID = "homepage";

export async function loadHomeContent(): Promise<HomeContent> {
  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) throw error;
  const saved = (data?.content ?? {}) as Partial<HomeContent>;
  const features =
    Array.isArray(saved.features) && saved.features.length
      ? saved.features.slice(0, 3).map((f, i) => ({
          title: f?.title ?? DEFAULT_HOME.features[i]?.title ?? "",
          text: f?.text ?? DEFAULT_HOME.features[i]?.text ?? "",
        }))
      : DEFAULT_HOME.features;
  return { ...DEFAULT_HOME, ...saved, features };
}

export async function saveHomeContent(content: HomeContent) {
  const { error } = await supabase
    .from("site_content")
    .upsert({ id: ROW_ID, content, updated_at: new Date().toISOString() });
  if (error) throw error;
}
