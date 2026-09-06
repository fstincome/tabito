import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "tabito_install_dismissed_at";
const DISMISS_DAYS = 14;

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const days = (Date.now() - Number(raw)) / 86_400_000;
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode() || recentlyDismissed()) return;

    // iOS has no beforeinstallprompt — show manual instructions after a delay.
    if (isIos()) {
      const t = window.setTimeout(() => setVisible(true), 2500);
      return () => window.clearTimeout(t);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      window.setTimeout(() => setVisible(true), 1500);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md sm:inset-x-auto sm:right-5 sm:bottom-5">
      <div className="surface flex items-start gap-3 p-4">
        <img
          src="/icon-192.png"
          alt="TABITO app icon"
          className="h-12 w-12 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-foreground">
            Install the TABITO app
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {isIos() ? (
              <>
                Tap <Share className="inline h-3.5 w-3.5 -translate-y-0.5" />{" "}
                <strong>Share</strong>, then <strong>“Add to Home Screen”</strong> to get
                TABITO as an app.
              </>
            ) : (
              "Add TABITO to your home screen for one-tap access to the travel guide."
            )}
          </p>
          {!isIos() && deferred && (
            <button
              type="button"
              onClick={install}
              className="mt-2.5 inline-flex items-center justify-center rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-navy-deep"
            >
              Install now
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
