import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="container-x flex min-h-[70dvh] flex-col items-start justify-center gap-5 py-20">
      <h1 className="text-[48px] md:text-[80px]">This wick has gone out</h1>
      <p className="max-w-md text-[17px]">We couldn’t find that page. It may have moved, or the product is no longer poured.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/shop" className="btn btn-primary">Browse the shop</Link>
        <Link href="/" className="btn btn-ghost">Back home</Link>
      </div>
    </main>
  );
}
