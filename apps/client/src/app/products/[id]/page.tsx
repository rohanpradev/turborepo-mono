import { getProduct, getProductServiceServerUrl } from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import Image from "next/image";
import ProductInteraction from "@/components/ProductInteraction";

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
}) => {
  const { id } = await params;
  const product = await loadProduct(Number(id));

  return {
    title: product?.name ?? "Product unavailable",
    description:
      product?.description ?? "The requested product is not available.",
  };
};

const ProductPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ color?: string; size?: string }>;
}) => {
  const [{ id }, { size, color }] = await Promise.all([params, searchParams]);
  const product = await loadProduct(Number(id));

  if (!product) {
    return (
      <div className="mt-12 rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
        This product could not be loaded right now.
      </div>
    );
  }

  const selectedSize = size || product.sizes[0] || "";
  const selectedColor = color || product.colors[0] || "";
  const selectedImage =
    product.images[selectedColor] ??
    product.images[product.colors[0] ?? ""] ??
    "";

  return (
    <div className="flex flex-col gap-4 lg:flex-row md:gap-12 mt-12">
      <div className="w-full lg:w-5/12 relative aspect-[2/3]">
        <Image
          src={selectedImage}
          alt={product.name}
          fill
          className="object-contain rounded-md"
        />
      </div>
      <div className="w-full lg:w-7/12 flex flex-col gap-4">
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
        <div className="flex items-center gap-2 mt-4">
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
