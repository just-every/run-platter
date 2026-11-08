# HubSpot deal card

The modern app card reads linked proposal titles and status through signed requests. It opens Platter in a new tab, where a current owner or admin selects the company and contact and explicitly reviews the copied draft. It grants no approval, sending or CRM write authority.

Prepare an installation copy with the public HTTPS origin of your Platter installation:

```sh
node ./integrations/hubspot/prepare.mjs HTTPS_ORIGIN OUTPUT_DIRECTORY
```

In the prepared copy, install dependencies in `./src/app/cards`, run `npm run typecheck`, then upload and install the private app with the HubSpot CLI. Its card needs deal read scope; the separate Platter workspace connection needs the company, contact, deal and line-item scopes used by the features you enable. Enter the installed app ID and client secret under Platter Settings, with explicit authorization. Use the same account as the verified workspace HubSpot connection. The HubSpot user's email must match a current Platter owner or admin. Credentials stay encrypted and are excluded from archives. Reconnecting requires fresh card authorization.

The backend validates the v3 HMAC signature, signed app and account metadata and five-minute timestamp before reading linked records. Client invitation URLs are never returned. A revoked or restored connection cannot read the card.

CRM writes use a separate human review in Settings. It verifies existing writable status and protected-link properties and closed-stage IDs, shows exact values, and binds apply to the reviewed proposal, destination, provider snapshot and current person. Each provider write has a retained receipt. Uncertain writes stop without automatic replay; reconcile them in HubSpot. Timeline activity is recorded as notes, rather than legacy custom app events. No standing grant is created.

Live app upload, provider scopes and rendering in an installed HubSpot deal remain unqualified until an account and app credentials are supplied. Network-edge journeys prove Platter's side only.

Provider references: [modern cards](https://developers.hubspot.com/docs/apps/developer-platform/add-features/ui-extensions/extension-points/app-cards/create-an-app-card), [request validation](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/request-validation), [notes](https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/notes/guide).
