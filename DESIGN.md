# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-07-11
- Primary product surfaces: editorial home, themed article collections, administrator sign-in and publishing panel
- Evidence reviewed: `index.html`, `css/styles.css`, `data/culture.js`, `js/main.js`, and the navigation/category/card hierarchy of the user-provided Greenleaf reference site

## Brand
- Personality: curious, editorial, warm, contemporary Korean culture guide
- Trust signals: clearly labeled themes, publication dates, concise summaries, and administrator-only publishing
- Avoid: community/social-feed framing, anonymous contribution prompts, copying the reference site's branding, and dense agency-style decoration that competes with content

## Product goals
- Goals: help visitors discover K-culture by theme; surface the latest stories first; let only approved administrators publish
- Non-goals: public accounts, comments, likes, or a general-purpose CMS
- Success signals: visitors can identify major themes immediately; each theme has scannable stories; anonymous visitors cannot access publishing controls

## Personas and jobs
- Primary personas: international K-culture beginners and the site administrator
- User jobs: browse recent stories, choose a theme, understand what to explore next; securely publish a short editorial note
- Key contexts of use: mobile discovery and desktop reading; occasional admin publishing

## Information architecture
- Primary navigation: Home, Latest, Music, Screen, Table, Places
- Core routes/screens: one editorial home; in-page themed collections; administrator panel dialog
- Content hierarchy: hero -> latest stories -> themed story rows -> category directory -> about/footer

## Design principles
- Editorial before interactive: prioritize readable story cards over dashboard controls.
- Theme at a glance: every collection has a distinct title, description, and consistent category marker.
- Admin controls stay out of the visitor journey: publishing is hidden behind a small footer/admin entry.
- Tradeoffs: remain a dependency-free static site; use Supabase REST/Auth endpoints rather than adding a framework.

## Visual language
- Color: paper white and warm stone, near-black ink, vivid coral-red primary accent, restrained theme tints
- Typography: system sans-serif with bold editorial display headings and comfortable body copy
- Spacing/layout rhythm: 8px base rhythm; wide 1180px container; generous section separators
- Shape/radius/elevation: subtle 12–20px rounding; thin rules; low shadows; cards are structured rather than floating pills
- Motion: short hover/focus transitions only; respect reduced motion
- Imagery/iconography: abstract CSS artwork and category labels until licensed editorial images exist

## Components
- Existing components to reuse: category data, post validation, Supabase post mapping, semantic buttons and status regions
- New/changed components: editorial story card, theme shelf, latest lead card, admin dialog, authenticated publish form
- Variants and states: lead/standard/compact story cards; loading/empty/error theme shelves; signed-out/signed-in admin dialog
- Token/component ownership: CSS custom properties in `css/styles.css`; content data in `data/culture.js` and `data/editorial.js`

## Accessibility
- Target standard: WCAG 2.1 AA
- Keyboard/focus behavior: visible focus, native dialog behavior, Escape close, logical source order
- Contrast/readability: dark body copy on light surfaces; accent used with dark text or as decoration
- Screen-reader semantics: landmarks, labeled sections, live status, form errors, explicit dialog labels
- Reduced motion and sensory considerations: disable smooth scrolling and transitions when requested

## Responsive behavior
- Supported breakpoints/devices: 360px mobile through wide desktop
- Layout adaptations: cards collapse to one column; horizontal navigation scrolls; lead grid stacks; admin form becomes single-column
- Touch/hover differences: large tap targets; hover is enhancement only

## Interaction states
- Loading: theme area announces that stories are loading
- Empty: curated starter stories remain visible when Supabase has no rows
- Error: cached/curated content remains and status explains remote unavailability
- Success: newly published story is inserted and shelves rerender
- Disabled: publish button disabled during network requests
- Offline/slow network: local cache supplements curated content

## Content voice
- Tone: concise, welcoming, informed, discovery-oriented
- Terminology: use “story” or “guide” publicly and “post” only in administrator controls
- Microcopy rules: explain the next action; avoid technical language in visitor-facing states

## Implementation constraints
- Framework/styling system: plain HTML, CSS, and browser JavaScript; GitHub Pages hosting
- Design-token constraints: extend the existing CSS variable approach; no new UI dependency
- Performance constraints: no required external imagery or font download; initial content renders from local data
- Compatibility constraints: evergreen browsers with `fetch`, `dialog`, and `sessionStorage`
- Test/screenshot expectations: Node unit tests for data/auth request helpers; HTML/JS syntax checks; desktop/mobile screenshot smoke checks when browser tooling is available

## Open questions
- [ ] Licensed editorial imagery can replace abstract card artwork later / owner: administrator / impact: visual richness only
