import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <div className="mt-12 grid gap-8 rounded-[1.75rem] border border-black/5 bg-[#171717] p-6 text-white shadow-sm sm:grid-cols-2 sm:p-8 xl:grid-cols-4">
      <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Commerce" width={36} height={36} />
          <p className="hidden text-md font-medium tracking-[0.24em] text-white md:block">
            COMMERCE
          </p>
        </Link>
        <p className="text-sm text-white/60">© 2025 Commerce.</p>
        <p className="text-sm text-white/60">All rights reserved.</p>
      </div>
      <div className="flex flex-col items-center gap-4 text-sm text-white/60 sm:items-start">
        <p className="text-sm text-white">Links</p>
        <Link href="/">Homepage</Link>
        <Link href="/">Contact</Link>
        <Link href="/">Terms of Service</Link>
        <Link href="/">Privacy Policy</Link>
      </div>
      <div className="flex flex-col items-center gap-4 text-sm text-white/60 sm:items-start">
        <p className="text-sm text-white">Catalog</p>
        <Link href="/">All Products</Link>
        <Link href="/">New Arrivals</Link>
        <Link href="/">Best Sellers</Link>
        <Link href="/">Sale</Link>
      </div>
      <div className="flex flex-col items-center gap-4 text-sm text-white/60 sm:items-start">
        <p className="text-sm text-white">Company</p>
        <Link href="/">About</Link>
        <Link href="/">Contact</Link>
        <Link href="/">Blog</Link>
        <Link href="/">Affiliate Program</Link>
      </div>
    </div>
  );
};

export default Footer;
