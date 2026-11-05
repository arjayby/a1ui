"use client";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useIsPresent,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

export type PaginationItem = number | "start-ellipsis" | "end-ellipsis";

const range = (start: number, end: number) =>
  Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);

/**
 * Lists the page numbers and gaps to show. Once there are enough pages the list keeps the
 * same number of slots, so the bar stays the same width while the window moves.
 */
export function getPaginationItems({
  page,
  pageCount,
  siblingCount = 1,
  boundaryCount = 1,
}: {
  page: number;
  pageCount: number;
  siblingCount?: number;
  boundaryCount?: number;
}): PaginationItem[] {
  const count = Math.max(1, Math.floor(pageCount));
  const current = Math.min(count, Math.max(1, Math.round(page)));
  const siblings = Math.max(0, Math.floor(siblingCount));
  const boundary = Math.max(0, Math.floor(boundaryCount));

  // Short lists show every page.
  if (count <= 2 * boundary + 2 * siblings + 3) return range(1, count);

  const startPages = range(1, boundary);
  const endPages = range(count - boundary + 1, count);
  const siblingsStart = Math.max(
    Math.min(current - siblings, count - boundary - 2 * siblings - 1),
    boundary + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(current + siblings, boundary + 2 * siblings + 2),
    count - boundary - 1,
  );

  return [
    ...startPages,
    siblingsStart > boundary + 2 ? "start-ellipsis" : boundary + 1,
    ...range(siblingsStart, siblingsEnd),
    siblingsEnd < count - boundary - 1 ? "end-ellipsis" : count - boundary,
    ...endPages,
  ];
}

export interface PaginationLinkProps {
  href?: string;
  className: string;
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  "aria-label": string;
  "aria-current"?: "page";
  "data-slot": string;
}

export interface PaginationProps {
  /** The current page, starting at 1, when controlled by the caller. */
  page?: number;
  /** The initial page when uncontrolled. */
  defaultPage?: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called with the page the user picked. Controlled usage requires the caller to update `page`. */
  onPageChange?: (page: number) => void;
  /** Pages shown on each side of the current page. */
  siblingCount?: number;
  /** Pages always shown at the start and end. */
  boundaryCount?: number;
  /** Renders every control as a link to this URL instead of a button. */
  getHref?: (page: number) => string;
  /**
   * Renders an enabled control as a link element, such as a router `Link`, from the given props.
   * Implies link mode. Disabled previous and next controls stay plain anchors without an href.
   */
  renderLink?: (props: PaginationLinkProps, page: number) => ReactElement;
  /** Visible text of the previous control. Hidden below the `sm` breakpoint. */
  previousLabel?: ReactNode;
  /** Visible text of the next control. Hidden below the `sm` breakpoint. */
  nextLabel?: ReactNode;
  /** Names the navigation landmark. */
  "aria-label"?: string;
  /** Travel time of the active surface and the number reflow, in seconds. */
  duration?: number;
  className?: string;
}

const controlClass =
  "focus-visible:ring-ring/30 relative inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1 rounded-md px-1.5 text-sm font-medium tabular-nums whitespace-nowrap outline-none transition-colors select-none focus-visible:ring-3 sm:h-9 sm:min-w-9 sm:px-2";

const enterVariants = {
  hidden: (direction: number) => ({ opacity: 0, x: direction * 12, scale: 0.8 }),
  shown: { opacity: 1, x: 0, scale: 1 },
  gone: (direction: number) => ({ opacity: 0, x: direction * -12, scale: 0.8 }),
};
const fadeVariants = { hidden: { opacity: 0 }, shown: { opacity: 1 }, gone: { opacity: 0 } };

function Chevron({ flip }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 shrink-0 ${flip ? "rotate-180" : ""}`}
    >
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </svg>
  );
}

export function Pagination({
  page,
  defaultPage = 1,
  pageCount,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  getHref,
  renderLink,
  previousLabel = "Previous",
  nextLabel = "Next",
  "aria-label": ariaLabel = "Pagination",
  duration = 0.35,
  className,
}: PaginationProps) {
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const refocus = useRef(false);
  const reducedMotion = useReducedMotion() ?? false;
  const [internalPage, setInternalPage] = useState(defaultPage);
  const count = Math.max(1, Math.floor(Number.isFinite(pageCount) ? pageCount : 1));
  const raw = page ?? internalPage;
  const current = Math.min(count, Math.max(1, Math.round(Number.isFinite(raw) ? raw : 1)));

  // Remember which way the page moved so entering numbers slide in from that side.
  const [shown, setShown] = useState({ page: current, direction: 0 });
  if (shown.page !== current) setShown({ page: current, direction: Math.sign(current - shown.page) });
  const direction = shown.page === current ? shown.direction : Math.sign(current - shown.page);

  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.35;
  const transition: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce: 0.15 };
  const fade: Transition = seconds === 0 ? { duration: 0 } : { duration: seconds * 0.6, ease: "easeOut" };

  // A disabled previous or next control drops focus, so hand it to the current page instead.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    listRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
  }, [current]);

  const asLink = Boolean(getHref || renderLink);
  const select = (target: number, event: MouseEvent<HTMLElement>, edge: boolean) => {
    // Let the browser open links in a new tab or window without moving the page here.
    if (asLink && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0))
      return;
    const next = Math.min(count, Math.max(1, target));
    if (next === current) return;
    if (edge && (next === 1 || next === count)) refocus.current = true;
    if (page === undefined) setInternalPage(next);
    onPageChange?.(next);
  };
  const link: LinkOptions = { asLink, getHref, renderLink, onSelect: select };

  const items = getPaginationItems({ page: current, pageCount: count, siblingCount, boundaryCount });
  const prevDisabled = current <= 1;
  const nextDisabled = current >= count;
  const edgeClass =
    "text-muted-foreground hover:text-foreground hover:bg-muted data-disabled:text-muted-foreground aria-disabled:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

  return (
    <nav
      aria-label={ariaLabel}
      data-slot="pagination"
      data-page={current}
      className={`flex w-full justify-center ${className ?? ""}`}
    >
      <LayoutGroup id={id}>
        <ul
          ref={listRef}
          data-slot="pagination-list"
          className="relative isolate flex items-center gap-0.5 sm:gap-1"
        >
          <motion.li layout="position" transition={transition} data-slot="pagination-item">
            <Control
              {...link}
              target={current - 1}
              slot="pagination-previous"
              label="Previous page"
              disabled={prevDisabled}
              className={`${edgeClass} sm:pr-3`}
            >
              <Chevron />
              {previousLabel && <span className="hidden sm:inline">{previousLabel}</span>}
            </Control>
          </motion.li>
          <PaginationContext.Provider value={{ current, transition, link }}>
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              {items.map((item) => {
                if (typeof item === "string")
                  return (
                    <motion.li
                      key={item}
                      layout="position"
                      aria-hidden="true"
                      data-slot="pagination-ellipsis"
                      custom={direction}
                      variants={fadeVariants}
                      initial="hidden"
                      animate="shown"
                      exit="gone"
                      transition={{ ...fade, layout: transition }}
                      className="text-muted-foreground inline-flex h-8 w-6 items-center justify-center select-none sm:h-9 sm:w-9"
                    >
                      …
                    </motion.li>
                  );
                return (
                  <motion.li
                    key={item}
                    layout="position"
                    data-slot="pagination-item"
                    custom={direction}
                    variants={enterVariants}
                    initial="hidden"
                    animate="shown"
                    exit="gone"
                    transition={{ ...transition, opacity: fade, layout: transition }}
                  >
                    <PageNumber page={item} />
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </PaginationContext.Provider>
          <motion.li layout="position" transition={transition} data-slot="pagination-item">
            <Control
              {...link}
              target={current + 1}
              slot="pagination-next"
              label="Next page"
              disabled={nextDisabled}
              className={`${edgeClass} sm:pl-3`}
            >
              {nextLabel && <span className="hidden sm:inline">{nextLabel}</span>}
              <Chevron flip />
            </Control>
          </motion.li>
        </ul>
      </LayoutGroup>
    </nav>
  );
}

type LinkOptions = {
  asLink: boolean;
  getHref?: (page: number) => string;
  renderLink?: (props: PaginationLinkProps, page: number) => ReactElement;
  onSelect: (target: number, event: MouseEvent<HTMLElement>, edge: boolean) => void;
};

const PaginationContext = createContext<{
  current: number;
  transition: Transition;
  link: LinkOptions;
} | null>(null);

// Reads the current page from context so a number that is animating out of the window
// re-renders as inactive instead of keeping the props it had when it left.
function PageNumber({ page }: { page: number }) {
  const context = useContext(PaginationContext)!;
  const present = useIsPresent();
  const active = present && page === context.current;
  if (!present)
    return (
      <span aria-hidden="true" className={`${controlClass} text-muted-foreground`}>
        {page}
      </span>
    );

  return (
    <Control
      {...context.link}
      target={page}
      slot="pagination-link"
      label={`Page ${page}`}
      active={active}
      className={active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}
    >
      {active && (
        <motion.span
          aria-hidden="true"
          data-slot="pagination-active"
          layoutId="pagination-active"
          initial={false}
          transition={context.transition}
          className="border-border bg-background pointer-events-none absolute inset-0 -z-10 rounded-md border shadow-sm"
        />
      )}
      {page}
    </Control>
  );
}

function Control({
  target,
  slot,
  label,
  disabled = false,
  active = false,
  className,
  children,
  asLink,
  getHref,
  renderLink,
  onSelect,
}: {
  target: number;
  slot: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  className: string;
  children: ReactNode;
} & LinkOptions) {
  const shared = {
    className: `${controlClass} ${className}`,
    children,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (disabled) event.preventDefault();
      else onSelect(target, event, slot !== "pagination-link");
    },
    "aria-label": label,
    "aria-current": active ? ("page" as const) : undefined,
    "data-slot": slot,
  };
  if (!asLink)
    return <button {...shared} type="button" disabled={disabled} data-disabled={disabled || undefined} />;
  // A disabled link has nowhere to go, so it drops its href and stays a plain anchor.
  if (disabled) return <a {...shared} role="link" aria-disabled="true" />;
  const props: PaginationLinkProps = { ...shared, href: getHref?.(target) };
  return renderLink ? renderLink(props, target) : <a {...props} />;
}
