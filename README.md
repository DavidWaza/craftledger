# CraftLedger — books for makers

Simple, honest bookkeeping for artisans. Record every sale and expense, see your
profit & loss each month, and track gross revenue across the year — all in a
clean ledger that lives in your browser.

Built with **Nuxt 3, Vue 3, TypeScript and Tailwind CSS**.

## What it does

- **The books** — record money in and money out with artisan-friendly categories
  (raw materials, market fees, commissions, workshops…), filter by month, search,
  edit and delete with a safe two-step confirm.
- **Monthly profit & loss** — a proper cash-basis P&L statement: income by
  category, expenses in parentheses, single rule above subtotals, double rule
  under the final figure — the way an accountant would close the page.
- **Yearly gross** — gross revenue, total expenses and net for the year, with a
  month-by-month chart and table.
- **Accountant-grade math** — every amount is stored as an integer in minor
  units (kobo/cents), so there are no floating-point rounding errors.
- **Your data stays yours** — entries are stored in your browser only. Export a
  CSV any time from Settings.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to GitHub + Vercel

1. Create a new empty repository on GitHub (e.g. `craftledger`).
2. From this folder:

   ```bash
   git init
   git add .
   git commit -m "CraftLedger — bookkeeping for artisans"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/craftledger.git
   git push -u origin main
   ```

3. Go to [vercel.com](https://vercel.com), click **Add New → Project**, and
   import the repository. Vercel detects Nuxt automatically — accept the
   defaults and click **Deploy**. No environment variables are needed.

Every push to `main` will redeploy automatically.

## Notes for accountants (and the curious)

- Books are kept on a **cash basis**: income when received, expenses when paid —
  the right fit for sole-trader artisans.
- **Gross revenue** is all income before any deductions; **net profit/(loss)**
  is income minus expenses. The app keeps the two clearly separated.
