# SupreCart Seller Portal

The portal source lives in this folder and is available within the main TanStack Start app at `/sellers`. It is also a separately runnable site: run `npm run dev:sellers` from the repository root to serve it on port 8082, or `npm run build:sellers` to build the independent portal. Both experiences import the same Supabase client configuration and project as the storefront; buyers and sellers use the same database and auth service. When deploying the seller site separately, set `VITE_MARKETPLACE_URL` to the buyer storefront's public URL so the logo and Marketplace links lead back to the store.

## Connect the shared database

1. Create a Supabase project.
2. Run the migrations in timestamp order:
   - [`../supabase/migrations/20261009000000_marketplace.sql`](../supabase/migrations/20261009000000_marketplace.sql)
   - [`../supabase/migrations/20261009120000_fix_views.sql`](../supabase/migrations/20261009120000_fix_views.sql)
   - [`../supabase/migrations/20261010100000_chat_delivery.sql`](../supabase/migrations/20261010100000_chat_delivery.sql)
3. The migration creates the private `seller-documents` and public `product-images` Storage buckets, with 10 MB size and image/PDF type limits.
4. Copy `.env.example` to `.env.local` and set the project URL and **anon/publishable** key. Never put a Supabase service-role key in a browser environment variable.
5. Enable email confirmations in Supabase Auth. In **Authentication → URL Configuration**, set **Site URL** to the real production site URL (not `localhost:3000`) and add the exact seller callback URL to **Redirect URLs**. For local development, add the URL for the server you actually use, such as `http://127.0.0.1:8081/sellers` for the embedded portal or `http://127.0.0.1:8082/` for the standalone portal. Add the corresponding production callback too, for example `https://your-domain.example/sellers` or `https://seller.your-domain.example/`. If you customized the confirmation email template, its link must use Supabase's `{{ .ConfirmationURL }}` rather than a hardcoded localhost address.

Seller signup and password reset request a callback based on the current app: `/sellers` when embedded in the main app and `/` when running standalone. If your deployment uses a different callback, set `VITE_SELLER_AUTH_REDIRECT_URL` in the repository-root `.env.local` or hosting environment to that exact absolute URL, add the same URL to Supabase **Redirect URLs**, then restart/redeploy the app. Supabase falls back to **Site URL** when a requested callback is not allowed; this is why a message can say signup succeeded while the email opens `localhost:3000`.

After confirmation, open the link in the same browser where the seller application was started so its saved application draft is available. The verified Supabase session returns to the seller portal and continues the application flow.

Seller applications are tied to a verified Supabase Auth account and stored as `pending` until reviewed. An approved seller signs in with the password they chose; use Supabase's password-reset/invite flow to let them set a password. Do not send passwords over email.

Authenticated buyers and sellers can use `/messages` to chat about live products. Voice notes are stored in the private `voice-notes` bucket (25 MB maximum); participants alone can read their conversation and its audio.

The chat/delivery migration adds Kwara address capture, optional GPS coordinates, configurable doorstep delivery fees, and active pickup stations. Its two pickup stations have sample addresses for testing only; replace them with verified locations before accepting real orders. The configurable doorstep fee begins at ₦0; an authorized operator can set it, for example:

```sql
update public.delivery_settings
set doorstep_fee = 1500, updated_at = now()
where singleton = true;
```

Checkout remains a preview and does not create database orders or collect payment.

Review seller applications in Supabase's secured operator tools. To approve an application, use the SQL editor with an authorized project-owner account:

```sql
update public.seller_applications
set status = 'approved', reviewed_at = now()
where email = 'seller@example.com' and status = 'pending';
```

To reject instead, set `status = 'rejected'` and set `reviewed_at = now()`. Sellers cannot change their own review status. Do not grant the service-role key to the browser or an individual seller.

## Payments and privacy

The portal records products, sales, reviews, and payout requests. It does not collect/transfer real money: connect a payment provider and reconcile successful, delivered orders before enabling withdrawals. The database payout function only requests an eligible balance; it never transfers funds. Seller bank details are protected by row-level security and must only be accessed by authorized operators. Apply applicable privacy, data-retention, KYC, and financial-services requirements before accepting real seller or buyer data.
