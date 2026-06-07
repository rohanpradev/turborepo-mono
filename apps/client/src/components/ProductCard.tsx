import { formatUsdFromCents } from "@repo/types";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import ProductCardActions from "@/components/ProductCardActions";
import { Badge } from "@/components/ui/badge";
import { getPrimaryProductImage } from "@/lib/catalog";
import type { ProductType } from "@/types";

const ProductCard = ({
  eager = false,
  product,
}: {
  eager?: boolean;
  product: ProductType;
}) => {
  const previewImage = getPrimaryProductImage(product);

  return (
    <article className="group flex h-full min-h-[38rem] min-w-0 flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)]">
      <Link href={`/products/${product.id}` as Route} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f5f7f2]">
          <Image
            src={previewImage}
            alt={product.name}
            fill
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            className="object-contain p-5 transition-transform duration-700 group-hover:scale-105"
            sizes="(min-width: 1536px) 18rem, (min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f766e,#f97316,#111827)]" />
          <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-white/90 text-gray-950">
              New
            </Badge>
            <Badge
              variant="outline"
              className="hidden bg-white/80 text-gray-700 min-[380px]:inline-flex"
            >
              Ships fast
            </Badge>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-1">
          <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-6 text-gray-950">
              {product.name}
            </h3>
            <p className="max-w-24 break-words text-right text-sm font-medium text-gray-950">
              {formatUsdFromCents(product.price)}
            </p>
          </div>
          <p className="line-clamp-2 min-h-12 text-sm leading-6 text-gray-600">
            {product.shortDescription}
          </p>
        </div>

        <ProductCardActions product={product} />
      </div>
    </article>
  );
};

export default ProductCard;
