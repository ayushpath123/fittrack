# FitTrack

FitTrack is a Next.js web app for tracking meals, workouts, weight, hydration, and progress insights.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set `DATABASE_URL`.

   **India / Neon unreachable:** use local Postgres (starts once, keeps running):

   ```bash
   npm run db:setup
   ```

   That uses Docker Postgres on `localhost:5432`. Your `.env` should have:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fittrack"
   ```

   Or use [Supabase](https://supabase.com) (no Docker): in **Connect**, use the **pooler** strings (not `db.*.supabase.co` — IPv6-only). Set both `DATABASE_URL` (port 6543) and `DIRECT_URL` (port 5432) in `.env`, then `npm run db:migrate`.

3. Run the app:

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

## Useful Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - run the production server
- `npm run lint` - run ESLint
- `npm run test` - run tests in watch mode
- `npm run test:run` - run tests once
