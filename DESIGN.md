# Graphite design system

Graphite is the design system for a1ui's site chrome and its local UI components. It is a quiet, neutral palette with ink as both its primary and its accent (blue is kept for charts), hairline structure, translucent materials, spring motion, three type families and shadcn `base-vega` geometry. This file is the reference for people and agents building on it.

The source is the **Graphite** design system in Claude Design ([artifact](https://claude.ai/artifact/9MqfgLG4LdqrErKqj4Xnxk)). Its guidance and examples are written for Tally, its reference analytics product; the rules apply to any surface built with Graphite.

## In this repository

| What                                                              | Where                                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Token source (ahead of Claude Design since November 8, 2026)      | [`docs/graphite/tokens.json`](docs/graphite/tokens.json)                                                           |
| Generated token CSS: light in `:root`, dark in `.dark`            | [`src/app/graphite-tokens.css`](src/app/graphite-tokens.css)                                                       |
| Tailwind, shadcn and Fumadocs role mapping, plus local extensions | [`src/app/globals.css`](src/app/globals.css)                                                                       |
| Component styles (`.ui-*`)                                        | [`src/app/graphite-components.css`](src/app/graphite-components.css)                                               |
| React components                                                  | `src/components/ui/<name>.tsx`                                                                                     |
| Fonts and licences                                                | [`public/fonts/graphite`](public/fonts/graphite), hashes in [`docs/graphite/fonts.json`](docs/graphite/fonts.json) |

- Dark is the default theme (`<html class="dark">`); the theme toggle switches to light.
- Use the semantic tokens (`var(--card)`, `bg-card`, `text-muted-foreground`), never raw hex or oklch values.
- Tailwind's `rounded-xs`/`sm`/`md`/`lg` resolve to Graphite's 4/6/8/12px radii, and `font-sans`, `font-mono` and `font-heading` to the three families.
- Spacing tokens are CSS variables named by pixel value (`var(--space-16)` is 16px). They do not replace Tailwind's numeric spacing scale: `p-4` keeps its usual meaning.
- Each type style is exposed as `--type-<style>-family`, `-size`, `-leading`, `-weight` and, where set, `-tracking`.
- Local extensions that are not part of Graphite live in `globals.css`: code-highlighting colours (`--syntax-*`), the primitive `--text-*`/`--leading-*`/`--tracking-*` scale, container widths, and the legacy `--status-*` and `--control-background` aliases that published registry components read.
- Registry blocks and components keep their own styles so they install cleanly into any shadcn theme.

On November 8, 2026 the colours, materials, shadows and motion tokens of the site's former Apple layer were merged into Graphite, and the layer was removed; type, spacing and radii are Graphite's own. Chart colours are unchanged. To change a token, edit `docs/graphite/tokens.json` (or re-export it from Claude Design) and regenerate `src/app/graphite-tokens.css` to match; do not hand-edit values in the CSS.

## Overview

Tally is a web analytics platform: traffic tracking, visitor journeys, funnels and revenue attribution. The interface is a quiet instrument panel: neutral greys, hairline structure, ink for action, focus and selection, and colour reserved for data and state. The numbers carry the colour; the chrome stays out of their way.

## Voice and content

- **Plain, exact, unhurried.** Say what the data shows and what it affects: "Orders after Oct 24 are missing attribution." Not "Oops! Something went wrong."
- **Sentence case everywhere**: titles, buttons, tabs, menu items. Uppercase appears only in the mono `eyebrow` style.
- **Second person for the reader, no first-person brand voice.** "Your checkout funnel converted 3.8%", never "We noticed…" in product UI (marketing may use "we" sparingly).
- **Verbs on buttons**, verb-first: "Create funnel", "Export CSV", "Reconnect Stripe". Confirmations in past tense: "Funnel saved".
- **Numbers are the copy.** Always show the comparison and period: "48,219 visitors · +12.4% vs previous 30 days". Use thousands separators, one decimal for percentages, currency with its symbol.
- **Domain words, used consistently:** _visitor_ (a unique person), _session_ (a visit), _pageview_, _event_, _goal_, _funnel_ (ordered steps), _journey_ (a visitor's path), _source / medium / campaign_ (UTM), _attribution_ (first touch, last touch, linear).
- No emoji, no exclamation marks, no filler stats.

## Colour

Dark is the primary theme; light is its paper counterpart. Use the tokens, never raw hex.

- **Surfaces:** `background` for the page (true black in dark, `#f5f5f7` in light), `card` for every raised surface (cards, the docs content panel, dialogs, menus, toasts), `muted` for hover, selection, secondary buttons and the tabs track. Demos, code and catalog tiles sit in recessed `--well` surfaces inside a card (`background` in light, a soft `#232325` in dark so they never read as black holes).
- **Text:** `foreground` for primary text, `muted-foreground` for descriptions, metadata and axis labels. Both pass 4.5:1 on `background`, `card` and `muted` in both themes (`muted-foreground` on `muted` is 5.4:1 in dark, 4.9:1 in light). `subtle-foreground` is for non-text marks only.
- **Lines:** `hairline` replaces most dividers between sections; `border` is a decorative edge (cards, separators, gridlines). Controls take `input`, which is a hairline too (1.8:1 on `card` in dark, 1.5:1 in light), below the 3:1 a control edge needs; `prefers-contrast: more` strengthens all three.
- **Primary is ink.** The primary button, checked controls and badges are `primary` (near-white in dark, near-black in light) with `on-primary` text.
- **Accent is ink.** `accent` is the same ink as `foreground` (`#f5f5f7` in dark, `#1d1d1f` in light), with `accent-foreground` its inverse. It marks text selection and the catalog card's hover arrow, and the focus `ring` and `sidebar-primary` match it. The chrome has no hue; blue appears only in the chart ramp. Fumadocs' neutral hover fills read `muted`, not `accent`.
- **State:** `success`, `warning`, `danger` (system green, orange and red), each with a `-soft` tint for alert and badge backgrounds. State colour never travels alone: pair it with a Phosphor icon (`CheckCircle`, `Warning`, `WarningCircle`) or a sign and arrow on deltas.
- **shadcn parity:** `card-foreground`, `popover`, `popover-foreground`, `secondary`, `secondary-foreground`, `on-danger` and the `sidebar-*` set carry the rest of the shadcn palette.
- **Data:** `chart-1` to `chart-5` are one blue ramp, the only blue on the site, lightest to darkest, the same in both themes; steps differ in lightness, so they suit ordered or ranked series. Assign them in order and keep a series' slot when filters hide others. A sixth series folds into `chart-other`. Scatter plots and maps use at most three series. Status colours are never used as series colours.

## Typography

Three families, each with one job:

- **Stack Sans Notch** (`--font-heading`) for headings, card titles, dialog titles and the big numbers (`metric`). Weights 400 for display sizes, 500 for titles. Tight tracking (-0.025em to -0.04em).
- **Inter** (`--font-sans`) for all content and controls: `body` 14/20 is the default, `label` for form labels and tabs, `button` 12/20 medium for buttons, menu items and badges, `caption` for metadata.
- **DM Mono** (`--font-mono`) for code (`code`), URLs, UTM strings and event names (`data`), and the uppercase `eyebrow` kicker (0.08em tracking) above KPI labels and section titles.

Numbers in tables and KPIs use tabular figures (`font-variant-numeric: tabular-nums`). Scale: `display` 64 · `h1` 48 · `h2` 32 · `h3` 24 · `h4` 18 · `title` 16 · `metric` 32.

## Layout and spacing

- Spacing tokens are named by their pixel value: `space-4` … `space-96`. Inside components: 4, 8, 12, 16, 24. Between dashboard cards: `space-24`. Between card groups: `space-32`. Marketing sections: `space-96` vertical.
- Dashboard pages: a toolbar row (date range Select first, then filters as `outline` buttons, actions at the right edge), then a KPI row of four `sm` cards, then chart cards in a 12-column grid.
- Content width caps at 1120px for marketing, 1280px for the app. 16px side gutter on phones.

## Shape, depth and borders

- Radii: `radius-xs` 4 (checkbox, menu item), `radius-sm` 6 (inputs, menus, popovers, tooltips, toasts), `radius-md` 8 (buttons, sidebar highlight, tabs track, alert, skeleton), `radius-lg` 12 (cards, dialogs), `radius-full` for badges and switches.
- Depth is a soft shadow: `shadow-card` for raised cards (a ring alone in dark), `shadow-card-hover` when a card or tile lifts on hover, `shadow-overlay` for floating layers. Buttons are flat: no shadow. No coloured glows, no gradients.
- **Materials:** the landing nav, docs toolbar, mobile sidebar, popovers, menus, tooltips and toasts are translucent: `material` or `material-thick` behind `backdrop-filter: blur(var(--material-blur)) saturate(var(--material-saturate))`. The toolbar hairline fades in only once the page scrolls. Modal dialogs and the mobile sidebar dim the page with `overlay`; floating layers do not. Under `prefers-reduced-transparency` materials go solid.
- Sheets meet the viewport edge with a `border` hairline and no radius.

## States and motion

- Hover: filled buttons step to `primary-hover`; quiet ones gain `muted`. Inputs show the `ring` border on hover.
- Focus: a 2px solid `ring` outline at 2px offset on buttons, checkboxes, radios, switches and tabs; inputs and select triggers take a `ring` border plus a 3px `ring-halo`. `ring` holds 3:1 on every surface in both themes.
- Disabled: 50% opacity, no pointer events. Invalid: `danger` border with a `danger-soft-hover` halo, plus a hint line.
- Motion uses springs sampled into CSS `linear()` curves: `ease-spring` (damping 1.0, response 0.4s) for overlays and layout, `ease-spring-snappy` (1.0, 0.3s) for press release and small controls, `ease-spring-bounce` (0.8, 0.4s) for momentum only, each with a matching `-duration`. Colour and press feedback use `ease-press` at 150ms so they never lag the input.
- Press feedback lands on pointer-down (`scale(0.96)` on site buttons, `0.985` on tiles) and springs back on release. Demo stages are excluded, so registry components look exactly as they install. Overlays scale in from their trigger; sheets and toasts leave the way they came.
- Under `prefers-reduced-motion` the page reveal becomes a 200ms cross-fade and overlays only fade.

## Iconography

- **Phosphor Icons, regular weight**, the shadcn `iconLibrary: "phosphor"` set. In React apps use `@phosphor-icons/react`; inside this system use `<Icon name="…" />`, which draws the same 256-grid paths.
- 16px in buttons, menus, inputs and alerts; 14px inside checkboxes and the toast close button; 12px in badges. Icons take `currentColor`: `muted-foreground` in menus, the state colour in alerts and toasts.
- Bundled names: Check, CaretDown, CaretUpDown, X, Info, WarningCircle, CheckCircle, Warning, ArrowUpRight, ArrowDownRight, DotsThree, MagnifyingGlass, Funnel, ChartLine, Globe, CalendarBlank, DownloadSimple, Gear, Trash, Copy, CircleNotch, Bell, Plus, Users, CurrencyDollar, Minus, Eye, Link, Lightning, Pulse.
- Icon-only buttons always carry `aria-label` and a Tooltip. No emoji as icons.

## Logo

Tally has no logo mark in this system yet. Set the name in Stack Sans Notch 500, `foreground`, until one is supplied.

## Using with shadcn

These tokens map one-to-one onto a shadcn `base-vega` theme: `background`, `foreground`, `card`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `primary`, plus `on-primary` → `--primary-foreground`, `danger` → `--destructive`, `on-danger` → `--destructive-foreground`, `chart-1`…`chart-5` → `--chart-1`…`--chart-5`. Set `--font-heading`, `--font-sans` and `--font-mono` to the three families. The `Tally` bundle here mirrors the base-vega components' geometry for previews and prototypes.

## Tokens

Every value below comes from `docs/graphite/tokens.json`.

### Colour

| Token                          | Dark                       | Light                      | Use                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | -------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--background`                 | `#000000`                  | `#f5f5f7`                  | Page canvas: true black in dark, Apple's #f5f5f7 grey in light. Marketing pages, the app shell, the recessed wells behind demos and code.                                                                                                                                                                                                                        |
| `--card`                       | `#1c1c1e`                  | `#ffffff`                  | Raised surfaces: cards, the docs content panel, dialogs, sheets, popovers, menus, toasts, chart panels.                                                                                                                                                                                                                                                          |
| `--card-foreground`            | `#f5f5f7`                  | `#1d1d1f`                  | Text on card (shadcn --card-foreground). Same value as foreground.                                                                                                                                                                                                                                                                                               |
| `--popover`                    | `#1c1c1e`                  | `#ffffff`                  | Surface of popovers, menus and select lists (shadcn --popover). Same value as card.                                                                                                                                                                                                                                                                              |
| `--popover-foreground`         | `#f5f5f7`                  | `#1d1d1f`                  | Text on popover.                                                                                                                                                                                                                                                                                                                                                 |
| `--muted`                      | `#2c2c2e`                  | `#e8e8ed`                  | Hover and selected rows, secondary buttons, the tabs track, skeleton blocks, menu highlight.                                                                                                                                                                                                                                                                     |
| `--secondary`                  | `#2c2c2e`                  | `#e8e8ed`                  | Secondary button fill (shadcn --secondary). Same value as muted.                                                                                                                                                                                                                                                                                                 |
| `--secondary-foreground`       | `#f5f5f7`                  | `#1d1d1f`                  | Text on secondary. 12.8:1 in dark, 13.8:1 in light.                                                                                                                                                                                                                                                                                                              |
| `--accent`                     | `#f5f5f7`                  | `#1d1d1f`                  | Ink, the same as foreground: text selection (at 32%) and the catalog card's hover arrow. The chrome is monochrome; blue is reserved for the chart ramp. 15.6:1 on card in dark, 16.8:1 in light. Fumadocs' neutral hover fills read muted instead.                                                                                                               |
| `--accent-foreground`          | `#1d1d1f`                  | `#ffffff`                  | Text and icons on an accent fill. 15.5:1 in dark, 16.8:1 in light.                                                                                                                                                                                                                                                                                               |
| `--border`                     | `rgb(255 255 255 / 0.12)`  | `rgb(0 0 0 / 0.1)`         | Hairlines: card edges, separators, table rules, chart gridlines. Decorative (1.4:1 on card in dark, 1.3:1 in light).                                                                                                                                                                                                                                             |
| `--input`                      | `rgb(255 255 255 / 0.18)`  | `rgb(0 0 0 / 0.16)`        | Borders of controls: inputs, textareas, select triggers, unchecked checkboxes and radios, the switch track when off. 1.8:1 on card in dark, 1.5:1 in light, below the 3:1 a control edge needs (flagged); prefers-contrast: more raises it.                                                                                                                      |
| `--ring`                       | `#f5f5f7`                  | `#1d1d1f`                  | Ink focus outline (2px solid, 2px offset) and the focused input border. 15.6:1 on card in dark, 16.8:1 in light; 19.3:1 on background in dark, 15.5:1 in light.                                                                                                                                                                                                  |
| `--ring-halo`                  | `rgb(245 245 247 / 0.2)`   | `rgb(29 29 31 / 0.14)`     | The soft 3px halo around a focused input, outside its ring-coloured border. Decorative; the border carries the contrast.                                                                                                                                                                                                                                         |
| `--foreground`                 | `#f5f5f7`                  | `#1d1d1f`                  | Primary text and icons on background, card and muted. 15.6:1 on card in dark, 16.8:1 in light.                                                                                                                                                                                                                                                                   |
| `--muted-foreground`           | `#a1a1a6`                  | `#636366`                  | Secondary text on background, card and muted: descriptions, metadata, axis labels, placeholders. 6.6:1 on card in dark, 6.0:1 in light; 5.4:1 on muted in dark, 4.9:1 in light.                                                                                                                                                                                  |
| `--subtle-foreground`          | `#6e6e73`                  | `#a1a1a6`                  | Tertiary marks only: chart axis lines, disabled icons, the empty-state glyph. Not for text (3.4:1 on card in dark, 2.6:1 in light).                                                                                                                                                                                                                              |
| `--primary`                    | `#f5f5f7`                  | `#1d1d1f`                  | Ink: near-white in dark, near-black in light. The one primary action per view, checked controls (checkbox, radio, switch) and badges. 15.6:1 on card in dark, 16.8:1 in light.                                                                                                                                                                                   |
| `--primary-hover`              | `#d2d2d7`                  | `#3a3a3c`                  | Primary button on hover: one step softer than primary.                                                                                                                                                                                                                                                                                                           |
| `--on-primary`                 | `#1d1d1f`                  | `#ffffff`                  | Text and icons on a primary fill: the primary button label, the check glyph, the switch thumb when on. 15.5:1 on primary in dark, 16.8:1 in light.                                                                                                                                                                                                               |
| `--control`                    | `rgb(255 255 255 / 0.06)`  | `#ffffff`                  | Fill inside inputs, textareas, selects and unchecked checkboxes.                                                                                                                                                                                                                                                                                                 |
| `--overlay`                    | `rgb(0 0 0 / 0.5)`         | `rgb(0 0 0 / 0.24)`        | Scrim behind modal dialogs and the mobile sidebar. Floating layers do not dim the page.                                                                                                                                                                                                                                                                          |
| `--success`                    | `#30d158`                  | `#1a7f37`                  | Healthy state and positive deltas (conversion up, goal met), always beside an icon and a sign. Text on card: 8.4:1 dark, 5.1:1 light; 6.5:1 and 4.4:1 on success-soft (light is below 4.5:1, flagged).                                                                                                                                                           |
| `--warning`                    | `#ff9f0a`                  | `#b25000`                  | Needs attention: sampling active, quota near, tracking delayed. Always with an icon. Text on card: 8.3:1 dark, 5.2:1 light; 6.4:1 and 4.5:1 on warning-soft.                                                                                                                                                                                                     |
| `--danger`                     | `#ff453a`                  | `#d70015`                  | Errors, negative deltas, destructive actions; always with an icon or sign. Text on card: 5.0:1 dark, 5.4:1 light; 4.3:1 on danger-soft in dark (below 4.5:1, flagged), 4.5:1 in light.                                                                                                                                                                           |
| `--success-soft`               | `rgb(48 209 88 / 0.14)`    | `rgb(26 127 55 / 0.1)`     | Tint behind success text in alerts and toasts.                                                                                                                                                                                                                                                                                                                   |
| `--warning-soft`               | `rgb(255 159 10 / 0.14)`   | `rgb(178 80 0 / 0.1)`      | Tint behind warning text in alerts and toasts.                                                                                                                                                                                                                                                                                                                   |
| `--danger-soft`                | `rgb(255 69 58 / 0.14)`    | `rgb(215 0 21 / 0.1)`      | Destructive button fill and the tint behind danger text.                                                                                                                                                                                                                                                                                                         |
| `--danger-soft-hover`          | `rgb(255 69 58 / 0.24)`    | `rgb(215 0 21 / 0.18)`     | Destructive button on hover; invalid input halo.                                                                                                                                                                                                                                                                                                                 |
| `--on-danger`                  | `#ffffff`                  | `#ffffff`                  | Text and icons on a solid danger fill (shadcn --destructive-foreground): white in both themes. 3.4:1 on danger in dark, below 4.5:1 (flagged); 5.4:1 in light.                                                                                                                                                                                                   |
| `--chart-1`                    | `oklch(0.8100 0.1000 252)` | `oklch(0.8100 0.1000 252)` | Series slot 1, the lightest step of a five-step blue ramp, the same in both themes: the headline series, e.g. Visitors or Revenue. Steps differ in lightness, so the ramp suits ordered or ranked series. Lines 2px, bars 4px-rounded ends. 9.5:1 on card in dark; 1.8:1 in light, below the 3:1 a mark needs (flagged): use it for fills there, not thin lines. |
| `--chart-2`                    | `oklch(0.6200 0.1900 260)` | `oklch(0.6200 0.1900 260)` | Series slot 2: the comparison series, e.g. Previous period or Pageviews. 4.6:1 on card in dark, 3.7:1 in light.                                                                                                                                                                                                                                                  |
| `--chart-3`                    | `oklch(0.5500 0.2200 263)` | `oklch(0.5500 0.2200 263)` | Series slot 3. Assign slots in order, never cycled; a series keeps its slot when filters hide others. 3.3:1 on card in dark, 5.1:1 in light.                                                                                                                                                                                                                     |
| `--chart-4`                    | `oklch(0.4900 0.2200 264)` | `oklch(0.4900 0.2200 264)` | Series slot 4. Lines and bars only; scatter and maps stop at three series. 2.6:1 on card in dark, below 3:1 (flagged); 6.7:1 in light.                                                                                                                                                                                                                           |
| `--chart-5`                    | `oklch(0.4200 0.1800 266)` | `oklch(0.4200 0.1800 266)` | Series slot 5, the darkest step. A sixth series folds into Other. 1.9:1 on card in dark, below 3:1 (flagged); 8.9:1 in light.                                                                                                                                                                                                                                    |
| `--chart-other`                | `#6f6f6a`                  | `#b4b4ab`                  | The folded Other series, and the unselected bars of a highlight.                                                                                                                                                                                                                                                                                                 |
| `--sidebar`                    | `#000000`                  | `#f5f5f7`                  | Sidebar surface; the same as background.                                                                                                                                                                                                                                                                                                                         |
| `--sidebar-foreground`         | `#f5f5f7`                  | `#1d1d1f`                  | Text and icons in the sidebar. 19.3:1 on sidebar in dark, 15.5:1 in light.                                                                                                                                                                                                                                                                                       |
| `--sidebar-primary`            | `#f5f5f7`                  | `#1d1d1f`                  | The active sidebar item: ink in both themes.                                                                                                                                                                                                                                                                                                                     |
| `--sidebar-primary-foreground` | `#1d1d1f`                  | `#ffffff`                  | Text on sidebar-primary. 15.5:1 in dark, 16.8:1 in light.                                                                                                                                                                                                                                                                                                        |
| `--sidebar-accent`             | `rgb(255 255 255 / 0.08)`  | `rgb(0 0 0 / 0.05)`        | Hovered and selected sidebar items.                                                                                                                                                                                                                                                                                                                              |
| `--sidebar-accent-foreground`  | `#f5f5f7`                  | `#1d1d1f`                  | Text on sidebar-accent. 12.4:1 in dark, 15.1:1 in light.                                                                                                                                                                                                                                                                                                         |
| `--sidebar-border`             | `rgb(255 255 255 / 0.12)`  | `rgb(0 0 0 / 0.1)`         | Hairline between the sidebar and the page, and between sidebar groups. Decorative.                                                                                                                                                                                                                                                                               |
| `--sidebar-ring`               | `#f5f5f7`                  | `#1d1d1f`                  | Focus outline inside the sidebar. 19.3:1 on sidebar in dark, 15.5:1 in light.                                                                                                                                                                                                                                                                                    |
| `--material`                   | `rgb(22 22 23 / 0.72)`     | `rgb(255 255 255 / 0.72)`  | Translucent bar material: landing nav, docs toolbar. Pair with backdrop-filter blur(var(--material-blur)) saturate(var(--material-saturate)).                                                                                                                                                                                                                    |
| `--material-thick`             | `rgb(36 36 38 / 0.8)`      | `rgb(255 255 255 / 0.82)`  | Thicker translucent material for floating layers: popovers, menus, tooltips, toasts, mobile sidebar.                                                                                                                                                                                                                                                             |
| `--material-edge`              | `rgb(255 255 255 / 0.08)`  | `rgb(255 255 255 / 0.6)`   | Highlight along the edge of a translucent material.                                                                                                                                                                                                                                                                                                              |
| `--hairline`                   | `rgb(255 255 255 / 0.1)`   | `rgb(0 0 0 / 0.08)`        | Quiet divider that replaces most borders between sections.                                                                                                                                                                                                                                                                                                       |

### Type styles

| Style     | Family  | Size / line | Weight | Tracking | Use                                                    |
| --------- | ------- | ----------- | ------ | -------- | ------------------------------------------------------ |
| `display` | heading | 64px / 68px | 400    | -0.04em  | One per marketing page: the hero line.                 |
| `h1`      | heading | 48px / 52px | 400    | -0.04em  | Marketing section titles.                              |
| `h2`      | heading | 32px / 40px | 500    | -0.025em | App page titles: Overview, Journeys, Funnels, Revenue. |
| `h3`      | heading | 24px / 32px | 500    | -0.025em | Panel and report titles.                               |
| `h4`      | heading | 18px / 28px | 500    | -0.025em | Dialog and sheet titles.                               |
| `title`   | heading | 16px / 24px | 500    | -0.025em | Card titles.                                           |
| `metric`  | heading | 32px / 40px | 400    | -0.04em  | The headline number in a KPI card. Tabular figures.    |
| `body-lg` | sans    | 16px / 24px | 400    | 0        | Marketing intros and empty-state copy.                 |
| `body`    | sans    | 14px / 20px | 400    | 0        | Default UI text, inputs, table cells, descriptions.    |
| `label`   | sans    | 14px / 20px | 500    | 0        | Form labels, tab triggers, alert titles.               |
| `button`  | sans    | 12px / 20px | 500    | 0        | Button, menu item and badge labels.                    |
| `caption` | sans    | 12px / 16px | 400    | 0        | Metadata, tooltips, helper text.                       |
| `eyebrow` | mono    | 12px / 16px | 400    | 0.08em   | Uppercase kicker above section titles and KPI labels.  |
| `code`    | mono    | 13px / 20px | 400    | 0        | Snippets, install commands, event payloads.            |
| `data`    | mono    | 12px / 16px | 500    | 0        | URLs, UTM strings, event names, IDs in tables.         |

### Spacing

| Token        | Value  | Use                                                   |
| ------------ | ------ | ----------------------------------------------------- |
| `--space-4`  | `4px`  | Icon-to-label in badges; menu padding.                |
| `--space-8`  | `8px`  | Gap between buttons in a row; label to input.         |
| `--space-12` | `12px` | Alert vertical padding; gap inside a card footer.     |
| `--space-16` | `16px` | Popover and toast padding; mobile gutter.             |
| `--space-24` | `24px` | Card and dialog padding; gap between dashboard cards. |
| `--space-32` | `32px` | Between card groups on a dashboard.                   |
| `--space-48` | `48px` | Section padding in the app.                           |
| `--space-96` | `96px` | Section padding on marketing pages.                   |

### Radius

| Token           | Value    | Use                                                               |
| --------------- | -------- | ----------------------------------------------------------------- |
| `--radius-xs`   | `4px`    | Checkbox, menu items, chart bar ends.                             |
| `--radius-sm`   | `6px`    | Inputs, selects, popovers, tooltips, menus, toasts, tab triggers. |
| `--radius-md`   | `8px`    | Buttons, the sidebar highlight, tabs track, alerts, skeletons.    |
| `--radius-lg`   | `12px`   | Cards and dialogs.                                                |
| `--radius-full` | `9999px` | Badges, switches, radio dots, status dots.                        |

### Shadow

| Token                 | Value                                                                                                                                                                                                    | Use                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `--shadow-card`       | dark: `0 0 0 1px rgb(255 255 255 / 0.06)`<br>light: `0 0 0 0.5px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04), 0 4px 20px rgb(0 0 0 / 0.04)`                                                           | Raised cards and the docs content panel: a hairline ring with a soft drop in light, a ring alone in dark. |
| `--shadow-card-hover` | dark: `0 0 0 1px rgb(255 255 255 / 0.12), 0 12px 32px rgb(0 0 0 / 0.5)`<br>light: `0 0 0 0.5px rgb(0 0 0 / 0.06), 0 2px 4px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.08)`                            | Cards and tiles on hover: the card shadow lifted further.                                                 |
| `--shadow-overlay`    | dark: `0 0 0 1px rgb(255 255 255 / 0.1), 0 8px 24px rgb(0 0 0 / 0.4), 0 24px 64px rgb(0 0 0 / 0.4)`<br>light: `0 0 0 0.5px rgb(0 0 0 / 0.1), 0 8px 24px rgb(0 0 0 / 0.12), 0 24px 64px rgb(0 0 0 / 0.1)` | Popovers, menus, select lists, toasts and dialogs.                                                        |
| `--shadow-tab`        | dark: `0 1px 2px rgb(0 0 0 / 0.3), 0 0 0 0.5px rgb(255 255 255 / 0.06)`<br>light: `0 1px 2px rgb(0 0 0 / 0.06), 0 2px 6px rgb(0 0 0 / 0.08)`                                                             | The active tab trigger.                                                                                   |

### Motion

The curve values are `linear()` samples of a damped spring; see `docs/graphite/tokens.json` for the full lists.

| Token                  | Duration | Use                                                                                          |
| ---------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `--ease-spring`        | `540ms`  | Default spring (damping 1.0, response 0.4s, no overshoot): overlays, sheets, layout changes. |
| `--ease-spring-snappy` | `410ms`  | Snappy spring (damping 1.0, response 0.3s): press release, toggles, small controls.          |
| `--ease-spring-bounce` | `520ms`  | Bouncy spring (damping 0.8, response 0.4s, 1.5% overshoot): momentum only.                   |
| `--ease-press`         | —        | Short colour and press feedback that must never lag the input.                               |

### Material

| Token                   | Value  | Use                                     |
| ----------------------- | ------ | --------------------------------------- |
| `--material-blur`       | `20px` | Backdrop blur behind --material.        |
| `--material-blur-thick` | `40px` | Backdrop blur behind --material-thick.  |
| `--material-saturate`   | `180%` | Backdrop saturation for both materials. |

## Components

Guidelines from the Graphite component set. a1ui implements these in `src/components/ui`, built on Base UI.

### Button

Triggers an action; one `default` (ink) button per view, for the thing the page is for.

**Provide** children (a verb-first label, sentence case: "Create funnel", "Export CSV"), `onClick`, and optionally a leading `<Icon>`.

| Prop      | Values                                                                      | Default   |
| --------- | --------------------------------------------------------------------------- | --------- |
| `variant` | `default` · `secondary` · `outline` · `ghost` · `destructive` · `link`      | `default` |
| `size`    | `xs` 24 · `sm` 32 · `default` 36 · `lg` 40 · `icon` · `icon-sm` · `icon-xs` | `default` |

- `outline` is the workhorse for report toolbars (Filter, Export, Compare). `secondary` for toggles that sit beside data.
- `destructive` only for removing data the user owns (a goal, a funnel, a site). Confirm it in a Dialog.
- Icon-only buttons need `aria-label`; wrap them in a Tooltip.
- While an action runs, disable the button and put a `<Spinner>` before the label ("Exporting").
- Don't use two `default` buttons side by side; don't put buttons inside chart plots.

### Input

A single-line text field for search, URLs, goal names and UTM values.

**Provide** an `id` paired with a `<Label htmlFor>` (or `aria-label`), `placeholder` with a real example ("acme.com", "/pricing"), and `value`/`onChange` or `defaultValue`. All native input props pass through.

- Mark errors with `aria-invalid` and a `.ty-hint[data-variant="error"]` line under the field; the border turns `danger`.
- For URLs, paths and UTM strings set `style={{ fontFamily: 'var(--font-mono)' }}` so characters are unambiguous.
- Height is 36px to align with Button and Select in toolbars.

### Textarea

Multi-line text for annotations, report notes and event descriptions.

**Provide** the same props as Input; `rows` defaults to 3 and it resizes vertically from 64px.

- Pair it with a `.ty-hint` that says where the text appears ("Shown as a marker on every traffic chart").

### Label

Names a form control; clicking it focuses or toggles the control.

**Provide** `htmlFor` matching the control's `id`, or wrap a Checkbox, Radio or Switch inside it as children.

- Sentence case, no colon: "Site domain", "Conversion goal".
- Stack label over field with `.ty-field` (8px gap); helper text goes below in `.ty-hint`.

### Checkbox

An independent on/off choice, usually in filters and settings lists.

**Provide** `checked` + `onCheckedChange(next)` or `defaultChecked`; `"indeterminate"` shows a dash for a partially selected group. Wrap it in a `<Label>` with its text.

- Use for options that apply on Save or Apply. For instant settings, use Switch.
- Unchecked boxes take the `input` border (3:1); checked fill is `primary`.

### RadioGroup

One choice from a short, visible set, like attribution model or device type.

**Provide** `RadioGroup` with `value` + `onValueChange` or `defaultValue` and an `aria-label`; children are `<Label><RadioGroupItem value="…" />Text</Label>`. `orientation="horizontal"` lays items in a row.

- Two to five options; more than five, use Select.
- Arrow keys move and select within the group.

### Switch

Turns a setting on or off immediately, with no Save step.

**Provide** `checked` + `onCheckedChange` or `defaultChecked`, an `id` paired with a Label. `size="sm"` for dense tables.

- Put the label on the left, the switch on the right, in a row that spans the panel.
- Don't use for choices inside a form that needs Apply; use Checkbox there.

### Select

Picks one value from a list too long for radios: date ranges, channels, metrics.

**Provide** `items` (`{ value, label, icon?, disabled? }[]`), `value` + `onValueChange` or `defaultValue`, `placeholder`, and `aria-label` or a Label via `id`. Optional `icon` sits in the trigger (`CalendarBlank` for ranges), `size="sm"` for toolbars, `align="end"` near the right edge.

- The date range Select is the first control in every report toolbar.
- Keep labels short and parallel ("Last 7 days", "Last 30 days").
- Keyboard: Enter or ↓ opens, ↑/↓ moves, Enter selects, Esc closes.

### Card

The container for every dashboard tile: a KPI, a chart, a table.

**Provide** children from its parts: `CardHeader` (`CardTitle`, `CardDescription`, optional `CardAction` top-right), `CardContent`, `CardFooter`. `size="sm"` uses 16px padding for dense grids.

- KPI cards: an `.ty-eyebrow` label, the number in `.ty-metric` (32px heading face, tabular figures), then the delta as a Badge with an arrow icon and a sign.
- Chart cards: title says the metric and period ("Visitors, last 30 days"), never "Chart".
- Cards sit 24px apart on `background`; never nest a card in a card.

### Badge

A short status or category label: a delta, a channel, "Live", "Sampled".

**Provide** children (one to three words or a number) and `variant`: `default` · `secondary` · `outline` · `success` · `warning` · `destructive`.

- Deltas always carry an arrow icon (`ArrowUpRight` / `ArrowDownRight`) and a value, so meaning never rests on green vs red.
- `secondary` for channel or source tags; `outline` for UTM values and filters.

### Separator

A 1px hairline that divides groups inside a card, menu or toolbar.

**Provide** `orientation` (`horizontal` default, `vertical`). It is decorative; pass `decorative={false}` only when it divides content for screen readers.

- Prefer spacing first; reach for a separator when two groups touch.

### Dialog

A modal for a focused task or a confirmation: export, delete, rename.

**Provide** `trigger` (a Button element), `title`, optional `description`, children for the body, and `footer` (elements, or `close => elements`). Control it with `open` + `onOpenChange` or `defaultOpen`.

- Title is the action as a phrase ("Export this report"); the primary button repeats the verb ("Export").
- Footer: Cancel (`outline`) then the primary, right-aligned.
- For destructive confirms name the object: "Delete Checkout funnel?" with a `destructive` button.
- Esc and the scrim close it; focus is trapped while open and returns to the trigger.

### Sheet

A side panel for filters, segment builders and visitor detail without leaving the report.

**Provide** the same props as Dialog plus `side` (`right` default, `left`, `bottom`).

- Filters live in a right sheet with Reset and Apply in the footer.
- A visitor's journey (their session timeline) opens in a sheet from any table row.

### Popover

A small non-modal panel anchored to a trigger, for quick settings or sharing.

**Provide** `trigger` (a Button element), optional `title` and `description`, children, `align` (`start` · `center` · `end`), `side` (`bottom` · `top`), and `open`/`onOpenChange` or `defaultOpen`.

- Use for share links, metric definitions with an action, column pickers.
- If it needs a Save button and more than two fields, use a Dialog.

### Tooltip

A short label that appears on hover or focus, to name an icon button or define a metric.

**Provide** `content` (text, or text with a `<kbd>` shortcut) and one focusable child. Optional `side` (`top` · `bottom` · `left` · `right`) and `delay` (ms, default 400).

- One sentence, no period for fragments: "Sessions that left after one page".
- Never put interactive content or the only copy of important data in a tooltip.
- Chart hover readouts are a chart concern, not this component.

### Tabs

Switches between views of the same subject: Traffic, Journeys, Funnels.

**Provide** `Tabs` with `value` + `onValueChange` or `defaultValue`, a `TabsList` of `TabsTrigger value="…"`, and a `TabsContent value="…"` per view. `variant="line"` gives an underline style for in-card sub-navigation (Pages / Sources / Events).

- Default (segmented) tabs for page-level views; line tabs inside cards.
- Labels are nouns, one word where possible. ← → move between tabs.

### DropdownMenu

A list of actions behind a button: report actions, row actions, account menu.

**Provide** `trigger` (a Button element) and `items`: `{ label, icon?, shortcut?, onSelect?, variant?: 'destructive', disabled? }`, `{ type: 'checkbox', label, checked, onSelect }`, `{ type: 'label', label }`, `{ type: 'separator' }`. `align="end"` when the trigger sits at the right edge.

- Group with separators; destructive items go last.
- Icons are Phosphor regular, 16px, in `muted-foreground`.
- ↑/↓ move, Enter selects, Esc closes.

### Alert

An inline message about the state of the data or the account, shown in the page flow.

**Provide** `title`, children (one sentence of detail), `variant` (`default` · `success` · `warning` · `destructive`), optional `action` (a small Button) and `icon` (a Phosphor name, or `null`).

- `warning` for sampling, delayed processing, quota. `destructive` for broken tracking or failed syncs, with the fix as the action ("Reconnect Stripe").
- Say what happened and what it affects ("Orders after Oct 24 are missing attribution").
- For confirmations of something the user just did, use Toast.

### Skeleton

A pulsing placeholder in the shape of content that is loading: KPI numbers, chart areas, table rows.

**Provide** `width` and `height` (numbers are px) or a className; `circle` for avatars and favicons.

- Match the real layout so nothing jumps: a 12px line for an eyebrow, 32px for a metric.
- Use for first loads; for refreshes keep the old data and show a Spinner.

### Spinner

An indeterminate loading indicator for short waits: a chart refresh, an export, a sync.

**Provide** optional `size` (px, default 16) and `label` (announced to screen readers, default "Loading").

- Put it inside the Button that started the work, or beside a short status ("Syncing events…").
- Waits longer than a few seconds deserve a Toast when done instead.

### Toast

A brief confirmation that appears in the corner after an action, then leaves on its own.

**Provide** `<Toaster />` once at the app root (`position`: `bottom-right` default, `top-right`, `bottom-center`), then call `toast({ title, description?, action?: { label, onClick }, duration? })`, or `toast.success`, `toast.warning`, `toast.error`. Returns an id for `toast.dismiss(id)`.

- Title in past tense ("Funnel saved", "Export started"); description says where to find the result.
- Offer Undo as the action for reversible changes. Three toasts at most on screen.
- Problems that need fixing belong in an Alert, not a toast that disappears.
