# SupreCart seller studio

The seller studio is available inside the main app at `/sellers` and as a standalone site. Run it from the repository root:

```sh
npm run dev:sellers   # standalone dev server on port 8082
npm run build:sellers # standalone production build
```

Set `VITE_MARKETPLACE_URL` to the buyer storefront URL when deploying the seller site separately. Logo, Marketplace, Messages, and sign-out links use it to return buyers to the storefront.

## Local preview behavior

- Accounts, applications, products, messages, preferences, and sample orders are stored in this browser.
- Product images and avatars are browser data URLs.
- There is no hosted authentication, database, object storage, or email service.
- Applications remain local and pending until reviewed in this build.
- Seller withdrawals are requests only; no payment provider or payout settlement is connected.

## Access

- `shewa@gmail.com` has a seeded approved seller application. Sign in through `/login` to create a local seller session.
- New sellers can register from the seller studio. Their application is saved locally as pending.
- Buyers without a seller session are redirected to `/login`.
- Sign out clears the active local session and returns to the storefront.

## Seller data

Seller preferences use the same local account preference store as the buyer app. Store profile, fulfilment, bank details, notifications, region, payment methods, avatar, and security controls are preview settings only. No marketplace record is created or updated.

## Commission preview

Commission is calculated in the browser from `src/lib/commission.ts`:

- **Below ₦1,500** — 7.5% of the selling price.
- **₦1,500 – ₦5,000** — ₦150 + 7.5% of the selling price.
- **Above ₦5,000** — 11% of the selling price.

The seller receives the selling price minus commission. The figure is guidance only and is not enforced by a backend.
