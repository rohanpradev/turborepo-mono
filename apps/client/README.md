# Commerce Client

Next.js 16 App Router storefront for browsing products, managing a cart, and
checking out through Stripe.

## Stack

- Next.js 16 with the default Turbopack dev/build pipeline
- React 19, Tailwind CSS 4, Server Components, streaming route loading states
- Clerk auth through `src/proxy.ts`
- Stripe Elements checkout
- Zustand cart persistence
- `next/image` optimization with explicit quality and remote host allowlists

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run check-types
```

The client app runs on http://localhost:3002.

## Environment

```env
NEXT_PUBLIC_CLIENT_APP_URL=http://localhost:3002
NEXT_PUBLIC_PRODUCT_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_ORDER_SERVICE_URL=http://localhost:8001
NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://localhost:8002
NEXT_PUBLIC_IMAGE_REMOTE_HOSTS=cdn.example.com
NEXT_IMAGE_ALLOW_LOCAL_IP=true

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

`NEXT_IMAGE_ALLOW_LOCAL_IP=true` is only needed when a self-hosted storefront
must optimize images from a local/private image host.
