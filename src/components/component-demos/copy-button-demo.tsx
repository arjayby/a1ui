import { CopyButton, type CopyButtonProps } from "@/registry/components/copy-button";

const animations: NonNullable<CopyButtonProps["animation"]>[] = ["blur", "slide", "flip"];

export function CopyButtonDemo() {
  return (
    <div className="not-prose demo-frame flex min-h-64 flex-wrap items-center justify-center gap-8 px-6 py-10">
      {animations.map((animation) => (
        <div key={animation} className="flex w-24 shrink-0 flex-col items-center justify-center gap-4">
          <span className="text-muted-foreground text-xs capitalize">{animation}</span>
          <CopyButton value="hello@a1ui.dev" animation={animation} duration={0.3} />
        </div>
      ))}
    </div>
  );
}
