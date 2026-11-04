# Archaic Candles — storefront & admin

An e-commerce site for a candle and gifting business, built with Next.js 16, PostgreSQL (Prisma), Tailwind CSS 4, and Cashfree / Razorpay / Cash on Delivery payments. It installs as an app (PWA).

**Deploying:** see [DEPLOYMENT.md](./DEPLOYMENT.md) (Vercel + Hostinger DNS + payment webhooks).

## What's inside
**Storefront**
- Homepage made of sections you arrange in admin (hero, categories, product rows, promo banner, story, membership, reviews, newsletter, rich text).
- Shop with category, price and stock filters, search, sorting and pagination.
- Product page where the customer picks **scent, wax colour, label theme, size** (any options you define). The price and photo update as they choose. They can add a **personalised label message**, and there is gifting.
- Bag with live server prices, coupons, gift wrap and a gift message, and a free-shipping progress bar.
- Checkout with saved addresses and Cashfree, Razorpay or COD.
- Customer accounts: order history, a **status timeline with courier tracking**, cancel / pay-now / return / buy-again, invoices, addresses and profile.
- **Membership tiers** (The Archaic Circle). Lifetime spend unlocks automatic discounts and free gift wrap.
- Public order tracking by order number and email, wishlist, reviews with "verified buyer" marks, and CMS pages.
- PWA: installable, offline page, app-style bottom tab bar on phones.

**Admin (`/admin`)**
- Dashboard with revenue, orders to ship, refunds due, low stock and setup warnings.
- Products with image upload, drag-drop and reordering, plus an **option builder** (swatches, buttons, dropdowns; per-value price, image and availability), specs, personalisation, SEO, and draft/active/archive.
- Orders: status updates with customer-visible notes, courier and tracking number, refunds and packing slips.
- Categories, customers (with tiers and admin roles), coupons, banners and ads, pages, and review moderation.
- **Appearance (site builder):** theme presets, every colour, fonts, corner radius and button shape with a live preview; logo, announcement bar, menu, homepage sections (add, reorder, edit, toggle) and footer.
- Settings: shipping, COD, gateways, returns, delivery estimates, membership tiers and SEO.

## Local development
```bash
cp .env.example .env        # fill DATABASE_URL, DIRECT_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```
Open http://localhost:3000 and sign in at /login with the admin credentials.

## How money and payments work
- All amounts are stored as integer **paise**. Prices are always recomputed on the server from the database (`src/lib/orders.ts → quoteCart`); prices sent by the browser are never trusted.
- An order is created as *Awaiting payment*. It is confirmed only after the gateway's signature or status is verified (`markOrderPaid`). That function is idempotent, so the browser callback and the webhook can both run safely.
- Stock is deducted once, when an order is confirmed, and returned when it is cancelled, returned or refunded.
- A payment that arrives after an order was cancelled is flagged in admin as a refund due.

## Project map
```
prisma/schema.prisma        data model        prisma/seed.ts   starter data
src/lib/                    settings, auth, pricing, orders, payments (cashfree.ts, razorpay.ts), email
src/app/(store)/            storefront, checkout, account
src/app/admin/              admin panel & site builder
src/app/api/                uploads, payment webhooks
public/sw.js                service worker
scripts/make-art.mjs        generates the placeholder product drawings
```
