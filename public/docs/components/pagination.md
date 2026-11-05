# Pagination

Page numbers with an active surface that slides between pages, a window that reflows as it moves, and ellipses that fade in and out.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/pagination)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/pagination.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/pagination.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/pagination.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/pagination.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { useState } from "react";
import Link from "next/link";

import { Pagination } from "@/components/animated/pagination";

export function ResultsPagination() {
  const [page, setPage] = useState(1);
  return <Pagination page={page} pageCount={20} onPageChange={setPage} aria-label="Search results" />;
}

export function PostsPagination({ page }: { page: number }) {
  return (
    <Pagination
      page={page}
      pageCount={12}
      getHref={(target) => `/posts?page=${target}`}
      renderLink={({ href, ...props }) => <Link href={href!} scroll={false} {...props} />}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/pagination.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop            | Type                                                         | Default        | Description                                                                                                              |
| --------------- | ------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pageCount`     | `number`                                                     | Required       | Total number of pages. Values below 1 show a single page.                                                                |
| `page`          | `number`                                                     | Uncontrolled   | Current page, starting at 1, when controlled by the caller. Clamped to `pageCount`.                                      |
| `defaultPage`   | `number`                                                     | `1`            | Initial page when uncontrolled.                                                                                          |
| `onPageChange`  | `(page: number) => void`                                     | None           | Called with the page the user picked. Controlled usage requires the caller to update `page`.                             |
| `siblingCount`  | `number`                                                     | `1`            | Pages shown on each side of the current page.                                                                            |
| `boundaryCount` | `number`                                                     | `1`            | Pages always shown at the start and end. Gaps between them and the window become ellipses.                               |
| `getHref`       | `(page: number) => string`                                   | None           | Renders every control as an anchor to this URL instead of a button.                                                      |
| `renderLink`    | `(props: PaginationLinkProps, page: number) => ReactElement` | None           | Renders enabled controls with your link element, such as a router `Link`. Disabled ends stay anchors without an `href`.  |
| `previousLabel` | `ReactNode`                                                  | `"Previous"`   | Visible text beside the previous chevron, hidden below the `sm` breakpoint. The accessible name stays "Previous page".   |
| `nextLabel`     | `ReactNode`                                                  | `"Next"`       | Visible text beside the next chevron, hidden below the `sm` breakpoint. The accessible name stays "Next page".           |
| `aria-label`    | `string`                                                     | `"Pagination"` | Names the navigation landmark.                                                                                           |
| `duration`      | `number`                                                     | `0.35`         | Travel time of the active surface and the number reflow in seconds. Zero, or reduced motion, moves everything instantly. |
| `className`     | `string`                                                     | None           | Additional classes on the `nav`.                                                                                         |
