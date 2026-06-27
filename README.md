# Discover K-Culture

A lightweight static MVP website that introduces K-culture through six beginner-friendly categories: K-pop, K-drama, K-food, Hanbok & Fashion, Festivals, and Travel.

## Tech stack

- HTML
- CSS
- JavaScript
- No frameworks, build tools, or external packages

## Project structure

```text
kculture/
  index.html
  css/
    styles.css
  js/
    main.js
    posts.js
  data/
    culture.js
  tests/
    posts.test.js
  assets/
    images/
    icons/
  README.md
```

## How to run

Open `index.html` directly in a browser, or serve the folder with any static file server.

Example:

```bash
cd kculture
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## MVP features

- Hero section with a clear call to action
- Six K-culture category cards
- Interactive detail panel powered by JavaScript
- Culture facts section
- Community post form with local-only browser storage
- Responsive layout for mobile and desktop
- Basic keyboard focus and accessibility-friendly button semantics

## Future improvements

- Add curated, license-safe images
- Add Korean/English language toggle
- Add a quiz for personalized category recommendations
- Add moderation and backend persistence if posts need to sync across devices
- Add source citations for publication-ready content
- Run Lighthouse and HTML validation before deployment
