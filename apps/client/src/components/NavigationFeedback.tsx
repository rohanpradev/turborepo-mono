"use client";

import { LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

export default function NavigationFeedback({
  children,
}: {
  children: ReactNode;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      className="relative inline-flex items-center justify-center gap-2"
      aria-busy={pending}
    >
      <span
        className={`inline-flex items-center gap-2 ${pending ? "opacity-35" : ""}`}
      >
        {children}
      </span>
      {pending ? (
        <LoaderCircle
          className="absolute size-4 animate-spin"
          aria-hidden="true"
        />
      ) : null}
      <span role="status" className="sr-only">
        {pending ? "Loading collection…" : ""}
      </span>
    </span>
  );
}
