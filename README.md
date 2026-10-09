# arber.ai portfolio

Personal portfolio for Arbër Salihu: graphic design, content creation, AI visuals and professional experience.

Plain HTML, CSS and JavaScript. No runtime dependencies, account secrets, database or build process are needed.

## Contents

- 8 creative projects, including DIGITAL HIVE and Rinas’s Scope
- 129 Instagram videos across Koral Secrets Kosova and Diverse Academy
- 44 AI works: 33 Fashion AI and 11 AI Explorations
- About and 9 professional positions
- Local photos, fonts, PDF brand books and 5 AI videos

Instagram videos use official embedded posts and include direct Instagram links if playback is unavailable.

## Preview locally

Run from the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173.

## Deploy with Vercel

Import this GitHub repository into Vercel. The checked-in `vercel.json` selects the Other framework, skips installation/build and serves `dist/`.

After the production domain is assigned, set `og:url` and `og:image` in `dist/index.html` to that domain and its `/assets/hero-art.webp` image. Site links, media and fonts use portable relative URLs.

Keep the repository private unless you intentionally choose public source. Vercel can deploy a private repository. Do not add credentials or `.env` files to Git.

## Ownership

Personal brand and provided original work: arber.ai. Concept identity applications and AI-generated visuals are identified in the portfolio.
