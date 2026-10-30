# Invoice V2

Invoice V2 is a browser-based invoice application for Friend Shop. It provides three separate invoice workflows, local invoice history, cloud invoice management, and print and spreadsheet exports.

## What the application is for

Use the application to create customer invoices, keep a record of saved bills, print invoices, and export invoice data for reporting or safekeeping.

The application includes:

- **Mod 1 — New Monthly Bill:** Record daily amounts for a customer across a selected month.
- **Mod 2 — Daily Bill:** Create a dated invoice with products, quantities, units, rates, previous dues, and optional transportation charges.
- **Mod 3 — Old Monthly Bill:** Use the existing monthly invoice workflow and its own invoice layout.
- **Cloud Invoice Management:** View, filter by module, inspect, edit, delete, and export invoices stored in the Cloudflare D1 database.

The three invoice modules remain separate so each can retain its own workflow and invoice format.

## Getting started

Open the application entry page and sign in. From the selection page, choose a billing module or open Cloud Invoice Management.

For local development with Cloudflare Pages, see [Local development](#local-development). The login requires server-side environment variables; the application does not provide a default password.

## Invoice data and numbering

Each module saves invoices in the browser's `localStorage`. New invoices are also sent to the configured D1 database for Cloud Invoice Management. If cloud sync fails, the local invoice remains saved and the application reports the sync failure.

Browser history belongs to that browser and device. Existing local invoices are not automatically migrated to D1, and clearing browser data can remove the local copy. Cloud Invoice Management reads D1 records and requires a valid login.

Each module has its own invoice-number counter that starts at 100 in a browser and advances beyond that module's existing local invoice numbers. Since these counters are browser-local, creating invoices for the same module from multiple devices can produce duplicate invoice numbers. The database record ID is used to identify and update a particular cloud record.

## Exports and backups

- Cloud Invoice Management can export the selected module's records as CSV or as an Excel workbook with one worksheet per invoice.
- Invoice module pages provide Excel exports of their local history.
- Mod 2 also supports saving an individual invoice as an image.
- Printed invoices use the selected module's invoice layout.

CSV and Excel files are convenient business exports, but are not complete D1 backups. To make a manual database backup, run Wrangler from the project root and save the dump outside the repository:

```bash
npx wrangler d1 export invoice-v2-db --remote --output=../invoice-v2.backup.sql
```

Test recovery against a separate, non-production D1 database before relying on a backup:

```bash
npx wrangler d1 execute <test-database-name> --remote --file=../invoice-v2.backup.sql
```

After restoring, verify invoice counts and module histories. Keep backup files in restricted storage and never commit them. Configure a recurring backup process and periodically test recovery; the application does not automate either.

## Cloudflare Pages deployment

This project is a **Cloudflare Pages** application, not a standalone Worker. The static site is served from the repository root, Pages Functions are in `functions/`, and the D1 database binding is named `DB`.

### Configure the project

1. In Cloudflare, create a **Pages** project and connect this GitHub repository. Select the production branch.
2. Set the project root to the repository root, leave the build command blank, and use `.` as the build output directory.
3. Create or select the D1 database. Configure the Pages Functions binding with the name `DB`.
4. Verify that `database_id` in [wrangler.toml](./wrangler.toml) refers to the intended database when using Wrangler configuration.
5. Add the following values in **Cloudflare Pages → Settings → Variables and Secrets** for each environment you deploy (Production and Preview):
   - `LOGIN_USERNAME`: the account username.
   - `LOGIN_PASSWORD`: a unique password with at least 8 characters; store it as a secret.
   - `SESSION_SECRET`: a randomly generated secret with at least 32 characters; store it as a secret.
6. Redeploy after changing environment variables or secrets.
7. Verify login, module navigation, `/api/invoices`, and `/Management/management.html`.

For example, generate a session secret locally with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Authentication is handled by Pages Functions. Protected pages and invoice API requests use a signed, HTTP-only session cookie that expires after eight hours. There is no default credential; login is unavailable until the required server-side values are configured. Never put secrets in frontend files or commit them to the repository.

For additional protection, configure a Cloudflare rate-limiting rule for `POST /api/auth/login`.

Git-connected Pages projects deploy pushes to their configured production branch. A project created as a Direct Upload project cannot later be converted to Git integration; create a new Pages project if Git-connected deployment is required. Do not remove `wrangler.toml` to work around a dashboard uploader message.

## Local development

Use Wrangler's Pages development server from the repository root:

```bash
npx wrangler pages dev .
```

Create an untracked `.dev.vars` file in the project root containing the same three variable names used by Pages:

```dotenv
LOGIN_USERNAME=your-local-username
LOGIN_PASSWORD=your-local-password
SESSION_SECRET=replace-with-a-random-secret-of-at-least-32-characters
```

Do not use production credentials in a shared development environment. The `.dev.vars` file is ignored by Git.

## Project layout

```text
Assets/                  Shared logo, stamp, and Excel export utility
functions/               Pages Functions for authentication and invoice API
Management/              Cloud Invoice Management page, styles, and scripts
Mod 1/                   New monthly invoice workflow
Mod 2/                   Daily invoice workflow
Mod 3/                   Legacy monthly invoice workflow
Selection/               Module selection page
index.html               Login and application entry page
auth-client.js           Browser session helpers
cloud-sync.js            Invoice synchronization with the cloud API
wrangler.toml            Cloudflare Pages and D1 configuration
```

## Ownership

Copyright (c) CARNAGE SENTINELS.
