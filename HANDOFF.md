# Handoff Notes for Claude

## Project snapshot
- SPA SEO analyzer with serverless endpoints for AI suggestions and SPA HTML rendering.
- AI provider order: OpenAI `gpt-5.1` → Claude `claude-3-5-sonnet-20240620` → Gemini `gemini-2.5-pro`. Keys are read from Vercel env vars.
- SPA rendering currently depends on `@sparticuz/chromium-min@141.0.0` with the pack tar download and `puppeteer-core@24.23.1`.
- Vercel config bundles Chromium/Puppeteer assets and routes all non-API paths to `index.html`.

## Known issue (blocking)
- SPA mode still fails on Vercel with a Chromium launch error (libnss3). Latest attempt switches to `chromium-min` and loads the pack tar via `chromium.executablePath`, but production still reports failure. No validated green run yet.

## Current implementation hints
- SPA handler: `api/fetch-spa.js` calls `chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar')` and launches Puppeteer headless shell with `chromium.args` and `chromium.defaultViewport`. Graphics mode is disabled.
- Vercel settings: `vercel.json` includes `node_modules/@sparticuz/chromium-min/**` and `node_modules/puppeteer-core/**` in the SPA function package, memory 1536 MB, timeout 60s; AI function memory 1024 MB, timeout 20s; routes send `/api/*` to functions and everything else to `index.html`.
- Package versions pinned in `package.json` to the above stack; scripts only echo placeholders.

## Suggested next steps
1. Deploy to Vercel and inspect function logs for the exact SPA failure; confirm whether the pack tar fetch succeeds and where Chromium unpacks.
2. If lib resolution still fails, try explicitly calling `chromium.setHeadlessMode(true)` before `executablePath` and consider setting `CHROMIUM_PATH` or `LD_LIBRARY_PATH` to the unpacked `chrome-linux` directories in the handler based on log output.
3. Add a minimal integration check (curl) hitting `/api/fetch-spa?url=https://example.com&spa=1` post-deploy to validate the fix.
4. Keep AI suggestion keys (`OPENAI_API_KEY`, etc.) populated in Vercel to verify the full flow once SPA succeeds.

## Quick file map
- SPA handler: `api/fetch-spa.js`
- AI suggestions: `api/ai-suggestions.js`
- Domain power heuristic: `modules/domain_power.js`
- Main UI/logic: `index.html`, `app.js`, `style.css`
- Guidelines data: `data/google_seo_guides.json`
- Vercel config: `vercel.json`
- Dependencies: `package.json`
