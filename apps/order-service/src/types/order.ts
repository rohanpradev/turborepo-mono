export interface Order {
  id: string;
  userId: string;
  email: string;
  items: OrderItem[];
  total: number;
  status: "success" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  name: string;
  productId?: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  email: string;
  items: OrderItem[];
}

export interface OrderResponse {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
}
