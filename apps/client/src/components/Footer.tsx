import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="mt-12 grid gap-8 rounded-lg border border-black/10 bg-[#171717] p-6 text-white shadow-sm sm:grid-cols-2 sm:p-8 xl:grid-cols-4">
      <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Commerce" width={36} height={36} />
          <p className="hidden text-md font-medium tracking-[0.24em] text-white md:block">
            COMMERCE
          </p>
        </Link>
        <p className="max-w-xs text-sm leading-6 text-white/60">
          A focused storefront for curated essentials, fast browsing, and a
          clean checkout path.
        </p>
        <p className="text-sm text-white/50">© 2026 Commerce.</p>
      </div>
      <div className="flex flex-col items-center gap-4 text-sm text-white/60 sm:items-start">
        <p className="text-sm text-white">Links</p>
        <Link href="/">Homepage</Link>
        <Link href="/products">Products</Link>
        <Link href="/cart" prefetch={false}>
          Cart
        </Link>
        <Link href="/orders" prefetch={false}>
          Orders
        </Link>
      </div>
      <div className="flex flex-col items-center gap-4 text-sm text-white/60 sm:items-start">
        <p className="text-sm text-white">Catalog</p>
        <Link href="/products">All Products</Link>
        <Link href="/products?sort=newest">New Arrivals</Link>
        <Link href="/products?sort=asc">Under Budget</Link>
        <Link href="/products?sort=desc">Premium Picks</Link>
      </div>
      <div className="flex flex-col items-center gap-4 text-sm text-white/60 sm:items-start">
        <p className="text-sm text-white">Service</p>
        <span>Secure payments</span>
        <span>Live order status</span>
        <span>Curated inventory</span>
        <span>Fast support flow</span>
      </div>
    </footer>
  );
};

export default Footer;
