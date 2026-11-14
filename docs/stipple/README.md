# Stipple integration reference

The design rules, tokens and component guidelines are in [DESIGN.md](../../DESIGN.md). This page records where they came from and how the repository applies them.

## Source status

The source is the **Stipple** design system in Claude Design ([artifact](https://claude.ai/artifact/UyvMnnHovgDXzJZUY45QoZ)), version `1794650883-043f`, last changed November 14, 2026. Its `project/tokens.json` was copied unchanged to [tokens.json](./tokens.json) and its `project/fonts/Endless-Regular.ttf` to `public/fonts/stipple/endless-400.ttf` on November 14, 2026; [source.json](./source.json) records the version and the hash of each copied file.

Stipple's own notes say its colours were sampled from a single landing-page screenshot and that the Night theme is derived from Paper, not sourced.

This replaces Graphite, which the site used from November 6 to November 14, 2026. The Graphite tokens, fonts and component styles were removed; nothing reads them any more.

## Theme and typography

`src/app/stipple-tokens.css` has two parts. Part 1 mirrors `tokens.json`: Stipple's colours for Paper on `:root` and for Night on `.dark`, and its spacing, radius, halftone and type-style tokens. Part 2 maps the shadcn role names (`background`, `card`, `primary`, `ring` and the rest) onto those tokens and holds the local colours Stipple does not define. `src/app/globals.css` maps the roles to Tailwind and Fumadocs. Paper is the default theme and the theme toggle switches to Night. Night changes only the grounds, lines and inks: on November 14, 2026 its `cobalt-ink`, `success` and `danger` were set to Paper's `#3444da`, `#18703d` and `#b62f25` in place of Stipple's `#a9acff`, `#5fd08d` and `#ff8f80`, so every hue is the same in both themes. The local `--warning` and `--on-danger` follow the same rule. `tokens.json` still holds Stipple's values; [source.json](./source.json) records the override.

Tailwind's `rounded-sm`, `rounded-md` and `rounded-lg` resolve to Stipple's 4, 8 and 10px radii. Its `text-xl` to `text-4xl` sizes resolve to Stipple's heading and display sizes, its medium, semibold and bold weights to 400, and its shadows to nothing or to a single `line-strong` edge. Elements with `tabular-nums` are set in the mono, because Endless has no tabular figures. Spacing tokens (`--space-1` to `--space-32`) are CSS variables and leave Tailwind's numeric spacing scale untouched. Graphite named its spacing tokens by pixel value, so `--space-4` changed meaning from 4px to 16px.

Everything a person wrote is set in Endless 400, served from `public/fonts/stipple`. Endless covers basic Latin only. Code, numeric readouts and the small labels use JetBrains Mono 400, 500 and 700, downloaded from Google Fonts on November 14, 2026 and served from the same folder with its SIL Open Font License. [fonts.json](./fonts.json) records each file's source and hash.

Local additions that Stipple does not define are listed in DESIGN.md under "Local colours" and "Local" components. The spring curves the registry demos use, container widths, and the `--status-*` and `--control-background` aliases that published registry components read stay in `globals.css`.

## Components

Each component is imported from `@/components/ui/<name>` and uses the existing `cn` helper.

| Group             | Components                           |
| ----------------- | ------------------------------------ |
| Actions and forms | Button, Input, Label, Textarea       |
| Form controls     | Checkbox, RadioGroup, Switch, Select |
| Content           | Card, Badge, Separator               |
| Overlays          | Dialog, Sheet, Popover, Tooltip      |
| Navigation        | Tabs, DropdownMenu                   |
| Feedback          | Alert, Skeleton, Spinner, Toast      |

Button supports `default` (Stipple's primary), `secondary` (Stipple's quiet), and the local `outline`, `ghost` and `destructive` variants. Stipple's inverse Button, for use on cobalt, is not implemented. Badge has `default`, `dot`, `secondary`, `outline`, `success`, `warning` and `destructive`. Native attributes, event handlers, and React 19 refs pass through.

Input, Textarea, Select, Checkbox, RadioGroupItem, and Switch use native form elements. RadioGroup is a fieldset: include a legend and give its RadioGroupItem inputs a shared `name`. Checkbox and Switch also accept `onCheckedChange(boolean)`. Their visible glyphs sit inside 44px targets. Select accepts native option children and `onChange`.

Button, Dialog, Sheet, Popover, Tabs, DropdownMenu, Tooltip, Toast, and Collapsible use Base UI. Sidebar and Breadcrumb use Base UI's `useRender` for composition. Triggers and links accept `render` instead of `asChild`. Menu items use `onClick`. TooltipProvider accepts `delay`. Sheet reuses Dialog's focus and dismissal behavior, with `finalFocus` for the mobile sidebar's trigger. ToastViewport renders notifications added with `useToastManager().add()` inside ToastProvider.

These components are available in this repository; they are not published as registry entries.

## Verification

Run the project checks with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.

The `/design-system` review page has been removed; `e2e/blocks-migration.spec.ts` checks that it returns 404.
