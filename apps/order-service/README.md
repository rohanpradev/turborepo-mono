# Order Service

RESTful API service for managing customer orders in the e-commerce platform.

## Technology Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: Clerk
- **API Documentation**: Scalar

## Features

- Order creation and management
- User-specific order retrieval
- Order status tracking
- Clerk authentication for all endpoints
- OpenAPI documentation with Scalar UI

## Environment Variables

Create `.env` file:

```env
PORT=8001
MONGODB_URI="mongodb://localhost:27017/orders"
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

## Database Setup

MongoDB will automatically create the database and collections on first connection. No migrations required.

## Development

```bash
# Start dev server with hot reload
bun run dev

# Type checking
bun run check-types
```

Server runs on http://localhost:8001

## API Documentation

Interactive API documentation available at:

- **Scalar UI**: http://localhost:8001/docs
- **OpenAPI JSON**: http://localhost:8001/openapi.json

## API Endpoints

All endpoints require authentication.

- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/user/:userId` - Get all orders for a user
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/orders` - Get all orders (admin)

## Order Schema

```typescript
{
  userId: string;              // Clerk user ID
  items: [{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
  }];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Project Structure

```
src/
├── routes/
│   └── orderRoutes.ts              # Route definitions
├── controllers/
│   └── OrderController.ts          # Request handlers
├── services/
│   └── OrderService.ts             # Business logic
├── middleware/
│   ├── auth.ts                     # Clerk authentication
│   └── errorHandler.ts             # Error handling
├── types/
│   └── order.ts                    # Type definitions
├── config/
│   └── openapi.ts                  # OpenAPI configuration
└── index.ts                        # Entry point
```

## Authentication

All endpoints require Clerk JWT token in Authorization header:

```bash
Authorization: Bearer <clerk_jwt_token>
```

The `userId` is automatically extracted from the JWT token.

## Error Handling

API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Order Status Flow

1. `pending` - Order created
2. `processing` - Payment confirmed, preparing shipment
3. `shipped` - Order dispatched
4. `delivered` - Order received by customer
5. `cancelled` - Order cancelled
