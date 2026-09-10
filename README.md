# Discover K-Culture

A lightweight static MVP website that introduces K-culture through six beginner-friendly categories: K-pop, K-drama, K-food, Hanbok & Fashion, Festivals, and Travel.

## Language policy

English is the primary and default language because the site is designed for international visitors. Public editorial content is authored in English first. The language tabs allow visitors to switch to Korean explicitly; every new visitor session starts in English.

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

## Features

- Editorial home with latest-story and themed K-culture shelves
- Clickable story cards with dedicated, bilingual long-form reading pages
- Music, drama, food, fashion, festival, and travel discovery sections
- Curated starter stories with Supabase-backed administrator posts
- Private administrator studio for publishing and editing stories
- Formatting toolbar, live preview, and 5,000-character long-form posts
- Responsive layout for mobile and desktop
- Basic keyboard focus and accessibility-friendly button semantics

## Future improvements

- Add curated, license-safe images
- Expand Korean translations as new English-first editorial stories are published
- Add a quiz for personalized category recommendations
- Add a review queue and publication audit log if the editorial team grows
- Add source citations for publication-ready content
- Run Lighthouse and HTML validation before deployment

## Supabase setup

1. Open the Supabase SQL Editor for the project.
2. For a new database, run `supabase/schema.sql` once.
3. Create the administrator under **Authentication > Users**. The current UI accepts
   an ID and maps it to `<id>@igaogdhrdtmjxnyezjbp.supabase.co` for Supabase email/password
   authentication.
4. Copy that user's UUID and add it to `public.admins`:

   ```sql
   insert into public.admins (user_id) values ('YOUR-AUTH-USER-UUID');
   ```

5. Reload the site, choose **관리자** in the footer, and sign in with the administrator ID.

If the original public-post schema was already installed, run
`supabase/admin-only.sql` instead of rerunning the full schema. Run the complete file:
it removes anonymous and broad table permissions, exposes only the public post columns,
keeps `id`, `created_at`, and `created_by` server-controlled, and restricts publishing
and editing to user UUIDs registered in `public.admins`. Existing installations must
run the updated file once to enable the longer body format and administrator UPDATE policy.

The publishable key in `js/supabase-config.js` is intended for browser use. Access is
restricted by the row-level security policies in `supabase/schema.sql`; never place a
Supabase secret or service-role key in this repository.

The browser verifies both the Supabase access token and `is_admin()` membership before
showing publishing controls. That check improves the UI boundary, but the database RLS
policy and column-level grants are the authoritative security boundary. Keep leaked
password protection enabled in Supabase Auth on Pro-plan projects and enable MFA for
administrator accounts when the project moves beyond a single trusted administrator.
The current Free plan does not provide leaked password protection.
