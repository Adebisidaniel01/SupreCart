# SupreCart

SupreCart is a browser-local marketplace with a **buyer storefront** and a **seller studio**. Buyers can browse a seeded catalog, use similar-product recommendations, manage a cart, use checkout, chat with sellers, and edit account preferences. Sellers can submit an application, manage local listings, review seeded orders, and view payouts.

The app is built with **TanStack Start (React)**, **TanStack Router**, and **Tailwind CSS v4**. All marketplace state is stored in this browser. There is no production database, authentication service, file storage, payment processor, or order backend connected yet. Recommendations are computed locally from catalog content and browser-side shopping signals.

## Key areas

- **Storefront** (`/`, `/shop`) — browse the seeded catalog, similar-product recommendations, product pages, cart, and checkout.
- **Buyer account** (`/account`) — profile, addresses, orders, messages, and preferences.
- **Messages** (`/messages`) — local buyer/seller conversations with read receipts.
- **Seller studio** (`/sellers`) — applications, products, seeded orders, payouts, and store settings.
- **Support and information** (`/support`, `/careers`, `/info/:slug`) — customer care, careers, FAQs, contact, policies, and marketplace information.
- **Sign in / sign up** (`/login`, `/signup`, `/forgot-password`) — local buyer and seller accounts.
- **Checkout** (`/checkout`) — local order reference and delivery estimates.

## Pages

The app currently has **12 route files**: 11 static routes plus the dynamic `/info/$slug` route, which serves 8 information pages. That is **19 URLs** in total. The `/sellers` route renders the standalone seller studio.

The admin area has been removed.

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

`npm audit` reports **0 vulnerabilities**. The previous `minimatch` advisory was resolved by overriding the nested `minimatch` dependency of `@typescript-eslint/typescript-estree` to `^11.0.1` in `package.json`.

- The override is scoped to `@typescript-eslint/typescript-estree`; do not add a global `minimatch` override.
- These packages are development-only and are not included in the built application.
- Recheck after ESLint/minimatch publish a patched dependency chain.

## Built-in accounts

Local credentials live in `src/lib/accounts.ts`:

- `blackrose@gmail.com` — buyer, `Daniel Adebisi`.

The preset account can sign in with any password. New accounts are saved in this browser only. An approved buyer gets a local seller session when they sign in; new seller applications remain pending until an approval flow is connected.

## Local data and safety

- Accounts, profiles, applications, addresses, preferences, products, messages, orders, wishlists, carts, and recommendation signals are stored in browser storage.
- Recommendation signals (saved products, cart quantities, and order item names) stay in this browser. No recommendation data is sent to a server or third party.
- Form input is normalized and control characters are stripped before it is stored. No SQL database is connected, so there is no SQL query surface; when one is added, use parameterized queries only.
- Uploaded product images and avatars are stored as browser data URLs; seeded catalog images use remote URLs.
- Uploads must be genuine JPEG, PNG, or WebP files. Image sources restored from browser storage are re-validated before they reach an `<img>` element.
- Local passwords use PBKDF2-SHA-256 with a per-account salt. Server responses set a Content Security Policy, HSTS, `nosniff`, frame-deny, and related hardening headers.
- Checkout saves a local reference only: it does not collect payment, dispatch delivery, or settle a payout.
- Seller withdrawals are requests only. No money moves.
- Clearing browser storage resets the local marketplace data.

## Seller commission

Commission is calculated in the browser for guidance and is not enforced by a backend:

- **₦5,000 and below** — ₦150 + 7.5% of the selling price.
- **Above ₦5,000** — 11% of the selling price.

The seller receives the selling price minus commission. There is no listing or subscription fee. See `src/lib/commission.ts`.

## Checkout and delivery

Checkout supports a doorstep fee estimate of ₦2,500 and illustrative pickup stations. Addresses are saved in this browser. No delivery booking or payment is made.

## Product recommendations

SupreCart uses a deterministic, browser-local hybrid recommender. It combines **content-based filtering** with **item-based collaborative filtering** to rank products for the "More like this" section of a product dialog. The implementation lives in `src/lib/recommendations.ts`, and the behavior is covered by `src/test/recommendations.test.ts`.

This is not a trained machine-learning model and there is no recommendation server. Every score is calculated from the seeded catalog and local browser state, so results are reproducible and never leave the device.

### Content-based filtering

Each product is converted into a weighted feature vector:

| Feature       | Weight        |
| ------------- | ------------- |
| Category      | 3.0           |
| Brand         | 2.2           |
| Seller        | 1.2           |
| Price band    | 0.8           |
| Product label | 0.5           |
| Name tokens   | 0.6 per token |

Price bands are `≤ ₦10k`, `≤ ₦25k`, `≤ ₦50k`, `≤ ₦100k`, and `> ₦100k`. Similarity is the cosine similarity between two feature vectors. A shopper's content profile is the weighted sum of vectors for products they saved, added to the cart, or bought. This captures "same category or brand", "similar price point", and "also from this seller" relationships.

### Collaborative filtering

Collaborative filtering uses an **item-item cosine model**. It builds a user-item matrix from:

- A compact set of seeded, synthetic shopper baskets in `src/lib/recommendations.ts`. These are demo co-purchase patterns, not real customer records.
- The current browser user's signals:
  - Saved wishlist product: weight `3.0`.
  - Cart line: weight `2.75` to `3.75`, based on quantity.
  - Delivered order item: weight `4.0`.
  - In-transit order item: weight `3.5`.
  - Processing order item: weight `3.0`.
  - Cancellation-requested order item: weight `1.5`.
  - Cancelled order item: `0`.

Item vectors are weighted by these signals. Item similarity is the cosine of their co-occurrence vectors across shoppers. Candidate scores are the weighted average similarity to the current user's items, then normalized by the strongest candidate. This is what surfaces a product that content alone might miss, such as a clothing item or accessory commonly bought alongside a saved pair of sneakers.

### Hybrid ranking and cold start

- **Personalized ranking:** `60% content score + 40% collaborative score + 5% quality nudge`.
- **Product-dialog ranking:** `70% similarity to the focused product + 25% collaborative score + 5% quality nudge`.
- **Cold start:** when there is no local history, ranking uses `60% seeded popularity + 40% quality`.
- **Quality nudge:** `70% rating score + 30% review-volume score`.

Products already saved, carted, ordered, focused, or explicitly excluded are filtered out before ranking. If history exists, recommendations are labelled as content, collaborative, or hybrid and include a reason such as "Matches your interest in ..." or "Shoppers with similar baskets liked this". Cold-start cards are labelled "Popular with SupreCart shoppers".

### Privacy and limitations

- Seeded shopper baskets are illustrative demo data and do not identify real people.
- Browser-local wishlists, carts, and orders are used only in memory to compute rankings.
- The model is small, deterministic, and catalog-specific; it does not learn continuously from clicks or train a neural network.
- To move to a production recommender, replace the seed matrix with real interaction events, add server-side training and evaluation, and keep explicit consent and privacy controls around shopper data.

## Cookies and analytics

The storefront and standalone seller portal show a cookie banner. The essential preference cookie remembers the visitor's choice. Analytics cookies are optional and off by default: Google Analytics loads only after analytics consent and when `VITE_GA_MEASUREMENT_ID` is configured. Marketing cookies are not installed. See `/info/cookies`.

## Third-party services

- **Vite** — development server and bundling.
- **React + TanStack Router + TanStack Start** — application structure and routing.
- **Tailwind CSS** — styling.
- **Google Fonts** — typefaces requested from `fonts.googleapis.com` by the storefront and seller portal.
- **Google Analytics 4** — optional, consent-gated usage analytics.
- **GitHub** — repository hosting.

Payment, transactional email, hosted authentication, object storage, and marketplace database services are not connected. Add and document them before treating this as a production marketplace.
