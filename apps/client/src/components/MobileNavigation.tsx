"use client";

import { ArrowUpRight, Menu } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function MobileNavigation({
  links,
}: {
  links: ReadonlyArray<{ href: Route; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="xl:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Open navigation"
            aria-haspopup="dialog"
            className="grid size-11 place-items-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pr-8 font-serif text-2xl">
              Explore Common Goods
            </DialogTitle>
            <DialogDescription>
              Pieces for your everyday rotation.
            </DialogDescription>
          </DialogHeader>
          <nav aria-label="Mobile navigation" className="grid">
            {[{ href: "/products" as Route, label: "Shop all" }, ...links].map(
              (item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onNavigate={() => setOpen(false)}
                  className="flex min-h-14 items-center justify-between border-b border-border py-3 font-serif text-2xl hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
                >
                  {item.label}
                  <ArrowUpRight className="size-5" aria-hidden="true" />
                </Link>
              ),
            )}
            <Link
              href="/orders"
              onNavigate={() => setOpen(false)}
              className="mt-5 rounded-lg py-3 text-sm font-semibold hover:text-primary"
            >
              My orders
            </Link>
            <Link
              href={"/sign-in" as Route}
              onNavigate={() => setOpen(false)}
              className="rounded-lg py-3 text-sm font-semibold hover:text-primary"
            >
              Your account
            </Link>
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
