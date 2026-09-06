import { SpiralText } from "@/registry/spiral-text";

export function SpiralTextDemo() {
  return (
    <>
      <div className="not-prose demo-frame spiral-demo">
        <SpiralText text="THE CONTENT ARCHITECTURE · " />
      </div>
      <p className="demo-caption">
        Press and hold to draw the coils closer. Release to send a wave past its resting shape.
      </p>
    </>
  );
}
