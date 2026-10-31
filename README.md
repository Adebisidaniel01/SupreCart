# SupreCart

SupreCart is a browser-local marketplace preview with a **buyer storefront** and a **seller studio**. Buyers can browse a demo catalog, manage a cart, preview checkout, chat with sellers, and edit account preferences. Sellers can submit an application, manage local listings, review sample orders, and preview payouts.

The app is built with **TanStack Start (React)**, **TanStack Router**, and **Tailwind CSS v4**. All marketplace state is stored in this browser. There is no production database, authentication service, file storage, payment processor, or order backend connected yet.

## Key areas

- **Storefront** (`/`, `/shop`) — browse the demo catalog, product pages, cart, and checkout preview.
- **Buyer account** (`/account`) — profile, addresses, orders, messages, and preferences.
- **Messages** (`/messages`) — local buyer/seller conversations with read receipts.
- **Seller studio** (`/sellers`) — applications, products, sample orders, payouts, and store settings.
- **Sign in / sign up** (`/login`, `/signup`) — local buyer and seller accounts.
- **Admin** (`/admin`) — marketplace overview, seller application review, and account moderation.

## Development

You need Node.js and npm.

```sh
npm install
npm run dev
```

Useful commands:

```sh
npm run test          # Vitest
npm run lint          # ESLint
npm run build         # buyer app
npm run dev:sellers   # standalone seller portal on http://127.0.0.1:5181
npm run build:sellers # standalone seller build
```

## Dependency audit

`npm audit --omit=dev` reports **0 production vulnerabilities**. `npm audit` also reports 14 moderate advisories from the development lint tooling (`minimatch` ReDoS via ESLint, `@typescript-eslint`, and related packages).

- These packages are development-only and are not included in the built application.
- npm reports **"No fix available"** for this advisory chain, so `npm audit fix --force` will not clear it.
- Do not force `minimatch@11` through `overrides`; that can break ESLint.
- Recheck after ESLint/minimatch publish a patched dependency chain.

## Demo accounts

Local credentials live in `src/lib/demo-accounts.ts`:

- `blackrose@gmail.com` — buyer, `Daniel Adebisi`.
- `shewa@gmail.com` — buyer with a seeded approved seller application, `Bello-lawal Dorcas`.

Preset demo accounts can sign in with any password. New accounts are saved in this browser only. Approved buyers get a local seller session when they sign in; new seller applications remain pending until reviewed locally.

## Admin access

Set `ADMIN_USERNAME` and either `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` in the server environment (`.env` locally), then sign in at `/admin` with the admin username and password. `ADMIN_SESSION_SECRET` is optional: when it is omitted, the admin session key is derived from the configured credentials. Warnings, bans, and account deletions are applied to local browser accounts only.

## Local data and safety

- Accounts, profiles, applications, addresses, preferences, products, messages, and demo orders are stored in browser storage.
- Product images and avatars are stored as browser data URLs.
- Checkout is a preview: it does not create an order, collect payment, dispatch delivery, or settle a payout.
- Seller withdrawals are requests only. No money moves.
- Clearing browser storage resets the local demo.

## Seller commission

Commission is calculated in the browser for guidance and is not enforced by a backend:

- **Below ₦1,500** — 7.5% of the selling price.
- **₦1,500 – ₦5,000** — ₦150 + 7.5% of the selling price.
- **Above ₦5,000** — 11% of the selling price.

The seller receives the selling price minus commission. There is no listing or subscription fee. See `src/lib/commission.ts`.

## Checkout and delivery

Checkout supports a doorstep preview fee of ₦2,500 and fictional pickup stations. Addresses are saved in this browser. No delivery booking or payment is made. Copy and controls are intentionally presented as preview-only.

## Cookies and analytics

The storefront and standalone seller portal show a cookie banner. The essential preference cookie remembers the visitor's choice. Analytics cookies are optional and off by default: Google Analytics loads only after analytics consent and when `VITE_GA_MEASUREMENT_ID` is configured. Marketing cookies are not installed. See `/info/cookies`.

## Third-party services

- **Vite** — development server and bundling.
- **React + TanStack Router + TanStack Start** — application structure and routing.
- **Tailwind CSS** — styling.
- **Google Analytics 4** — optional, consent-gated usage analytics.
- **GitHub** — repository hosting.

Payment, transactional email, hosted authentication, object storage, and marketplace database services are not connected. Add and document them before treating this as a production marketplace.
