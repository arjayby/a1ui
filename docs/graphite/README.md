# Graphite integration reference

The local review page is [Components](http://localhost:3000/components). It follows the existing documentation shell and uses Kousa analytics examples. The application remains a1ui, with its existing block catalog and registry.

## Source status

The source is [Kousa — Graphite Design System](https://app.paper.design/file/01M4QXGJ7XQN84CH7BW3PF4GMX/p-1-0). The task began at Git revision `1792e28bfc9b44ce9d24883df0342c7bd4fbe80e` with a clean worktree.

On October 23, 2026, Paper's read-only file overview returned eight artboards, three font families, and all 66 token values. The token hash was `ec211c92`, matching the supplied October 17 snapshot. The separate token export and Actions & Forms JSX export both returned a weekly-quota error. No further Paper reads or canvas writes were made.

This is a partial source import with locally implemented component adaptations. Exact component JSX, computed styles, state variations, and any additional themes remain unverified. No measurements were taken from screenshots. The source overview now has a Kousa title, but its example text could not be checked.

The confirmed values, artboard metadata, provenance, and quota responses are cached in [source.json](./source.json). The original component dimensions followed the supplied Graphite conventions. The current UI uses [shadcn Luma](https://ui.shadcn.com/docs/changelog/2026-03-luma) geometry with the Graphite palette and existing component APIs. Buttons and inputs are 36px high on desktop, with 44px touch targets on mobile. Cards and dialogs use 32px radii, inputs and menus use 24px radii, and textareas use 16px radii. UI icons use `@phosphor-icons/react`. Block implementations and demos retain their existing styles and icons.

## Theme and typography

All 11 source token namespaces are in `src/app/graphite-tokens.css`. The existing `globals.css` maps them to application and Fumadocs roles. Graphite dark mode is the default. The existing theme toggle remains usable. Light colors are an application adaptation, with darker status and syntax colors for readable text.

Source spacing names retain their literal pixel values. They are CSS variables, rather than replacements for Tailwind's numeric spacing scale: `var(--spacing-4)` is 4px, while Tailwind `p-4` retains its existing meaning. This preserves the block catalog's layout. Source colors stay constant across themes.

Headings use Stack Sans Notch 400 and 500. Body text, UI buttons, and form labels use Inter 400, 500, and 600. Code uses DM Mono 400 and 500. Fonts are served locally from `public/fonts/graphite`. [fonts.json](./fonts.json) records download URLs and SHA-256 hashes. Each family has its SIL Open Font License beside its files.

Headings use the supplied local `-0.025em` override. The source `--tracking-tight` token remains `-0.04em`.

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

Dialog, Sheet, Popover, Tabs, DropdownMenu, Tooltip, and Toast use Radix, as Fumadocs does. The related exports follow the usual compound-component pattern: Root, Trigger, Content, and relevant title, description, close, list, or item components. Tooltip needs TooltipProvider. Toast needs ToastProvider and ToastViewport. Sheet reuses Dialog's focus and dismissal behavior.

The showcase uses local state for funnel names, filters, reporting periods, and notifications. Its analytics numbers are sample data. These components are available in this repository; no new registry entries were published.

## Verification

The integration adds browser coverage in `e2e/graphite.spec.ts` and updates the existing Components-page, font-weight, and default-theme expectations. Browser checks cover all token values, seven font weights, native controls, modal focus, validation, draft cancellation, tabs, menus, tooltips, toast expiry, light mode, mobile overflow, and reduced motion.

Run the project checks with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.

The cached Paper data records the original Graphite import. Current component styling follows Luma and does not claim to reproduce the Paper component exports.
