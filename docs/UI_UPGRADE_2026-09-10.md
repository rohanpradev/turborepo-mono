# Storefront and dependency refresh — 10 September 2026

The storefront uses a warm ivory and olive palette, editorial typography, original campaign photography, simpler product cards, and consistent category, catalog, navigation, and footer styling. Responsive catalog grids use two columns on phones, three on smaller desktops, and four from 1280px. Product options retain Radix focus management and size/color selection.

## Next.js implementation

The new editorial sections remain Server Components. Static WebP imports supply image dimensions and automatic blur placeholders. Only the hero is preloaded; lower-page photography is lazy loaded. Responsive `sizes` match the layout. Both source photographs are approximately 270 KB, and Next.js serves optimized AVIF/WebP variants. Existing Cache Components, partial prefetching, React Compiler, typed routes, and Suspense data boundaries remain enabled. The root HTML declares `data-scroll-behavior="smooth"`, as required for Next.js to suppress smooth scrolling during route transitions. Reduced-motion preferences remain respected.

## Dependency decisions

- Next.js 16.3.4 and Bun 1.4.2 remain current and unchanged. Helm is updated to stable 4.3.0, matching the installed tool and CI pin.
- React and React DOM advance together to 19.3.0, with matching React type packages.
- Updated Clerk packages, Lucide 1.44.0, Stripe 22.6.2, Stripe.js 9.16.0, Zod 4.6.1, Knip 6.35.1, Bun types, and security overrides.
- Node types advance to 26.5.1. At verification, the npm `latest` tag for Node types pointed to 22.20.2, while current TypeScript tags pointed to 26.5.1. Stripe.js similarly had an older `latest` tag (7.10.0), incompatible with the installed React Stripe package's `>=9.10.0 <10.0.0` peer range. The newer published compatible releases were selected explicitly.
- The existing Prisma 8 prerelease architecture remains: ORM advances from 8.0.0-rc.8 to exact-pinned 8.0.0-rc.9; CLI stays 8.0.0-rc.13. These are release candidates, not stable Prisma 8.
- Traefik advances to 3.7.13 with a verified multi-platform image digest. PostgreSQL 18.6, Kafka 4.3.1, and MongoDB 8.3.8 hardened-image digests are refreshed to their current builds. CI MongoDB advances to the digest containing 8.3.9.
- MongoDB 8.3.9 is available upstream, but `dhi.io/mongodb:8.3.9-debian13` was unavailable. The current hardened 8.3.8 image is retained rather than changing the container distribution implicitly.

Registry metadata, installed version-specific Next.js documentation, and official release records were verified. `bun outdated --recursive` reports no direct updates and a frozen install succeeds.

## Verification

- Full `bun run ci:verify`: 99 tests passed; lint, dependency policy/deduplication, migration validation, unused-code and package-boundary checks passed; all workspace type checks and both production builds passed.
- Vulnerability audit: no vulnerabilities across 793 packages.
- Standalone smoke checks: storefront health, 3 pages and 21 static assets; admin health, 2 pages and 14 assets.
- Real PostgreSQL/MongoDB integration suite: 6 tests passed, including rollback, concurrent order deduplication, and outbox lease safety.
- All five application Docker images built successfully.
- Docker Compose validation and all 12 Helm profile policies passed. Refreshed hardened images pulled successfully on their supported platforms.
- Browser verification with the real catalog API and 11 seed products in a disposable database: variant selection, add-to-bag, correct price/color/size, removal, price sorting, search preserving sorting, and mobile category navigation. Phone viewport: 390px; document width: 390px.

Kubernetes commerce verification is recorded separately once the complete authenticated flow has been exercised.

## Image provenance

Both images were generated with the built-in image generation tool and converted to WebP for the app. Existing product photography remains the source of product-specific previews. The generated images are editorial campaign imagery.

### `apps/client/src/assets/everyday-campaign.webp`

Prompt: Use case: photorealistic-natural. Asset type: premium apparel ecommerce campaign hero photograph. Create a beautifully art-directed wide landscape photograph, 3:2 aspect ratio. Two stylish adults, a woman with short dark hair wearing a textured cream oversized knit and dark relaxed jeans, and a man wearing a muted olive chore jacket over an off-white tee with sand trousers, standing naturally beside a sunlit travertine building. Modern slow-living fashion editorial, Mediterranean stone architecture, sculptural shadows, warm late-afternoon sunlight, tactile fabric detail, subtle 35mm film grain. Subjects on the center-right, framed from head to shin, relaxed candid interaction, faces natural and realistic. Warm limestone, olive, cream and tobacco palette. Clean sophisticated composition, ample architectural space around subjects. No logos, no text, no watermark. This is aspirational category imagery, not a specific branded product.

### `apps/client/src/assets/considered-details.webp`

Prompt: Use case: product-mockup. Asset type: editorial still-life photograph for a thoughtful everyday apparel storefront. Wide landscape 3:2 photograph of a cream ribbed sweater loosely folded over a sand-colored linen chair, indigo jeans neatly folded beside it, simple off-white canvas sneakers on a warm limestone floor, a single olive branch at the edge. Beautiful natural window sunlight and sculptural shadows. Close composition, tactile cotton, denim, wool and stone textures. Understated premium slow fashion campaign, realistic analog photography, warm neutral palette, no text, no watermark, no logos, no people.

## Sources

- [React 19.3 release](https://react.dev/blog/2026/09/09/react-19-3)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js Image reference](https://nextjs.org/docs/app/api-reference/components/image)
- [Traefik 3.7.13](https://github.com/traefik/traefik/releases/tag/v3.7.13)
- [MongoDB 8.3 release notes](https://www.mongodb.com/docs/manual/release-notes/8.3/)
- [PostgreSQL release information](https://www.postgresql.org/download/)
- [Kafka downloads](https://kafka.apache.org/community/downloads/)
