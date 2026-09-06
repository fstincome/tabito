import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { InstallPrompt } from "../components/InstallPrompt";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-navy">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This stop is not on the TABITO route map.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy-deep"
          >
            Back to the welcome desk
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try again or head back to the home page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy-deep"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TABITO — Tanganyika e-Bridge International Tours" },
      {
        name: "description",
        content:
          "TABITO is your complete travel guide around Lake Tanganyika: attractions, monuments, cultural centres, bus stations, flight ticket offices and live tourist services.",
      },
      { name: "author", content: "TABITO" },
      { property: "og:title", content: "TABITO — International Tours & Travel Guide" },
      {
        property: "og:description",
        content:
          "Discover attractions, monuments, cultural products, bus stations and flight ticket offices with live GPS guidance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0b1f3a" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "TABITO" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Welcome" },
  { to: "/guide", label: "Guide" },
  { to: "/live", label: "Live tracker" },
  { to: "/admin", label: "Admin" },
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-deep/40 sea-gradient">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/tabito-logo.png"
            alt="TABITO logo"
            className="h-11 w-11 rounded-full bg-white/95 object-cover p-0.5"
          />
          <span className="leading-tight">
            <span className="block font-display text-lg font-extrabold tracking-tight text-white">
              TABITO
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-lagoon">
              e-Bridge International Tours
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "bg-white/15 text-white" }}
              inactiveProps={{ className: "text-white/70 hover:text-white hover:bg-white/10" }}
              className="rounded-full px-3.5 py-2 text-sm font-semibold transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="h-1 w-full rainbow-rule" />
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-20 sea-gradient text-white/80">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="font-display text-lg font-bold text-white">
          TABITO — Tanganyika e-Bridge International Tours
        </p>
        <p className="mt-2 max-w-2xl text-sm">
          Your bridge between the great lake and the world. Tours, transfers, cultural
          discovery and live travel guidance.
        </p>
        <p className="mt-6 text-xs uppercase tracking-widest text-lagoon">
          © {new Date().getFullYear()} TABITO · Maps © OpenStreetMap contributors
        </p>
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          {/* Required: nested routes render here. */}
          <Outlet />
        </main>
        <InstallPrompt />
        <SiteFooter />
      </div>
    </QueryClientProvider>
  );
}
