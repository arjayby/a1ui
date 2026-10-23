import { ShapeFlow } from "@/registry/blocks/shape-flow";

const text =
  "A page is a conversation between what is said and what is left open. Give the words a little room and they find their own rhythm. A line bends, a sentence takes the long way around, and an ordinary paragraph becomes something you can play with. Move the duck through this passage. Notice how the words gather on either side, then return to the full width of the page. Nothing has been added to the story. Only the space has changed. In a book, these decisions are fixed in ink. Here, the composition is yours to rearrange. Let the duck drift toward an edge, bring it back to the center, or leave it somewhere unexpected. There is more than one way to read a page, and more than one shape a story can take. A little farther down, the sentences settle into longer lines again. The duck has left a small bend in the paragraph, but every word is still here, waiting in its original order. Try moving it slowly from one side to the other. A few words slip across first, then a whole phrase follows. Near the margin, the open space becomes a narrow channel. In the middle, the passage divides and meets again below the tail. You can stop anywhere and the page holds that arrangement until you move again. Think of a quiet pond on a windless afternoon. The water makes room for whatever crosses it, then closes gently behind. These lines do something similar. They leave enough space for a beak, a rounded body, and a little movement. Keep reading, or reach back into the paragraph and change its course. The words have plenty of room to follow.";

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
    <>
      <div className="not-prose demo-frame shape-flow-demo">
        <div className="shape-flow-demo-heading">
          <span className="shape-flow-demo-eyebrow">An exercise in space</span>
          <h3>Room to move.</h3>
        </div>
        <ShapeFlow text={text} />
      </div>
      <p className="demo-caption text-center">Drag the duck. Follow the words. Arrow keys work, too.</p>
    </>
  );
}
