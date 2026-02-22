# Drive Insight - API

NestJS backend API for Drive Insight platform.

## Tech Stack

- **Framework:** NestJS 11.x
- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 20+

## Development

```bash
# Install dependencies (from project root)
pnpm install

# Run in watch mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## Health Check

GET `/api/health` returns:
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T23:30:00.000Z"
}
```
