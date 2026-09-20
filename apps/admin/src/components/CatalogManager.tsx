"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  updateCategory,
  updateProduct,
} from "@repo/api-client";
import type { CategoryRecord, ProductRecord } from "@repo/types";
import { formatUsdFromCents } from "@repo/types";
import {
  Edit,
  PackagePlus,
  Plus,
  RotateCcw,
  Save,
  Tags,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { buildProductPayload, type ProductFormState } from "@/lib/product-form";

type CatalogManagerProps = {
  children?: ReactNode;
  initialCategories: Array<CategoryRecord>;
  initialProducts: Array<ProductRecord>;
  productServiceUrl: string;
};

type CategoryFormState = {
  name: string;
  slug: string;
};

const emptyProductForm: ProductFormState = {
  categorySlug: "",
  colors: "black, white",
  description: "",
  images: "black=/products/example.png\nwhite=/products/example.png",
  name: "",
  price: "",
  shortDescription: "",
  sizes: "s, m, l",
};

const emptyCategoryForm: CategoryFormState = {
  name: "",
  slug: "",
};

const toCsv = (values: Array<string>) => values.join(", ");

const productToForm = (product: ProductRecord): ProductFormState => ({
  categorySlug: product.categorySlug,
  colors: toCsv(product.colors),
  description: product.description,
  images: Object.entries(product.images)
    .map(([color, url]) => `${color}=${url}`)
    .join("\n"),
  name: product.name,
  price: String(product.price / 100),
  shortDescription: product.shortDescription,
  sizes: toCsv(product.sizes),
});

const createSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const fieldLabelClass = "text-sm font-medium text-foreground";
const fieldHintClass = "text-xs leading-5 text-muted-foreground";
const textareaClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";
const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

const CatalogManager = ({
  children,
  initialCategories,
  initialProducts,
  productServiceUrl,
}: CatalogManagerProps) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const mutationInFlight = useRef(false);
  const [categories, setCategories] = useState(initialCategories);
  const [products, setProducts] = useState(initialProducts);
  const [productForm, setProductForm] = useState<ProductFormState>(() => ({
    ...emptyProductForm,
    categorySlug: initialCategories[0]?.slug ?? "",
  }));
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingCategorySlug, setEditingCategorySlug] = useState<string | null>(
    null,
  );
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isReady = isLoaded && isSignedIn;

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => (
        <option key={category.slug} value={category.slug}>
          {category.name}
        </option>
      )),
    [categories],
  );

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm({
      ...emptyProductForm,
      categorySlug: categories[0]?.slug ?? "",
    });
  };

  const openCreateProduct = () => {
    resetProductForm();
    setError(null);
    setMessage(null);
    setIsProductSheetOpen(true);
  };

  const openEditProduct = (product: ProductRecord) => {
    setEditingProductId(product.id);
    setProductForm(productToForm(product));
    setError(null);
    setMessage(null);
    setIsProductSheetOpen(true);
  };

  const runAdminMutation = async <T,>(
    mutation: (token: string) => Promise<T>,
  ) => {
    if (!isReady) {
      throw new Error("Sign in to the admin app before changing the catalog.");
    }

    const token = await getToken();

    if (!token) {
      throw new Error("Unable to read your Clerk session token.");
    }

    return mutation(token);
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildProductPayload(productForm);
      const response = await runAdminMutation((token) =>
        editingProductId
          ? updateProduct(productServiceUrl, editingProductId, payload, token)
          : createProduct(productServiceUrl, payload, token),
      );

      setProducts((current) => {
        const nextProduct = response.data;

        return editingProductId
          ? current.map((product) =>
              product.id === nextProduct.id ? nextProduct : product,
            )
          : [nextProduct, ...current];
      });
      resetProductForm();
      setIsProductSheetOpen(false);
      router.refresh();
      setMessage(
        editingProductId
          ? "Product updated successfully."
          : "Product created successfully.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save product.",
      );
    } finally {
      mutationInFlight.current = false;
      setIsSaving(false);
    }
  };

  const handleProductDelete = async (product: ProductRecord) => {
    if (!confirm(`Delete ${product.name}?`)) {
      return;
    }

    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await runAdminMutation((token) =>
        deleteProduct(productServiceUrl, product.id, token),
      );
      setProducts((current) =>
        current.filter((currentProduct) => currentProduct.id !== product.id),
      );
      router.refresh();
      setMessage("Product deleted successfully.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete product.",
      );
    } finally {
      mutationInFlight.current = false;
      setIsSaving(false);
    }
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: categoryForm.name.trim(),
      slug: createSlug(categoryForm.slug || categoryForm.name),
    };

    try {
      if (!payload.name || !payload.slug)
        throw new Error("Enter a category name and a URL-friendly slug.");
      const response = await runAdminMutation((token) =>
        editingCategorySlug
          ? updateCategory(
              productServiceUrl,
              editingCategorySlug,
              payload,
              token,
            )
          : createCategory(productServiceUrl, payload, token),
      );

      setCategories((current) =>
        editingCategorySlug
          ? current.map((category) =>
              category.slug === editingCategorySlug ? response.data : category,
            )
          : [...current, response.data].sort((left, right) =>
              left.name.localeCompare(right.name),
            ),
      );
      setCategoryForm(emptyCategoryForm);
      setEditingCategorySlug(null);
      router.refresh();
      setMessage(
        editingCategorySlug
          ? "Category updated successfully."
          : "Category created successfully.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save category.",
      );
    } finally {
      mutationInFlight.current = false;
      setIsSaving(false);
    }
  };

  const handleCategoryDelete = async (category: CategoryRecord) => {
    if (!confirm(`Delete ${category.name}?`)) {
      return;
    }

    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await runAdminMutation((token) =>
        deleteCategory(productServiceUrl, category.slug, token),
      );
      setCategories((current) =>
        current.filter((item) => item.slug !== category.slug),
      );
      router.refresh();
      setMessage("Category deleted successfully.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete category. Remove or move its products first.",
      );
    } finally {
      mutationInFlight.current = false;
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Catalog Operations</Badge>
              <Badge variant={isReady ? "success" : "warning"}>
                {isReady ? "Admin session active" : "Sign in required"}
              </Badge>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Manage products and categories
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Update the details customers see, add something new, or organize
              your products into easy-to-browse categories.
            </p>
          </div>

          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={isSaving || !isReady}
            onClick={openCreateProduct}
          >
            <PackagePlus className="size-4" />
            Add product
          </Button>
        </div>

        {message ? (
          <div
            role="status"
            className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {message}
          </div>
        ) : null}
        {error && !isProductSheetOpen ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        ) : null}
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Products</h3>
            <p className="text-sm text-muted-foreground">
              {products.length} products on this page. Select a product to edit
              its details.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isSaving || !isReady}
            onClick={openCreateProduct}
          >
            <Plus className="size-4" />
            New product
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[minmax(0,1fr)_9rem_7rem] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground max-md:hidden">
            <span>Product</span>
            <span>Price</span>
            <span className="text-right">Actions</span>
          </div>
          {products.length === 0 ? (
            <div role="status" className="px-5 py-12 text-center">
              <PackagePlus
                className="mx-auto mb-3 size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="font-semibold">No products to show</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Adjust your filters, or add your first product to get started.
              </p>
            </div>
          ) : null}
          <div className="divide-y">
            {products.map((product) => (
              <article
                key={product.id}
                className="grid gap-3 bg-background px-4 py-4 md:grid-cols-[minmax(0,1fr)_9rem_7rem] md:items-center"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{product.name}</p>
                    <Badge variant="outline">{product.categorySlug}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {product.shortDescription}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{product.colors.length} colors</span>
                    <span>{product.sizes.length} sizes</span>
                  </div>
                </div>

                <div className="text-sm font-medium md:text-base">
                  {formatUsdFromCents(product.price)}
                </div>

                <div className="flex justify-start gap-2 md:justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={isSaving || !isReady}
                    onClick={() => openEditProduct(product)}
                  >
                    <Edit className="size-4" />
                    <span className="sr-only">Edit {product.name}</span>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={isSaving || !isReady}
                    onClick={() => void handleProductDelete(product)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete {product.name}</span>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {children}

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-md border bg-background p-2">
              <Tags className="size-4 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {editingCategorySlug ? "Edit Category" : "Add Category"}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Keep category slugs short and stable because storefront filters
                use them in URLs.
              </p>
            </div>
          </div>

          <form
            aria-busy={isSaving}
            className="mt-5 space-y-4"
            onSubmit={handleCategorySubmit}
          >
            <fieldset disabled={isSaving} className="space-y-4">
              <div className="space-y-2">
                <label className={fieldLabelClass} htmlFor="category-name">
                  Name
                </label>
                <Input
                  id="category-name"
                  required
                  placeholder="Accessories"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className={fieldLabelClass} htmlFor="category-slug">
                  Slug
                </label>
                <Input
                  id="category-slug"
                  placeholder={createSlug(categoryForm.name) || "accessories"}
                  value={categoryForm.slug}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      slug: createSlug(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={isSaving || !isReady}>
                  {editingCategorySlug ? (
                    <Save className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {editingCategorySlug ? "Save category" : "Add category"}
                </Button>
                {editingCategorySlug ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingCategorySlug(null);
                      setCategoryForm(emptyCategoryForm);
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Cancel
                  </Button>
                ) : null}
              </div>
            </fieldset>
          </form>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Categories</h3>
              <p className="text-sm text-muted-foreground">
                {categories.length} category records available to the
                storefront.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => (
              <article
                key={category.slug}
                className="rounded-lg border bg-background p-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{category.name}</p>
                    <p className="break-all text-xs text-muted-foreground">
                      {category.slug}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {category.productCount ?? 0}
                  </Badge>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={isSaving || !isReady}
                    onClick={() => {
                      setError(null);
                      setMessage(null);
                      setEditingCategorySlug(category.slug);
                      setCategoryForm({
                        name: category.name,
                        slug: category.slug,
                      });
                    }}
                  >
                    <Edit className="size-4" />
                    <span className="sr-only">Edit {category.name}</span>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={isSaving || !isReady}
                    onClick={() => void handleCategoryDelete(category)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete {category.name}</span>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <Sheet
        open={isProductSheetOpen}
        onOpenChange={(open) => {
          if (isSaving) return;
          setIsProductSheetOpen(open);
          if (!open) {
            resetProductForm();
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-3xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="text-xl">
              {editingProductId ? "Edit Product" : "Add Product"}
            </SheetTitle>
            <SheetDescription>
              Paste one image URL for every color, or use color mappings for
              variants. Root-relative storefront assets are also supported.
            </SheetDescription>
          </SheetHeader>

          <form
            aria-busy={isSaving}
            className="space-y-6 px-6 py-5"
            onSubmit={handleProductSubmit}
          >
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}
            <fieldset disabled={isSaving} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={fieldLabelClass} htmlFor="product-name">
                    Name
                  </label>
                  <Input
                    id="product-name"
                    required
                    placeholder="Transit Zip Hoodie"
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className={fieldLabelClass} htmlFor="product-price">
                    Price
                  </label>
                  <Input
                    id="product-price"
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    placeholder="74.90"
                    value={productForm.price}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className={fieldLabelClass}
                  htmlFor="product-short-description"
                >
                  Short description
                </label>
                <Input
                  id="product-short-description"
                  required
                  maxLength={60}
                  placeholder="Structured hoodie for layered daily wear."
                  value={productForm.shortDescription}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      shortDescription: event.target.value,
                    }))
                  }
                />
                <p className={fieldHintClass}>Maximum 60 characters.</p>
              </div>

              <div className="space-y-2">
                <label
                  className={fieldLabelClass}
                  htmlFor="product-description"
                >
                  Description
                </label>
                <textarea
                  id="product-description"
                  required
                  rows={5}
                  className={textareaClass}
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className={fieldLabelClass} htmlFor="product-category">
                    Category
                  </label>
                  <select
                    id="product-category"
                    required
                    className={selectClass}
                    value={productForm.categorySlug}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        categorySlug: event.target.value,
                      }))
                    }
                  >
                    <option value="" disabled>
                      Select category
                    </option>
                    {categoryOptions}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={fieldLabelClass} htmlFor="product-sizes">
                    Sizes
                  </label>
                  <Input
                    id="product-sizes"
                    required
                    value={productForm.sizes}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        sizes: event.target.value,
                      }))
                    }
                  />
                  <p className={fieldHintClass}>Comma separated.</p>
                </div>
                <div className="space-y-2">
                  <label className={fieldLabelClass} htmlFor="product-colors">
                    Colors
                  </label>
                  <Input
                    id="product-colors"
                    required
                    value={productForm.colors}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        colors: event.target.value,
                      }))
                    }
                  />
                  <p className={fieldHintClass}>Must match image keys.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className={fieldLabelClass} htmlFor="product-images">
                  Images by color
                </label>
                <textarea
                  id="product-images"
                  required
                  rows={5}
                  className={`${textareaClass} font-mono text-xs`}
                  placeholder={
                    "https://cdn.example.com/product.webp\n\nor\nblack=/products/product-black.png"
                  }
                  value={productForm.images}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      images: event.target.value,
                    }))
                  }
                />
                <p className={fieldHintClass}>
                  Accepts one HTTP(S) URL or root-relative path for all colors;
                  one URL per color in order; `color=URL`; `color: URL`; or a
                  JSON object. Common web formats include PNG, JPG/JPEG, WebP,
                  AVIF, and GIF.
                </p>
              </div>
            </fieldset>
            <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 border-t bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setIsProductSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !isReady}>
                {editingProductId ? (
                  <Save className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {isSaving
                  ? "Saving…"
                  : editingProductId
                    ? "Save product"
                    : "Add product"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default CatalogManager;
