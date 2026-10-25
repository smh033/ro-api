# Orbit: GitHub Pages + Cloudflare Roblox public-viewer test

This is a **read-only proof of concept**, not a mirror of roblox.com and not a Roblox game player. Visitors remain on your GitHub Pages website while viewing public Roblox experience/profile summaries. The official Roblox website is opened separately for logging in or playing a game.

## What it includes

- `index.html`, `styles.css`, `app.js`: your responsive GitHub Pages website.
- `config.js`: where you paste your deployed Cloudflare Worker URL.
- `worker.js`: backend that fetches specific Roblox *public* API data (no general webpage proxy).
- No Roblox cookies, credentials, private APIs, or login handling.
- Example lookup: Brookhaven's game place ID `4924922222`, or user ID `1`.

## Step 1 — Make the Cloudflare Worker

1. Visit <https://dash.cloudflare.com/> and open **Workers & Pages**.
2. Select **Create application** > **Create Worker** (wording may vary).
3. Create a Worker, for example `orbit-roblox-public`.
4. Open **Edit code**, replace the starter code with the entire contents of `worker.js`, then **Deploy**.
5. Copy your Worker URL, for example `https://orbit-roblox-public.YOUR-SUBDOMAIN.workers.dev`.
6. Open this URL with `/api/health` appended. It should return JSON containing `"ok": true`.
7. Test a game: `<YOUR-WORKER-URL>/api/game?placeId=4924922222`. If Roblox rejects it, you should see an error JSON explaining why.

**Important:** We cannot guarantee Roblox will continue allowing these public API requests from Cloudflare Workers. Roblox can block/rate-limit endpoints, and the place-to-universe lookup is undocumented.

## Step 2 — Connect the website to Cloudflare

Open `config.js` and replace the empty string with the full HTTPS Worker origin **without a trailing slash**:

```javascript
window.PUBLIC_ROBLOX_API = 'https://orbit-roblox-public.YOUR-SUBDOMAIN.workers.dev';
```

Never paste a password, Roblox cookie, or API key into this file.

## Step 3 — Upload the website to GitHub

1. Create a public GitHub repository, e.g. `orbit-roblox-viewer`.
2. Upload `index.html`, `styles.css`, `app.js`, and your edited `config.js` **directly to the repository root**.
3. You can also store `worker.js` and `README.md` in the repository for reference; GitHub Pages doesn't run the Worker code.
4. Go to repository **Settings** > **Pages** > **Build and deployment** > **Deploy from a branch**.
5. Choose branch `main`, folder `/(root)`, and save.
6. Visit `https://YOUR-USERNAME.github.io/orbit-roblox-viewer/`.
7. Paste a public Roblox game URL like `https://www.roblox.com/games/4924922222/`, or enter a profile URL such as `https://www.roblox.com/users/1/profile`.
8. Your GitHub Pages URL remains in the address bar while the public information loads.

### Optional: your own domain

A custom domain for GitHub Pages is optional. Configure it under the repository's Pages settings and follow GitHub's DNS guidance. The Cloudflare Worker can remain at a `workers.dev` URL as the backend.

## Troubleshooting

- **UI SAMPLE · NOT LIVE:** You forgot to change `config.js` or didn't upload the edited version.
- **Couldn't load / Failed to fetch:** Check Worker URL, deployment, and browser network connection.
- **Roblox returned HTTP 403 or 429:** Roblox blocked or rate-limited a backend request. This demo does not bypass those restrictions.
- **Roblox could not find that item:** Check you pasted a valid public game place ID or profile ID.
- **Link not loading with a nickname:** Use a numeric user ID instead of a Roblox username for this test.
- **Game play isn't embedded:** Intentional. Official Roblox login, play, and site interactions remain on roblox.com.

## API implementation notes

The Worker only allows:
- `GET /api/health`
- `GET /api/game?placeId=<numeric-id>`
- `GET /api/user?userId=<numeric-id>`

The Worker constructs fixed upstream URLs and does not fetch arbitrary visitor-supplied hosts. It returns a tightly selected set of public metadata and adds CORS headers for the separate GitHub Pages site. It never forwards login credentials or session cookies.

As of October 2026, Roblox lists the public game detail and thumbnail endpoints in Creator Hub documentation. The unauthenticated place ID -> universe ID endpoint is **undocumented** and may change. User-by-ID lookup is a legacy endpoint and may change too.

## References

- Roblox Creator Hub: <https://create.roblox.com/docs/cloud/reference/domains/games>
- Roblox Creator Hub thumbnails: <https://create.roblox.com/docs/cloud/reference/features/thumbnails>
- Cloudflare Workers dashboard setup: <https://developers.cloudflare.com/workers/get-started/dashboard/>
- GitHub Pages publishing: <https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>

Not affiliated with or endorsed by Roblox.
