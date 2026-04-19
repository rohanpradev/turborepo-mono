import { getProduct, getProductServiceServerUrl } from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import ProductInteraction from "@/components/ProductInteraction";

const getSingleParam = (value?: string | Array<string>) =>
  Array.isArray(value) ? value[0] : value;

const getProductId = (value: string) => {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const loadProduct = async (id: number) => {
  try {
    const response = await getProduct(getProductServiceServerUrl(), id);
    return response.data;
  } catch {
    return null;
  }
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> => {
  const { id } = await params;
  const productId = getProductId(id);
  const product = productId ? await loadProduct(productId) : null;
  const primaryImage = product
    ? (product.images[product.colors[0] ?? ""] ??
      Object.values(product.images)[0] ??
      "/featured.png")
    : undefined;

  return {
    title: product?.name ?? "Product unavailable",
    description:
      product?.shortDescription ?? "The requested product is not available.",
    alternates: product ? { canonical: `/products/${product.id}` } : undefined,
    openGraph: product
      ? {
          title: product.name,
          description: product.shortDescription,
          url: `/products/${product.id}`,
          images: primaryImage
            ? [
                {
                  url: primaryImage,
                  alt: product.name,
                },
              ]
            : undefined,
        }
      : undefined,
  };
};

const ProductPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    color?: string | Array<string>;
    size?: string | Array<string>;
  }>;
}) => {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const productId = getProductId(id);

  if (!productId) {
    notFound();
  }

  const product = await loadProduct(productId);

  if (!product) {
    notFound();
  }

  const requestedSize = getSingleParam(resolvedSearchParams.size);
  const requestedColor = getSingleParam(resolvedSearchParams.color);
  const selectedSize =
    product.sizes.find((size) => size === requestedSize) ??
    product.sizes[0] ??
    "";
  const selectedColor =
    product.colors.find((color) => color === requestedColor) ??
    product.colors[0] ??
    "";
  const selectedImage =
    product.images[selectedColor] ??
    Object.values(product.images)[0] ??
    "/featured.png";

  return (
    <div className="mt-8 flex flex-col gap-6 md:gap-12 lg:mt-12 lg:flex-row">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-gray-50 lg:w-5/12">
        <Image
          src={selectedImage}
          alt={product.name}
          fill
          priority
          className="object-contain rounded-md"
          sizes="(min-width: 1024px) 40vw, 100vw"
        />
      </div>
      <div className="flex w-full flex-col gap-4 lg:w-7/12">
        <h1 className="text-2xl font-medium">{product.name}</h1>
        <p className="text-gray-500">{product.description}</p>
        <h2 className="text-2xl font-semibold">
          {formatUsdFromCents(product.price)}
        </h2>
        <ProductInteraction
          product={product}
          selectedSize={selectedSize}
          selectedColor={selectedColor}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Image
            src="/klarna.png"
            alt="klarna"
            width={50}
            height={25}
            className="rounded-md"
          />
          <Image
            src="/cards.png"
            alt="cards"
            width={50}
            height={25}
            className="rounded-md"
          />
          <Image
            src="/stripe.png"
            alt="stripe"
            width={50}
            height={25}
            className="rounded-md"
          />
        </div>
        <p className="text-gray-500 text-xs">
          By clicking Pay Now, you agree to our{" "}
          <span className="underline hover:text-black">Terms & Conditions</span>{" "}
          and <span className="underline hover:text-black">Privacy Policy</span>
          . You authorize us to charge your selected payment method for the
          total amount shown.
        </p>
      </div>
    </div>
  );
};

export default ProductPage;
