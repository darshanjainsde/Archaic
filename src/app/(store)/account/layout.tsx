import { requireUser } from "@/lib/auth";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="container-x py-8 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-4 hidden text-[15px] text-muted lg:block">Signed in as<br /><span className="text-ink">{user.email}</span></p>
          <AccountNav isAdmin={user.role === "ADMIN"} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
