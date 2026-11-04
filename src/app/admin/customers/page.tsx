import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { tierForSpend } from "@/lib/membership";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PageHeader, Table, Tag, Pagination, Empty } from "@/components/admin/ui";

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
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" aria-label="Search customers" className="field !min-h-[40px] !py-2" />
        <select name="role" defaultValue={sp.role ?? ""} aria-label="Role" className="field !min-h-[40px] w-40 !py-2"><option value="">Everyone</option><option value="ADMIN">Admins</option></select>
        <button className="btn btn-ink btn-sm !min-h-[40px]">Search</button>
      </form>
      {users.length === 0 ? <Empty>No customers found.</Empty> : (
        <Table>
          <thead><tr><th>Name</th><th>Contact</th><th>Orders</th><th>Lifetime spend</th><th>Tier</th><th>Joined</th></tr></thead>
          <tbody>
            {users.map((u) => {
              const spend = spendMap.get(u.id) ?? 0;
              return (
                <tr key={u.id}>
                  <td><Link className="font-semibold hover:underline" href={`/admin/customers/${u.id}`}>{u.name}</Link>{u.role === "ADMIN" && <span className="ml-2"><Tag tone="amber">Admin</Tag></span>}</td>
                  <td>{u.email}<div className="text-[12px] text-muted">{u.phone}</div></td>
                  <td className="tabular-nums">{u._count.orders}</td>
                  <td className="tabular-nums">{formatMoney(spend)}</td>
                  <td>{s.membership.enabled ? tierForSpend(s.membership.tiers, spend).current.name : "—"}</td>
                  <td className="whitespace-nowrap">{formatDate(u.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER)} makeHref={(p) => `/admin/customers?${new URLSearchParams({ ...(q && { q }), ...(sp.role && { role: sp.role }), page: String(p) })}`} />
    </div>
  );
}
