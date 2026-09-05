import { ShapeFlow } from "@/registry/shape-flow";

const text =
  "A page is a conversation between what is said and what is left open. Give the words a little room and they find their own rhythm. A line bends, a sentence takes the long way around, and an ordinary paragraph becomes something you can play with. Move the circle through this passage. Notice how the words gather on either side, then return to the full width of the page. Nothing has been added to the story. Only the space has changed. In a book, these decisions are fixed in ink. Here, the composition is yours to rearrange. Let the circle drift toward an edge, bring it back to the center, or leave it somewhere unexpected. There is more than one way to read a page, and more than one shape a story can take.";

export function ShapeFlowPreview() {
  return (
    <div className="demo-frame shape-flow-preview">
      <ShapeFlow text={text} height={180} radius={43} gap={10} fontSize={13} lineHeight={19} />
    </div>
  );
}

export function ShapeFlowDemo() {
  return (
    <div className="demo-frame shape-flow-demo">
      <div className="shape-flow-demo-heading">
        <span className="shape-flow-demo-eyebrow">An exercise in space</span>
        <h3>Room to move.</h3>
      </div>
      <ShapeFlow text={text} />
      <div className="shape-flow-demo-footer">
        <span>Drag the circle. Follow the words.</span>
        <span>Arrow keys work, too.</span>
      </div>
    </div>
  );
}
