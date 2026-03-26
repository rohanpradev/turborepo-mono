# @repo/order-db

Shared Mongoose models and MongoDB connection for the order database.

## Overview

This package provides centralized Mongoose models and database connection for the MongoDB order database, used by the order-service.

## Technology

- **ODM**: Mongoose
- **Database**: MongoDB

## Database Schema

### Order Model

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

## Usage

```typescript
import { connectOrderDB, Order } from "@repo/order-db";

// Connect to database
await connectOrderDB();

// Create order
const order = await Order.create({
  userId: "user_123",
  items: [
    {
      productId: "prod_456",
      name: "Product Name",
      price: 29.99,
      quantity: 2,
    },
  ],
  totalAmount: 59.98,
  status: "pending",
  shippingAddress: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "US",
  },
});

// Query orders
const orders = await Order.find({ userId: "user_123" });
```

## Environment Variables

```env
MONGODB_URI="mongodb://localhost:27017/orders"
```

## Connection

The package exports a `connectOrderDB()` function that establishes a MongoDB connection with proper error handling and connection pooling.

## Models

- **Order** - Main order model with full schema validation
