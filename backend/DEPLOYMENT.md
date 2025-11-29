# Backend Deployment Guide (Railway)

The backend is configured to be deployed on Railway.app.

## Railway Configuration

The `railway.json` file at the root of the repository describes the build and deploy configuration.

### Build Context
The build uses `backend/Dockerfile` as the definition. It expects the repository root as the build context.

### Environment Variables

When deploying to Railway, you must configure the following environment variables in the Railway project settings.
Many of these (like PORT, DATABASE_URL, REDIS_URL) are automatically provided by Railway services, but you may need to map them or provide others manually.

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `PORT` | The port the server listens on (Provided by Railway) | `8080` |
| `DATABASE_URL` | PostgreSQL connection string (Provided by Railway Postgres) | `postgres://user:pass@host:port/dbname` |
| `REDIS_URL` | Redis connection string (Provided by Railway Redis) | `redis://:pass@host:port` |
| `APP_ENV` | Application environment | `production` |
| `JWT_SECRET` | Secret key for JWT tokens | **REQUIRED** (Generate a strong random string) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `https://your-frontend.vercel.app` |
| `AI_GATEWAY_URL` | URL of the AI Gateway service | `http://ai-gateway:8000` or internal URL |
| `AI_API_KEY` | API Key for AI Gateway | Optional (if required by gateway) |

For a full list of configuration options, see `backend/.env.template`.

### CORS Configuration

In `production` environment (`APP_ENV=production`), the wildcard `*` for `CORS_ALLOWED_ORIGINS` is **ignored** for security reasons. You MUST specify the exact origin of your frontend application (e.g., your Vercel deployment URL).

### Health Check

Railway checks `/health` endpoint to verify the service is running.
