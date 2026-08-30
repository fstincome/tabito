import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TabitoMap } from "@/components/TabitoMap";
import type { LatLng } from "@/lib/geo";
import { useSession } from "@/hooks/useSession";
import {
  ACCESS_TYPES,
  MAX_IMAGES,
  compressImage,
  createCategory,
  deleteCategory,
  deletePoint,
  grantRole,
  loadCategories,
  loadPoints,
  loadStaff,
  revokeRole,
  savePoint,
  signIn,
  signOut,
  signUp,
  type AccessType,
  type AppRole,
  type Category,
  type StaffMember,
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
  categoryId: "",
  name: "",
  description: "",
  address: "",
  lat: "",
  lng: "",
  images: [] as string[],
  region: "",
  municipality: "",
  management: "",
  accessTypes: [] as AccessType[],
  accessNotes: "",
  distDestKm: "",
  distDestHours: "",
  distBujaKm: "",
  distBujaHours: "",
  siteCode: "",
  narrativeGeneral: "",
  narrativeSeasonal: "",
  mediaUrl: "",
  merchantCode: "",
  restrictions: "",
  weatherSensors: false,
  openingHours: "",
  localContacts: "",
};

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const FIELD =
  "mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5";
const LABEL =
  "mt-4 block text-xs font-bold uppercase tracking-widest text-navy";


function Admin() {
  const { user, isAdmin, isStaff, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [points, setPoints] = useState<TourPoint[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newCat, setNewCat] = useState({ name: "", icon: "📍" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const watchRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2800);
  };
  const fail = (e: unknown) =>
    setErr(e instanceof Error ? e.message : "Something went wrong.");

  const refresh = useCallback(async () => {
    try {
      const [cats, pts] = await Promise.all([loadCategories(), loadPoints()]);
      setCategories(cats);
      setPoints(pts);
      setForm((f) =>
        f.categoryId
          ? f
          : { ...f, categoryId: cats.find((c) => !c.live)?.id ?? "" },
      );
    } catch (e) {
      fail(e);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadStaff().then(setStaff).catch(() => setStaff([]));
  }, [isAdmin, msg]);

  useEffect(
    () => () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    },
    [],
  );

  const editableCategories = useMemo(
    () => categories.filter((c) => !c.live),
    [categories],
  );

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

  const submitPoint = async () => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.categoryId) return setErr("Choose a category.");
    if (!form.name.trim()) return setErr("Give the point a name.");
    if (!form.description.trim()) return setErr("Describe what happens at this point.");
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180)
      return setErr("Invalid coordinates. Use live capture, the map, or type them.");
    setErr(null);
    setBusy(true);
    try {
      await savePoint({
        ...(form.id ? { id: form.id } : {}),
        categoryId: form.categoryId,
        name: form.name.trim(),
        description: form.description.trim(),
        address: form.address.trim() || undefined,
        lat,
        lng,
        images: form.images,
        region: form.region,
        municipality: form.municipality,
        management: form.management,
        accessTypes: form.accessTypes,
        accessNotes: form.accessNotes,
        distDestKm: numOrNull(form.distDestKm),
        distDestHours: numOrNull(form.distDestHours),
        distBujaKm: numOrNull(form.distBujaKm),
        distBujaHours: numOrNull(form.distBujaHours),
        siteCode: form.siteCode,
        narrativeGeneral: form.narrativeGeneral,
        narrativeSeasonal: form.narrativeSeasonal,
        mediaUrl: form.mediaUrl,
        merchantCode: form.merchantCode,
        restrictions: form.restrictions,
        weatherSensors: form.weatherSensors,
        openingHours: form.openingHours,
        localContacts: form.localContacts,
      });

      const keepCat = form.categoryId;
      setForm({ ...EMPTY_FORM, categoryId: keepCat });
      await refresh();
      flash(form.id ? "Point updated." : "Point published.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- auth screens ---------------- */

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    const submit = async () => {
      setBusy(true);
      setErr(null);
      try {
        if (mode === "signin") await signIn(email, pass);
        else {
          await signUp(email, pass, fullName);
          flash("Account created. An admin must grant you access rights.");
        }
        setPass("");
      } catch (e) {
        fail(e);
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <form
          className="surface p-8"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h1 className="font-display text-2xl font-bold text-navy">
            {mode === "signin" ? "Staff sign in" : "Create a staff account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            TABITO staff accounts manage categories and publish tourist points.
          </p>

          {mode === "signup" && (
            <>
              <label className="mt-5 block text-xs font-bold uppercase tracking-widest text-navy">
                Full name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Tabito"
                className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5"
              />
            </>
          )}

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
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-full bg-navy px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErr(null);
            }}
            className="mt-3 w-full text-sm font-semibold text-navy underline"
          >
            {mode === "signin"
              ? "New team member? Create an account"
              : "Already have an account? Sign in"}
          </button>
          {msg && <p className="mt-3 text-sm text-palm">{msg}</p>}
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        </form>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="surface p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-navy">Waiting for access</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You are signed in as <strong>{user.email}</strong>, but no role has been
            granted yet. A TABITO admin must give you editor or admin rights.
          </p>
          <button
            onClick={() => void signOut()}
            className="mt-6 rounded-full bg-muted px-5 py-2.5 font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- admin desk ---------------- */

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy">Admin desk</h1>
          <p className="text-muted-foreground">
            Signed in as {user.email} · {isAdmin ? "admin" : "editor"}
          </p>
        </div>
        <button
          onClick={() => void signOut()}
          className="rounded-full bg-muted px-4 py-2 text-sm font-semibold"
        >
          Sign out
        </button>
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
                  onClick={async () => {
                    try {
                      await deleteCategory(c.id);
                      await refresh();
                      flash("Category removed.");
                    } catch (e) {
                      fail(e);
                    }
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
            onClick={async () => {
              const name = newCat.name.trim();
              if (!name) return setErr("Category name required.");
              try {
                await createCategory(name, newCat.icon);
                setNewCat({ name: "", icon: "📍" });
                setErr(null);
                await refresh();
                flash("Category added.");
              } catch (e) {
                fail(e);
              }
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

          <div className="mt-8 border-t border-border pt-5">
            <h3 className="font-display text-lg font-bold text-navy">
              Official site specification
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Data sheet as defined by the tourism authorities.
            </p>

            <label className={LABEL}>Access type</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACCESS_TYPES.map((a) => {
                const on = form.accessTypes.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        accessTypes: on
                          ? f.accessTypes.filter((v) => v !== a.value)
                          : [...f.accessTypes, a.value],
                      }))
                    }
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      on ? "bg-navy text-white" : "bg-muted text-navy"
                    }`}
                  >
                    {a.icon} {a.label}
                  </button>
                );
              })}
            </div>

            <label className={LABEL}>Access indication (road name, track length…)</label>
            <input
              value={form.accessNotes}
              onChange={(e) => setForm((f) => ({ ...f, accessNotes: e.target.value }))}
              className={FIELD}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Natural region / local destination</label>
                <input
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>Municipality</label>
                <input
                  value={form.municipality}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, municipality: e.target.value }))
                  }
                  className={FIELD}
                />
              </div>
            </div>

            <label className={LABEL}>Administration, management or ownership</label>
            <input
              value={form.management}
              onChange={(e) => setForm((f) => ({ ...f, management: e.target.value }))}
              className={FIELD}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Distance from destination capital (km)</label>
                <input
                  value={form.distDestKm}
                  inputMode="decimal"
                  onChange={(e) => setForm((f) => ({ ...f, distDestKm: e.target.value }))}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>Distance from destination capital (hours)</label>
                <input
                  value={form.distDestHours}
                  inputMode="decimal"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, distDestHours: e.target.value }))
                  }
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>Distance from Bujumbura (km)</label>
                <input
                  value={form.distBujaKm}
                  inputMode="decimal"
                  onChange={(e) => setForm((f) => ({ ...f, distBujaKm: e.target.value }))}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>Distance from Bujumbura (hours)</label>
                <input
                  value={form.distBujaHours}
                  inputMode="decimal"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, distBujaHours: e.target.value }))
                  }
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>Site code / grade</label>
                <input
                  value={form.siteCode}
                  onChange={(e) => setForm((f) => ({ ...f, siteCode: e.target.value }))}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>TABITO merchant code (optional)</label>
                <input
                  value={form.merchantCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, merchantCode: e.target.value }))
                  }
                  className={FIELD}
                />
              </div>
            </div>

            <label className={LABEL}>General narrative</label>
            <textarea
              value={form.narrativeGeneral}
              onChange={(e) =>
                setForm((f) => ({ ...f, narrativeGeneral: e.target.value }))
              }
              rows={4}
              className={FIELD}
            />

            <label className={LABEL}>Seasonal narrative</label>
            <textarea
              value={form.narrativeSeasonal}
              onChange={(e) =>
                setForm((f) => ({ ...f, narrativeSeasonal: e.target.value }))
              }
              rows={3}
              className={FIELD}
            />

            <label className={LABEL}>Prohibitions and specific precautions</label>
            <textarea
              value={form.restrictions}
              onChange={(e) => setForm((f) => ({ ...f, restrictions: e.target.value }))}
              rows={3}
              className={FIELD}
            />

            <label className={LABEL}>Opening and closing hours</label>
            <input
              value={form.openingHours}
              onChange={(e) => setForm((f) => ({ ...f, openingHours: e.target.value }))}
              placeholder="08:00 – 17:00, daily"
              className={FIELD}
            />

            <label className={LABEL}>
              Local guides, first-aid or medical assistance contacts
            </label>
            <textarea
              value={form.localContacts}
              onChange={(e) => setForm((f) => ({ ...f, localContacts: e.target.value }))}
              rows={2}
              className={FIELD}
            />

            <label className={LABEL}>Video link (social network or website)</label>
            <input
              value={form.mediaUrl}
              onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))}
              placeholder="https://…"
              className={FIELD}
            />

            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-navy">
              <input
                type="checkbox"
                checked={form.weatherSensors}
                onChange={(e) =>
                  setForm((f) => ({ ...f, weatherSensors: e.target.checked }))
                }
              />
              Weather sensors present on site
            </label>
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
                    onChange={(e) => void onFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => void submitPoint()}
              disabled={busy}
              className="rounded-full bg-sunset px-6 py-3 font-semibold text-white shadow-lift disabled:opacity-60"
            >
              {form.id ? "✓ Save changes" : "✓ Publish point"}
            </button>
            {form.id && (
              <button
                onClick={() => setForm({ ...EMPTY_FORM, categoryId: form.categoryId })}
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
                          region: p.region,
                          municipality: p.municipality,
                          management: p.management,
                          accessTypes: p.accessTypes,
                          accessNotes: p.accessNotes,
                          distDestKm: p.distDestKm?.toString() ?? "",
                          distDestHours: p.distDestHours?.toString() ?? "",
                          distBujaKm: p.distBujaKm?.toString() ?? "",
                          distBujaHours: p.distBujaHours?.toString() ?? "",
                          siteCode: p.siteCode,
                          narrativeGeneral: p.narrativeGeneral,
                          narrativeSeasonal: p.narrativeSeasonal,
                          mediaUrl: p.mediaUrl,
                          merchantCode: p.merchantCode,
                          restrictions: p.restrictions,
                          weatherSensors: p.weatherSensors,
                          openingHours: p.openingHours,
                          localContacts: p.localContacts,

                        })
                      }
                      className="rounded-full bg-card px-3 py-1 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deletePoint(p.id);
                          await refresh();
                          flash("Point deleted.");
                        } catch (e) {
                          fail(e);
                        }
                      }}
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

      {/* Team */}
      {isAdmin && (
        <section className="surface mt-8 p-6">
          <h2 className="font-display text-xl font-bold text-navy">Team accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New colleagues create their account on this page, then you grant them editor
            or admin rights here.
          </p>
          <ul className="mt-4 space-y-2">
            {staff.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {m.fullName || m.email || m.id}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email} · {m.roles.length ? m.roles.join(", ") : "no access yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["editor", "admin"] as AppRole[]).map((role) => {
                    const has = m.roles.includes(role);
                    return (
                      <button
                        key={role}
                        onClick={async () => {
                          try {
                            if (has) await revokeRole(m.id, role);
                            else await grantRole(m.id, role);
                            flash(`${role} ${has ? "revoked" : "granted"}.`);
                          } catch (e) {
                            fail(e);
                          }
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          has ? "bg-navy text-white" : "bg-card text-navy"
                        }`}
                      >
                        {has ? `− ${role}` : `+ ${role}`}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
            {staff.length === 0 && (
              <li className="text-sm text-muted-foreground">No accounts yet.</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
