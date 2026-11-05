# Graphite integration reference

The design rules, tokens and component guidelines are in [DESIGN.md](../../DESIGN.md). This page records where they came from and how the repository applies them.

## Source status

The source is the **Graphite** design system in Claude Design ([artifact](https://claude.ai/artifact/9MqfgLG4LdqrErKqj4Xnxk)), version `1793897822-33b3`, last changed November 5, 2026. Its `project/tokens.json` was copied to [tokens.json](./tokens.json) on November 6, 2026; [source.json](./source.json) records the version and the hash of the copied file.

Later the same day, the neutral and danger colours were replaced with values from a supplied shadcn theme: `background`, `foreground`, `card`, `popover`, `secondary`, `muted`, `border`, `input`, `danger`, `on-danger`, the `danger-soft` tints and the sidebar surface, text, accent and border colours, each with its `-foreground` pair where it has one. Primary, `on-primary`, `primary-hover`, `sidebar-primary`, accent, ring, the blue chart ramp and the success and warning colours stay as Claude Design supplied them. Fonts, radii, spacing, shadows and type styles are unchanged. This repository's tokens therefore differ from the Claude Design artifact until it is updated to match.

This replaces the earlier partial import from Paper (October 23, 2026), which had only the overview tokens. The new source adds full light and dark themes, shadcn-parity colour roles, chart and sidebar colours, named type styles, radii and shadows. The font files are unchanged: their SHA-256 hashes match [fonts.json](./fonts.json).

## Theme and typography

`src/app/graphite-tokens.css` is generated from `tokens.json`: theme-independent spacing, radius, shadow and type-style tokens on `:root`, light colours on `:root` and dark colours on `.dark`. `src/app/globals.css` maps them to Tailwind, shadcn and Fumadocs roles. Graphite dark mode is the default and the theme toggle still switches to light.

Tailwind's `rounded-xs`, `rounded-sm`, `rounded-md` and `rounded-lg` now resolve to Graphite's 4, 6, 8 and 12px radii. Spacing tokens (`--space-4` to `--space-96`) are CSS variables and leave Tailwind's numeric spacing scale untouched.

Headings use Stack Sans Notch 400 and 500. Body text, buttons and form labels use Inter 400, 500 and 600. Code, URLs and the uppercase eyebrow use DM Mono 400 and 500. Fonts are served locally from `public/fonts/graphite`, each family with its SIL Open Font License.

Local additions that Graphite does not define stay in `globals.css`: code-highlighting colours, the primitive type scale, container widths, and the `--status-*` and `--control-background` aliases that published registry components read.

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

Button supports `default`, `secondary`, `outline`, `ghost`, and `destructive` variants. Badge preserves its existing `default` and `dot` variants and adds `secondary`, `outline`, `success`, `warning`, and `destructive`. Native attributes, event handlers, and React 19 refs pass through.

Input, Textarea, Select, Checkbox, RadioGroupItem, and Switch use native form elements. RadioGroup is a fieldset: include a legend and give its RadioGroupItem inputs a shared `name`. Checkbox and Switch also accept `onCheckedChange(boolean)`. Their visible glyphs sit inside 44px targets. Select accepts native option children and `onChange`.

Button, Dialog, Sheet, Popover, Tabs, DropdownMenu, Tooltip, Toast, and Collapsible use Base UI. Sidebar and Breadcrumb use Base UI's `useRender` for composition. Triggers and links accept `render` instead of `asChild`. Menu items use `onClick`. TooltipProvider accepts `delay`. Sheet reuses Dialog's focus and dismissal behavior, with `finalFocus` for the mobile sidebar's trigger. ToastViewport renders notifications added with `useToastManager().add()` inside ToastProvider.

These components are available in this repository; they are not published as registry entries.

## Verification

Run the project checks with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.

The `/design-system` review page has been removed; `e2e/blocks-migration.spec.ts` checks that it returns 404.
