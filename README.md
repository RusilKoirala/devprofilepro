# DevProfile Pro

A SaaS product that helps developers auto-generate professional resumes from their GitHub and LinkedIn profiles.

## Phase 1: Foundation Setup ✅

This project has been initialized with:
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Supabase client configuration
- Landing page with navbar, hero, and footer

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your Supabase project:
   - Create a project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Add them to `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     ```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
/app
  /(marketing)          # Marketing pages (landing page)
    layout.tsx          # Marketing layout with navbar/footer
    page.tsx            # Landing page
  layout.tsx            # Root layout
  globals.css           # Global styles
/components
  /ui                   # shadcn/ui components
  /marketing            # Marketing components (navbar, footer, hero)
/lib
  /supabase             # Supabase client configuration
    client.ts           # Browser client
    server.ts           # Server component client
    middleware.ts       # Middleware helper
  utils.ts              # Utility functions (cn helper)
/types
  index.ts              # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (recommended)

## Next Steps (Phase 2)

The following features will be implemented in Phase 2:
- NextAuth.js setup with email/password authentication
- GitHub OAuth integration
- User dashboard layout
- Database schema creation in Supabase

## Environment Variables

See `.env.example` for all required environment variables. The following are needed for Phase 1:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (server-only)

Additional environment variables will be added in future phases for:
- NextAuth.js
- GitHub OAuth
- LinkedIn OAuth
- Stripe payments

## License

Private project - All rights reserved
