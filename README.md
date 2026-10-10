# SupreCart

i want to build a website, i need it exactly like the template attached. My stack is html, css, tailwind, javascript, python, and node, create a github repo while you are at it, note that the name is SupreCart, i would be uploading the logo after first build and deployment

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/50351802-7276-4458-aeb5-ac7ab9e11705).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

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

### Supabase setup and troubleshooting notes

Use these notes when configuring Supabase for a new local checkout or diagnosing the connection:

- **URL and key were entered in the wrong fields:** `VITE_SUPABASE_URL` must contain the project's HTTPS base URL, for example `https://<project-ref>.supabase.co`. `VITE_SUPABASE_ANON_KEY` must contain the project's anon/publishable key. Do not put a key in the URL field, and never expose a service-role key in a `VITE_` variable. The client warns if the URL contains a path such as `/rest/v1/` and uses only the origin, but the base URL is the correct setting.
- **Environment changes did not appear to take effect:** put the values in the repository-root `.env.local`, then stop and restart the relevant Vite development server. The main app and standalone seller portal both use these shared Supabase variables.
- **Seller verification email opens the wrong site (such as `localhost:3000`):** in Supabase **Authentication → URL Configuration**, set **Site URL** to the production site, then add the exact callback URL used by this app to **Redirect URLs** (embedded local example: `http://127.0.0.1:8081/sellers`; standalone local example: `http://127.0.0.1:8082/`). Seller signup and password reset choose `/sellers` when embedded and `/` when standalone. For a custom deployment callback, set `VITE_SELLER_AUTH_REDIRECT_URL` in the repository-root `.env.local` and allowlist that exact URL in Supabase; restart Vite after changing the environment. If you customized the Supabase confirmation email, its link should use `{{ .ConfirmationURL }}`, not a hardcoded localhost URL. Verification should be opened in the same browser that holds the saved application draft. See [seller portal setup](./seller-portal/README.md) for production examples.
- **The SQL migration reported “Success, no rows returned”:** this is expected for migrations made up of schema changes, policies, grants, and functions. They generally do not return a result table. A success response means the SQL ran; it does not by itself confirm application-level access or resolve every Supabase security warning.
- **The migration reported `policy "Buyers manage own profile" ... already exists`:** this means the initial marketplace migration (or at least that policy statement) had already been applied. Do not remove the existing policy manually. If the goal is only to fix the view-security warning, run [supabase/migrations/20261009120000_fix_views.sql](./supabase/migrations/20261009120000_fix_views.sql), not the initial migration again. The initial migration in this repository now drops and recreates its named policies so it can be re-run safely when necessary.
- **Auth connectivity was checked separately:** a successful Supabase Auth response confirmed that the configured project URL and key could reach Auth. That check did not prove that marketplace tables and views existed; those are created by the marketplace migration.
- **Supabase flagged `public.public_seller_profiles` and `public.seller_product_ratings` as SECURITY DEFINER views:** the original view definitions used `security_invoker = false`, causing them to run with the view owner's permissions instead of the querying user's. The repository migration was corrected to use `security_invoker = true`, and the follow-up migration re-creates both views with that option while preserving their `SELECT` grants. Run the follow-up migration against the hosted project to apply the fix there, then re-check the Supabase security/advisor finding and test the views as the intended roles. Until that hosted step is confirmed, treat the live database fix as pending.

For an existing Supabase project that already ran the marketplace migration, run only the follow-up migration in the Supabase SQL Editor or your normal migration workflow to fix the views; do not re-run the entire initial migration just to change the views. For a new project, run all migrations in timestamp order. With invoker-security views, access is also constrained by the querying role's permissions and the underlying tables' RLS policies, so validate the intended anonymous and authenticated read paths after applying the change.

### Chat, location, checkout, and cookies

- Buyers can start a conversation from a **live Supabase product** before or after purchase; buyers and sellers can continue it from `/messages`. Conversations are private to their participants. Text chat, realtime updates, read receipts, and voice notes are stored through Supabase. Voice notes have a 25 MB file-size cap and no application-imposed duration limit.
- Doorstep delivery captures a Kwara LGA, community, street address, optional landmark, and optional browser GPS coordinates. Pickup checkout uses active rows in `public.pickup_stations`.
- The app's checkout is still a preview: it does not create an order, send an order to a seller, or collect payment. Delivery selection, address storage, fees, and station details are currently test/setup features, not a live dispatch system.
- The cookie banner records only the visitor's accept/reject choice in a first-party preference cookie. Optional analytics/marketing cookies are not currently installed; accepting does not enable a third-party tracker.

## Third-party services and verification providers

The project is currently wired to the following providers and services:

- **Supabase** — shared database, authentication, storage buckets, and RLS-backed marketplace tables.
- **Twilio** — email and phone verification / messaging integration for account verification flows and contact workflows.
- **Lovable** — project scaffolding and editor workflow used during build and iteration.
- **Vite** — local development server, build tooling, and frontend bundling.
- **Tailwind CSS** — styling system used across storefront and seller portal UI.
- **React + TanStack Router + TanStack Start** — frontend application structure and routing.
- **GitHub** — repository hosting and version control.

### Payment / premium services note

The following are not yet enabled as live production services in this repo unless you explicitly add them later:

- Stripe / Paystack / Flutterwave / other payment processing providers for seller payout settlement and buyer checkout.
- SMTP or transactional email providers beyond the default Supabase/Auth configuration.
- Any premium analytics or monitoring tool you decide to add later.

Use this section as the source of truth for which services are integrated now and which ones are waiting for future activation. Twilio is currently the verification provider for email and phone-related flows in this app setup.

## Twilio verification setup checklist

Use this checklist when you are ready to turn on Twilio-based email and phone verification for the user flows.

1. Create a Twilio account and purchase a phone number if you want SMS verification or message sending.
2. Open your Twilio console and copy your **Account SID**, **Auth Token**, and **Phone Number**.
3. Create a Verify Service in Twilio and copy its **Service SID**. This is the value used for OTP email/phone verification.
4. If you are using a messaging service for SMS, copy the **Messaging Service SID** as well.
5. Set the values in `.env.local` using the variables in [.env.example](./.env.example):
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `TWILIO_VERIFY_SERVICE_SID`
   - `TWILIO_MESSAGING_SERVICE_SID`
   - `TWILIO_EMAIL_FROM`
6. Configure the app to call Twilio Verify for OTP/email and phone validation flows, instead of relying only on Supabase's default email confirmation.
7. Add the Twilio webhook or callback endpoints you need for any verification or message confirmation flows. Keep them behind secure auth where required.
8. Test the verification flow with a real mobile number and a real email address before going live.
9. For premium or production use, consider a dedicated email sending domain, alerting, and rate-limit monitoring to avoid delivery issues and abuse.

### Future premium services

Any additional paid services you decide to add later should be tracked here in the same way so you always know what is already live, what is in testing, and what is waiting to be paid for.
