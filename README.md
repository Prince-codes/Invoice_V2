# Invoice Generator

This project is a simple invoice-generation website created especially for My Friend business. It helps the business owner prepare, save, review, export, and print invoices from a browser.

## What It Does

The application provides two invoice options:

- **Monthly Bill**: enter daily amounts for a selected customer, month, and year.
- **Date Bill**: enter products, quantities, quote prices, and calculated prices for one billing date.

Both options support saving invoice records, viewing previous invoices, and printing completed invoices. The layout works on desktop and mobile screens.
  

## Invoice Data

Invoice records are saved in the browser's local storage. This means the records belong to the browser and device being used. They do not automatically appear on another device or browser.

Use **Export CSV** regularly to keep a backup. Clearing browser data can remove locally saved invoices.

The Cloud Invoice Management page also stores cloud invoices in the configured D1 database. Its invoice list loads 50 summary rows per page and fetches full invoice data only when viewing or editing a record. Cloud Excel exports create one invoice worksheet per record for the selected module; PDF export creates module-specific invoice PDFs for all three modules and packages them in one ZIP file.


## Cloudflare Deployment Setup

This project uses **Cloudflare Pages**, not a standalone Cloudflare Worker. The frontend is static, Pages Functions are in `functions/api`, and the D1 database binding is named `DB`.

The `wrangler.toml` file configures Pages Functions and D1. The dashboard's drag-and-drop uploader does not deploy projects using this configuration file; do not remove the file just to get past that uploader message.

### Login Security

The login is verified by Pages Functions. It no longer uses the browser's editable `localStorage` as a credential store. Protected pages and invoice API requests require an eight-hour, signed, HTTP-only session cookie.

Before deploying, add these values in **Cloudflare Pages → Settings → Variables and Secrets** for every environment you use (Production and Preview):

- `LOGIN_USERNAME`: the login username.
- `LOGIN_PASSWORD`: a unique password with at least 8 characters. Store it as a secret.
- `SESSION_SECRET`: a randomly generated secret with at least 32 characters. Store it as a secret; for example, generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Do not use the old browser-stored default password. There is no fallback credential: login remains unavailable until all three server-side values are configured. After adding or changing secrets, redeploy the Pages project.

For local development, put the same variable names in an untracked `.dev.vars` file in the project root and never commit that file. Configure a Cloudflare rate-limiting rule for `POST /api/auth/login` as an additional defense against password guessing.

### Recommended: Git-connected Pages project

1. In Cloudflare, select **Workers & Pages → Create application → Pages → Connect to Git**. Do not select Workers or the drag-and-drop uploader.
2. Connect this GitHub repository and select its production branch.
3. Use the repository root as the root directory. Leave the build command blank and set the build output directory to `.`.
4. Create a D1 database and bind it to Pages Functions with the binding name `DB`.
5. Replace the placeholder `database_id` in `wrangler.toml` with the actual D1 database ID before deploying with the Wrangler configuration file. Alternatively, download the existing Pages project configuration with `npx wrangler pages download config` and use that generated configuration.
6. Deploy and verify `/api/invoices` and `/management.html`.

The project should be created as a **Pages project** with Git integration. Cloudflare Pages Git integration automatically deploys pushes to the production branch. If the project was created as a Direct Upload project instead, it cannot later be converted to Git integration; create a new Pages project with Git integration.

### Local Development Command

For Pages local development, use:

```bash
npx wrangler pages dev .
```

For a Pages Direct Upload project, deploy with the Pages-specific command (not `wrangler deploy`):

```bash
npx wrangler pages deploy . --project-name invoice-v2
```

The direct-upload command is not the recommended Git-connected deployment workflow for this repository.

### Important Notes

- Keep all database credentials and secrets in Cloudflare environment settings, not in frontend JavaScript.
- The project continues to keep browser-stored local invoice data as-is and uses cloud storage only for the new invoice-management workflow.
- Existing invoice layouts and modules should remain functional after deployment.

## Owner

Copyright (c) CARNAGE SENTINELS.
