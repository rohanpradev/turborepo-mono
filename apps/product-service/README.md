# Product Service

RESTful API service for managing products and categories in the e-commerce platform.

## Technology Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Clerk
- **API Documentation**: Scalar

## Features

- Product CRUD operations with filtering, sorting, and search
- Category management
- Image and variant support (sizes, colors)
- Clerk authentication for protected endpoints
- OpenAPI documentation with Scalar UI

## Environment Variables

Create `.env` file:

```env
PORT=8000
DATABASE_URL="postgresql://user:password@localhost:5432/products"
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

## Database Setup

```bash
# Navigate to product-db package
cd ../../packages/product-db

# Run migrations
bun run db:migrate

# Generate Prisma client
bun run db:generate
```

## Development

```bash
# Start dev server with hot reload
bun run dev

# Type checking
bun run check-types
```

Server runs on http://localhost:8000

## API Documentation

Interactive API documentation available at:

- **Scalar UI**: http://localhost:8000/reference
- **OpenAPI JSON**: http://localhost:8000/doc

## API Endpoints

### Public Endpoints

- `GET /products` - List products with filters
  - Query params: `pageSize`, `sort`, `category`, `search`
- `GET /products/:id` - Get product by ID
- `GET /categories` - List all categories
- `GET /categories/:slug` - Get category by slug

### Protected Endpoints (Require Authentication)

- `POST /products` - Create new product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `POST /categories` - Create category
- `PUT /categories/:slug` - Update category
- `DELETE /categories/:slug` - Delete category

## Database Schema

### Product

- `id` - Auto-increment integer
- `name` - Product name
- `shortDescription` - Brief description
- `description` - Full description
- `price` - Price in cents
- `sizes` - Available sizes array
- `colors` - Available colors array
- `images` - JSON object with color-keyed image URLs
- `categorySlug` - Foreign key to category
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

### Category

- `id` - Auto-increment integer
- `name` - Category name
- `slug` - URL-friendly identifier (unique)
- `products` - Relation to products

## Project Structure

```
src/
├── routes/
│   ├── products/
│   │   ├── products.routes.ts      # Route definitions
│   │   ├── products.handlers.ts    # Request handlers
│   │   └── products.index.ts       # Route registration
│   └── categories/
│       ├── categories.routes.ts
│       ├── categories.handlers.ts
│       └── categories.index.ts
├── services/
│   ├── ProductService.ts           # Business logic
│   └── CategoryService.ts
├── validation/
│   └── schemas.ts                  # Zod validation schemas
├── middleware/
│   ├── auth.ts                     # Clerk authentication
│   ├── errorHandler.ts             # Error handling
│   └── logging.ts                  # Request logging
├── types/
│   └── app-route.ts                # Type definitions
├── app.ts                          # App configuration
└── index.ts                        # Entry point
```

## Authentication

Protected endpoints require Clerk JWT token in Authorization header:

```bash
Authorization: Bearer <clerk_jwt_token>
```

## Error Handling

API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "status": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
