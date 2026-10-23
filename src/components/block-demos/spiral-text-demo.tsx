import { SpiralText } from "@/registry/blocks/spiral-text";

export function SpiralTextDemo() {
  return (
    <>
      <div className="not-prose spiral-demo">
        <SpiralText text="THE CONTENT ARCHITECTURE · " />
      </div>
      <p className="demo-caption text-center">
        Press and hold to draw the coils closer. Release to send a wave past its resting shape.
      </p>
    </>
  );
}
