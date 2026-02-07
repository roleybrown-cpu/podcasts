# Podcast RAG Studio

Full-stack Next.js app to ingest podcast transcripts into Supabase pgvector and query/generate drafts using RAG.

## Setup
1. Install dependencies
   - `npm install`
2. Start local embeddings service (Python)
   - `python3 -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -r embeddings_service/requirements.txt`
   - `uvicorn embeddings_service.app:app --host 127.0.0.1 --port 8001`
3. Create database objects in Supabase
   - Open the SQL editor in your Supabase project and run `supabase/schema.sql`.
   - If you already created the table with 1536 dims, drop and recreate it so it matches 384 dims.
4. Update environment variables in `.env.local`
   - `APP_ADMIN_TOKEN` (used to access the API)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EMBEDDINGS_URL` (default `http://127.0.0.1:8001`)
   - Optional: `OPENAI_API_KEY` (only needed for the generate endpoint)
   - Optional: `OPENAI_CHAT_MODEL`
5. Run the app
   - `npm run dev`

## API
- `POST /api/ingest` (multipart or JSON)
- `POST /api/query` (JSON)
- `POST /api/generate` (JSON)
- `POST /api/generate-transcript` (JSON)
- `GET /api/episode?episodeId=62` (JSON)

## Notes
- The UI supports paste text or .txt/.docx upload.
- Chunking uses a simple character-based strategy with overlap.
- Place your logo at `public/logo.png`.

## Auth
- The API is protected by an admin token.
- Set `APP_ADMIN_TOKEN` and sign in via the UI.
- For programmatic access, send `x-admin-token: <APP_ADMIN_TOKEN>` with API requests.
- For ChatGPT Actions, set `APP_ACTION_KEY` and use `Authorization: Bearer <APP_ACTION_KEY>`.

## Filters
- `speaker`, `dateFrom`, `dateTo`, and `episodeId` are supported in the search UI.
- To enable date filters, include `recorded_date` or `date` in metadata as ISO 8601 strings (e.g., `2026-02-06T00:00:00Z`).

## Google Docs Sync
This uses a Google service account. Share the target folder with the service account email.

1. Install Python deps
   - `pip install -r scripts/requirements.txt`
2. Run sync
   - `SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... EMBEDDINGS_URL=http://127.0.0.1:8001 \\`
   - `python scripts/gdocs_sync.py --folder-id <FOLDER_ID> --creds <SERVICE_ACCOUNT_JSON> --replace`

Optional flags:
- `--since 2026-02-01T00:00:00Z`
- `--limit 10`
- `--dry-run`

## ChatGPT Actions
The OpenAPI spec is available at `public/openapi.json`. Use it in your Custom GPT Action.

Steps:
- Set `APP_ACTION_KEY` in `.env.local`.
- In the Custom GPT Actions UI, choose Bearer auth and paste the value of `APP_ACTION_KEY`.
- Point the schema URL to `/openapi.json` on your deployed app (or use the local file during setup).
- Replace `https://YOUR_DOMAIN` in `public/openapi.json` with your deployed URL.

## Deploy Embeddings Service (Render)
1. Create a Render account and connect this repo.
2. Create a new **Web Service** from `render.yaml`.
3. Once deployed, copy the Render URL (e.g., `https://podcast-embeddings.onrender.com`).
4. Update `.env.local` and your Vercel env vars:
   - `EMBEDDINGS_URL=https://podcast-embeddings.onrender.com`

Notes:
- Render free tier sleeps after inactivity. First request after sleep can take ~30-60s.
