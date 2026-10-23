import { CompareCurtain } from "@/registry/blocks/compare-curtain";

function Design({ published }: { published: boolean }) {
  return (
    <div
      className={`@container absolute inset-0 grid content-center justify-items-center gap-2 font-sans whitespace-nowrap ${
        published ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
      }`}
    >
      <span className="font-mono text-xs leading-4 tracking-(--tracking-wide) uppercase">
        {published ? "Published / 02" : "Draft / 01"}
      </span>
      <span className="font-heading text-[clamp(var(--text-xl),6cqi,var(--text-3xl))] leading-[1.1] font-normal tracking-[-0.025em]">
        a new perspective.
      </span>
      <span className="text-xs leading-4">{published ? "Final design" : "Working concept"}</span>
    </div>
  );
}

export function CompareCurtainPreview() {
  return (
    <div className="not-prose demo-frame grid place-items-center p-6">
      <CompareCurtain
        before={<Design published={false} />}
        after={<Design published />}
        defaultValue={50}
        className="max-w-[480px] [&>div:last-child]:font-sans"
      />
    </div>
  );
}

export function CompareCurtainDemo() {
  return (
    <>
      <div className="not-prose demo-frame p-5 sm:p-8">
        <CompareCurtain
          before={<Design published={false} />}
          after={<Design published />}
          ariaLabel="Reveal published design"
          beforeLabel="Draft"
          afterLabel="Published"
          className="mx-auto max-w-[640px] [&>div:last-child]:hidden"
        />
      </div>
      <p className="demo-caption text-center">
        Drag the arrow with a mouse or touch. Focus it and use arrow keys to move one percent, Shift with an
        arrow key to move ten percent, or Home and End to jump to either side.
      </p>
    </>
  );
}
