import type {
  CategoryRecord,
  CheckoutSessionPayload,
  OrderRecord,
  ProductListQuery as SharedProductListQuery,
  ProductRecord,
} from "@repo/types";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const parseJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;

    throw new ApiClientError(message, response.status, payload);
  }

  return payload as T;
};

const createServiceClient = (baseUrl: string) => ({
  request: (path: string, init?: RequestInit) =>
    fetch(new URL(path, baseUrl), init),
});

export const createProductServiceClient = (baseUrl: string) =>
  createServiceClient(baseUrl);

export const createOrderServiceClient = (baseUrl: string) =>
  createServiceClient(baseUrl);

export const createPaymentServiceClient = (baseUrl: string) =>
  createServiceClient(baseUrl);

export const getProductServiceUrl = () =>
  process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL ?? "http://localhost:3000";

export const getOrderServiceUrl = () =>
  process.env.NEXT_PUBLIC_ORDER_SERVICE_URL ?? "http://localhost:8001";

export const getPaymentServiceUrl = () =>
  process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL ?? "http://localhost:8002";

export const getProductServiceServerUrl = () =>
  process.env.PRODUCT_SERVICE_INTERNAL_URL ?? getProductServiceUrl();

export const getOrderServiceServerUrl = () =>
  process.env.ORDER_SERVICE_INTERNAL_URL ?? getOrderServiceUrl();

export const getPaymentServiceServerUrl = () =>
  process.env.PAYMENT_SERVICE_INTERNAL_URL ?? getPaymentServiceUrl();

type AuthenticatedGetOptions = {
  token: string;
};

type FetchOptions = RequestInit;

type ServiceDependency = {
  name: string;
  status: "ready" | "not_ready" | "disabled";
  required: boolean;
  detail?: string;
};

type ServiceHealthResponse<TService extends string = string> = {
  status: "ok";
  service: TService;
  ready: boolean;
  timestamp: string;
  uptimeSeconds: number;
  dependencies: Array<ServiceDependency>;
};

type SuccessResponse<T> = {
  success: true;
  data: T;
};

export type ProductListQuery = SharedProductListQuery;

export type ListProductsResponse = SuccessResponse<Array<ProductRecord>> & {
  meta: {
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
export type GetProductResponse = SuccessResponse<ProductRecord>;
export type ListCategoriesResponse = SuccessResponse<Array<CategoryRecord>>;
export type ProductHealthResponse = ServiceHealthResponse<"product-service">;
export type OrderHealthResponse = ServiceHealthResponse<"order-service">;
export type PaymentHealthResponse = ServiceHealthResponse<"payment-service">;
export type ListOrdersResponse = SuccessResponse<Array<OrderRecord>>;
export type ListUserOrdersResponse = SuccessResponse<Array<OrderRecord>>;
export type CreateCheckoutSessionRequest = CheckoutSessionPayload;
export type CreateCheckoutSessionResponse = SuccessResponse<{
  clientSecret: string;
  sessionId: string;
}>;
export type CheckoutSessionStatusResponse = SuccessResponse<{
  sessionId: string;
  status: string;
  paymentStatus: string;
  customerEmail: string | null;
  paymentIntentId: string | null;
}>;
export type PaymentIntegrationEventsResponse = SuccessResponse<{
  kafkaUiUrl: string;
  topics: {
    consumes: Array<string>;
    publishes: Array<string>;
  };
  recentEvents: Array<{
    id: string;
    source: "service" | "kafka" | "stripe" | "checkout" | "webhook";
    type: string;
    message: string;
    timestamp: string;
    details?: Record<string, string | number | boolean | null>;
  }>;
}>;

export const listProducts = async (
  baseUrl: string,
  query?: ProductListQuery,
  fetchOptions?: FetchOptions,
) => {
  const url = new URL("/products", baseUrl);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, fetchOptions);

  return parseJson<ListProductsResponse>(response);
};

export const getProduct = async (baseUrl: string, id: number) => {
  const response = await createProductServiceClient(baseUrl).request(
    `/products/${id}`,
  );

  return parseJson<GetProductResponse>(response);
};

export const listCategories = async (baseUrl: string) => {
  const response = await createProductServiceClient(baseUrl).request(
    "/categories",
  );
  return parseJson<ListCategoriesResponse>(response);
};

export const getProductServiceHealth = async (
  baseUrl: string,
  fetchOptions?: FetchOptions,
) => {
  const response = await createProductServiceClient(baseUrl).request(
    "/health",
    fetchOptions,
  );
  return parseJson<ProductHealthResponse>(response);
};

export const getOrderServiceHealth = async (
  baseUrl: string,
  fetchOptions?: FetchOptions,
) => {
  const response = await createOrderServiceClient(baseUrl).request(
    "/health",
    fetchOptions,
  );
  return parseJson<OrderHealthResponse>(response);
};

export const getPaymentServiceHealth = async (
  baseUrl: string,
  fetchOptions?: FetchOptions,
) => {
  const response = await createPaymentServiceClient(baseUrl).request(
    "/health",
    fetchOptions,
  );
  return parseJson<PaymentHealthResponse>(response);
};

export const listOrders = async (
  baseUrl: string,
  options: AuthenticatedGetOptions,
) => {
  const response = await createOrderServiceClient(baseUrl).request(
    "/api/orders",
    {
      headers: {
        Authorization: `Bearer ${options.token}`,
      },
    },
  );

  return parseJson<ListOrdersResponse>(response);
};

export const listUserOrders = async (
  baseUrl: string,
  options: AuthenticatedGetOptions,
) => {
  const response = await createOrderServiceClient(baseUrl).request(
    "/api/user-order",
    {
      headers: {
        Authorization: `Bearer ${options.token}`,
      },
    },
  );

  return parseJson<ListUserOrdersResponse>(response);
};

export const createCheckoutSession = async (
  baseUrl: string,
  payload: CreateCheckoutSessionRequest,
  token: string,
) => {
  const response = await createPaymentServiceClient(baseUrl).request(
    "/api/session/create-checkout-session",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return parseJson<CreateCheckoutSessionResponse>(response);
};

export const getCheckoutSessionStatus = async (
  baseUrl: string,
  sessionId: string,
  fetchOptions?: FetchOptions,
) => {
  const url = new URL("/api/session/status", baseUrl);
  url.searchParams.set("sessionId", sessionId);

  const response = await fetch(url, fetchOptions);

  return parseJson<CheckoutSessionStatusResponse>(response);
};

export const getPaymentIntegrationEvents = async (
  baseUrl: string,
  fetchOptions?: FetchOptions,
) => {
  const response = await createPaymentServiceClient(baseUrl).request(
    "/ops/events",
    fetchOptions,
  );

  return parseJson<PaymentIntegrationEventsResponse>(response);
};
