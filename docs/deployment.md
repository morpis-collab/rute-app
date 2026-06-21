# RUTE Deployment Notes

## Recommended MVP Deployment

Use two services:

- Frontend: Vercel/Netlify static build from `dist`.
- Backend API: Render/Railway/Fly Node service running `npm run start`.

This repo includes:

- `vercel.json` for frontend SPA rewrites.
- `render.yaml` for a Render backend service with a persistent `/data` disk.
- `scripts/deploy-vps.sh` and `scripts/setup-nginx.sh` for a single VPS serving both frontend and API.

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
   - `OPENAI_API_KEY=<optional>`
   - `RECEIPT_AI_API_KEY=<optional>`
3. Confirm the `rute-data` persistent disk is mounted at `/data`.
4. Deploy and verify `/api/health`.

## Vercel Frontend Quick Path

1. Set build command to `npm run build`.
2. Set output directory to `dist`.
3. Add `VITE_API_URL=https://your-api-host.example.com/api`.
4. Deploy after backend URL is known.

## Single VPS Quick Path

Current VPS target:

```bash
http://202.10.34.42
```

Run on the VPS as root:

```bash
PUBLIC_ORIGIN=http://202.10.34.42 bash scripts/deploy-vps.sh
bash scripts/setup-nginx.sh 202.10.34.42
```

If using a domain later:

```bash
PUBLIC_ORIGIN=https://ruteapp.cloud bash scripts/deploy-vps.sh
bash scripts/setup-nginx.sh ruteapp.cloud
```

The VPS script writes production config to `/opt/rute-app/.env`, which is the file loaded by `server/index.js` when PM2 starts from `/opt/rute-app`. On each run, the script keeps existing secrets but forces deploy-safe VPS values for `NODE_ENV`, `PORT`, `VITE_API_URL=/api`, `RUTE_CORS_ORIGIN`, `RUTE_DATA_FILE`, and `RUTE_UPLOAD_DIR` before building.

Required edits before real users log in:

```bash
nano /opt/rute-app/.env
```

Set these values:

```bash
JWT_SECRET=<long-random-secret>
RUTE_OWNER_PIN=<new-6-digit-owner-pin>
RUTE_CORS_ORIGIN=http://202.10.34.42
VITE_API_URL=/api
```

Use `VITE_API_URL=/api` when frontend and backend are served from the same VPS origin. This keeps browser requests on the same origin and avoids accidentally calling `localhost` from the user's device.

## Important

- `RUTE_DATA_FILE` must point to persistent storage. On Render/Railway, attach a persistent disk/volume if using the JSON database.
- `RUTE_UPLOAD_DIR` must also point to persistent storage if receipt photos need to survive deploy/restart.
- Do not deploy production with the dev PINs from `.env.example`.
- `RUTE_CORS_ORIGIN` must be the exact frontend origin in production.
- For single-VPS deploy, use the public IP/domain as `PUBLIC_ORIGIN` and keep `VITE_API_URL=/api`.
- Vercel SPA rewrites only serve the frontend. The Express API still needs a separate Node backend unless the app is migrated to serverless API routes.
- If the backend URL changes, redeploy the frontend so `VITE_API_URL` is baked into the static build.

## Verification

After deploy:

```bash
curl https://your-api-host.example.com/api/health
```

Then login through the frontend using the Owner PIN and verify:

- dashboard loads remote data,
- sales submission updates stock,
- cash expected and close cash work,
- Owner Cash mutation updates balances,
- AI Copilot returns either `source: "ai"` or `source: "local"`.
