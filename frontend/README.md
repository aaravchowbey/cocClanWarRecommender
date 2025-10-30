# War Recommender Frontend (React + Material UI)

Purpose: A single-page React app using Material UI that calls the war recommender API with a `clanTag` and displays results in a sortable table.

## Features
- Input for `clanTag` (with or without `#`), proper encoding to preserve `%23`
- Fetches from:
  `https://13hfp225yh.execute-api.us-east-1.amazonaws.com/prod/war-recommender?clanTag=%23YOURTAG`
- Robust parsing of API response (handles `body` as a stringified JSON array)
- Material UI components with a dark theme, responsive layout, and client-side sorting
- Shareable URLs: the page keeps `clanTag` in the query string

## Run locally (Windows PowerShell)

```powershell
# From the frontend directory
npm install
npm run dev
```

This starts Vite and prints a local URL (typically http://localhost:5173). Open it and use the app.

To build and preview the production bundle:

```powershell
npm run build
npm run preview
```

## CORS note
If you see a CORS error in the browser console or an error banner in the app, ensure the API allows browser requests by returning an appropriate `Access-Control-Allow-Origin` header (e.g., `*` or your specific origin) and allows `GET`.

## File overview
- `index.html` – Vite root HTML with React mount point
- `package.json` – Project scripts and dependencies
- `vite.config.js` – Vite config with React plugin
- `src/main.jsx` – React entry and Material UI theme provider
- `src/App.jsx` – Main app UI: form, fetching, error/loading states, summary, and results table
- `src/components/ResultsTable.jsx` – MUI table with sorting
- `src/utils.js` – Helpers for encoding, parsing, numeric coercion, and date formatting
- `src/reset.css` – Small global background/visual polish

## Customization tips
- Adjust theme colors in `src/main.jsx` (createTheme).
- Change default sort by editing `orderBy`/`order` in `src/App.jsx`.
- Add/remove columns in `src/components/ResultsTable.jsx`.
