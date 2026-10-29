import { Heart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";

export function FavoriteButton({ id, name }: { id: string; name: string }) {
  const { ids, toggle } = useFavorites();
  const [error, setError] = useState(false);
  const saved = ids.includes(id);
  const label = `${saved ? "Remove from" : "Add to"} favorites: ${name}`;
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={label}
        aria-pressed={saved}
        title={label}
        className={saved ? "text-sunset" : "text-muted-foreground"}
        onClick={() => {
          try { toggle(id); setError(false); }
          catch { setError(true); }
        }}
      >
        <Heart className={saved ? "fill-current" : ""} />
      </Button>
      {error && <span role="alert" className="max-w-48 text-xs text-destructive">Could not save. Allow browser storage and retry.</span>}
    </span>
  );
}