# Add canonical tags

## Goal
Tell search engines the single official URL for the site so the same content served under different URLs (preview domain, published domain, with/without query strings) isn't treated as duplicate pages.

## What will change
`index.html` head gets:

- `<link rel="canonical" href="https://inpt.org.in/" />`
- `<meta property="og:url" content="https://inpt.org.in/" />` (matches the canonical, so social previews and search agree)

No other tags are touched; title and description stay exactly as they are.

## Note on per-page canonicals
This app is a single static HTML file (no server rendering), so crawlers read one head for every route. That means one site-level canonical pointing at the homepage — not a self-referencing canonical per route. Adding real per-route canonicals would need server-side rendering; the app can get that by upgrading to Lovable's latest template ([what the upgrade gives you](https://lovable.dev/blog/building-apps-using-tanstack-start)) — happy to do it if you want, but it isn't required for this fix.

## Technical detail
- Single edit in `index.html`, inside `<head>`, next to the existing Open Graph block.
- Domain used: `https://inpt.org.in` (the active custom domain).
