import { createFileRoute } from "@tanstack/react-router";
import { Guide } from "./guide";

export const Route = createFileRoute("/favorites")({
  component: () => <Guide favoritesOnly />,
  head: () => ({
    meta: [
      { title: "My favorites — TABITO travel" },
      { name: "description", content: "Your saved TABITO tourist sites, ready for your next journey." },
      { property: "og:title", content: "My favorites — TABITO travel" },
      { property: "og:description", content: "Keep your favorite Tanganyika tourist sites together with TABITO travel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});