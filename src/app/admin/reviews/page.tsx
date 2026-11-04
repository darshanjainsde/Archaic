import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Stars } from "@/components/ui/stars";
import { PageHeader, Tag, Empty, Pagination } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/action-form";
import { setReviewVisible, deleteReview } from "@/actions/admin/catalog";

export const metadata = { title: "Reviews" };
const PER = 30;

export default async function Reviews({ searchParams }: { searchParams: Promise<{ page?: string; filter?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.filter === "hidden" ? { isVisible: false } : sp.filter === "low" ? { rating: { lte: 2 } } : {};
  const [reviews, total] = await Promise.all([
    db.review.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { product: { select: { name: true, slug: true } }, user: { select: { name: true, email: true } } } }),
    db.review.count({ where }),
  ]);
  const tabs = [["", "All"], ["low", "1–2 stars"], ["hidden", "Hidden"]];
  return (
    <div>
      <PageHeader title="Reviews" description={`${total} review${total === 1 ? "" : "s"}`} />
      <div className="mb-4 flex gap-1 text-[14px]">
        {tabs.map(([v, l]) => <Link key={v} href={v ? `/admin/reviews?filter=${v}` : "/admin/reviews"} className={`rounded-md px-3 py-1.5 ${(sp.filter ?? "") === v ? "bg-ink text-bg" : "hover:bg-black/5"}`}>{l}</Link>)}
      </div>
      {reviews.length === 0 ? <Empty>No reviews here.</Empty> : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-black/10 bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Stars value={r.rating} size={15} />{r.isVerified && <Tag tone="green">Verified buyer</Tag>}{!r.isVisible && <Tag>Hidden</Tag>}</div>
                <span className="text-[13px] text-muted">{formatDate(r.createdAt)}</span>
              </div>
              {r.title && <b className="mt-2 block text-[15px]">{r.title}</b>}
              <p className="mt-1 whitespace-pre-line text-[14px]">{r.body}</p>
              <p className="mt-2 text-[13px] text-muted">{r.user.name} ({r.user.email}) on <a className="underline" href={`/product/${r.product.slug}`} target="_blank" rel="noreferrer">{r.product.name}</a></p>
              <div className="mt-2 flex gap-1 text-[13px]">
                <ConfirmButton className="rounded px-2 py-1 hover:bg-black/5" action={setReviewVisible.bind(null, r.id, !r.isVisible)}>{r.isVisible ? "Hide" : "Show"}</ConfirmButton>
                <ConfirmButton className="rounded px-2 py-1 text-sale hover:bg-red-50" confirmText="Delete this review permanently?" action={deleteReview.bind(null, r.id)}>Delete</ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER)} makeHref={(p) => `/admin/reviews?${new URLSearchParams({ ...(sp.filter && { filter: sp.filter }), page: String(p) })}`} />
    </div>
  );
}
