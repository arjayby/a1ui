"use client";

import { ChevronRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";

import { DemoSelect, DemoSwitch } from "@/components/component-demos/demo-controls";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetSide,
} from "@/registry/components/sheet";

const sides: SheetSide[] = ["bottom", "right", "left"];
const sizes = {
  "fit content": undefined,
  "half, full": [0.5, 1],
  "three stops": [0.3, 0.6, 1],
} satisfies Record<string, number[] | undefined>;
type Size = keyof typeof sizes;
const sizeOptions = Object.keys(sizes) as Size[];

const primaryClass = "bg-foreground text-background hover:bg-foreground/90 border-transparent";

type Product = { id: string; name: string; detail: string; price: number; hue: number };
type Line = Product & { quantity: number };

const stocked: Line[] = [
  { id: "notebook", name: "Dot grid notebook", detail: "A5, 160 pages", price: 18, hue: 30, quantity: 2 },
  { id: "pen", name: "Brass pen", detail: "Fine nib", price: 42, hue: 80, quantity: 1 },
  { id: "refill", name: "Ink refill", detail: "Black, 0.5 mm", price: 6, hue: 260, quantity: 3 },
  { id: "tape", name: "Washi tape set", detail: "Six rolls", price: 12, hue: 340, quantity: 1 },
  { id: "mat", name: "Linen desk mat", detail: "Oat, 80 cm", price: 38, hue: 60, quantity: 1 },
  { id: "pencils", name: "Pencil set", detail: "HB, box of 12", price: 9, hue: 150, quantity: 1 },
  { id: "flags", name: "Page flags", detail: "Five colors", price: 5, hue: 200, quantity: 2 },
  { id: "clips", name: "Binder clips", detail: "Brass, set of 10", price: 7, hue: 100, quantity: 1 },
  { id: "planner", name: "Weekly planner", detail: "Undated", price: 24, hue: 300, quantity: 1 },
  { id: "eraser", name: "Block eraser", detail: "Soft", price: 3, hue: 230, quantity: 1 },
];
const freeShipping = 75;

function Swatch({ product, className }: { product: Product; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.86 0.07 ${product.hue}), oklch(0.62 0.11 ${product.hue + 40}))`,
      }}
    />
  );
}

const stepButton =
  "hover:bg-foreground/10 focus-visible:ring-ring grid size-7 place-items-center rounded-full outline-none focus-visible:ring-2 [&_svg]:size-3.5";

/** A bag summary and its sheet. Editing quantities in the sheet updates the summary behind it. */
export function SheetDemo() {
  const [side, setSide] = useState<SheetSide>("bottom");
  const [size, setSize] = useState<Size>("half, full");
  const [pushBack, setPushBack] = useState(true);
  const [bag, setBag] = useState(stocked);
  const detents = sizes[size];
  const count = bag.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = bag.reduce((sum, line) => sum + line.quantity * line.price, 0);

  // A sheet that fits its content suits a short bag, so each layout starts with a bag of its own size.
  const chooseSize = (next: Size) => {
    setSize(next);
    setBag(sizes[next] ? stocked : stocked.slice(0, 2));
  };

  const change = (id: string, amount: number) =>
    setBag((lines) =>
      lines
        .map((line) => (line.id === id ? { ...line, quantity: line.quantity + amount } : line))
        .filter((line) => line.quantity > 0),
    );

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="w-full max-w-xs">
          {/* A new key gives each layout a fresh sheet that opens at its own default detent. */}
          <Sheet
            key={`${side}-${size}`}
            side={side}
            detents={detents}
            pushBack={pushBack && '[data-slot="sidebar-inset"]'}
          >
            <SheetTrigger
              render={<button type="button" />}
              className="border-input bg-background hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center gap-3 rounded-xl border p-3 text-left outline-none focus-visible:ring-2"
            >
              {bag.length === 0 ? (
                <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                  <ShoppingBag aria-hidden="true" className="size-4" />
                </span>
              ) : (
                <span className="flex shrink-0 -space-x-4">
                  {bag.slice(0, 3).map((line) => (
                    <Swatch
                      key={line.id}
                      product={line}
                      className="ring-background size-10 rounded-lg ring-2"
                    />
                  ))}
                </span>
              )}
              <span className="grid min-w-0 flex-1">
                <span className="text-sm font-medium">Bag</span>
                <span className="text-muted-foreground truncate text-xs tabular-nums">
                  {bag.length === 0 ? "Empty" : `${count === 1 ? "1 item" : `${count} items`} · $${subtotal}`}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Your bag</SheetTitle>
                <SheetDescription>
                  {count === 1 ? "1 item" : `${count} items`}.{" "}
                  {subtotal >= freeShipping
                    ? "Free shipping is included."
                    : `Free shipping from $${freeShipping}: add $${freeShipping - subtotal} more.`}
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                {bag.length === 0 && (
                  <p className="text-muted-foreground py-6 text-center text-sm">Your bag is empty.</p>
                )}
                <ul className="divide-border divide-y">
                  {bag.map((line) => (
                    <li key={line.id} className="flex items-center gap-3 py-3">
                      <Swatch product={line} className="size-12 rounded-lg" />
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate text-sm font-medium">{line.name}</span>
                        <span className="text-muted-foreground truncate text-xs">{line.detail}</span>
                      </span>
                      <span className="border-input flex items-center rounded-full border">
                        <button
                          type="button"
                          aria-label={
                            line.quantity === 1 ? `Remove ${line.name}` : `Decrease quantity of ${line.name}`
                          }
                          onClick={(event) => {
                            // The row leaves with its last item. Hand focus to the sheet first, without
                            // scrolling, so a sheet resting below its full size stays where it is.
                            if (line.quantity === 1) {
                              event.currentTarget
                                .closest<HTMLElement>('[data-slot="sheet-content"]')
                                ?.focus({ preventScroll: true });
                            }
                            change(line.id, -1);
                          }}
                          className={stepButton}
                        >
                          {line.quantity === 1 ? <Trash2 aria-hidden="true" /> : <Minus aria-hidden="true" />}
                        </button>
                        <span aria-live="polite" className="w-5 text-center text-sm tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${line.name}`}
                          onClick={() => change(line.id, 1)}
                          className={stepButton}
                        >
                          <Plus aria-hidden="true" />
                        </button>
                      </span>
                      <span className="w-10 text-right font-mono text-xs tabular-nums">
                        ${line.quantity * line.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </SheetBody>
              <SheetFooter className="border-border flex-col! border-t sm:flex-row! sm:items-center sm:justify-between!">
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-medium tabular-nums">${subtotal}</span>
                </span>
                <SheetClose disabled={bag.length === 0} className={primaryClass}>
                  Checkout
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-32">
        <DemoSelect label="Side" value={side} options={sides} onChange={setSide} />
        <DemoSelect label="Detents" value={size} options={sizeOptions} onChange={chooseSize} />
        <DemoSwitch label="Push back" checked={pushBack} onChange={setPushBack} />
      </div>
    </div>
  );
}
