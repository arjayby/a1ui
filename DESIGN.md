# Stipple design system

Stipple is the design system for a1ui's site chrome and its local UI components: dotted ink on bone paper. It has three materials. Warm paper stays flat and nearly empty. One electric cobalt appears as ink and as a floating window. Mono type marks whatever came from the machine. This file is the reference for people and agents building on it.

The source is the **Stipple** design system in Claude Design ([artifact](https://claude.ai/artifact/UyvMnnHovgDXzJZUY45QoZ)). It was drawn for a landing page, so it defines nine components and no form controls, overlays or state colours beyond a tool log's. Where a1ui needs more, this repository extends it; every extension is marked **local** below.

## In this repository

| What                                                                 | Where                                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Token source, copied unchanged from Claude Design                    | [`docs/stipple/tokens.json`](docs/stipple/tokens.json)                                                         |
| Token CSS: Stipple's own names, then the shadcn roles mapped to them | [`src/app/stipple-tokens.css`](src/app/stipple-tokens.css)                                                     |
| Tailwind and Fumadocs mapping, plus local extensions                 | [`src/app/globals.css`](src/app/globals.css)                                                                   |
| Component styles (`.ui-*`)                                           | [`src/app/stipple-components.css`](src/app/stipple-components.css)                                             |
| React components                                                     | `src/components/ui/<name>.tsx`                                                                                 |
| Fonts                                                                | [`public/fonts/stipple`](public/fonts/stipple), hashes in [`docs/stipple/fonts.json`](docs/stipple/fonts.json) |

- Paper (light) is the default theme; the theme toggle switches to Night (`<html class="dark">`).
- Use the Stipple tokens (`var(--paper-100)`, `var(--cobalt-ink)`) in site CSS, and the shadcn roles (`bg-background`, `text-muted-foreground`) in components. Never use raw hex values.
- Tailwind's `rounded-sm`/`md`/`lg` resolve to Stipple's 4/8/10px radii. `rounded-xs` is 4px and `rounded-xl` and above stop at 10px, so nothing is rounder than a window.
- Tailwind's `text-xl` to `text-4xl` resolve to 22, 32, 48 and 64px (`heading-sm`, `heading-md`, `display-lg`, `display-xl`). `text-xs` to `text-lg` keep Tailwind's defaults so registry demos render as they install; site chrome sets Stipple's 13 and 15px sizes through the `--type-*` tokens.
- `tabular-nums` also switches to `font-mono`. Endless has no tabular figures, so numbers that tick, count or line up are set in the mono.
- `font-medium`, `font-semibold` and `font-bold` all resolve to 400, because Endless has one weight.
- Tailwind's `shadow-xs` and `shadow-sm` resolve to nothing, and `shadow-md` and above to one 1px `line-strong` edge.
- Spacing tokens are Stipple's steps: `var(--space-4)` is 16px, not 4px. They do not replace Tailwind's numeric spacing scale.
- Registry blocks and components keep their own styles so they install cleanly into any shadcn theme. On this site they pick up Stipple through the roles above.

To change a token, edit `docs/stipple/tokens.json` (or re-export it from Claude Design) and bring part 1 of `src/app/stipple-tokens.css` in step with it.

## Principles

- **Paper first.** Most of every page is `paper-100` with nothing on it. If a page feels busy, remove something before you shrink anything.
- **One cobalt.** Cobalt is the only hue with a job. It is ink (`cobalt-ink`) for the wordmark, links, hovered rows, the current page and the focus ring, and a fill for the primary Button, the landing window and every control that is on or selected. Nothing else is coloured.
- **Dots, not drawings.** Pictures are dots in one ink: the landing's particle menu is drawn in `cobalt-ink`. No gradients outside the window, no 3D.
- **Show the work.** Mono type means "this came from the machine": code, install commands, counts, durations, keyboard shortcuts and the small labels.
- **One weight.** Endless ships in Regular only. Hierarchy comes from size, colour and space. Never bold, never italic, never a faked version of either.

## Voice

Stipple's source writes as one person talking to another, dry and specific: short sentence-case headings with no closing punctuation, verb phrases on buttons, mono labels of one to three words, no emoji and no exclamation marks. a1ui's existing copy was kept as it was when the system was applied; follow these rules for new copy.

## Colour

Two themes share the same token names: **Paper** (light, the default) and **Night** (dark, derived from it).

- Set pages on `paper-100`. Use `paper-50` for raised things (inputs, menus, dialogs, cards) and `paper-200` for quiet fills (the quiet Button, badges, the tabs track, skeletons). `paper-300` is the hover of `paper-200`.
- Set headings and body copy in `ink`, secondary copy in `ink-muted`, and mono labels, durations and fine print in `ink-faint`. `ink-faint` reads on `paper-50` and `paper-100` only.
- Use `cobalt-ink` whenever cobalt is text or a mark on paper. Do not use `cobalt-500` or `cobalt-600` as text.
- **Local:** Night's cobalts stay close to Paper's. The fills are identical. `cobalt-ink` is `#5b66e6`: Paper's `#3444da` lifted a third of the way toward Stipple's `#a9acff`. On Night's grounds it is 3.9:1 on `paper-100` and 3.6:1 on `paper-50`, enough for the focus ring and marks but below the 4.5:1 that small text needs (flagged).
- **Local:** Night's `success` and `--warning` are lifted the same way: `#2f9057` and `#a17518`, 4.5:1 and 4.4:1 on Night's `paper-100`. `danger` is Paper's `#b62f25` in both themes, so the destructive fill looks the same in each; as text on Night it is 3.0:1 on `paper-100` and 2.7:1 on `paper-50`, below the 4.5:1 that small text needs (flagged).
- Use `cobalt-500` and `cobalt-600` only as fills, with `on-cobalt` on top.
- Mark the current row with `cobalt-wash` behind `ink`: the sidebar does this for the current page.
- Use `line` for decorative hairlines and `line-strong` for any border that is the only edge of a control or a floating layer.
- `signal-red`, `signal-amber` and `signal-green` are the three window dots and nothing else.
- Cobalt fills an area for the primary Button, the landing window and the on or selected state of a control: checked checkboxes and radios, switches that are on, pressed chips, the selected segment, page or tab, a slider's filled track and a completed key combo. Use the `primary` role for that fill and `on-primary` for anything on top of it, never `foreground` or a raw cobalt, so the colour changes in one place (`--primary` in `src/app/stipple-tokens.css`).
- Keep idle and neutral parts on paper and ink: unchecked controls, slider knobs, carets, tooltips and badges. A selected row in a list or menu is still `accent` (`cobalt-wash` behind `ink`), not a fill.

### Roles

Components read shadcn role names. Each one points at a Stipple token.

| Role                                   | Token                 | Notes                                                                                                |
| -------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `background`, `sidebar`                | `paper-100`           | The page, the sidebar, demo wells.                                                                   |
| `card`, `popover`, `control`           | `paper-50`            | Raised ground.                                                                                       |
| `muted`, `secondary`, `sidebar-accent` | `paper-200`           | Quiet fills and hover rows.                                                                          |
| `foreground` and the `-foreground` set | `ink`                 | 12.4:1 on `paper-100` in Paper, 15.0:1 in Night.                                                     |
| `muted-foreground`                     | `ink-muted`           | 6.7:1 on `paper-100`, 5.9:1 on `paper-200` in Paper.                                                 |
| `subtle-foreground`                    | `ink-faint`           | 4.7:1 on `paper-100` in Paper. Not for `paper-200`.                                                  |
| `accent` / `accent-foreground`         | `cobalt-wash` / `ink` | A selected or current row.                                                                           |
| `border`, `hairline`, `sidebar-border` | `line`                | Decorative.                                                                                          |
| `input`                                | `line-strong`         | 3.3:1 on `paper-100`, 3.6:1 on `paper-50` in Paper.                                                  |
| `ring`, `sidebar-ring`                 | `cobalt-ink`          | 5.8:1 on `paper-100` in Paper, 3.9:1 in Night.                                                       |
| `primary`, `sidebar-primary`           | `cobalt-500`          | Fill only: the primary Button and on or selected controls. Hover `cobalt-600`, pressed `cobalt-700`. |
| `on-primary`                           | `on-cobalt`           | 6.0:1 on `cobalt-500`.                                                                               |
| `success`, `danger`                    | `success`, `danger`   | 5.0:1 on `paper-100` in Paper; 4.5:1 and 3.0:1 in Night. Always beside an icon or a sign.            |
| `chart-1` to `chart-5`                 | cobalt ramp           | `cobalt-300`, a 300/500 mix, `cobalt-500`, `cobalt-700`, a darker mix.                               |

### Local colours

Stipple does not define these. They exist because the component library needs them.

| Token                                               | Paper                          | Night              | Why                                                                                  |
| --------------------------------------------------- | ------------------------------ | ------------------ | ------------------------------------------------------------------------------------ |
| `--warning`                                         | `#7d5400`                      | `#a17518`          | Password strength and warning badges. 5.5:1 on `paper-100` in Paper, 4.4:1 in Night. |
| `--on-danger`                                       | `#ffffff`                      | same               | Text on a solid `danger` fill. 6.1:1 in both themes.                                 |
| `--overlay`                                         | `rgb(42 38 31 / 0.32)`         | `rgb(0 0 0 / 0.6)` | The scrim behind modal dialogs and the mobile sidebar.                               |
| `--success-soft`, `--warning-soft`, `--danger-soft` | 12% of the colour              | same               | Tints behind state text; `--danger-soft-hover` is 20%.                               |
| `--chart-2`, `--chart-5`, `--chart-other`           | mixed from the Stipple cobalts | same               | Avatar tones and unread dots need five steps of one ramp.                            |
| `--shadow-overlay`                                  | `0 0 0 1px` `line-strong`      | same               | The edge of a floating layer, in place of a shadow.                                  |

## Type

Two families. **Endless** (`font-sans`, and `font-heading`, which is the same family) sets everything a person wrote. **JetBrains Mono** (`font-mono`) sets everything a machine wrote, plus the small labels. Both are served from `public/fonts/stipple`.

| Style        | Size / line | Tracking | Use on this site                                                                           |
| ------------ | ----------- | -------- | ------------------------------------------------------------------------------------------ |
| `display-xl` | 64 / 64     | -0.02em  | Not used yet: a hero line.                                                                 |
| `display-lg` | 48 / 52     | -0.02em  | Page titles (`.page-heading`, docs `h1`).                                                  |
| `heading-lg` | 40 / 44     | -0.015em | Not used yet: section headings on a landing page.                                          |
| `heading-md` | 32 / 36     | -0.01em  | Docs `h2`; page titles on phones.                                                          |
| `heading-sm` | 22 / 28     | -0.005em | Dialog titles, the landing window title.                                                   |
| `body-lg`    | 18 / 28     | 0        | Page descriptions.                                                                         |
| `body`       | 15 / 24     | 0        | Running text, inputs.                                                                      |
| `body-sm`    | 13 / 20     | 0        | Captions, card copy, tables, the contents rail.                                            |
| `label`      | 13 / 16     | 0.01em   | Buttons, tabs, menu items, sidebar rows.                                                   |
| `mono-label` | 11 / 16     | 0.12em   | Eyebrows, badges, sidebar group titles, table column titles. Weight 500, always uppercase. |
| `mono-body`  | 13 / 24     | 0        | Code and terminal output.                                                                  |
| `mono-sm`    | 11 / 18     | 0        | Durations, counters, keyboard hints.                                                       |

- Endless is always weight 400 and `font-synthesis: none` is set on `body`. Emphasise with `cobalt-ink` or with size: `<strong>` in docs prose is `cobalt-ink`.
- Endless covers basic Latin only (letters, digits and ASCII punctuation). Curly quotes, dashes, the middle dot and accented letters fall back to the next family in the stack. Prefer straight quotes and hyphens in new copy. The Open Graph image replaces them with their ASCII forms.
- `mono-label` is the only uppercase style besides the wordmark. Write labels in sentence case and let the style uppercase them.
- Keep running text under 62 characters wide (`--container-reading`).

## Space, shape and depth

- Space on a 4px base: `space-1` to `space-4` (4 to 16px) inside components, `space-6` to `space-12` (24 to 48px) between the parts of a block, `space-16` (64px) between a picture and its words, `space-24` and `space-32` (96 and 128px) between sections.
- Catalog pages open on `space-24` of empty paper and every page closes on `space-32`. A docs article opens on `space-16`, so a component's demo is on screen when the page loads. Docs sections sit `space-32` apart on desktop and `space-24` on small screens.
- The catalog pages lay out in one 1120px column (`--container-content`), wider than Stipple's 960px. A catalog is an index, not a gallery: one row per entry in title order, `space-16` below the page header, with a `line` hairline between rows.
- A catalog row is at least 44px tall and reads left to right: a two-digit `mono-sm` number, the name in `body`, the description in muted `body` cut to one line, and an arrow that arrives on hover. The name is the link and covers the whole row; no demo is mounted on a catalog page. On a phone the number goes and the description drops under the name, on two lines at most.
- The docs toolbar is `space-16` tall. Sidebar rows are 34px, with `space-3` around each group and `space-6` around the wordmark. Demo stages keep `space-12` above and below the component.
- On the landing page the window and the menu sit `space-24` apart.
- Corners are small: `radius-sm` 4px for chips, checkboxes and menu rows, `radius-md` 8px for buttons and inputs, `radius-lg` 10px for cards, dialogs and the window. `radius-full` is for dots, radios and switch tracks.
- Paper surfaces are flat. There are no shadows; the landing window alone takes `shadow-window`. Cards and demo wells are set apart by a `line` hairline, catalog rows by a `line` rule between them, and floating layers (menus, popovers, tooltips, dialogs, toasts) by one `line-strong` edge.
- Nothing is translucent and nothing blurs in the site chrome. Registry components keep their own backdrop blur.
- Focus is a solid 2px `cobalt-ink` outline, offset 2px, on every interactive element. Inside the landing window it is `on-cobalt`.

## Motion

- Site chrome is limited to 120ms colour changes on hover and toggle (`--motion-fast`). Nothing lifts, scales, slides or fades in on load, and nothing loops except the Spinner.
- Overlays appear with a 120ms opacity change. The Sheet is the one **local** exception: a drawer travels from its edge for 200ms so it reads as a drawer.
- The registry demos are about motion and keep their own. `--ease-spring`, `--ease-spring-snappy` and `--ease-press` stay in `globals.css` for them.
- `prefers-reduced-motion` removes the remaining transitions.

## Imagery and iconography

- Pictures are dots in one ink with no frame and no background. The dotted grounds behind the Text Banner and Text Scramble demos are square 2px dots (`dot-size`) in `paper-300`.
- Stipple has no icon set and asks for a word in `mono-label` where an icon would go. **Local:** the component library and the docs toolbar use Phosphor icons, 16px in `currentColor`, because the components need them. Do not add icon tiles or emoji, and prefer a mono label in new site chrome.

## Name and logo

The a1ui name is set as a Stipple wordmark (`.wordmark`): Endless, uppercase, tracked 0.14em, in `cobalt-ink`. The brand mark beside it, the favicon and the Open Graph image use the same `cobalt-ink` on paper.

## Components

a1ui implements these in `src/components/ui`, built on Base UI, styled in `src/app/stipple-components.css`.

### From Stipple

| Stipple component                               | On this site                                                                                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                                          | `Button`. `default` is Stipple's primary (`cobalt-500`, hover `cobalt-600`, pressed `cobalt-700`); `secondary` is its quiet (`paper-200`, hover `paper-300`). 36px tall, `sm` 28px. One primary per view. |
| Eyebrow                                         | `.stipple-eyebrow`, and the same `mono-label` style on badges, sidebar group titles and table column titles.                                                                                              |
| WindowCard                                      | The landing card and the 404 card (`.landing-card`): a cobalt window with three window dots, a `heading-sm` title and `body-sm` copy, floating on `shadow-window`.                                        |
| TopNav                                          | Its wordmark, in the sidebar header.                                                                                                                                                                      |
| RuleLabel, ToolLog, Accordion, Footer, Halftone | Not built into the site chrome. Read them in the Claude Design artifact before adding one.                                                                                                                |

### Local

Stipple has no equivalents for these; each follows its rules.

- **Button** `outline` (a `line-strong` edge) and `ghost` (no fill at rest) hover to a paper fill, never to cobalt. `destructive` is a solid `danger` fill with `on-danger` text, the same as Swipe Row's destructive action, and darkens toward black on hover and press the way the primary fill does.
- **Input, Textarea, Select**: `paper-50` inside a 1px `line-strong` edge, `radius-md`, 36px tall, `body` text. Hover turns the edge `ink`; invalid turns it `danger`.
- **Checkbox, RadioGroup, Switch**: `paper-50` with a `line-strong` edge when off, `primary` with an `on-primary` mark when on.
- **Card**: a `paper-50` sheet inside a `line` hairline. Catalog rows sit on `paper-100` and their name and arrow turn `cobalt-ink` on hover.
- **Badge**: a `mono-label` on a `paper-200` chip; `outline` takes a `line-strong` edge, the state variants take their colour as text and edge, and `dot` is an 8px `cobalt-ink` dot.
- **Tabs**: a `paper-200` track; the current tab is a `paper-50` chip with `cobalt-ink` text.
- **Dialog, Sheet, Popover, Tooltip, DropdownMenu, Toast**: `paper-50` sheets with one `line-strong` edge. Menu group labels are `mono-label`.
- **Alert**: a `paper-50` sheet inside a `line` hairline; the variant colours its text and always comes with an icon.
- **Skeleton**: a still `paper-200` block.
- **Code blocks**: syntax colours come from the default GitHub Shiki themes (light in Paper, dark in Night), not from Stipple. This is the one place besides cobalt where the page is coloured.
