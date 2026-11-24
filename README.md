# Chat

Personal ChatGPT-style chatbot. Next.js (App Router) · Tailwind · shadcn/ui · Vercel AI SDK · Drizzle + Neon Postgres.

Providers: OpenAI, Anthropic, Google (optional: Groq, OpenRouter). Only models whose API key is set appear in the picker. Edit models in `lib/models.ts`.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL + at least one provider key
npm run db:push              # create tables
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (**Add New → Project**).
2. **Storage → Marketplace → Neon → Create** and connect it to the project. This sets `DATABASE_URL` automatically.
3. **Settings → Environment Variables**: add `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` (and optionally `GROQ_API_KEY`, `OPENROUTER_API_KEY`). Never prefix them with `NEXT_PUBLIC_`.
4. Create the tables against the Neon DB from your machine:
   ```bash
   vercel env pull .env.local   # or paste DATABASE_URL into .env.local
   npm run db:push
   ```
5. Deploy (**Deployments → Redeploy**, or `git push`).

There is **no auth**: anyone with the URL can use your keys. Keep the URL private or enable Vercel Deployment Protection (Settings → Deployment Protection). The site sends `noindex` and `robots.txt` disallows all crawlers.

## Scripts

- `npm run db:push` — sync schema to the DB
- `npm run db:generate` / `npm run db:migrate` — SQL migrations in `drizzle/`
