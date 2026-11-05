# Skeleton

Loading placeholders that shimmer in sync, then blur the real content into place without a layout jump.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/skeleton)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/skeleton.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/skeleton.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/skeleton.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/skeleton.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { Skeleton, SkeletonAvatar, SkeletonText } from "@/components/animated/skeleton";

export function ProfileCard({ user }: { user?: { name: string; bio: string } }) {
  return (
    <Skeleton
      loading={!user}
      loadingLabel="Loading profile"
      fallback={
        <div className="flex gap-3">
          <SkeletonAvatar />
          <SkeletonText lines={2} className="flex-1" />
        </div>
      }
    >
      <h3>{user?.name}</h3>
      <p>{user?.bio}</p>
    </Skeleton>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/skeleton.json). Each file's content is embedded in the registry JSON.



## API reference

### Skeleton

| Prop           | Type                                  | Default     | Description                                                                                                                         |
| -------------- | ------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `loading`      | `boolean`                             | `true`      | Shows the placeholder and sets `aria-busy`. When it turns false, the children blur and fade in while the placeholder fades out.     |
| `fallback`     | `ReactNode`                           | None        | Placeholder layout shown while loading. Without it, one block covers the children, which keep their size but stay hidden and inert. |
| `children`     | `ReactNode`                           | None        | Real content. Without children or a fallback, Skeleton renders a single placeholder shape sized by `className`.                     |
| `loadingLabel` | `string`                              | `"Loading"` | Visually hidden text announced while loading.                                                                                       |
| `duration`     | `number`                              | `0.5`       | Reveal time in seconds. The wrapper holds the larger height, then eases to the content height. Zero swaps instantly.                |
| `animation`    | `"shimmer" \| "pulse" \| "none"`      | `"shimmer"` | A band that sweeps across every placeholder in sync, a shared opacity pulse, or no motion. Nested placeholders inherit it.          |
| `direction`    | `"right" \| "left" \| "down" \| "up"` | `"right"`   | Which way the shimmer band travels. Nested placeholders inherit it.                                                                 |
| `cycle`        | `number`                              | `1.6`       | Seconds for one shimmer sweep or pulse. Placeholders share the page clock, so neighbors stay in step.                               |
| `className`    | `string`                              | None        | Classes on the wrapper, or the size and radius of a single shape.                                                                   |

### SkeletonText

| Prop                                  | Type             | Default     | Description                                                 |
| ------------------------------------- | ---------------- | ----------- | ----------------------------------------------------------- |
| `lines`                               | `number`         | `3`         | Number of lines.                                            |
| `lastLineWidth`                       | `string`         | `"60%"`     | CSS width of the last line, which is shorter than the rest. |
| `loadingLabel`                        | `string`         | `"Loading"` | Announced only when used outside a loading Skeleton.        |
| `animation`, `direction`, and `cycle` | Same as Skeleton | Inherited   | Override the values from the surrounding Skeleton.          |
| `className`                           | `string`         | None        | Additional classes on the line stack.                       |

### SkeletonAvatar

| Prop                                  | Type                   | Default     | Description                                          |
| ------------------------------------- | ---------------------- | ----------- | ---------------------------------------------------- |
| `size`                                | `number`               | `40`        | Width and height in pixels.                          |
| `shape`                               | `"circle" \| "square"` | `"circle"`  | A circle or a rounded square.                        |
| `loadingLabel`                        | `string`               | `"Loading"` | Announced only when used outside a loading Skeleton. |
| `animation`, `direction`, and `cycle` | Same as Skeleton       | Inherited   | Override the values from the surrounding Skeleton.   |
| `className`                           | `string`               | None        | Additional classes on the shape.                     |
