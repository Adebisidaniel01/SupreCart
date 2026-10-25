# SupreCart

SupreCart is a two-sided online marketplace: a **buyer storefront** for browsing and shopping a demo catalog, and a **seller portal** for applying to sell, listing products, and tracking sales. Both sides run from one codebase against one Supabase project and one set of marketplace tables, so buyer and seller activity stays in sync.

The app is built with **TanStack Start (React)**, **TanStack Router**, and **Tailwind CSS v4**. It is currently a preview/demo build: the catalog, orders, and dashboard figures are for interface testing only. Checkout does not create real orders, collect payment, or settle seller payouts until real inventory, checkout, and payment processing are connected.

Key areas:

- **Storefront** (`/`, `/shop`) — browse the demo catalog, product pages, cart, and checkout preview.
- **Buyer account** (`/account`) — profile, orders, messages, and settings such as notifications, region & language, saved payment methods, and security.
- **Messages** (`/messages`) — buyer/seller chat with realtime updates, read receipts, and voice notes (live via Supabase).
- **Seller studio** (`/sellers`) — approved buyers manage products, orders, payouts, and settings including store profile, fulfilment, bank details, notifications, region, payments, and security. Seller applications start from the buyer dashboard at `/account#seller`.

See [seller-portal/README.md](./seller-portal/README.md) for seller-side setup and database details.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Seller portal and shared marketplace database

The seller application, seller dashboard, and buyer marketplace use one Supabase project. Follow the setup and financial-safety notes in [seller-portal/README.md](./seller-portal/README.md), configure `.env.local` from [.env.example](./.env.example), and run the shared database migrations in timestamp order:

1. [supabase/migrations/20261009000000_marketplace.sql](./supabase/migrations/20261009000000_marketplace.sql)
2. [supabase/migrations/20261009120000_fix_views.sql](./supabase/migrations/20261009120000_fix_views.sql)
3. [supabase/migrations/20261010100000_chat_delivery.sql](./supabase/migrations/20261010100000_chat_delivery.sql)

The second migration updates the seller-related views to use invoker permissions so queries are subject to the querying user's grants and row-level security (RLS). The third migration adds product chats, read receipts, private voice-note storage, buyer delivery addresses, Kwara delivery settings, and editable pickup stations. The buyer-facing `/shop` lists published products from approved sellers after the database is configured.

The pickup stations included in the chat/delivery migration are clearly labeled test locations; replace their sample addresses before using pickup in real operations. The doorstep fee defaults to ₦0 for testing and can be changed by an authorized project operator in `public.delivery_settings`.

Seller withdrawals are recorded as requests, not transferred funds. Connect and verify payment processing, order reconciliation, and payout review before using the system for real transactions.

### SupreCart seller commission policy

SupreCart charges a commission on the selling price of each item when an order is delivered. The tiers are defined once in [`src/lib/commission.ts`](./src/lib/commission.ts) and shown to sellers in the portal (product form preview, product list, payout panel, and the **Commission & fees** settings tab):

- **Below ₦1,500** — 7.5% of the selling price (e.g. a ₦1,000 item → ₦75 commission).
- **₦1,500 – ₦5,000** — ₦150 + 7.5% of the selling price.
- **Above ₦5,000** — 11% of the selling price.

The seller receives the selling price minus this commission. There is no listing or subscription fee. In this preview the commission is calculated in the browser and shown for guidance only; it is not yet enforced in the database or on a real checkout.

### Seller verification, held funds, and profile details

- **Verified sellers:** `seller_applications.verified` (added by [`supabase/migrations/20261015000000_seller_verification.sql`](./supabase/migrations/20261015000000_seller_verification.sql)) is the source of truth for the **Verified seller** badge and is exposed on `public.public_seller_profiles`. There is no admin UI: authorized operators set it directly in Supabase, for example `update public.seller_applications set verified = true where id = '<seller-uuid>';`. The seller portal shows **Verified seller** or **Verification pending** from this flag; the server query falls back to non-verified if the column has not been migrated yet.
- **Money held by SupreCart (escrow):** the seller dashboard shows a **Held by SupreCart** card totalling `order_items.seller_net` for orders that are paid but not yet delivered (`processing`, `in_transit`, `paid`, `shipped`). Held funds are released to the seller's available balance only when the order is delivered; if a sale does not complete it is never credited. This is a browser-side preview calculation.
- **Profile photos:** buyers (`/account` → Profile) and sellers (seller portal → Account) can add, change, or remove a profile photo. Photos are read from the file picker and stored as a data URL in browser `localStorage` only; nothing is uploaded.
- **Payout bank details:** the seller payout form and signup bank field use a dropdown of major Nigerian banks, licensed microfinance banks, and payment providers (see `nigerianBanks` in [`src/lib/account-preferences.ts`](./src/lib/account-preferences.ts)). The 10-digit account number is still entered manually.
- **Withdrawals:** the seller dashboard has a **Withdraw** button that opens the payout-request form (the same non-transferring request used in the Withdrawals section). It never moves real money.

### Supabase setup and troubleshooting notes

Use these notes when configuring Supabase for a new local checkout or diagnosing the connection:

- **URL and key were entered in the wrong fields:** `VITE_SUPABASE_URL` must contain the project's HTTPS base URL, for example `https://<project-ref>.supabase.co`. `VITE_SUPABASE_ANON_KEY` must contain the project's anon/publishable key. Do not put a key in the URL field, and never expose a service-role key in a `VITE_` variable. The client warns if the URL contains a path such as `/rest/v1/` and uses only the origin, but the base URL is the correct setting.
- **Environment changes did not appear to take effect:** put the values in the repository-root `.env.local`, then stop and restart the relevant Vite development server. The main app and standalone seller portal both use these shared Supabase variables.
- **Seller verification email opens the wrong site (such as `localhost:3000`):** in Supabase **Authentication → URL Configuration**, set **Site URL** to the production site, then add the exact callback URL used by this app to **Redirect URLs** (embedded local example: `http://localhost:5173/sellers`; standalone local example: `http://127.0.0.1:8082/`). Seller signup and password reset choose `/sellers` when embedded and `/` when standalone. For a custom deployment callback, set `VITE_SELLER_AUTH_REDIRECT_URL` in the repository-root `.env.local` and allowlist that exact URL in Supabase; restart Vite after changing the environment. If you customized the Supabase confirmation email, its link should use `{{ .ConfirmationURL }}`, not a hardcoded localhost URL. Verification should be opened in the same browser that holds the saved application draft. See [seller portal setup](./seller-portal/README.md) for production examples.
- **The SQL migration reported “Success, no rows returned”:** this is expected for migrations made up of schema changes, policies, grants, and functions. They generally do not return a result table. A success response means the SQL ran; it does not by itself confirm application-level access or resolve every Supabase security warning.
- **The migration reported `policy "Buyers manage own profile" ... already exists`:** this means the initial marketplace migration (or at least that policy statement) had already been applied. Do not remove the existing policy manually. If the goal is only to fix the view-security warning, run [supabase/migrations/20261009120000_fix_views.sql](./supabase/migrations/20261009120000_fix_views.sql), not the initial migration again. The initial migration in this repository now drops and recreates its named policies so it can be re-run safely when necessary.
- **Auth connectivity was checked separately:** a successful Supabase Auth response confirmed that the configured project URL and key could reach Auth. That check did not prove that marketplace tables and views existed; those are created by the marketplace migration.
- **Supabase flagged `public.public_seller_profiles` and `public.seller_product_ratings` as SECURITY DEFINER views:** the original view definitions used `security_invoker = false`, causing them to run with the view owner's permissions instead of the querying user's. The repository migration was corrected to use `security_invoker = true`, and the follow-up migration re-creates both views with that option while preserving their `SELECT` grants. Run the follow-up migration against the hosted project to apply the fix there, then re-check the Supabase security/advisor finding and test the views as the intended roles. Until that hosted step is confirmed, treat the live database fix as pending.

For an existing Supabase project that already ran the marketplace migration, run only the follow-up migration in the Supabase SQL Editor or your normal migration workflow to fix the views; do not re-run the entire initial migration just to change the views. For a new project, run all migrations in timestamp order. With invoker-security views, access is also constrained by the querying role's permissions and the underlying tables' RLS policies, so validate the intended anonymous and authenticated read paths after applying the change.

### Local demo accounts

For local data testing only, the buyer login accepts the two preview email addresses in
`src/lib/demo-accounts.ts` without a password or email verification. Both are buyers first, and the Shewa account has
a pre-approved local seller application so the seller studio can be tested. New seller applications start from the
buyer dashboard and wait for approval on the admin dashboard. These are browser-local identities, not Supabase users
or database rows. Buyer and seller dashboards show fictional sample orders, product metrics, and NGN values for
interface testing only; they do not represent real purchases, payouts, or financial records. Demo profile name and
phone edits are stored in local browser storage and do not change Supabase data or login credentials. This behavior is
compiled out of production builds and must not be used to authenticate real users.

### Chat, location, checkout, and cookies

- Buyers can start a conversation from a **live Supabase product** before or after purchase; buyers and sellers can continue it from `/messages`. Conversations are private to their participants. Text chat, realtime updates, read receipts, and voice notes are stored through Supabase. Voice notes have a 25 MB file-size cap and no application-imposed duration limit.
- Doorstep delivery captures a Kwara LGA, community, street address, optional landmark, and optional browser GPS coordinates. Pickup checkout uses active rows in `public.pickup_stations`.
- The app's checkout is still a preview: it does not create an order, send an order to a seller, or collect payment. Delivery selection, address storage, fees, and station details are currently test/setup features, not a live dispatch system.
- The cookie banner (on the storefront and the standalone seller portal) records the visitor's choice in a single first-party preference cookie. Visitors can accept, reject, or manage optional cookies; the essential cookie only remembers that choice. Analytics cookies are optional and off by default: Google Analytics only loads after a visitor accepts analytics and `VITE_GA_MEASUREMENT_ID` is configured. Marketing cookies are not installed. See the cookie policy at `/info/cookies`.

## Third-party services

The project is currently wired to the following providers and services:

- **Supabase** — shared database, authentication, storage buckets, and RLS-backed marketplace tables.
- **Google Analytics 4** — consented storefront and seller-studio usage analytics. Set `VITE_GA_MEASUREMENT_ID` in `.env.local` (or the hosting environment) to enable it; leaving the variable empty disables all tracking.
- **Lovable** — project scaffolding and editor workflow used during build and iteration.
- **Vite** — local development server, build tooling, and frontend bundling.
- **Tailwind CSS** — styling system used across storefront and seller portal UI.
- **React + TanStack Router + TanStack Start** — frontend application structure and routing.
- **GitHub** — repository hosting and version control.

### Payment / premium services note

The following are not yet enabled as live production services in this repo unless you explicitly add them later:

- Stripe / Paystack / Flutterwave / other payment processing providers for seller payout settlement and buyer checkout.
- SMTP or transactional email providers beyond the default Supabase/Auth configuration.
- Any other premium analytics or monitoring tool you decide to add later.

Use this section as the source of truth for which services are integrated now and which ones are waiting for future activation.

### Google Analytics setup

1. Create a GA4 property in Google Analytics and copy its measurement ID (`G-XXXXXXXXXX`).
2. Add `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to `.env.local` (and to the hosting environment for production), then restart or redeploy.
3. Accept analytics in the cookie banner and use GA4 Realtime or Admin DebugView to confirm page views and events. Development builds send `debug_mode`, so local events appear in DebugView. Visitors who reject analytics are not tracked.

Tracked activity includes page views, scroll depth, outbound clicks, searches and filters, product views, add/remove cart, wishlist changes, begin checkout, shipping selection, preview order confirmations, buyer sign-up and login, seller application submissions, newsletter interest, contact-seller clicks, seller studio page changes and runtime exceptions. Checkout is still a preview, so confirmations use the custom `preview_order_created` event rather than a revenue-bearing `purchase` event.

### Future premium services

Any additional paid services you decide to add later should be tracked here in the same way so you always know what is already live, what is in testing, and what is waiting to be paid for.
