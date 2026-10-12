# GLOPE Sales Workspace V1 setup

## Safety and branch rules
- Backup branch: \`backup-before-sales-workspace-v1-20261012\`
- Feature branch: \`feature/sales-workspace-v1\`
- This work is not deployed. Do not merge or deploy it until login, D1, and the public website have been tested.
- The public website files are not changed by this feature branch's admin-login work.

## Custom login (no Cloudflare Zero Trust required)
Configure these as **Worker secrets** for the \`glope-website\` Worker in Cloudflare Dashboard > Workers & Pages > glope-website > Settings > Variables and Secrets. Do not put secret values in GitHub, this document, or chat.
- \`ADMIN_USERNAME\`: a private admin username (not a public brand name).
- \`ADMIN_PASSWORD\`: a unique password of at least 16 characters; use a password manager.
- \`ADMIN_SESSION_SECRET\`: a randomly generated secret of at least 32 characters. Generate it with a password manager; do not reuse the admin password.
- The Worker sets an HttpOnly, Secure, SameSite=Strict session cookie and signs sessions server-side. Login attempts are rate-limited using D1. Five failed attempts in a 15-minute window temporarily block that IP bucket.
- Do not share admin credentials. If they are exposed, rotate the secrets immediately.

## D1 database setup
1. In Cloudflare Dashboard, open Workers & Pages and create a D1 database named \`glope-sales-v1\`.
2. Copy the database ID.
3. Add a D1 binding named \`DB\` to this Worker in its settings, or add a \`d1_databases\` binding in \`wrangler.jsonc\` using the real database ID. Do not use a placeholder ID.
4. Apply \`migrations/0001_initial_sales_schema.sql\` to the new database. It creates tables for leads, orders, inventory, audit logs and login-attempt rate limiting. It seeds only three honey pack sizes with zero stock; it creates no customer records.
5. Confirm the Worker has the \`ASSETS\` static asset binding and uses \`src/index.js\` as its entry point. The admin routes must run through the Worker first; do not expose an unprotected admin API.
6. No Cloudflare Access or Zero Trust setup is used by this custom-login design.

## Required tests before deployment
1. With secrets and D1 configured, test login using the correct credentials.
2. Wrong credentials must show a generic error; after five failures, login should return HTTP 429 for the blocked window.
3. Directly opening \`/admin/app\` without a session must redirect to \`/admin\`.
4. Calling \`/api/admin/health\` without a session must return HTTP 401.
5. Signing out must clear the session; the old session must no longer be accepted.
6. Check session cookie flags: HttpOnly, Secure, SameSite=Strict, Path=/.
7. Verify the public homepage, product images, English/Hindi switch, and WhatsApp ordering are unchanged.
8. Only after the tests pass should the feature branch be reviewed for a deliberate deployment. Do not merge to \`main\` without explicit approval.

## Current scope
- Custom server-side login, signed sessions, logout, login rate limiting and database health check are included.
- Lead entry, order management, stock editing and reporting are not implemented yet.
- Keep the workspace private; do not add real customer data until the security tests pass.
