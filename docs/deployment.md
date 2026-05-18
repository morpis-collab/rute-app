# RUTE Deployment Notes

## Recommended MVP Deployment

Use two services:

- Frontend: Vercel/Netlify static build from `dist`.
- Backend API: Render/Railway/Fly Node service running `npm run start`.

This repo includes:

- `vercel.json` for frontend SPA rewrites.
- `render.yaml` for a Render backend service with a persistent `/data` disk.

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

## Render Backend Quick Path

1. Create a new Render Blueprint from this repo and select `render.yaml`.
2. Set the unresolved secret values:
   - `RUTE_CORS_ORIGIN=https://your-frontend-host.example.com`
   - `RUTE_OWNER_PIN=<new-6-digit-owner-pin>`
   - `RUTE_PARTNER_PIN=<new-6-digit-partner-pin>`
   - `OPENAI_API_KEY=<optional>`
   - `RECEIPT_AI_API_KEY=<optional>`
3. Confirm the `rute-data` persistent disk is mounted at `/data`.
4. Deploy and verify `/api/health`.

## Vercel Frontend Quick Path

1. Set build command to `npm run build`.
2. Set output directory to `dist`.
3. Add `VITE_API_URL=https://your-api-host.example.com/api`.
4. Deploy after backend URL is known.

## Important

- `RUTE_DATA_FILE` must point to persistent storage. On Render/Railway, attach a persistent disk/volume if using the JSON database.
- `RUTE_UPLOAD_DIR` must also point to persistent storage if receipt photos need to survive deploy/restart.
- Do not deploy production with the dev PINs from `.env.example`.
- `RUTE_CORS_ORIGIN` must be the exact frontend origin in production.
- Vercel SPA rewrites only serve the frontend. The Express API still needs a separate Node backend unless the app is migrated to serverless API routes.
- If the backend URL changes, redeploy the frontend so `VITE_API_URL` is baked into the static build.

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
