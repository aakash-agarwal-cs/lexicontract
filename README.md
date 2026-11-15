This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.# LexiContract

LexiContract is a comprehensive contract lifecycle management and risk audit platform designed to streamline vendor management, contract creation, milestone tracking, and clause analysis.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Supabase account (for database and authentication)
- PostgreSQL (if running locally with Supabase CLI)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/aakash-agarwal-cs/lexicontract.git
   cd lexicontract
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add the following variables:
   ```env
   DATABASE_URL=your_supabase_postgresql_connection_string
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET=your_jwt_secret
   ```

4. Run database migrations:
   Execute the SQL migration scripts in the `db/migrations` directory in order from `001` to `005`.

5. Seed the database:
   Run the seed scripts to populate initial data:
   ```bash
   node scripts/seed-standard-clauses.mjs
   ```

6. Create an admin user:
   Insert an admin user into the `users` table via the Supabase dashboard or SQL editor.

7. Start the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Demo Logins

You can log in with the following demo accounts without passwords:

- **Admin User**: `admin@example.com`
- **Reviewer User**: `krishg@gmail.com`

## Documentation

For more detailed information, please refer to the documentation in the `docs` directory:
- `docs/architecture.md`: System architecture overview
- `docs/db-corrections.md`: Database schema corrections
- `docs/important-queries.md`: Important SQL queries
- `docs/migrations-order.md`: Migration execution order
- `docs/test-cases.md`: Test cases for LexiContract features

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
