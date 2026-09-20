import type { ProductListQuery } from "./api";
import { productSortSchema } from "./api";

type SearchValue = string | Array<string> | undefined;

export const singleSearchValue = (value: SearchValue) =>
  Array.isArray(value) ? value[0] : value;

export const catalogPage = (value: SearchValue) => {
  const page = Number(singleSearchValue(value));
  return Number.isSafeInteger(page) && page > 0 && page <= 10_000 ? page : 1;
};

/** Normalize browser input before passing it to the shared API contract. */
export const catalogQuery = (
  values: Record<string, SearchValue>,
): ProductListQuery => {
  const category = singleSearchValue(values.category)?.trim();
  const sort = productSortSchema.safeParse(singleSearchValue(values.sort));
  return {
    category: category && category !== "all" ? category : undefined,
    page: catalogPage(values.page),
    search: singleSearchValue(values.search)?.trim() || undefined,
    sort: sort.success ? sort.data : "newest",
  };
};

export const catalogQueryString = (query: ProductListQuery) => {
  const params: Array<[string, string]> = [];
  if (query.category && query.category !== "all")
    params.push(["category", query.category]);
  if (query.search?.trim()) params.push(["search", query.search.trim()]);
  if (query.sort && query.sort !== "newest") params.push(["sort", query.sort]);
  const page = catalogPage(query.page?.toString());
  if (page > 1) params.push(["page", String(page)]);
  return params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
};
