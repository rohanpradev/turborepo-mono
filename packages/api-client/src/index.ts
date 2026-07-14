import { createORPCClient, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type {
  OrderContract,
  PaymentContract,
  ProductContract,
} from "@repo/contracts";
import type {
  CategoryPayload,
  CategoryRecord,
  CategoryUpdatePayload,
  CheckoutSessionPayload,
  OrderRecord,
  ProductPayload,
  ProductRecord,
  ProductUpdatePayload,
  ProductListQuery as SharedProductListQuery,
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

type HeaderSource = ConstructorParameters<typeof Headers>[0];
type FetchOptions = RequestInit & {
  headers?: HeaderSource;
};
type AuthenticatedGetOptions = {
  token: string;
};
type AuthenticatedFetchOptions = AuthenticatedGetOptions & {
  fetchOptions?: FetchOptions;
};

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
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
export type GetProductResponse = SuccessResponse<ProductRecord>;
export type CreateProductRequest = ProductPayload;
export type UpdateProductRequest = ProductUpdatePayload;
export type CreateProductResponse = SuccessResponse<ProductRecord>;
export type UpdateProductResponse = SuccessResponse<ProductRecord>;
export type DeleteProductResponse = {
  success: true;
  message: string;
};
export type ListCategoriesResponse = SuccessResponse<Array<CategoryRecord>>;
export type CreateCategoryRequest = CategoryPayload;
export type UpdateCategoryRequest = CategoryUpdatePayload;
export type CreateCategoryResponse = SuccessResponse<CategoryRecord>;
export type UpdateCategoryResponse = SuccessResponse<CategoryRecord>;
export type DeleteCategoryResponse = {
  success: true;
  message: string;
};
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

const toRpcUrl = (baseUrl: string, service: string) =>
  new URL(`/rpc/${service}`, baseUrl).toString();

const mergeHeaders = (...sources: Array<HeaderSource | undefined>) => {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) {
      continue;
    }

    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
};

const toApiClientError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (error instanceof ORPCError) {
    return new ApiClientError(error.message, error.status, error.toJSON());
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message, 500, {
      message: error.message,
    });
  }

  return new ApiClientError("Request failed", 500, error);
};

const createRpcLink = (
  baseUrl: string,
  service: "order" | "payment" | "product",
  options: {
    fetchOptions?: FetchOptions;
    token?: string;
  } = {},
) =>
  new RPCLink({
    fetch: (request, init) => {
      const initWithHeaders = init as RequestInit & {
        headers?: HeaderSource;
      };
      const requestHeaders =
        request instanceof Request ? request.headers : undefined;
      const fetchInit = {
        ...options.fetchOptions,
        ...init,
        headers: mergeHeaders(
          requestHeaders,
          options.fetchOptions?.headers,
          initWithHeaders.headers,
          options.token
            ? { authorization: `Bearer ${options.token}` }
            : undefined,
        ),
      };

      return fetch(request, fetchInit);
    },
    headers: () =>
      options.token
        ? {
            authorization: `Bearer ${options.token}`,
          }
        : {},
    url: toRpcUrl(baseUrl, service),
  });

const createProductRpcClient = (
  baseUrl: string,
  options?: { fetchOptions?: FetchOptions; token?: string },
) =>
  createORPCClient<ContractRouterClient<ProductContract>>(
    createRpcLink(baseUrl, "product", options),
  );

const createOrderRpcClient = (
  baseUrl: string,
  options?: { fetchOptions?: FetchOptions; token?: string },
) =>
  createORPCClient<ContractRouterClient<OrderContract>>(
    createRpcLink(baseUrl, "order", options),
  );

const createPaymentRpcClient = (
  baseUrl: string,
  options?: { fetchOptions?: FetchOptions; token?: string },
) =>
  createORPCClient<ContractRouterClient<PaymentContract>>(
    createRpcLink(baseUrl, "payment", options),
  );

const rpcCall = async <T>(call: () => Promise<T>) => {
  try {
    return await call();
  } catch (error) {
    throw toApiClientError(error);
  }
};

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

export const listProducts = async (
  baseUrl: string,
  query?: ProductListQuery,
  fetchOptions?: FetchOptions,
) =>
  rpcCall(() =>
    createProductRpcClient(baseUrl, { fetchOptions }).product.list(query),
  );

export const getProduct = async (
  baseUrl: string,
  id: number,
  fetchOptions?: FetchOptions,
) =>
  rpcCall(() =>
    createProductRpcClient(baseUrl, { fetchOptions }).product.get({ id }),
  );

export const createProduct = async (
  baseUrl: string,
  payload: CreateProductRequest,
  token: string,
) =>
  rpcCall(() =>
    createProductRpcClient(baseUrl, { token }).product.create(payload),
  );

export const updateProduct = async (
  baseUrl: string,
  id: number,
  payload: UpdateProductRequest,
  token: string,
) =>
  rpcCall(() =>
    createProductRpcClient(baseUrl, { token }).product.update({ id, payload }),
  );

export const deleteProduct = async (
  baseUrl: string,
  id: number,
  token: string,
) =>
  rpcCall(() =>
    createProductRpcClient(baseUrl, { token }).product.delete({ id }),
  );

export const listCategories = async (
  baseUrl: string,
  fetchOptions?: FetchOptions,
) =>
  rpcCall(() =>
    createProductRpcClient(baseUrl, { fetchOptions }).category.list(),
  );

export const createCategory = async (
  baseUrl: string,
  payload: CreateCategoryRequest,
  token: string,
) =>
  rpcCall(() =>
    createProductRpcClient(baseUrl, { token }).category.create(payload),
  );

export const updateCategory = async (
  baseUrl: string,
  slug: string,
  payload: UpdateCategoryRequest,
  token: string,
) =>
  rpcCall(() =>
    createProductRpcClient(baseUrl, { token }).category.update({
      payload,
      slug,
    }),
  );

export const deleteCategory = async (
  baseUrl: string,
  slug: string,
  token: string,
) =>
  rpcCall(() =>
    createProductRpcClient(baseUrl, { token }).category.delete({ slug }),
  );

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
) =>
  rpcCall(() =>
    createOrderRpcClient(baseUrl, { token: options.token }).order.listAll(),
  );

export const listUserOrders = async (
  baseUrl: string,
  options: AuthenticatedGetOptions,
) =>
  rpcCall(() =>
    createOrderRpcClient(baseUrl, {
      token: options.token,
    }).order.listForUser(),
  );

export const createCheckoutSession = async (
  baseUrl: string,
  payload: CreateCheckoutSessionRequest,
  token: string,
) =>
  rpcCall(() =>
    createPaymentRpcClient(baseUrl, { token }).checkout.createSession(payload),
  );

export const getCheckoutSessionStatus = async (
  baseUrl: string,
  sessionId: string,
  token: string,
) =>
  rpcCall(() =>
    createPaymentRpcClient(baseUrl, {
      token,
    }).checkout.getSessionStatus({ sessionId }),
  );

export const getPaymentIntegrationEvents = async (
  baseUrl: string,
  options: AuthenticatedFetchOptions,
) =>
  rpcCall(() =>
    createPaymentRpcClient(baseUrl, {
      fetchOptions: options.fetchOptions,
      token: options.token,
    }).ops.integrationEvents(),
  );
