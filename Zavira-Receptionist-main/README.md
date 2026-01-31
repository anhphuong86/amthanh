# Zavira Receptionist

A LiveKit voice AI receptionist agent built with Node.js and TypeScript.

## Features

- Voice-based receptionist interactions
- Appointment scheduling and checking
- Integration with Supabase for data storage
- Deployable on Vercel, Railway, Render, Fly.io, or locally
- Uses Google Gemini 2.0 Flash for LLM, DeepGram for STT/TTS

## Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Download ML models: `pnpm run download-files`
4. Copy `.env.example` to `.env` and fill in your API keys
5. Build: `pnpm run build`
6. Run: `pnpm run start`

## Environment Variables

See `.env.example` for required variables. You need:

- LiveKit credentials
- Google API key (for Gemini 2.0 Flash)
- DeepGram API key (for STT and TTS)
- Supabase URL and anon key

## Database Setup

Create a Supabase project and ensure the `appointments` table exists with the following schema:

```sql
-- The appointments table should have these columns:
-- id (UUID, primary key)
-- full_name (TEXT)
-- appointment_date (DATE)
-- appointment_time (TIME)
-- notes (TEXT)
-- Other columns as needed for your application
```

The agent will use the `full_name`, `appointment_date`, `appointment_time`, and `notes` columns for appointment management.

## Deployment Options

### Local Deployment

Run the agent locally for development:

```bash
pnpm install
pnpm run download-files
cp .env.example .env  # Fill in your API keys
pnpm run build
pnpm run start
```

### Docker

Build and run the Docker container:

```bash
docker build -t zavira-receptionist .
docker run -e LIVEKIT_URL=$LIVEKIT_URL -e LIVEKIT_API_KEY=$LIVEKIT_API_KEY -e LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET -e GOOGLE_API_KEY=$GOOGLE_API_KEY -e DEEPGRAM_API_KEY=$DEEPGRAM_API_KEY -e SUPABASE_URL=$SUPABASE_URL -e SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY zavira-receptionist
```

### Cloud Platforms

**Vercel:** Deploy as serverless function, set env vars in dashboard.

**Railway:** Connect GitHub repo, set env vars, auto-deploys.

**Render:** Create Web Service, set build/start commands, configure env vars.

**Fly.io:** Use Fly CLI, set secrets, deploy.

**AWS/GCP/Azure:** Deploy containerized app using Docker image.

## Development

- `pnpm run dev` for development with hot reload
- `pnpm run typecheck` for TypeScript checking
- `pnpm run lint` for linting