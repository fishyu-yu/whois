# Whale Whois Design System

## Product direction

Whale Whois is a domain and network registration lookup tool. Warm neutral
surfaces, restrained terracotta actions and generous spacing put the query and
returned records first. The original Whale logo, product name, copyright and
metadata remain intact. There are no borrowed brand assets or chat interactions.

## Tokens

`src/app/globals.css` is the source of truth. Colors use OKLCH and semantic
variables, exposed to Tailwind through `@theme inline`.

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `oklch(0.975 0.006 85)` | `oklch(0.205 0.003 70)` |
| `--foreground` | `oklch(0.27 0.012 65)` | `oklch(0.94 0.008 80)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.255 0.006 70)` |
| `--primary` | `oklch(0.54 0.13 40)` | `oklch(0.76 0.12 44)` |
| `--primary-foreground` | `oklch(0.99 0.002 80)` | `oklch(0.21 0.02 40)` |
| `--muted` | `oklch(0.944 0.009 80)` | `oklch(0.29 0.008 70)` |
| `--muted-foreground` | `oklch(0.49 0.012 65)` | `oklch(0.73 0.012 75)` |
| `--border` | `oklch(0.88 0.01 75)` | `oklch(0.365 0.008 70)` |
| `--ring` | Primary | Primary |

Cards contain search, results and history. Muted text covers descriptions and
field labels; borders separate surfaces and rows. Rings identify keyboard focus.

Aliases cover popovers, secondary actions and history surfaces. Destructive
states use red; neutral status tags use secondary surfaces. Colors never stand
alone as status indicators. Primary hover retains 95% opacity for text contrast.

### Typography and geometry

- Existing Inter is self-hosted by Next Font with `display: optional` and no
  eager preload. Cold/slow connections paint an adjusted system fallback;
  cached fonts retain Inter without a late font swap. Chinese uses PingFang SC /
  Microsoft YaHei / system fallbacks. No extra font dependency.
- Domains, addresses, ASN, email and raw records use the system monospace stack.
- Hero: fluid 30–52px; result heading: 24–30px; body: 14–16px; captions: 12px.
- Body leading: `--leading-body: 1.65`; dense records still use comfortable
  20–24px lines.
- Spacing follows a 4px unit (`--space-unit`), usually 16–24px between sections.
- Radius tokens: 6 / 10 / 14 / 16px. Search uses 16px on mobile, 22.4px on desktop.
- `--shadow-surface` is a restrained search shadow. Result cards use a light
  border; large blur layers and decorative gradients are absent.

## Layout

- Header: minimum 64px, bounded at 1152px. Original logo left; history, GitHub
  and theme controls right. It wraps when text is enlarged instead of overflowing.
  Sticky background is opaque enough to retain readability.
- Main result width: 1024px (`--content-width`); search width: 768px
  (`--search-width`). Wide screens retain bounded reading lengths.
- Home centers one editorial title and one search composer. Examples and two
  quiet capability hints replace promotional feature cards.
- Active queries smoothly collapse the hero using a 280ms grid-track transition
  and bounded search-section padding. Results enter independently; no animation
  delays request submission or input handling.
- Mobile results use one column; at 640px field grids can use two columns;
  at 1024px the main information and dates use a 2:1 grid.
- History is a collapsible left drawer on desktop and mobile, leaving the
  workspace unobstructed when closed. This keeps one result reading width
  across laptop and desktop sizes. It does not require an account.
- Use `min-w-0`, `overflow-wrap:anywhere`, `break-all` and preserved whitespace
  for data. Do not truncate registry values or hide page overflow to mask bugs.

## Components and interaction

### Query composer

- Fixed 44×44px primary action, 56px input (48px compact), rounded surface.
- Domain / IP / CIDR / ASN detection reuses existing normalization and public
  suffix rules. The icon and helper text reflect the actual detected type.
- Empty and invalid queries cannot submit. Invalid values have an associated
  error; subdomain normalization has its own polite hint.
- Enter submits, except during IME composition. `/` and Ctrl/Cmd+K focus the
  composer from non-editing contexts. They leave inputs, editors, menus and
  modal dialogs alone.
- Examples fill and focus the input; they do not submit unexpectedly.
- Loading leaves the input and valid submit action available. A new request
  cancels the previous one with AbortController; the requestId guard also
  rejects stale responses from transports that cannot be cancelled.
- No fake results, progress estimates, artificial delays or success states.

### History

- Continue using `whois_history`, `{ query, type, timestamp }`, maximum 20 items.
  Existing valid records are retained; malformed storage cannot crash the page.
- Native `dialog.showModal()` provides inert background semantics. Explicit Tab
  boundary wrapping, autofocus, Escape, backdrop close and trigger restoration
  keep keyboard interaction predictable. Scroll is restored on close/unmount.
- Type icon, full query, date and `aria-current` distinguish recent records.
- An empty drawer explains where future queries will appear.

### Results and exports

- Summary: query, object type, completion, actual source, query time and returned
  organization/registrar. No network location is inferred from registration data.
- Domain: registrar, EPP status, DNS, returned dates and available contacts.
- IP/CIDR/ASN: returned allocation, range, organization, registry and contacts.
  Missing domain-only fields are omitted from network records.
- Controls use a 2-column grid on narrow screens and a compact desktop toolbar.
  Copy/JSON/CSV/image actions remain individually named and at least 44px high.
- Copy and export use polite status/error feedback. Image encoding is lazy
  loaded; JSON/CSV preserve original data, including registry-specific fields.
- Result presentation is loaded on demand and preloaded alongside the query;
  it does not add its tooltip/contact code to the home page's critical path.
- Image export snapshots the result before asynchronous work so starting a new
  query cannot detach and collapse the exported content. Its background is read
  at encoding time to match a theme changed while the module was loading.
- `全部查询字段` and `原始查询数据` start collapsed and toggle independently.
  Buttons expose expanded/controls state; panels remain mounted, associated
  with their trigger and hidden when collapsed.
- Field count is separate metadata outside the disclosure button, preserving
  its visible/accessibility label match. It is omitted in narrow containers.
- Preserve `data-export-panel` and `data-export-ignore`: PNG expands all fields
  in its isolated clone without changing live disclosure state or scrolling.
- Raw data wraps and scrolls within a focusable region capped at 500px.
- Registrar links accept HTTP/HTTPS only; original values remain exportable.

## Motion

| Token | Duration | Use |
| --- | --- | --- |
| `--motion-press` | 100ms | Press feedback budget |
| `--motion-fast` | 150ms | Focus, button colors |
| `--motion-menu` | 180ms | Drawer, dropdown, disclosure reveal |
| `--motion-enter` | 220ms | Small content/result entry |
| `--motion-layout` | 280ms | Maximum major layout transition budget |

Use `cubic-bezier(0.22, 1, 0.36, 1)` for entering content. Entry movement is
limited to 5px, drawer movement to 12px. Animate opacity/transform, never stagger
all result cards or delay the toolbar. Replace previous 560–700ms arbitrary
max-height/width transitions with one bounded 280ms hero/search transition;
there are no synchronous JavaScript layout measurements or per-card stagger.
Loading spinners run only during
actual pending work. Theme changes use next-themes without a whole-page flash.

`prefers-reduced-motion: reduce` disables transitions, entry animations,
spinners and backdrop animation while preserving state text and all actions.

## Accessibility and validation

- Preserve page/field/button names used by existing keyboard and E2E consumers.
- Visible focus rings on links, buttons, menus, disclosures and scroll regions.
- Primary/header/export/example actions are 44px or larger. Disabled controls
  remain visually distinct; accessible names do not depend on icons.
- One visible polite loading status avoids duplicated screen-reader messages.
- Light, dark and system themes use the same geometry and semantic hierarchy.
- Playwright keeps existing query/export/navigation coverage and adds keyboard,
  IME, focus, cancellation, stale-response and long-record checks.
- Screenshot widths: 320px compatibility plus required 360, 390, 768, 1024,
  1440 and 1920px in both themes. Fixtures are confined to test code.
- See `UI_REFACTOR_REPORT.md` for actual check results and performance limits.
