import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/actions/auth";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const hidden = user.emailVerified ? 0 : await db.order.count({ where: { userId: user.id, isGuest: true } });
  return (
    <div className="container-x py-8 md:py-14">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-4 hidden text-[15px] text-muted lg:block">Signed in as<br /><span className="text-ink">{user.email}</span></p>
          <AccountNav isAdmin={user.role === "ADMIN"} />
        </aside>
        <div className="min-w-0">
          {!user.emailVerified && (
            <form action={sendVerificationEmail} className="mb-8 flex flex-col gap-3 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderRadius: "var(--radius)" }}>
              <p className="text-[15px] leading-snug">{hidden > 0 ? <><b>{hidden} order{hidden > 1 ? "s" : ""} placed as a guest</b> with this email {hidden > 1 ? "are" : "is"} waiting.</> : "Confirm your email to see any order you place without signing in."} We’ll send a confirmation link to <b>{user.email}</b>.</p>
              <button type="submit" className="btn btn-primary btn-sm shrink-0">Send confirmation link</button>
            </form>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
