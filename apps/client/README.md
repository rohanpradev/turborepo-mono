# E-Commerce Client

Next.js 15 storefront application with Stripe checkout integration.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Authentication**: Clerk
- **Payments**: Stripe Elements
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React

## Features

- Product browsing with filtering and search
- Shopping cart with Zustand state management
- Multi-step checkout process
- Stripe payment integration
- Clerk authentication
- Responsive design with Tailwind CSS

## Environment Variables

Create `.env.local` file:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Service URLs
NEXT_PUBLIC_PRODUCT_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_ORDER_SERVICE_URL=http://localhost:8001
NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://localhost:8002

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Development

```bash
# Start dev server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Type checking
bun run check-types

# Linting
bun run lint
```

Application runs on http://localhost:3002

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/                # Sign in page
│   │   └── sign-up/                # Sign up page
│   ├── products/
│   │   ├── page.tsx                # Product listing
│   │   └── [id]/
│   │       └── page.tsx            # Product details
│   ├── cart/
│   │   └── page.tsx                # Shopping cart & checkout
│   ├── return/
│   │   └── page.tsx                # Payment return page
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Home page
│   └── globals.css                 # Global styles
├── components/
│   ├── Navbar.tsx                  # Navigation bar
│   ├── ProductCard.tsx             # Product card component
│   ├── ProductList.tsx             # Product grid
│   ├── ShoppingCartIcon.tsx        # Cart icon with count
│   ├── ShippingForm.tsx            # Shipping address form
│   ├── StripePaymentForm.tsx       # Stripe checkout wrapper
│   ├── CheckoutForm.tsx            # Stripe payment form
│   ├── Filter.tsx                  # Product filters
│   ├── SearchBar.tsx               # Search component
│   └── Footer.tsx                  # Footer
├── stores/
│   └── cartStore.ts                # Zustand cart store
├── types.ts                        # TypeScript types
└── middleware.ts                   # Clerk middleware
```

## Features

### Shopping Cart

Persistent cart state managed with Zustand:

- Add/remove items
- Update quantities
- Select size and color variants
- Calculate totals

### Checkout Flow

Three-step checkout process:

1. **Cart Review** - Review items, quantities, and totals
2. **Shipping Information** - Enter delivery address
3. **Payment** - Stripe Elements payment form

### Authentication

Clerk provides:

- Sign up/Sign in pages
- User profile management
- Protected routes
- Session management

### Payment Processing

Stripe integration:

- Custom checkout UI with Stripe Elements
- PaymentIntent creation via payment-service
- Real-time payment status
- Secure card processing

## API Integration

The client communicates with three backend services:

- **Product Service** - Product catalog and categories
- **Order Service** - Order creation and management
- **Payment Service** - Stripe checkout sessions

## Styling

Tailwind CSS 4 with custom configuration:

- Responsive design
- Dark mode support
- Custom color palette
- Utility-first approach

## Type Safety

Full TypeScript coverage with:

- Zod schema validation
- Type-safe API calls
- Strict mode enabled
- Form validation with React Hook Form

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables

Set all environment variables in your deployment platform:

- Clerk keys
- Service URLs (production endpoints)
- Stripe publishable key

### Build Configuration

The app uses Next.js App Router with:

- Server-side rendering (SSR)
- Static generation where possible
- API route handlers
- Middleware for authentication
