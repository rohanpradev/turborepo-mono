import { describe, expect, it } from "bun:test";
import { createRequire } from "node:module";
import AdminGlobalError from "../apps/admin/src/app/global-error";
import StorefrontGlobalError from "../apps/client/src/app/global-error";

// Resolve the renderer from the frontend workspace in Bun's isolated install.
const requireClient = createRequire(
  new URL("../apps/client/package.json", import.meta.url),
);
const { createElement } = requireClient("react") as {
  createElement: (
    component: typeof StorefrontGlobalError,
    props: Parameters<typeof StorefrontGlobalError>[0],
  ) => ReturnType<typeof StorefrontGlobalError>;
};
const { renderToStaticMarkup } = requireClient("react-dom/server") as {
  renderToStaticMarkup: (
    element: ReturnType<typeof StorefrontGlobalError>,
  ) => string;
};

for (const [name, component] of [
  ["storefront", StorefrontGlobalError],
  ["admin", AdminGlobalError],
] as const) {
  describe(`${name} global error recovery`, () => {
    const renderError = (error: unknown) =>
      renderToStaticMarkup(createElement(component, { error, retry() {} }));

    it.each([null, undefined, "connection failed", 42, { digest: 123 }])(
      "keeps the recovery screen usable for a thrown value: %j",
      (error) => {
        const html = renderError(error);
        expect(html).toContain("Try again");
        expect(html).toContain("Reload application");
        expect(html).not.toContain("Reference:");
      },
    );

    it("shows a server reference while preserving a standalone document", () => {
      const html = renderError({ digest: "server-reference-123" });
      expect(html).toContain('lang="en"');
      expect(html).toContain("<title>Unable to load");
      expect(html).toContain("Reference: server-reference-123");
    });

    it("keeps internal error messages out of the recovery document", () => {
      const html = renderError(new Error("sensitive upstream connection"));
      expect(html).toContain("Try again");
      expect(html).not.toContain("sensitive upstream connection");
    });
  });
}
