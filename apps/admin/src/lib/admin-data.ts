import "server-only";

import {
  type ListProductsResponse,
  listCategories,
  listOrders,
  listPaymentActivities,
  listProducts,
  type ProductListQuery,
} from "@repo/api-client";
import {
  getOrderServiceServerUrl,
  getPaymentServiceServerUrl,
  getProductServiceServerUrl,
} from "@repo/api-client/server";
import type { CategoryRecord, ProductRecord } from "@repo/types";
import { requireAdminAccess } from "@/lib/auth";

export { buildCustomerSummaries } from "./customer-summaries";

const liveFetchOptions = {
  cache: "no-store" as const,
};

export const formatCustomerLabel = (userId: string) =>
  userId === "unknown"
    ? "Unknown / test session"
    : `Customer ${userId.slice(0, 8)}`;

export const formatTimestamp = (timestamp: string) => {
  const value = new Date(timestamp);

  return Number.isNaN(value.getTime())
    ? "Timestamp unavailable"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);
};

export const loadPaymentActivities = async () => {
  const { token } = await requireAdminAccess();
  return (
    await listPaymentActivities(getPaymentServiceServerUrl(), {
      fetchOptions: liveFetchOptions,
      token,
    })
  ).data;
};

export const loadOptionalAdminOrders = async () => {
  const { token } = await requireAdminAccess();

  try {
    const response = await listOrders(getOrderServiceServerUrl(), { token });
    return response.data;
  } catch {
    return null;
  }
};

export const loadCatalogSnapshot = async (
  query: ProductListQuery = {},
): Promise<{
  categories: Array<CategoryRecord>;
  products: Array<ProductRecord>;
  pagination: ListProductsResponse["meta"];
}> => {
  await requireAdminAccess();
  const productServiceUrl = getProductServiceServerUrl();
  const [products, categories] = await Promise.all([
    listProducts(
      productServiceUrl,
      {
        limit: 24,
        sort: "newest",
        ...query,
      },
      liveFetchOptions,
    ),
    listCategories(productServiceUrl, liveFetchOptions),
  ]);

  return {
    categories: categories.data,
    products: products.data,
    pagination: products.meta,
  };
};
