"use client";

import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from "motion/react";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";

type NavigationMenuContextValue = {
  /** The item whose section is open, or null when the panel is closed. */
  value: string | null;
  hovered: string | null;
  setHovered: (value: string | null) => void;
  seconds: number;
  transition: Transition;
};

const NavigationMenuContext = createContext<NavigationMenuContextValue | null>(null);
const NavigationMenuItemContext = createContext<string | null>(null);
const NavigationMenuContentContext = createContext(false);

function useNavigationMenu(part: string) {
  const context = useContext(NavigationMenuContext);
  if (!context) throw new Error(`${part} must be used within NavigationMenu.`);
  return context;
}

function useNavigationMenuItem(part: string) {
  const value = useContext(NavigationMenuItemContext);
  if (value === null) throw new Error(`${part} must be used within NavigationMenuItem.`);
  return value;
}

type Align = "start" | "center" | "end";

export interface NavigationMenuProps {
  /** The open item's value when controlled by the caller. `null` closes the panel. */
  value?: string | null;
  /** The item that starts open when uncontrolled. */
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Time in seconds for the panel to resize, move, and slide sections. */
  duration?: number;
  /** Milliseconds to wait before opening on hover. */
  delay?: number;
  /** Milliseconds to wait before closing once the pointer leaves. */
  closeDelay?: number;
  /** Alignment of the panel against the active trigger. */
  align?: Align;
  /** Gap between the triggers and the panel in pixels. */
  sideOffset?: number;
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
}

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

export function NavigationMenu({
  value,
  defaultValue = null,
  onValueChange,
  duration = 0.35,
  delay = 50,
  closeDelay = 50,
  align = "center",
  sideOffset = 8,
  className,
  children,
  ...props
}: NavigationMenuProps) {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue);
  const [hovered, setHovered] = useState<string | null>(null);
  const current = value === undefined ? internalValue : value;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.35;
  const transition: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds * 0.8, bounce: 0.15 };
  // The panel is portaled out of the root, so it carries the timing variables itself.
  const timing = { "--nav-duration": `${seconds}s`, "--nav-gap": `${sideOffset}px` } as CSSProperties;

  return (
    <LayoutGroup id={id}>
      <NavigationMenuContext.Provider value={{ value: current, hovered, setHovered, seconds, transition }}>
        <NavigationMenuPrimitive.Root
          {...props}
          data-slot="navigation-menu"
          value={current}
          delay={delay}
          closeDelay={closeDelay}
          onValueChange={(next: string | null) => {
            if (value === undefined) setInternalValue(next ?? null);
            onValueChange?.(next ?? null);
          }}
          className={`relative z-10 flex max-w-full justify-center ${className ?? ""}`}
        >
          {children}
          <NavigationMenuPrimitive.Portal>
            <NavigationMenuPrimitive.Positioner
              data-slot="navigation-menu-positioner"
              side="bottom"
              align={align}
              sideOffset={sideOffset}
              collisionPadding={16}
              collisionAvoidance={{ side: "none" }}
              style={timing}
              // The ::before strip bridges the gap so the pointer can travel from trigger to panel.
              className={`z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-(--nav-duration) ${EASE} before:absolute before:inset-x-0 before:bottom-full before:h-(--nav-gap) before:content-[''] data-instant:transition-none`}
            >
              <NavigationMenuPrimitive.Popup
                data-slot="navigation-menu-popup"
                className={`bg-background text-foreground border-border relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) rounded-xl border shadow-lg transition-[opacity,scale,width,height] duration-(--nav-duration) outline-none ${EASE} data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--nav-duration)*0.6)] data-starting-style:scale-95 data-starting-style:opacity-0`}
              >
                <NavigationMenuPrimitive.Viewport
                  data-slot="navigation-menu-viewport"
                  className="relative size-full overflow-hidden rounded-[inherit]"
                />
              </NavigationMenuPrimitive.Popup>
            </NavigationMenuPrimitive.Positioner>
          </NavigationMenuPrimitive.Portal>
        </NavigationMenuPrimitive.Root>
      </NavigationMenuContext.Provider>
    </LayoutGroup>
  );
}

export interface NavigationMenuListProps {
  className?: string;
  children?: ReactNode;
}

export function NavigationMenuList({ className, children }: NavigationMenuListProps) {
  const nav = useNavigationMenu("NavigationMenuList");

  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      onPointerLeave={() => nav.setHovered(null)}
      className={`relative isolate flex flex-wrap items-center justify-center gap-1 ${className ?? ""}`}
    >
      {children}
    </NavigationMenuPrimitive.List>
  );
}

export interface NavigationMenuItemProps {
  /** Identifies the item for controlled usage. Generated when omitted. */
  value?: string;
  className?: string;
  children?: ReactNode;
}

export function NavigationMenuItem({ value, className, children }: NavigationMenuItemProps) {
  useNavigationMenu("NavigationMenuItem");
  const generated = useId();
  const itemValue = value ?? generated;

  return (
    <NavigationMenuItemContext.Provider value={itemValue}>
      <NavigationMenuPrimitive.Item
        value={itemValue}
        data-slot="navigation-menu-item"
        className={`relative ${className ?? ""}`}
      >
        {children}
      </NavigationMenuPrimitive.Item>
    </NavigationMenuItemContext.Provider>
  );
}

const topLevelClass =
  "text-muted-foreground hover:text-foreground data-popup-open:text-foreground focus-visible:ring-ring/30 relative inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50";

/** The highlight that travels between top-level triggers and links. */
function Highlight({ value }: { value: string }) {
  const nav = useNavigationMenu("NavigationMenuTrigger");
  const shown = (nav.hovered ?? nav.value) === value;

  return (
    <AnimatePresence initial={false}>
      {shown && (
        <motion.span
          aria-hidden="true"
          data-slot="navigation-menu-highlight"
          layoutId="navigation-menu-highlight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={nav.transition}
          className="bg-muted pointer-events-none absolute inset-0 -z-10 rounded-md"
        />
      )}
    </AnimatePresence>
  );
}

export type NavigationMenuTriggerProps = Omit<
  ComponentProps<typeof NavigationMenuPrimitive.Trigger>,
  "className" | "render"
> & {
  className?: string;
};

export function NavigationMenuTrigger({ className, children, ...props }: NavigationMenuTriggerProps) {
  const nav = useNavigationMenu("NavigationMenuTrigger");
  const item = useNavigationMenuItem("NavigationMenuTrigger");
  const open = nav.value === item;

  return (
    <NavigationMenuPrimitive.Trigger
      {...props}
      data-slot="navigation-menu-trigger"
      onPointerEnter={(event) => {
        nav.setHovered(item);
        props.onPointerEnter?.(event);
      }}
      className={`${topLevelClass} ${className ?? ""}`}
    >
      <Highlight value={item} />
      {children}
      <motion.svg
        aria-hidden="true"
        data-slot="navigation-menu-chevron"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ rotate: open ? 180 : 0 }}
        transition={
          nav.seconds === 0 ? { duration: 0 } : { duration: nav.seconds * 0.7, ease: [0.22, 1, 0.36, 1] }
        }
        className="size-3.5 shrink-0 opacity-70"
      >
        <path d="m4 6 4 4 4-4" />
      </motion.svg>
    </NavigationMenuPrimitive.Trigger>
  );
}

export interface NavigationMenuContentProps {
  className?: string;
  children?: ReactNode;
}

export function NavigationMenuContent({ className, children }: NavigationMenuContentProps) {
  useNavigationMenu("NavigationMenuContent");

  return (
    <NavigationMenuContentContext.Provider value={true}>
      <NavigationMenuPrimitive.Content
        data-slot="navigation-menu-content"
        // Sections slide like a carousel: moving right pushes the old section out to the left.
        className={`h-full w-[calc(100vw-2rem)] p-2 transition-[opacity,translate] duration-(--nav-duration) sm:w-max ${EASE} data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:data-[activation-direction=left]:translate-x-1/2 data-starting-style:data-[activation-direction=left]:-translate-x-1/2 data-ending-style:data-[activation-direction=right]:-translate-x-1/2 data-starting-style:data-[activation-direction=right]:translate-x-1/2 ${className ?? ""}`}
      >
        {children}
      </NavigationMenuPrimitive.Content>
    </NavigationMenuContentContext.Provider>
  );
}

export type NavigationMenuLinkProps = Omit<
  ComponentProps<typeof NavigationMenuPrimitive.Link>,
  "className" | "render"
> & {
  className?: string;
};

export function NavigationMenuLink({ className, children, ...props }: NavigationMenuLinkProps) {
  const nav = useNavigationMenu("NavigationMenuLink");
  const item = useContext(NavigationMenuItemContext);
  const inContent = useContext(NavigationMenuContentContext);

  if (inContent || item === null) {
    return (
      <NavigationMenuPrimitive.Link
        {...props}
        data-slot="navigation-menu-link"
        className={`hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring/30 data-active:bg-muted block rounded-lg p-3 text-sm transition-colors outline-none focus-visible:ring-3 ${className ?? ""}`}
      >
        {children}
      </NavigationMenuPrimitive.Link>
    );
  }

  return (
    <NavigationMenuPrimitive.Link
      {...props}
      data-slot="navigation-menu-link"
      onPointerEnter={(event) => {
        nav.setHovered(item);
        props.onPointerEnter?.(event);
      }}
      className={`${topLevelClass} data-active:text-foreground ${className ?? ""}`}
    >
      <Highlight value={item} />
      {children}
    </NavigationMenuPrimitive.Link>
  );
}
