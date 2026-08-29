import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadCategories, loadPoints, type Category } from "@/lib/tabito";

export const Route = createFileRoute("/")({
  component: Welcome,
  head: () => ({
    meta: [
      { title: "TABITO Travel Guide — Welcome to Tanganyika e-Bridge Tours" },
      {
        name: "description",
        content:
          "Welcome to TABITO. Explore attractions, historical monuments, cultural centres, bus stations and flight ticket offices with a live GPS travel companion.",
      },
      { property: "og:title", content: "Welcome to TABITO Tours" },
      {
        property: "og:description",
        content:
          "A complete tourist guide by Tanganyika e-Bridge International Tours: curated points, photos, stories and live guidance.",
      },
    ],
  }),
});

function Welcome() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    void loadCategories().then(setCategories).catch(() => setCategories([]));
    void loadPoints()
      .then((pts) => {
        const c: Record<string, number> = {};
        for (const p of pts) c[p.categoryId] = (c[p.categoryId] ?? 0) + 1;
        setCounts(c);
      })
      .catch(() => setCounts({}));
  }, []);

  return (
    <div>
      <section className="sea-gradient text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-lagoon">
              Karibu · Welcome
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              A word of welcome from{" "}
              <span className="bg-gradient-to-r from-lagoon to-sun bg-clip-text text-transparent">
                TABITO
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
              We are <strong className="text-white">Tanganyika e-Bridge International
              Tours</strong>. From the shores of Lake Tanganyika to every corner of the
              region, our mission is simple: to be the bridge between you and the places,
              people and stories worth travelling for. This guide gathers our curated
              attractions, historic monuments, cultural houses, road stations and flight
              ticket desks — and walks beside you, live, while you travel.
            </p>
            <p className="mt-4 max-w-2xl text-sm text-lagoon">
              Travel well, travel curious. Our team is with you at every stop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/guide"
                className="rounded-full bg-sunset px-6 py-3 font-semibold text-white shadow-sea transition-transform hover:-translate-y-0.5"
              >
                Explore the guide
              </Link>
              <Link
                to="/live"
                className="rounded-full border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/20"
              >
                Start live tracking
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 -z-0 rounded-full bg-lagoon/25 blur-3xl" />
            <img
              src="/tabito-logo.png"
              alt="TABITO — Tanganyika e-Bridge International Tours logo"
              className="relative z-10 w-full rounded-3xl bg-white/95 p-4 shadow-sea"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">What you can explore</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every category below is maintained by the TABITO team. Tourist services appear
          automatically around you as you travel — they are never added by hand.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/guide"
              search={{ cat: c.id }}
              className="surface group p-5 transition-transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-3xl">{c.icon}</span>
                {c.live ? (
                  <span className="rounded-full bg-lagoon/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lagoon-deep">
                    Live
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {counts[c.id] ?? 0} point{(counts[c.id] ?? 0) === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy">{c.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.live
                  ? "Hotels, restaurants, banks, pharmacies and more, detected around your position."
                  : "Curated stops with photos and the story of what happens there."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="surface grid gap-6 p-8 sm:grid-cols-3">
          {[
            {
              t: "Curated by our guides",
              d: "Each point carries up to five photos and a description of what takes place there.",
            },
            {
              t: "Live companion",
              d: "Turn on GPS and TABITO alerts you when a listed site is within your chosen radius.",
            },
            {
              t: "Works offline",
              d: "Your guide data stays on your device, so it keeps working in low-network areas.",
            },
          ].map((f) => (
            <div key={f.t}>
              <div className="h-1 w-12 rounded-full rainbow-rule" />
              <h3 className="mt-4 font-display text-lg font-bold text-navy">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
