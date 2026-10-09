# SupreCart Seller Portal

The portal source lives in this folder and is available within the main TanStack Start app at `/sellers`. It is also a separately runnable site: run `npm run dev:sellers` from the repository root to serve it on port 8082, or `npm run build:sellers` to build the independent portal. Both experiences import the same Supabase client configuration and project as the storefront; buyers and sellers use the same database and auth service. When deploying the seller site separately, set `VITE_MARKETPLACE_URL` to the buyer storefront's public URL so the logo and Marketplace links lead back to the store.

## Connect the shared database

1. Create a Supabase project.
2. Run [`../supabase/migrations/20261009000000_marketplace.sql`](../supabase/migrations/20261009000000_marketplace.sql) in the Supabase SQL editor.
3. The migration creates the private `seller-documents` and public `product-images` Storage buckets, with 10 MB size and image/PDF type limits.
4. Copy `.env.example` to `.env.local` and set the project URL and **anon/publishable** key. Never put a Supabase service-role key in a browser environment variable.
5. Enable email confirmations in Supabase Auth and configure its email templates and allowed redirect URLs to include the site origin plus `/sellers` and `/signup`.

Seller applications are tied to a verified Supabase Auth account and stored as `pending` until reviewed. An approved seller signs in with the password they chose; use Supabase's password-reset/invite flow to let them set a password. Do not send passwords over email.

Review seller applications in Supabase's secured operator tools. To approve an application, use the SQL editor with an authorized project-owner account:

```sql
update public.seller_applications
set status = 'approved', reviewed_at = now()
where email = 'seller@example.com' and status = 'pending';
```

To reject instead, set `status = 'rejected'` and set `reviewed_at = now()`. Sellers cannot change their own review status. Do not grant the service-role key to the browser or an individual seller.

## Payments and privacy

The portal records products, sales, reviews, and payout requests. It does not collect/transfer real money: connect a payment provider and reconcile successful, delivered orders before enabling withdrawals. The database payout function only requests an eligible balance; it never transfers funds. Seller bank details are protected by row-level security and must only be accessed by authorized operators. Apply applicable privacy, data-retention, KYC, and financial-services requirements before accepting real seller or buyer data.
