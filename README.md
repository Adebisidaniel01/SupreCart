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

The seller application, seller dashboard, and buyer marketplace use one Supabase project. Follow the setup and financial-safety notes in [seller-portal/README.md](./seller-portal/README.md), configure `.env.local` from [.env.example](./.env.example), and run the shared database migration in [supabase/migrations/20261009000000_marketplace.sql](./supabase/migrations/20261009000000_marketplace.sql). The buyer-facing `/shop` lists published products from approved sellers after the database is configured.

Seller withdrawals are recorded as requests, not transferred funds. Connect and verify payment processing, order reconciliation, and payout review before using the system for real transactions.
