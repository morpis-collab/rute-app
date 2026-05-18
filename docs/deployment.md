# RUTE Deployment Notes

## Recommended MVP Deployment

Use two services:

- Frontend: Vercel/Netlify static build from `dist`.
- Backend API: Render/Railway/Fly Node service running `npm run start`.

Set frontend env:

```bash
VITE_API_URL=https://your-api-host.example.com/api
```

Set backend env:

```bash
NODE_ENV=production
PORT=4321
RUTE_BUSINESS_TZ=Asia/Makassar
RUTE_CORS_ORIGIN=https://your-frontend-host.example.com
RUTE_DATA_FILE=/data/rute-db.json
RUTE_UPLOAD_DIR=/data/uploads
JWT_SECRET=replace-with-long-random-secret
JWT_EXPIRES_SECONDS=43200
RUTE_OWNER_PIN=replace-owner-pin
RUTE_PARTNER_PIN=replace-partner-pin
OPENAI_API_KEY=optional-ai-key
AI_MODEL=gpt-4o-mini
RECEIPT_AI_API_KEY=optional-receipt-ai-key
RECEIPT_AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
```

## Important

- `RUTE_DATA_FILE` must point to persistent storage. On Render/Railway, attach a persistent disk/volume if using the JSON database.
- `RUTE_UPLOAD_DIR` must also point to persistent storage if receipt photos need to survive deploy/restart.
- Do not deploy production with the dev PINs from `.env.example`.
- `RUTE_CORS_ORIGIN` must be the exact frontend origin in production.
- Vercel SPA rewrites only serve the frontend. The Express API still needs a separate Node backend unless the app is migrated to serverless API routes.

## Verification

After deploy:

```bash
curl https://your-api-host.example.com/api/health
```

Then login through the frontend using Owner/Partner PIN and verify:

- dashboard loads remote data,
- sales submission updates stock,
- cash expected and close cash work,
- Owner Cash mutation updates balances,
- AI Copilot returns either `source: "ai"` or `source: "local"`.
