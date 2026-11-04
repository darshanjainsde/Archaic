# Deploying Archaic Candles to Vercel + archaiccandles.com (Hostinger)

Takes about 30 minutes. You need: the GitHub repo, your Vercel account, the Hostinger login, and your Cashfree and/or Razorpay dashboards.

## 1. Import the project into Vercel
1. Go to vercel.com → **Add New… → Project** → import `darshanjainsde/Archaic`.
2. Framework preset: **Next.js** (auto-detected). Leave the build command as is — Vercel runs `npm run vercel-build`, which generates the Prisma client, applies database migrations and builds.
3. Don't deploy yet. First add storage and environment variables (steps 2–4).

## 2. Database (Postgres)
1. In the Vercel project: **Storage → Create Database → Neon (Postgres)**. Pick the **Mumbai (ap-south-1)** region (it matches `vercel.json`, which runs the app in Mumbai).
2. Connect it to the project. Vercel adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
3. Add one more variable, **`DIRECT_URL`**, with the same value as `DATABASE_URL_UNPOOLED`. Prisma migrations use it.

## 3. Image storage (Vercel Blob)
**Storage → Create → Blob** → connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`. Without it, images you upload in admin are not saved on Vercel.

## 4. Environment variables (Settings → Environment Variables)
| Name | Value |
| --- | --- |
| `AUTH_SECRET` | a long random string — run `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | `https://archaiccandles.com` |
| `ADMIN_EMAIL` | the email you want to log in to admin with |
| `ADMIN_PASSWORD` | a strong password, used once by the seed script |
| `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` | Cashfree dashboard → Developers → API Keys (production) |
| `CASHFREE_ENV` | `production` (or `sandbox` while testing with test keys) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay → Account & Settings → API Keys (optional) |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you type when creating the Razorpay webhook (step 7) |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional, for order and password-reset emails (resend.com) |

Now click **Deploy**.

## 5. Load the starter data (one time)
On your computer, in the project folder:
```bash
npm install
npx vercel link
npx vercel env pull .env
npm run db:seed
```
This creates your admin account, the store settings, categories, 12 sample products, policy pages and a `WELCOME10` coupon. Running it again does not overwrite anything you have changed.

Then sign in at `https://<your-project>.vercel.app/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` and open **/admin**.

## 6. Connect archaiccandles.com (Hostinger DNS)
1. Vercel → Project → **Settings → Domains** → add `archaiccandles.com` and `www.archaiccandles.com` (choose to redirect `www` to the apex).
2. Hostinger → **Domains → archaiccandles.com → DNS / Nameservers → Manage DNS records**:
   - Delete any existing **A** record for `@` and any **CNAME** for `www` (Hostinger adds parking records by default).
   - Add **A** · name `@` · points to `76.76.21.21` · TTL 3600
   - Add **CNAME** · name `www` · points to `cname.vercel-dns.com` · TTL 3600
   - If Vercel's Domains page shows different values for your project, use the values Vercel shows.
3. Wait for Vercel to show **Valid Configuration** (minutes to a few hours). HTTPS is issued automatically.
4. Keep any **MX** records Hostinger created if you use Hostinger email.

## 7. Payment webhooks (so payments are confirmed even if a customer closes the browser)
**Cashfree** → Developers → Webhooks → add `https://archaiccandles.com/api/webhooks/cashfree` (Payment events, latest version). Cashfree signs webhooks with your secret key, so no extra variable is needed. Also whitelist `archaiccandles.com` under Developers → Whitelisting if Cashfree asks for it.

**Razorpay** → Account & Settings → Webhooks → add `https://archaiccandles.com/api/webhooks/razorpay`, choose events `payment.captured`, `payment.failed`, `order.paid`, set a secret, and save the same secret as `RAZORPAY_WEBHOOK_SECRET` in Vercel (then redeploy).

In **Admin → Settings → Payments** you can turn Cashfree, Razorpay and Cash on Delivery on or off, and choose which gateway is shown first. A gateway only appears at checkout when it is switched on *and* its keys are set.

## 8. Before you launch
- Replace the drawn product images with your photographs (Admin → Products → each product → Images; and per-colour images in Options).
- Edit the policy pages (Admin → Pages): Shipping, Returns, Privacy, Terms, Contact. Payment gateways check these pages during KYC.
- Set your store phone, address and GSTIN in Admin → Settings.
- Change or delete the `WELCOME10` coupon.
- Place one real order with each payment method and cancel or refund it.

## Installing as an app
The site is a Progressive Web App. On Android/Chrome, customers see an "Install" prompt; on iPhone, Safari → Share → **Add to Home Screen**. It opens full-screen with its own icon (built from your theme colours) and shows an offline page if the connection drops.
