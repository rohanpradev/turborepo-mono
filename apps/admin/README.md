# Flagship Commerce Admin

Next.js 16 App Router admin console for commerce operations.

## Stack

- Next.js 16 with the default Turbopack dev/build pipeline
- React 19, Tailwind CSS 4, shadcn-style primitives
- Clerk-protected admin routes through `src/proxy.ts`
- `next/image` optimization with explicit remote image allowlists
- Standalone output for the existing Docker/runtime strategy

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run check-types
```

The admin app runs on http://localhost:3003.

## Environment

```env
NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3003
NEXT_PUBLIC_CLIENT_APP_URL=http://localhost:3002
CLIENT_APP_URL=http://localhost:3002
NEXT_PUBLIC_IMAGE_REMOTE_HOSTS=cdn.example.com
NEXT_IMAGE_ALLOW_LOCAL_IP=true

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

`NEXT_IMAGE_ALLOW_LOCAL_IP=true` is only needed when a self-hosted admin runtime
must optimize images from another local/private service.
