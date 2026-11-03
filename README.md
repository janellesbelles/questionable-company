# Questionable Company — Nomi API beta v1.2

## Features
Two-player Nomi game, six decks, freestyle/white cards, Brenda judge, reveal and reactions, optional API connection. Existing clipboard mode remains fully supported. No auto-sending or automatic round changes. Multi-Nomi is **not implemented yet**; this is its API foundation.

## Deploy to Vercel
Create a new GitHub repository and upload the files from this directory **to repository root**. Import it into Vercel as an Other framework project (no build command, root directory `.`). Set private server environment variables **NOMI_API_KEY** and **GAME_ACCESS_CODE** in Vercel Project Settings. Redeploy after creating env vars. Do not put your actual key in the GitHub repo, in browser fields, or `.env.example`.

Open the deployed URL. Choose your deck, start a game, and scroll down to Nomi API. Enter the **GAME_ACCESS_CODE** (not the Nomi key), connect, and choose a Nomi. Press **Send Prompt manually** to initiate each round. The returned reply populates the Nomi reply box; click Recognize Answer and verify it. Press **Send Reveal manually** after judging. Do not advance before the reveal and reaction.

## Important
This is a **private testing prototype**, not a public multi-user service. A shared access code is only a simple gate, not user accounts or secure multi-tenant auth. Use Vercel Deployment Protection to limit who can reach the site if possible. Do not share the access code. API calls can time out; on uncertainty, inspect the Nomi chat before retrying to avoid duplicates. Game state is browser-local. Hosting does not sync between devices.

## Test
`npm test` validates syntax. Real API functionality requires configured credentials and a live connection. No API requests are made during testing.

## Public BYOK mode (v1.3)
Each visitor enters their own Nomi API key. The key is held only in browser memory and sent via HTTPS request headers to the Vercel function for their own Nomi API calls. It is not written to localStorage or the repository. Do not log request headers or use untrusted analytics that capture secrets. Users must trust the hosted application operator and should use keys with minimal permissions. The server proxy is subject to resource abuse without user authentication and quotas; enforce platform-level rate limits before wide promotion.
