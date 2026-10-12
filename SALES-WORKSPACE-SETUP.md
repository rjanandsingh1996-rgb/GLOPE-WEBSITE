# GLOPE Sales Workspace V1 setup

## Branch safety
- Backup branch: `backup-before-sales-workspace-v1-20261012`
- Feature branch: `feature/sales-workspace-v1`
- Do not merge or deploy the feature branch to production until Cloudflare Access and D1 are configured and tested.

## Cloudflare setup required before production
1. In Cloudflare Dashboard, open Workers & Pages and choose `glope-website`.
2. Create a D1 database named `glope-sales-v1`.
3. Copy the real database ID and add a D1 binding named `DB` in Wrangler config, with database name `glope-sales-v1` and that ID.
4. Apply `migrations/0001_initial_sales_schema.sql` to the remote D1 database. It creates tables and three zero-stock honey pack rows; it does not create customer records.
5. In Cloudflare Zero Trust > Access > Applications, create a self-hosted application protecting the exact current Worker hostname paths `/admin*` and `/api/admin/*`. Use an allow policy for the owner's exact sign-in identity. Do not protect the whole Worker if the public site must remain public.
6. Set Worker variables `ACCESS_TEAM_DOMAIN` to the Cloudflare Access team issuer URL (for example `https://your-team.cloudflareaccess.com`) and `ACCESS_AUD` to the audience tag for this Access application.
7. Test unauthenticated `/admin` and `/api/admin/health` (both must be denied), sign in as the allowed identity, then test both routes again. Also verify public homepage, products, language switch, and WhatsApp ordering.

## Security notes
- Worker code validates the `Cf-Access-Jwt-Assertion` signature and checks issuer, audience, and expiry for admin routes.
- Keep admin routes protected at Cloudflare Access and in the Worker. Do not rely on an obscure URL or a frontend-only password form.
- The database is intentionally not bound until the actual D1 ID is available.
- Lead/order write APIs and data UI are not implemented yet; build them after access and DB health checks pass.
- Do not commit credentials, tokens, or customer information.
