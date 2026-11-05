# Breadcrumb

A breadcrumb trail whose middle collapses into an expandable ellipsis, with segments that slide in and out as you navigate.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/breadcrumb)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/breadcrumb.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/breadcrumb.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/breadcrumb.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/breadcrumb.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import Link from "next/link";

import { Breadcrumb } from "@/components/animated/breadcrumb";

export function BreadcrumbExample() {
  return (
    <Breadcrumb
      maxItems={4}
      items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/projects" },
        { label: "a1ui", href: "/projects/a1ui" },
        { label: "src", href: "/projects/a1ui/src" },
        { label: "breadcrumb.tsx" },
      ]}
      renderLink={(props) => <Link {...props} />}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/breadcrumb.json). Each file's content is embedded in the registry JSON.



## API reference

### Breadcrumb

| Prop                  | Type                                                                 | Default        | Description                                                                                                       |
| --------------------- | -------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `items`               | `BreadcrumbSegment[]`                                                | Required       | The trail from the root to the current page. The last item renders with `aria-current="page"`.                    |
| `maxItems`            | `number`                                                             | None           | Collapses the middle segments into an ellipsis button once the trail is longer than this.                         |
| `itemsBeforeCollapse` | `number`                                                             | `1`            | Segments kept before the ellipsis.                                                                                |
| `itemsAfterCollapse`  | `number`                                                             | `2`            | Segments kept after the ellipsis, including the current page.                                                     |
| `collapseToFit`       | `boolean`                                                            | `true`         | Also collapses, further if needed, when the trail does not fit on one line of the nav, which fills its container. |
| `expanded`            | `boolean`                                                            | Uncontrolled   | Whether the collapsed segments are shown, when controlled by the caller.                                          |
| `defaultExpanded`     | `boolean`                                                            | `false`        | Initial expanded state when uncontrolled.                                                                         |
| `onExpandedChange`    | `(expanded: boolean) => void`                                        | None           | Called when the ellipsis is clicked, and when focus leaves the trail or Escape collapses it again.                |
| `renderLink`          | `(props: BreadcrumbLinkProps, item: BreadcrumbSegment) => ReactNode` | `<a>`          | Renders each link. Spread `props` onto a router link such as Next.js `Link`.                                      |
| `separator`           | `ReactNode`                                                          | Chevron        | Replaces the icon between segments.                                                                               |
| `duration`            | `number`                                                             | `0.3`          | Slide and reflow time in seconds. Zero, or reduced motion, swaps segments instantly.                              |
| `aria-label`          | `string`                                                             | `"Breadcrumb"` | Names the navigation landmark.                                                                                    |
| `className`           | `string`                                                             | None           | Additional classes for the `nav`.                                                                                 |

### BreadcrumbSegment

| Field   | Type        | Default                 | Description                                                                     |
| ------- | ----------- | ----------------------- | ------------------------------------------------------------------------------- |
| `label` | `ReactNode` | Required                | Visible text for the segment.                                                   |
| `href`  | `string`    | None                    | Destination. Segments without one render as plain text.                         |
| `key`   | `string`    | Position and label text | Stable identity, so a segment animates only when it is really added or removed. |
