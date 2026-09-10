import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TabitoMap } from "@/components/TabitoMap";
import {
  ACCESS_TYPES,
  loadCategories,
  loadPoints,
  type Category,
  type TourPoint,
} from "@/lib/tabito";

type Search = { cat?: string | undefined };

export const Route = createFileRoute("/guide")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    cat: typeof search["cat"] === "string" ? (search["cat"] as string) : undefined,
  }),
  component: Guide,
  head: () => ({
    meta: [
      { title: "TABITO travel Guide — Attractions, Monuments & Cultural Sites" },
      {
        name: "description",
        content:
          "Browse the TABITO travel guide: tourist attractions, historical monuments, cultural centres, bus stations and flight ticket offices, each with photos and descriptions.",
      },
      { property: "og:title", content: "TABITO travel Guide — Places worth travelling for" },
      {
        property: "og:description",
        content:
          "Curated tourist points with photos, descriptions and map locations across the Tanganyika region.",
      },
    ],
  }),
});

function Guide() {
  const { cat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [points, setPoints] = useState<TourPoint[]>([]);
  const [open, setOpen] = useState<TourPoint | null>(null);
  const [shot, setShot] = useState(0);

  useEffect(() => {
    void loadCategories().then(setCategories).catch(() => setCategories([]));
    void loadPoints().then(setPoints).catch(() => setPoints([]));
  }, []);

  const visible = useMemo(
    () => (cat ? points.filter((p) => p.categoryId === cat) : points),
    [points, cat],
  );

  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const liveCategory = cat ? catById[cat]?.live : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-navy sm:text-4xl">
        The TABITO travel Guide
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Places our guides recommend, with photos and what actually happens there.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => navigate({ search: {} })}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            !cat ? "bg-navy text-white" : "bg-muted text-navy hover:bg-lagoon/30"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate({ search: { cat: c.id } })}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              cat === c.id ? "bg-navy text-white" : "bg-muted text-navy hover:bg-lagoon/30"
            }`}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {liveCategory && (
        <div className="mt-6 rounded-xl border border-lagoon/50 bg-lagoon/15 p-4 text-sm">
          Tourist services are not entered by hand — they are detected around you while you
          travel.{" "}
          <Link to="/live" className="font-semibold text-lagoon-deep underline">
            Open the live tracker
          </Link>
          .
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {visible.length === 0 ? (
            <div className="surface p-10 text-center text-muted-foreground">
              No points published in this category yet. An administrator can add them from
              the{" "}
              <Link to="/admin" className="font-semibold text-navy underline">
                Admin desk
              </Link>
              .
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {visible.map((p) => (
                <li key={p.id} className="surface overflow-hidden">
                  <button
                    onClick={() => {
                      setOpen(p);
                      setShot(0);
                    }}
                    className="w-full text-left"
                  >
                    {p.images[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        loading="lazy"
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center bg-muted text-4xl">
                        {catById[p.categoryId]?.icon ?? "📍"}
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-lagoon-deep">
                        {catById[p.categoryId]?.name ?? "Point"}
                      </p>
                      <h2 className="mt-1 font-display text-lg font-bold text-navy">
                        {p.name}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {p.description || "No description yet."}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <TabitoMap
            markers={visible.map((p) => ({
              id: p.id,
              name: p.name,
              icon: catById[p.categoryId]?.icon ?? "📍",
              lat: p.lat,
              lng: p.lng,
            }))}
            height={460}
          />
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/70 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-2xl bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-lagoon-deep">
                  {catById[open.categoryId]?.name}
                </p>
                <h3 className="font-display text-2xl font-bold text-navy">{open.name}</h3>
                {open.address && (
                  <p className="text-sm text-muted-foreground">{open.address}</p>
                )}
              </div>
              <button
                onClick={() => setOpen(null)}
                className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {open.images.length > 0 && (
              <div className="mt-4">
                <img
                  src={open.images[shot]}
                  alt={`${open.name} photo ${shot + 1}`}
                  className="h-64 w-full rounded-xl object-cover"
                />
                {open.images.length > 1 && (
                  <div className="mt-2 flex gap-2">
                    {open.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setShot(i)}
                        className={`h-14 w-16 overflow-hidden rounded-lg border-2 ${
                          i === shot ? "border-sunset" : "border-transparent"
                        }`}
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
              {open.description || "No description yet."}
            </p>

            {open.narrativeGeneral && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-lagoon-deep">
                  General narrative
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {open.narrativeGeneral}
                </p>
              </div>
            )}
            {open.narrativeSeasonal && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-lagoon-deep">
                  Seasonal narrative
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {open.narrativeSeasonal}
                </p>
              </div>
            )}

            <dl className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {(
                [
                  ["Natural region / destination", open.region],
                  ["Municipality", open.municipality],
                  ["Administration / management", open.management],
                  [
                    "Access type",
                    open.accessTypes
                      .map((a) => ACCESS_TYPES.find((x) => x.value === a)?.label ?? a)
                      .join(", "),
                  ],
                  ["Access indication", open.accessNotes],
                  [
                    "From destination capital",
                    [
                      open.distDestKm != null ? `${open.distDestKm} km` : "",
                      open.distDestHours != null ? `${open.distDestHours} h` : "",
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  ],
                  [
                    "From Bujumbura",
                    [
                      open.distBujaKm != null ? `${open.distBujaKm} km` : "",
                      open.distBujaHours != null ? `${open.distBujaHours} h` : "",
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  ],
                  ["Site code / grade", open.siteCode],
                  ["TABITO merchant code", open.merchantCode],
                  ["Opening hours", open.openingHours],
                  ["Weather sensors", open.weatherSensors ? "Yes" : ""],
                  ["Prohibitions & precautions", open.restrictions],
                  ["Local guides / assistance", open.localContacts],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {k}
                    </dt>
                    <dd className="whitespace-pre-wrap text-sm">{v}</dd>
                  </div>
                ))}
            </dl>

            {open.mediaUrl && (
              <a
                href={open.mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm font-semibold text-lagoon-deep underline"
              >
                ▶ Watch the video
              </a>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
              <p className="font-mono text-xs text-muted-foreground">
                {open.lat.toFixed(5)}, {open.lng.toFixed(5)}
              </p>
              <WeatherPanel lat={open.lat} lng={open.lng} />
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${open.lat}&mlon=${open.lng}#map=17/${open.lat}/${open.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white"
            >
              Open in maps
            </a>

          </div>
        </div>
      )}
    </div>
  );
}
