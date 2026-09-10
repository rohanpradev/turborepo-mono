import { describe, expect, it } from "bun:test";
import {
  catalogPage,
  catalogQuery,
  catalogQueryString,
  productListQuerySchema,
} from "../packages/types/src/index";

describe("catalog navigation", () => {
  it("normalizes repeated and invalid browser parameters into valid API input", () => {
    const query = catalogQuery({
      page: "10001",
      sort: "invalid",
      category: [" all ", "shoes"],
      search: "  cotton & linen  ",
    });
    expect(query).toEqual({
      page: 1,
      sort: "newest",
      category: undefined,
      search: "cotton & linen",
    });
    expect(productListQuerySchema.safeParse(query).success).toBe(true);
  });
  it.each([
    "0",
    "-1",
    "1.5",
    "Infinity",
    "NaN",
    "9007199254740993",
    "10001",
    "",
  ])("rejects out-of-range page %s", (page) => {
    expect(catalogPage(page)).toBe(1);
  });
  it("preserves filters and safely encodes punctuation during pagination", () => {
    const query = {
      page: 3,
      sort: "desc" as const,
      search: "cotton & linen + silk",
      category: "t-shirts",
    };
    const params = new URLSearchParams(catalogQueryString(query));
    expect(catalogQuery(Object.fromEntries(params))).toEqual(query);
    expect(
      catalogQueryString({
        page: 1,
        sort: "newest",
        category: "all",
        search: " ",
      }),
    ).toBe("");
    expect(catalogPage("10000")).toBe(10000);
  });
});
