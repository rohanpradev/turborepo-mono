"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export default function RefreshButton({
  label = "Refresh",
  onRefresh,
}: {
  label?: string;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() =>
        startTransition(() => {
          router.refresh();
          onRefresh?.();
        })
      }
    >
      <RotateCcw
        className={`size-4 ${isPending ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {isPending ? "Refreshing…" : label}
    </Button>
  );
}
