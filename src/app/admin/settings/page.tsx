import { getSettings, gatewayConfig } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  const g = gatewayConfig();
  return (
    <div>
      <PageHeader title="Settings" description="Store details, shipping, payments, membership and SEO." />
      <SettingsForm initial={s} gateways={{ ...g }} webhooks={{ razorpay: siteUrl("/api/webhooks/razorpay"), cashfree: siteUrl("/api/webhooks/cashfree") }} />
    </div>
  );
}
