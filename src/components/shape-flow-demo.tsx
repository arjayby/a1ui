import { ShapeFlow } from "@/registry/shape-flow";

const text =
  "A page is a conversation between what is said and what is left open. Give the words a little room and they find their own rhythm. A line bends, a sentence takes the long way around, and an ordinary paragraph becomes something you can play with. Move the X through this passage. Notice how the words gather on either side, then return to the full width of the page. Nothing has been added to the story. Only the space has changed. In a book, these decisions are fixed in ink. Here, the composition is yours to rearrange. Let the X drift toward an edge, bring it back to the center, or leave it somewhere unexpected. There is more than one way to read a page, and more than one shape a story can take.";

export function ShapeFlowPreview() {
  return (
    <div className="not-prose demo-frame shape-flow-preview">
      <ShapeFlow
        text="Words find their way around a shape. A line bends, a sentence takes the long way, and the page finds a new rhythm. Leave a little room and watch the story take shape. There is always another way to read."
        height={176}
        radius={40}
        gap={3}
        fontSize={13}
        lineHeight={19}
        className="mx-auto max-w-[222px]"
      />
    </div>
  );
}

export function ShapeFlowDemo() {
  return (
    <div className="not-prose demo-frame shape-flow-demo">
      <div className="shape-flow-demo-heading">
        <span className="shape-flow-demo-eyebrow">An exercise in space</span>
        <h3>Room to move.</h3>
      </div>
      <ShapeFlow text={text} />
      <div className="shape-flow-demo-footer">
        <span>Drag the X. Follow the words.</span>
        <span>Arrow keys work, too.</span>
      </div>
    </div>
  );
}
