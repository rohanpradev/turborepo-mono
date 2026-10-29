"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const digest =
    error !== null &&
    typeof error === "object" &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null;
  useEffect(() => {
    console.error("Application shell failed", error);
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#f6f5f2",
          color: "#242424",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Unable to load | Common Goods</title>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: 24 }}>
          <p style={{ fontSize: 14 }}>Common Goods</p>
          <h1>Let’s get you back on track.</h1>
          <p style={{ lineHeight: 1.7 }}>
            This page could not load. Try again, or reload the application to
            start fresh.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={retry}
              style={{
                padding: "12px 20px",
                borderRadius: 8,
                background: "#242424",
                color: "white",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 20px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Reload application
            </button>
          </div>
          {digest ? <p style={{ fontSize: 12 }}>Reference: {digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
