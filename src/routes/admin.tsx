import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TabitoMap } from "@/components/TabitoMap";
import type { LatLng } from "@/lib/geo";
import {
  checkAdminCredentials,
  DEFAULT_CATEGORIES,
  MAX_IMAGES,
  compressImage,
  exportData,
  importData,
  isAdmin,
  loadCategories,
  loadPoints,
  saveCategories,
  savePoints,
  setAdmin,
  type Category,
  type TourPoint,
} from "@/lib/tabito";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({
    meta: [
      { title: "TABITO Admin — Manage categories and tourist points" },
      {
        name: "description",
        content:
          "TABITO administration desk: create categories, capture coordinates live or by hand, and publish tourist points with up to five photos and a description.",
      },
      { property: "og:title", content: "TABITO Admin Desk" },
      {
        property: "og:description",
        content: "Manage the TABITO travel guide content: categories, points, photos.",
      },
    ],
  }),
});

const EMPTY_FORM = {
  id: "",
  categoryId: "attractions",
  name: "",
  description: "",
  address: "",
  lat: "",
  lng: "",
  images: [] as string[],
};

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [points, setPoints] = useState<TourPoint[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newCat, setNewCat] = useState({ name: "", icon: "📍" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const watchRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAuthed(isAdmin());
    setCategories(loadCategories());
    setPoints(loadPoints());
  }, []);

  useEffect(
    () => () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    },
    [],
  );

  const editableCategories = useMemo(() => categories.filter((c) => !c.live), [categories]);

  const persistCategories = (list: Category[]) => {
    setCategories(list);
    saveCategories(list);
  };
  const persistPoints = (list: TourPoint[]) => {
    setPoints(list);
    savePoints(list);
  };

  const toggleLive = useCallback(() => {
    if (live) {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setLive(false);
      return;
    }
    if (!("geolocation" in navigator)) {
      setErr("Geolocation is not available on this device.");
      return;
    }
    setErr(null);
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        setLive(true);
        setForm((f) => ({
          ...f,
          lat: p.coords.latitude.toFixed(6),
          lng: p.coords.longitude.toFixed(6),
        }));
      },
      (e) => {
        setErr(e.message || "GPS error");
        setLive(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
  }, [live]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);
    const room = MAX_IMAGES - form.images.length;
    if (room <= 0) {
      setErr(`Maximum ${MAX_IMAGES} photos per point.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    try {
      const encoded = await Promise.all(picked.map((f) => compressImage(f)));
      setForm((f) => ({ ...f, images: [...f.images, ...encoded].slice(0, MAX_IMAGES) }));
    } catch {
      setErr("One of the images could not be processed.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const submitPoint = () => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.name.trim()) return setErr("Give the point a name.");
    if (!form.description.trim())
      return setErr("Describe what happens at this point.");
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180)
      return setErr("Invalid coordinates. Use live capture, the map, or type them.");
    setErr(null);

    const point: TourPoint = {
      id: form.id || `pt-${Date.now()}`,
      categoryId: form.categoryId,
      name: form.name.trim().slice(0, 120),
      description: form.description.trim().slice(0, 2000),
      address: form.address.trim().slice(0, 200) || undefined,
      lat,
      lng,
      images: form.images.slice(0, MAX_IMAGES),
      createdAt: Date.now(),
    };
    const next = form.id
      ? points.map((p) => (p.id === form.id ? point : p))
      : [point, ...points];
    persistPoints(next);
    setForm(EMPTY_FORM);
    setMsg(form.id ? "Point updated." : "Point published.");
    setTimeout(() => setMsg(null), 2500);
  };

  if (!authed) {
    const signIn = () => {
      if (checkAdminCredentials(email, pass)) {
        setAdmin(true);
        setAuthed(true);
        setErr(null);
        setPass("");
      } else {
        setErr("Wrong email or password.");
      }
    };

    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <form
          className="surface p-8"
          onSubmit={(e) => {
            e.preventDefault();
            signIn();
          }}
        >
          <h1 className="font-display text-2xl font-bold text-navy">Admin sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your TABITO staff account to manage categories and publish points.
          </p>
          <label className="mt-5 block text-xs font-bold uppercase tracking-widest text-navy">
            Email
          </label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5"
          />
          <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-navy">
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5"
          />
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-navy px-5 py-3 font-semibold text-white"
          >
            Sign in
          </button>
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy">Admin desk</h1>
          <p className="text-muted-foreground">
            Categories, coordinates, photos and descriptions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const blob = new Blob([exportData()], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "tabito-guide.json";
              a.click();
            }}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold"
          >
            ⭳ Export
          </button>
          <label className="cursor-pointer rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold">
            ⭱ Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  importData(await f.text());
                  setCategories(loadCategories());
                  setPoints(loadPoints());
                  setMsg("Guide data imported.");
                } catch {
                  setErr("Invalid backup file.");
                }
              }}
            />
          </label>
          <button
            onClick={() => {
              setAdmin(false);
              setAuthed(false);
            }}
            className="rounded-full bg-muted px-4 py-2 text-sm font-semibold"
          >
            Lock
          </button>
        </div>
      </div>

      {msg && (
        <div className="mt-5 rounded-xl border border-palm/40 bg-palm/15 p-3 text-sm">
          {msg}
        </div>
      )}
      {err && (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {/* Categories */}
      <section className="surface mt-8 p-6">
        <h2 className="font-display text-xl font-bold text-navy">Categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm font-semibold"
            >
              {c.icon} {c.name}
              {c.live && (
                <span className="rounded-full bg-lagoon/40 px-2 py-0.5 text-[10px] uppercase">
                  live
                </span>
              )}
              {!c.builtin && (
                <button
                  onClick={() => {
                    persistCategories(categories.filter((x) => x.id !== c.id));
                    persistPoints(points.filter((p) => p.categoryId !== c.id));
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${c.name}`}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <input
            value={newCat.icon}
            onChange={(e) => setNewCat((c) => ({ ...c, icon: e.target.value.slice(0, 3) }))}
            className="w-16 rounded-lg border border-input bg-background px-3 py-2 text-center"
            aria-label="Category icon"
          />
          <input
            value={newCat.name}
            onChange={(e) => setNewCat((c) => ({ ...c, name: e.target.value }))}
            placeholder="New category name"
            className="min-w-56 flex-1 rounded-lg border border-input bg-background px-4 py-2"
          />
          <button
            onClick={() => {
              const name = newCat.name.trim();
              if (!name) return setErr("Category name required.");
              persistCategories([
                ...categories,
                {
                  id: `cat-${Date.now()}`,
                  name: name.slice(0, 60),
                  icon: newCat.icon || "📍",
                },
              ]);
              setNewCat({ name: "", icon: "📍" });
              setErr(null);
            }}
            className="rounded-full bg-navy px-5 py-2.5 font-semibold text-white"
          >
            + Add category
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tourist Services is a live category: its content is detected automatically as
          travellers move, so no points are added to it by hand.
        </p>
      </section>

      {/* Point editor */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="surface p-6">
          <h2 className="font-display text-xl font-bold text-navy">
            {form.id ? "Edit point" : "New point"}
          </h2>

          <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-navy">
            Category
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5"
          >
            {editableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>

          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Point name"
            className="mt-4 w-full rounded-lg border border-input bg-background px-4 py-2.5"
          />
          <input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Address / area (optional)"
            className="mt-3 w-full rounded-lg border border-input bg-background px-4 py-2.5"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What happens at this place? Activities, history, opening hours…"
            rows={5}
            className="mt-3 w-full rounded-lg border border-input bg-background px-4 py-2.5"
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <input
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
              placeholder="latitude"
              inputMode="decimal"
              className="rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm"
            />
            <input
              value={form.lng}
              onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
              placeholder="longitude"
              inputMode="decimal"
              className="rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={toggleLive}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                live ? "bg-sunset text-white" : "bg-muted text-navy"
              }`}
            >
              {live ? "● Live capture ON" : "📡 Capture my position live"}
            </button>
            <button
              onClick={() =>
                navigator.geolocation.getCurrentPosition(
                  (p) =>
                    setForm((f) => ({
                      ...f,
                      lat: p.coords.latitude.toFixed(6),
                      lng: p.coords.longitude.toFixed(6),
                    })),
                  (e) => setErr(e.message),
                  { enableHighAccuracy: true },
                )
              }
              className="rounded-full bg-muted px-4 py-2 text-sm font-semibold text-navy"
            >
              📍 Use current position once
            </button>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-widest text-navy">
              Photos ({form.images.length}/{MAX_IMAGES})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="h-20 w-24 rounded-lg object-cover" />
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        images: f.images.filter((_, j) => j !== i),
                      }))
                    }
                    className="absolute -right-2 -top-2 rounded-full bg-destructive px-2 text-xs text-white"
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {form.images.length < MAX_IMAGES && (
                <label className="flex h-20 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border text-2xl text-muted-foreground">
                  +
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={submitPoint}
              className="rounded-full bg-sunset px-6 py-3 font-semibold text-white shadow-lift"
            >
              {form.id ? "✓ Save changes" : "✓ Publish point"}
            </button>
            {form.id && (
              <button
                onClick={() => setForm(EMPTY_FORM)}
                className="rounded-full bg-muted px-5 py-3 font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <TabitoMap
            position={
              Number.isFinite(Number(form.lat)) && form.lat !== ""
                ? ({ lat: Number(form.lat), lng: Number(form.lng) } as LatLng)
                : null
            }
            markers={points.map((p) => ({
              id: p.id,
              name: p.name,
              icon: categories.find((c) => c.id === p.categoryId)?.icon ?? "📍",
              lat: p.lat,
              lng: p.lng,
            }))}
            height={340}
            onPick={(pos) =>
              setForm((f) => ({
                ...f,
                lat: pos.lat.toFixed(6),
                lng: pos.lng.toFixed(6),
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Tip: click anywhere on the map to drop the coordinates into the form.
          </p>

          <div className="surface p-5">
            <h3 className="font-display text-lg font-bold text-navy">
              Published points ({points.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {points.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {categories.find((c) => c.id === p.categoryId)?.name} ·{" "}
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)} · {p.images.length} 📷
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() =>
                        setForm({
                          id: p.id,
                          categoryId: p.categoryId,
                          name: p.name,
                          description: p.description,
                          address: p.address ?? "",
                          lat: String(p.lat),
                          lng: String(p.lng),
                          images: p.images,
                        })
                      }
                      className="rounded-full bg-card px-3 py-1 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => persistPoints(points.filter((x) => x.id !== p.id))}
                      className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {points.length === 0 && (
                <li className="text-sm text-muted-foreground">No points yet.</li>
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
