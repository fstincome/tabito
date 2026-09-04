import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadCategories, loadPoints, type Category } from "@/lib/tabito";
import { DEFAULT_HOME, loadHomeContent, type HomeContent } from "@/lib/homepage";
import { ContactForm } from "@/components/ContactForm";


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
  const [home, setHome] = useState<HomeContent>(DEFAULT_HOME);

  useEffect(() => {
    void loadHomeContent().then(setHome).catch(() => setHome(DEFAULT_HOME));
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
              {home.badge}
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              {home.titleLead}{" "}
              <span className="bg-gradient-to-r from-lagoon to-sun bg-clip-text text-transparent">
                {home.titleHighlight}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
              {home.welcome}
            </p>
            <p className="mt-4 max-w-2xl text-sm text-lagoon">
              {home.tagline}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/guide"
                className="rounded-full bg-sunset px-6 py-3 font-semibold text-white shadow-sea transition-transform hover:-translate-y-0.5"
              >
                {home.ctaPrimary}
              </Link>
              <Link
                to="/live"
                className="rounded-full border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/20"
              >
                {home.ctaSecondary}
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
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{home.exploreHeading}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {home.exploreIntro}
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
          {home.features.map((f) => (
            <div key={f.title}>
              <div className="h-1 w-12 rounded-full rainbow-rule" />
              <h3 className="mt-4 font-display text-lg font-bold text-navy">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <ContactForm />
      </section>

    </div>
  );
}
