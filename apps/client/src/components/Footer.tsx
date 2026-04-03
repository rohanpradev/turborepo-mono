import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <div className="mt-16 grid gap-8 rounded-lg bg-gray-800 p-6 sm:grid-cols-2 sm:p-8 xl:grid-cols-4">
      <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="TrendLama" width={36} height={36} />
          <p className="hidden md:block text-md font-medium tracking-wider text-white">
            TRENDLAMA.
          </p>
        </Link>
        <p className="text-sm text-gray-400">© 2025 Trendlama.</p>
        <p className="text-sm text-gray-400">All rights reserved.</p>
      </div>
      <div className="flex flex-col items-center gap-4 text-sm text-gray-400 sm:items-start">
        <p className="text-sm text-amber-50">Links</p>
        <Link href="/">Homepage</Link>
        <Link href="/">Contact</Link>
        <Link href="/">Terms of Service</Link>
        <Link href="/">Privacy Policy</Link>
      </div>
      <div className="flex flex-col items-center gap-4 text-sm text-gray-400 sm:items-start">
        <p className="text-sm text-amber-50">Catalog</p>
        <Link href="/">All Products</Link>
        <Link href="/">New Arrivals</Link>
        <Link href="/">Best Sellers</Link>
        <Link href="/">Sale</Link>
      </div>
      <div className="flex flex-col items-center gap-4 text-sm text-gray-400 sm:items-start">
        <p className="text-sm text-amber-50">Company</p>
        <Link href="/">About</Link>
        <Link href="/">Contact</Link>
        <Link href="/">Blog</Link>
        <Link href="/">Affiliate Program</Link>
      </div>
    </div>
  );
};

export default Footer;
