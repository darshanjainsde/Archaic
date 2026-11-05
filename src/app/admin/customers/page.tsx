import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { tierForSpend } from "@/lib/membership";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { PageHeader, Table, Tag, Pagination, Empty, CardList, Card } from "@/components/admin/ui";

export const metadata = { title: "Customers" };
const PER = 30;

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; role?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = {
    ...(sp.role === "ADMIN" ? { role: "ADMIN" } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
  };
  const [users, total, s] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, _count: { select: { orders: true } } } }),
    db.user.count({ where }),
    getSettings(),
  ]);
  const spends = users.length
    ? await db.order.groupBy({ by: ["userId"], where: { userId: { in: users.map((u) => u.id) }, status: { notIn: ["PENDING_PAYMENT", "CANCELLED", "RETURNED", "REFUNDED"] }, OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }] }, _sum: { total: true } })
    : [];
  const spendMap = new Map(spends.map((x) => [x.userId, x._sum.total ?? 0]));
  return (
    <div>
      <PageHeader title="Customers" description={`${total} account${total === 1 ? "" : "s"}`} />
      <form className="mb-6 grid gap-2 @xl:grid-cols-[minmax(0,1fr)_180px_auto]">
        <input name="q" defaultValue={q} type="search" placeholder="Search name, email or phone…" aria-label="Search customers" autoComplete="off" className="field" />
        <select name="role" defaultValue={sp.role ?? ""} aria-label="Role" className="field"><option value="">Everyone</option><option value="ADMIN">Admins</option></select>
        <button className="btn btn-ink">Search</button>
      </form>
      {users.length === 0 ? <Empty>No customers found.</Empty> : (
        <>
        <CardList label="Customers">
          {users.map((u) => {
            const spend = spendMap.get(u.id) ?? 0;
            return (
              <Card key={u.id}>
                <Link href={`/admin/customers/${u.id}`} className="flex items-center gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[16px] font-semibold">{u.name}{u.role === "ADMIN" && <Tag tone="amber">Admin</Tag>}</span>
                    <span className="block truncate text-[14px] text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</span>
                    <span className="mt-1 block text-[14px] tabular-nums">{u._count.orders} order{u._count.orders === 1 ? "" : "s"} · {formatMoney(spend)}{s.membership.enabled ? ` · ${tierForSpend(s.membership.tiers, spend).current.name}` : ""}</span>
                  </span>
                  <ChevronRight size={20} aria-hidden className="shrink-0 text-muted" />
                </Link>
              </Card>
            );
          })}
        </CardList>
        <Table hideOnPhone>
          <thead><tr><th>Name</th><th>Contact</th><th>Orders</th><th>Lifetime spend</th><th>Tier</th><th>Joined</th></tr></thead>
          <tbody>
            {users.map((u) => {
              const spend = spendMap.get(u.id) ?? 0;
              return (
                <tr key={u.id}>
                  <td><Link className="font-semibold hover:underline" href={`/admin/customers/${u.id}`}>{u.name}</Link>{u.role === "ADMIN" && <span className="ml-2"><Tag tone="amber">Admin</Tag></span>}</td>
                  <td>{u.email}<div className="text-[13px] text-muted">{u.phone}</div></td>
                  <td className="tabular-nums">{u._count.orders}</td>
                  <td className="tabular-nums">{formatMoney(spend)}</td>
                  <td>{s.membership.enabled ? tierForSpend(s.membership.tiers, spend).current.name : "—"}</td>
                  <td className="whitespace-nowrap">{formatDate(u.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        </>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER)} makeHref={(p) => `/admin/customers?${new URLSearchParams({ ...(q && { q }), ...(sp.role && { role: sp.role }), page: String(p) })}`} />
    </div>
  );
}
