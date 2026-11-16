"use client";

import { ContextMenu as Primitive } from "@base-ui/react/context-menu";
import { useRender } from "@base-ui/react/use-render";
import {
  LayoutGroup,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Transition,
  type Variants,
} from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type Ref,
  type RefObject,
  type SetStateAction,
} from "react";

type Point = { x: number; y: number };

/** Where the menu was asked for: the pointer, or the focused element for a keyboard open. */
type Source = { point: Point | null; anchor: Element | null };

type RootContextValue = {
  source: Source;
  /** Records where a pointer or keyboard open was asked for. */
  openFrom: (source: Source) => void;
  /** Remembers the latest touch-down point, which a long press opens from. */
  touchDown: (point: Point | null) => void;
  /** True once after a keyboard open, for the menu to move focus to its first row. */
  takeFirstRow: () => boolean;
  disabled: boolean;
};

const RootContext = createContext<RootContextValue | null>(null);

function useRoot(part: string) {
  const context = useContext(RootContext);
  if (!context) throw new Error(`${part} must be used within ContextMenu.`);
  return context;
}

/** One open menu surface: the root menu, or a submenu. */
type SurfaceContextValue = {
  open: boolean;
  seconds: number;
  reducedMotion: boolean;
  /** Called when the closing animation has finished, so Base UI can unmount the popup. */
  onClosed: () => void;
};

const SurfaceContext = createContext<SurfaceContextValue | null>(null);

// The row that last held a menu level's highlight. Its highlight stays mounted (faded out) while the
// pointer crosses a label or separator, so the next row's highlight glides from it instead of appearing.
const LastHighlightContext = createContext<[string | null, Dispatch<SetStateAction<string | null>>] | null>(
  null,
);
const RadioGroupContext = createContext("");

// Critically damped: the menu settles without overshoot. This is the spring Motion resolves
// `visualDuration` to, written as stiffness and damping because Motion drops velocity on time-defined
// springs, and a second right-click reopens the menu while it is still closing.
function spring(seconds: number): Transition {
  if (seconds === 0) return { duration: 0 };
  const omega = (2 * Math.PI) / (seconds * 1.2);
  return { type: "spring", stiffness: omega * omega, damping: 2 * omega };
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") return ref(value);
  if (ref) ref.current = value;
}

// Keeps the popup mounted while it animates out. Without it the menu closes on its own.
function holdUntilClosed(details: object) {
  if ("preventUnmountOnClose" in details && typeof details.preventUnmountOnClose === "function") {
    details.preventUnmountOnClose();
  }
}

type ActionsRef = RefObject<Primitive.Root.Actions | null>;

function useSurface(open: boolean, duration: number): SurfaceContextValue & { actionsRef: ActionsRef } {
  const reducedMotion = useReducedMotion() ?? false;
  const actionsRef = useRef<Primitive.Root.Actions | null>(null);
  const seconds = Number.isFinite(duration) ? Math.max(0, duration) : 0.25;
  return { open, seconds, reducedMotion, actionsRef, onClosed: () => actionsRef.current?.unmount() };
}

export type ContextMenuProps = Omit<ComponentProps<typeof Primitive.Root>, "actionsRef"> & {
  /** Opening time in seconds. Closing is shorter. Reduced motion fades without scaling. */
  duration?: number;
};

export function ContextMenu({
  open,
  defaultOpen = false,
  onOpenChange,
  duration = 0.25,
  disabled = false,
  children,
  ...props
}: ContextMenuProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [source, setSource] = useState<Source>({ point: null, anchor: null });
  const touchRef = useRef<Point | null>(null);
  const firstRowRef = useRef(false);
  const current = open ?? internalOpen;
  const { actionsRef, ...surface } = useSurface(current, duration);

  return (
    <RootContext.Provider
      value={{
        source,
        disabled,
        openFrom: (next) => {
          firstRowRef.current = next.anchor !== null;
          setSource(next);
        },
        touchDown: (point) => {
          touchRef.current = point;
        },
        takeFirstRow: () => {
          const pending = firstRowRef.current;
          firstRowRef.current = false;
          return pending;
        },
      }}
    >
      <SurfaceContext.Provider value={surface}>
        <Primitive.Root
          {...props}
          open={current}
          disabled={disabled}
          actionsRef={actionsRef}
          onOpenChange={(next, details) => {
            onOpenChange?.(next, details);
            if (details.isCanceled) return;
            // A long press has no contextmenu event, so its origin is the touch-down point.
            if (next && details.event.type.startsWith("touch") && touchRef.current) {
              firstRowRef.current = false;
              setSource({ point: touchRef.current, anchor: null });
            }
            if (!next && surface.seconds > 0) holdUntilClosed(details);
            if (open === undefined) setInternalOpen(next);
          }}
        >
          {children}
        </Primitive.Root>
      </SurfaceContext.Provider>
    </RootContext.Provider>
  );
}

export type ContextMenuTriggerProps = ComponentProps<typeof Primitive.Trigger>;

/**
 * The area that opens the menu. Give it `tabIndex={0}` when nothing inside it can take focus, so
 * Shift+F10 and the context-menu key have somewhere to open from.
 */
export function ContextMenuTrigger({
  onContextMenu,
  onKeyDown,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  ...props
}: ContextMenuTriggerProps) {
  const root = useRoot("ContextMenuTrigger");
  const surface = useContext(SurfaceContext);
  const keyboardRef = useRef(false);
  const touchRef = useRef<Point | null>(null);
  const [pressing, setPressing] = useState(false);

  return (
    <Primitive.Trigger
      {...props}
      data-slot="context-menu-trigger"
      // Set while a finger is held down, before the long press opens the menu.
      data-pressing={pressing && !surface?.open ? "" : undefined}
      onContextMenu={(event) => {
        onContextMenu?.(event);
        if (event.defaultPrevented || root.disabled) return;
        const anchor = keyboardRef.current && event.target instanceof Element ? event.target : null;
        root.openFrom(
          anchor ? { point: null, anchor } : { point: { x: event.clientX, y: event.clientY }, anchor: null },
        );
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        const shortcut = event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
        if (!shortcut || event.defaultPrevented || root.disabled) return;
        // Browsers disagree on which key events open a context menu, and macOS has none, so the
        // keyboard path opens the menu itself, anchored to whatever holds focus.
        event.preventDefault();
        const trigger = event.currentTarget;
        const focused = trigger.ownerDocument.activeElement;
        const target = focused && trigger.contains(focused) ? focused : trigger;
        const rect = target.getBoundingClientRect();
        keyboardRef.current = true;
        try {
          target.dispatchEvent(
            new MouseEvent("contextmenu", {
              bubbles: true,
              cancelable: true,
              clientX: rect.left,
              clientY: rect.bottom,
            }),
          );
        } finally {
          keyboardRef.current = false;
        }
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        const touch = event.touches.length === 1 ? event.touches[0] : null;
        touchRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        root.touchDown(touchRef.current);
        setPressing(touch !== null && !root.disabled);
      }}
      onTouchMove={(event) => {
        onTouchMove?.(event);
        const start = touchRef.current;
        const touch = event.touches[0];
        // The same slop Base UI allows before it abandons a long press.
        if (!start || !touch || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10) {
          setPressing(false);
        }
      }}
      onTouchEnd={(event) => {
        onTouchEnd?.(event);
        setPressing(false);
      }}
      onTouchCancel={(event) => {
        onTouchCancel?.(event);
        setPressing(false);
      }}
    />
  );
}

// Writes the pointer's position, relative to the menu, as the popup's transform origin. Base UI
// re-renders the positioner whenever it moves the menu (a flip, a shift, a resize), so the origin
// stays on the pointer however the menu had to be placed.
function PointerPositioner({ point, ref, ...props }: ComponentProps<"div"> & { point: Point | null }) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (!point) {
      element.style.removeProperty("--context-menu-origin");
      return;
    }
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--context-menu-origin", `${point.x - rect.left}px ${point.y - rect.top}px`);
  });

  return (
    <div
      {...props}
      ref={(element) => {
        elementRef.current = element;
        return assignRef(ref, element);
      }}
    />
  );
}

type PositionerProps = Pick<
  ComponentProps<typeof Primitive.Positioner>,
  "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding"
>;

export type ContextMenuContentProps = Omit<ComponentProps<typeof Primitive.Popup>, "className" | "render"> &
  PositionerProps & { className?: string };

function Surface({
  slot,
  positioner,
  origin,
  className = "",
  onContextMenu,
  ...props
}: Omit<ComponentProps<typeof Primitive.Popup>, "className" | "render"> & {
  slot: string;
  positioner: ComponentProps<typeof Primitive.Positioner>;
  origin: string;
  className?: string;
}) {
  const id = useId();
  const lastHighlight = useState<string | null>(null);
  const surface = useContext(SurfaceContext);
  if (!surface) throw new Error("ContextMenuContent must be used within ContextMenu.");
  const { open, reducedMotion, onClosed } = surface;
  // Reduced motion keeps a short fade and drops the scale.
  const seconds = reducedMotion ? Math.min(surface.seconds, 0.15) : surface.seconds;
  const scale = reducedMotion ? 1 : 0.9;
  const variants: Variants = {
    // Closing shrinks back toward the point the menu grew from.
    closed: {
      opacity: 0,
      scale,
      transition: {
        scale: spring(seconds * 0.6),
        opacity: { duration: seconds * 0.6, ease: [0.4, 0, 1, 1] },
      },
    },
    open: {
      opacity: 1,
      scale: 1,
      transition: { scale: spring(seconds), opacity: { duration: seconds * 0.5 } },
    },
  };

  return (
    <Primitive.Portal>
      <Primitive.Positioner collisionPadding={8} {...positioner} className="z-50 outline-none">
        <Primitive.Popup
          {...props}
          data-slot={slot}
          onContextMenu={(event) => {
            onContextMenu?.(event);
            // A menu has no context menu of its own, and the event must not reach an outer trigger.
            event.preventDefault();
            event.stopPropagation();
          }}
          // A translucent material that turns solid for reduced transparency and for more contrast.
          className={`border-border bg-popover/80 text-popover-foreground [@media(prefers-reduced-transparency:reduce)]:bg-popover contrast-more:border-foreground contrast-more:bg-popover isolate max-h-(--available-height) max-w-[calc(100vw-1rem)] min-w-32 overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border p-1 text-left shadow-lg backdrop-blur-xl backdrop-saturate-150 outline-none contrast-more:backdrop-filter-none [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none ${origin} ${className}`}
          render={(popupProps) => (
            // One layout scope per popup, so each menu level has its own traveling highlight.
            <LastHighlightContext.Provider value={lastHighlight}>
              <LayoutGroup id={id}>
                <motion.div
                  {...(popupProps as HTMLMotionProps<"div">)}
                  layoutScroll
                  variants={variants}
                  initial={seconds === 0 ? false : "closed"}
                  animate={open ? "open" : "closed"}
                  onAnimationComplete={(definition) => {
                    if (definition === "closed") onClosed();
                  }}
                />
              </LayoutGroup>
            </LastHighlightContext.Provider>
          )}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}

export function ContextMenuContent({
  side,
  align,
  sideOffset,
  alignOffset,
  collisionPadding,
  onFocus,
  ...props
}: ContextMenuContentProps) {
  const { source, takeFirstRow } = useRoot("ContextMenuContent");
  // A keyboard open hangs below the focused element; a pointer open keeps Base UI's pointer offsets.
  const placement = source.anchor
    ? { anchor: source.anchor, side: side ?? "bottom", align, sideOffset: sideOffset ?? 4, alignOffset }
    : { side, align, sideOffset, alignOffset };

  return (
    <Surface
      {...props}
      slot="context-menu-content"
      onFocus={(event) => {
        onFocus?.(event);
        // Base UI focuses the menu itself on open. A keyboard open moves on to the first row, once,
        // as a keyboard-opened menu does on the desktop.
        if (event.target !== event.currentTarget || !takeFirstRow()) return;
        event.currentTarget.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
      }}
      origin="origin-[var(--context-menu-origin,var(--transform-origin))]"
      positioner={{
        ...placement,
        ...(collisionPadding === undefined ? null : { collisionPadding }),
        render: <PointerPositioner point={source.point} />,
      }}
    />
  );
}

const ROW =
  "relative flex min-h-7 cursor-default items-center gap-2 rounded-[calc(var(--radius-md)-var(--spacing))] px-2 py-1 text-xs font-medium outline-none select-none data-disabled:opacity-50 data-inset:pl-8 data-[variant=destructive]:text-destructive pointer-coarse:min-h-11 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

type RowState = { highlighted: boolean; open?: boolean; checked?: boolean };

function Row<State extends RowState>({
  state,
  mark,
  render,
  children,
  ...props
}: useRender.ComponentProps<"div", State> & { state: State; mark?: "check" | "radio" }) {
  const reducedMotion = useReducedMotion();
  const radioGroup = useContext(RadioGroupContext);
  const checked = state.checked === true;
  const travel: Transition = reducedMotion ? { duration: 0 } : spring(0.3);
  // A submenu's trigger stays lit while its menu is open.
  const highlighted = state.highlighted || state.open === true;
  const rowId = useId();
  const [lastHighlight, setLastHighlight] = useContext(LastHighlightContext) ?? [null, null];

  useEffect(() => {
    if (highlighted) setLastHighlight?.(rowId);
  }, [highlighted, rowId, setLastHighlight]);

  return useRender({
    defaultTagName: "div",
    render: typeof render === "function" ? (elementProps) => render(elementProps, state) : render,
    props: {
      ...props,
      children: (
        <>
          {(highlighted || lastHighlight === rowId) && (
            <motion.span
              aria-hidden="true"
              data-slot="context-menu-highlight"
              layoutId="context-menu-highlight"
              // One highlight travels between rows; crossfading the outgoing and incoming copies
              // would dim it on every hop.
              layoutCrossfade={false}
              initial={false}
              animate={{ opacity: highlighted ? 1 : 0 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { ...travel, opacity: { duration: 0.15, delay: highlighted ? 0 : 0.1 } }
              }
              className="bg-muted contrast-more:outline-foreground pointer-events-none absolute inset-0 -z-10 rounded-[inherit] contrast-more:outline-2 contrast-more:-outline-offset-2"
            />
          )}
          {mark && (
            <span
              aria-hidden="true"
              data-slot="context-menu-indicator"
              className="flex size-4 shrink-0 items-center justify-center"
            >
              {mark === "check" && (
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  {/* Drawn on a change only: an already ticked item opens with its check in place. */}
                  <motion.path
                    d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
                    initial={false}
                    animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
                    transition={{
                      pathLength: reducedMotion
                        ? { duration: 0 }
                        : { duration: 0.2, ease: [0.65, 0, 0.35, 1] },
                      opacity: { duration: checked ? 0.05 : 0.15 },
                    }}
                  />
                </svg>
              )}
              {mark === "radio" && checked && (
                // One dot per group, so it slides from the old choice to the new one.
                <motion.span
                  layoutId={`context-menu-radio-${radioGroup}`}
                  initial={false}
                  transition={travel}
                  className="size-1.5 rounded-full bg-current"
                />
              )}
            </span>
          )}
          {children}
        </>
      ),
    },
  });
}

type Variant = "default" | "destructive";

export type ContextMenuItemProps = Omit<ComponentProps<typeof Primitive.Item>, "className"> & {
  className?: string;
  /** Indents the row to line up with checkbox and radio items. */
  inset?: boolean;
  variant?: Variant;
};

export function ContextMenuItem({
  className = "",
  inset,
  variant = "default",
  render,
  ...props
}: ContextMenuItemProps) {
  return (
    <Primitive.Item
      {...props}
      data-slot="context-menu-item"
      data-inset={inset ? "" : undefined}
      data-variant={variant}
      className={`${ROW} ${className}`}
      render={(itemProps, state) => <Row {...itemProps} state={state} render={render} />}
    />
  );
}

export type ContextMenuCheckboxItemProps = Omit<
  ComponentProps<typeof Primitive.CheckboxItem>,
  "className"
> & {
  className?: string;
};

export function ContextMenuCheckboxItem({ className = "", render, ...props }: ContextMenuCheckboxItemProps) {
  return (
    <Primitive.CheckboxItem
      {...props}
      data-slot="context-menu-checkbox-item"
      className={`${ROW} ${className}`}
      render={(itemProps, state) => <Row {...itemProps} state={state} render={render} mark="check" />}
    />
  );
}

export type ContextMenuRadioGroupProps = ComponentProps<typeof Primitive.RadioGroup>;

export function ContextMenuRadioGroup(props: ContextMenuRadioGroupProps) {
  const id = useId();

  return (
    <RadioGroupContext.Provider value={id}>
      <Primitive.RadioGroup {...props} data-slot="context-menu-radio-group" />
    </RadioGroupContext.Provider>
  );
}

export type ContextMenuRadioItemProps = Omit<ComponentProps<typeof Primitive.RadioItem>, "className"> & {
  className?: string;
};

export function ContextMenuRadioItem({ className = "", render, ...props }: ContextMenuRadioItemProps) {
  return (
    <Primitive.RadioItem
      {...props}
      data-slot="context-menu-radio-item"
      className={`${ROW} ${className}`}
      render={(itemProps, state) => <Row {...itemProps} state={state} render={render} mark="radio" />}
    />
  );
}

export type ContextMenuGroupProps = ComponentProps<typeof Primitive.Group>;

export function ContextMenuGroup(props: ContextMenuGroupProps) {
  return <Primitive.Group {...props} data-slot="context-menu-group" />;
}

export type ContextMenuLabelProps = Omit<ComponentProps<typeof Primitive.GroupLabel>, "className"> & {
  className?: string;
  inset?: boolean;
};

/** Labels a `ContextMenuGroup` or a `ContextMenuRadioGroup`, and must sit inside one. */
export function ContextMenuLabel({ className = "", inset, ...props }: ContextMenuLabelProps) {
  return (
    <Primitive.GroupLabel
      {...props}
      data-slot="context-menu-label"
      data-inset={inset ? "" : undefined}
      className={`text-muted-foreground px-2 py-1.5 text-xs data-inset:pl-8 ${className}`}
    />
  );
}

export type ContextMenuSeparatorProps = Omit<ComponentProps<typeof Primitive.Separator>, "className"> & {
  className?: string;
};

export function ContextMenuSeparator({ className = "", ...props }: ContextMenuSeparatorProps) {
  return (
    <Primitive.Separator
      {...props}
      data-slot="context-menu-separator"
      className={`bg-border contrast-more:bg-foreground -mx-1 my-1 h-px ${className}`}
    />
  );
}

export type ContextMenuShortcutProps = ComponentProps<"span">;

/** A keyboard hint at the end of a row. It is decoration: bind the shortcut yourself. */
export function ContextMenuShortcut({ className = "", ...props }: ContextMenuShortcutProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      data-slot="context-menu-shortcut"
      className={`text-muted-foreground ml-auto pl-4 text-xs tracking-widest contrast-more:text-inherit ${className}`}
    />
  );
}

export type ContextMenuSubProps = Omit<ComponentProps<typeof Primitive.SubmenuRoot>, "actionsRef"> & {
  /** Opening time in seconds. */
  duration?: number;
  children?: ReactNode;
};

export function ContextMenuSub({
  open,
  defaultOpen = false,
  onOpenChange,
  duration = 0.25,
  children,
  ...props
}: ContextMenuSubProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = open ?? internalOpen;
  const { actionsRef, ...surface } = useSurface(current, duration);

  return (
    <SurfaceContext.Provider value={surface}>
      <Primitive.SubmenuRoot
        {...props}
        open={current}
        actionsRef={actionsRef}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          if (details.isCanceled) return;
          if (!next && surface.seconds > 0) holdUntilClosed(details);
          if (open === undefined) setInternalOpen(next);
        }}
      >
        {children}
      </Primitive.SubmenuRoot>
    </SurfaceContext.Provider>
  );
}

export type ContextMenuSubTriggerProps = Omit<
  ComponentProps<typeof Primitive.SubmenuTrigger>,
  "className"
> & {
  className?: string;
  inset?: boolean;
};

export function ContextMenuSubTrigger({
  className = "",
  inset,
  render,
  children,
  ...props
}: ContextMenuSubTriggerProps) {
  return (
    <Primitive.SubmenuTrigger
      {...props}
      data-slot="context-menu-sub-trigger"
      data-inset={inset ? "" : undefined}
      className={`${ROW} ${className}`}
      render={(itemProps, state) => <Row {...itemProps} state={state} render={render} />}
    >
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted-foreground ml-auto size-4 contrast-more:text-inherit rtl:rotate-180"
      >
        <path d="M6 4 L10 8 L6 12" />
      </svg>
    </Primitive.SubmenuTrigger>
  );
}

/** A nested menu. It grows out of its trigger, on the side Base UI found room for. */
export function ContextMenuSubContent({
  side,
  align,
  sideOffset = 4,
  alignOffset = -5,
  collisionPadding,
  ...props
}: ContextMenuContentProps) {
  return (
    <Surface
      {...props}
      slot="context-menu-sub-content"
      origin="origin-(--transform-origin)"
      positioner={{
        side,
        align,
        sideOffset,
        alignOffset,
        ...(collisionPadding === undefined ? null : { collisionPadding }),
      }}
    />
  );
}
