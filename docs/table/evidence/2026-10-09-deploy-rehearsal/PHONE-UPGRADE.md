# Upgrade Table from your phone (Render Free + Neon) — DRAFT

Draft, 2026-10-09. Everything marked **[tested]** was run locally: production build, PostgreSQL 16,
a household database at migration 011 upgraded to 012. Nothing here was tried on Render or Neon.
Anything marked **[unverified]** describes what Render or Neon is expected to do, and nobody has
checked it on your service.

You need: the Render dashboard, the Neon console, your phone's browser, and the commit to deploy
(`<VERIFIED_COMMIT>`). You never type or paste the database password anywhere in these steps.

---

## 1. Make a recovery point in Neon

Neon console → your project → **Branches** → **New branch** (or **Create branch**).

- **Parent:** your main branch. **Data:** current data (the latest, not a past time).
- **Name:** `before-table-012-upgrade`.
- If the form offers automatic deletion, turn it off, or choose a date after you will have checked the upgrade.
- Tap **Create**.

This is a recovery point **inside Neon**. It is **not an independent backup**: if the Neon project or
account is lost, the branch goes with it. Keep the independent export as a separate step for later, from a
trusted computer: `scripts/backup.sh dump "<your Neon connection string>" table-YYYYMMDD.dump`. Store
the file encrypted, because it contains password hashes and sessions. That step is not part of this
phone checklist.

## 2. Check what the service runs when it starts

Render dashboard → your service (`meal-planner-…`) → **Settings** → **Build & Deploy** → **Start Command**.
Read it and write it down exactly as it is.

| What you see | What it means | What to do |
|---|---|---|
| It starts with `npm run db:migrate &&` | The service already updates the database when it starts. | Go to step 3 and replace it with the exact text there, so the command is the one that was tested. |
| Anything without `db:migrate`, such as `npm start`, `npm run start` or `next start …` | The service does **not** update the database. If you deploy the new code with this command, `/api/health` answers 503 `schema_migrations_pending`. | Go to step 3. |

Also note the **Build Command**. The start-time update uses a development tool (`tsx`), so the build has to
install development packages. A build command like `npm ci --include=dev && npx next build`, or
`npm install && npm run build`, does that. **[unverified]** whether your service's build command installs them.
If step 5 shows `tsx: not found`, change the Build Command to `npm ci --include=dev && npx next build` and
deploy again.

## 3. Set the tested Start Command

In the same **Start Command** box, type exactly:

```
npm run db:migrate && exec node_modules/.bin/next start -H 0.0.0.0
```

Then **Save**.

- **[tested]** On first start it upgrades 011 to 012, then serves. On later starts it changes nothing and serves.
  If the database update fails, the server does not start.
- Keep the word `exec`. With it, the web server replaces the shell and receives the stop signal itself.
  **[tested]** Without `exec`, under `/bin/sh` the shell stayed in front of the server. A stop signal sent only to
  the shell left the server running. **[unverified]** Which shell Render uses, and which process it signals.
- **[unverified]** Whether saving this setting starts a deploy by itself. If a deploy starts right after you save,
  look at its commit in the **Events** list. If it is not `<VERIFIED_COMMIT>`, let it finish (or cancel it) and
  continue with step 4, which deploys the right commit.
- Leave every environment variable as it is.

## 4. Deploy the exact commit

Service → **Manual Deploy** → **Deploy a specific commit** → enter `<VERIFIED_COMMIT>` → **Deploy**.

**[unverified]** Render's documentation (read 2026-10-09) says deploying a specific commit from the dashboard
turns automatic deploys off for the service. That is fine; it is what you want for a verified commit.

## 5. Read the deploy log

Service → **Events** → the new deploy → **Logs**. Look for these lines in this order:

```
> table@0.1.0 db:migrate
> tsx scripts/migrate.ts
applied: 012_recipe_content.sql
▲ Next.js 16.3.8
✓ Ready in …
```

- If the database was older than 011, the applied line lists more files, ending in `012_recipe_content.sql`.
  For example: `applied: 008_cook_record_corrections.sql, …, 012_recipe_content.sql`.
- `schema up to date` instead of `applied: …` means the database already had 012. That is fine.
  You will also see it on every later restart.
- **Stop and do not retry if you see** `Error: migration 0NN_….sql failed: …` or
  `migration 0NN_….sql changed after it was applied`. The server will not start, and nothing from the failed
  file is kept. **[tested]** The failing file was rolled back completely; files before it stayed applied.
  **[unverified]** Render is expected to keep the previous release serving when a deploy fails.
  Copy the error line (it contains no password) and ask for help.

## 6. Check health and sign in

1. Open `https://meal-planner-eq58.onrender.com/api/health`. Expect `{"ok":true,"problems":[]}`.
   If the service was asleep, the first request can take about a minute **[unverified]**.
   A 503 with `schema_migrations_pending` means the database was not updated: go back to steps 2–5.
2. Open `https://meal-planner-eq58.onrender.com/login` and sign in with your usual email and password.
   **[tested]** Accounts created before the upgrade still sign in, and sessions from before it keep working.
3. Our Recipes still lists your recipes and saved links.

## 7. If something goes wrong: what can and cannot be undone

- **Code can go back** to an earlier commit from Render's deploy list, but only to a commit whose migrations
  are all already in the database (a commit at 011 or 012 for this upgrade).
  **[tested]** The 011-era code served, read and wrote correctly on the 012 database. Its startup update said
  `schema up to date`. **Its `/api/health` still answers 200**, because it only checks the migrations it knows
  about. So a 200 does not prove that code and database match.
- **The database change cannot be un-applied.** 012 only adds a table, a few optional columns and a wider check,
  which is why older code keeps working on it.
- **Restoring from the Neon branch** (`before-table-012-upgrade`) puts the data back as it was in step 1.
  **Everything written after step 1 is lost**: new recipes, links, plans and sign-ins.
  **[unverified]** The exact Neon screens for restoring a branch from another branch.
  Do this only if the data itself is damaged, not just because a deploy failed.
- The Neon branch stays inside Neon. Take the independent export from step 1 when you are back at a trusted computer.
