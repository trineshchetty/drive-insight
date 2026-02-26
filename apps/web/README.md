# Drive Insight - Web Application

Tenant-facing dashboard built with Next.js 15, TypeScript, Tailwind CSS, and Shadcn/UI.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4.x + Shadcn/UI (New York style, CSS variables)
- **State Management:** Jotai
- **UI Components:** Shadcn/UI (copy-paste components)

## Development

```bash
# Install dependencies (from project root)
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build
```

## Shadcn/UI

This project uses Shadcn/UI with New York style and CSS variables for theming.

To add components:
```bash
npx shadcn@latest add button
```

Components are installed to `src/components/ui/`.
