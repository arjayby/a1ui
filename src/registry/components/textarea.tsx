"use client";

import { AnimatePresence, animate, motion, useAnimate, useMotionValue, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
// The counter turns from muted to full contrast once this share of maxLength is used.
const NEAR_LIMIT = 0.8;
// Shared by the textarea and its hidden mirror, so the mirror wraps text exactly like the field.
const TEXT_CLASSES = "block w-full px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap";

export interface TextareaProps extends Omit<
  ComponentProps<"textarea">,
  "value" | "defaultValue" | "rows" | "children"
> {
  /** Visible label, wired to the textarea. */
  label?: ReactNode;
  /** Hint shown under the field. */
  description?: ReactNode;
  /** Error message that slides in under the field and marks it invalid. */
  error?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Smallest height, in rows. */
  minRows?: number;
  /** Tallest height, in rows. Longer text scrolls inside the field. */
  maxRows?: number;
  /** Shows a rolling character counter. Needs maxLength. */
  showCount?: boolean;
  /** Height spring duration in seconds. Zero resizes instantly. */
  duration?: number;
  /** Classes on the outer wrapper. */
  className?: string;
}

export function Textarea({
  label,
  description,
  error,
  value,
  defaultValue = "",
  onValueChange,
  onChange,
  onKeyDown,
  minRows = 2,
  maxRows = 8,
  showCount = false,
  duration = 0.25,
  maxLength,
  placeholder,
  id: idProp,
  className,
  ref,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const reducedMotion = useReducedMotion();
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.25;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const text = value ?? internalValue;
  const [fieldHeight, setFieldHeight] = useState<number>();
  const [scrolls, setScrolls] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLTextAreaElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  // The frame's height trails the textarea's: the textarea resizes at once so the caret never
  // scrolls out of view, and the clipping frame springs after it.
  const frameHeight = useMotionValue<number | "auto">("auto");
  const measuredRef = useRef(false);

  const low = Math.max(1, Math.round(minRows));
  const high = Math.max(low, Math.round(maxRows));
  const limit = maxLength !== undefined && maxLength >= 0 ? maxLength : undefined;
  const counting = showCount && limit !== undefined;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const countId = counting ? `${id}-count` : undefined;

  const measure = useCallback(
    (instant: boolean) => {
      const mirror = mirrorRef.current;
      if (!mirror) return;
      mirror.value = "x";
      const oneRow = mirror.scrollHeight;
      mirror.value = "x\nx";
      const row = mirror.scrollHeight - oneRow;
      mirror.value = text || placeholder || "x";
      const content = mirror.scrollHeight;
      mirror.value = "";
      // jsdom and hidden ancestors report zero; keep the rows-based height until layout exists.
      if (row <= 0) return;
      const padding = oneRow - row;
      const min = padding + low * row;
      const max = padding + high * row;
      const next = Math.min(max, Math.max(min, content));
      setFieldHeight(next);
      setScrolls(content > max);
      if (instant || seconds === 0 || !measuredRef.current) {
        frameHeight.stop();
        frameHeight.jump(next);
      } else {
        animate(frameHeight, next, { type: "spring", visualDuration: seconds, bounce: 0 });
      }
      measuredRef.current = true;
    },
    [text, placeholder, low, high, seconds, frameHeight],
  );

  useLayoutEffect(() => measure(false), [measure]);

  // Width changes rewrap the text, and late web fonts change the row height.
  const measureRef = useRef(measure);
  useLayoutEffect(() => {
    measureRef.current = measure;
  }, [measure]);
  useEffect(() => {
    const frame = frameRef.current;
    let width = frame?.offsetWidth;
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) measureRef.current(true);
    });
    if (!frame || typeof ResizeObserver === "undefined") {
      return () => {
        active = false;
      };
    }
    const observer = new ResizeObserver(() => {
      if (frame.offsetWidth === width) return;
      width = frame.offsetWidth;
      measureRef.current(true);
    });
    observer.observe(frame);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  const [counterScope, animateCounter] = useAnimate<HTMLSpanElement>();
  const shake = useCallback(() => {
    if (seconds === 0 || !counterScope.current) return;
    animateCounter(counterScope.current, { x: [0, -4, 4, -3, 3, 0] }, { duration: 0.32 });
  }, [seconds, counterScope, animateCounter]);
  const count = text.length;
  const atLimit = limit !== undefined && count >= limit;
  const level =
    limit === undefined ? "under" : atLimit ? "limit" : count >= limit * NEAR_LIMIT ? "near" : "under";
  const previousCount = useRef(count);
  useEffect(() => {
    if (counting && limit !== undefined && previousCount.current < limit && count >= limit) shake();
    previousCount.current = count;
  }, [count, counting, limit, shake]);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) (ref as { current: HTMLTextAreaElement | null }).current = node;
    },
    [ref],
  );

  return (
    <div
      data-slot="textarea-root"
      data-invalid={error ? "" : undefined}
      className={`flex w-full flex-col text-sm ${className ?? ""}`}
    >
      {label && (
        <label htmlFor={id} data-slot="textarea-label" className="mb-2 leading-none font-medium">
          {label}
        </label>
      )}
      <motion.div
        ref={frameRef}
        data-slot="textarea-frame"
        data-invalid={error ? "" : undefined}
        style={{ height: frameHeight }}
        className="border-border bg-background has-focus-visible:ring-ring/30 data-invalid:border-destructive relative box-content overflow-hidden rounded-md border transition-[border-color,box-shadow] duration-150 has-focus-visible:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-50 motion-reduce:transition-none"
      >
        <textarea
          {...props}
          ref={setRefs}
          id={id}
          data-slot="textarea"
          data-scrolls={scrolls ? "" : undefined}
          rows={low}
          value={text}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={
            [errorId, descriptionId, countId, ariaDescribedBy].filter(Boolean).join(" ") || undefined
          }
          style={{ ...props.style, height: fieldHeight, overflowY: scrolls ? "auto" : "hidden" }}
          className={`${TEXT_CLASSES} placeholder:text-muted-foreground resize-none bg-transparent outline-none disabled:cursor-not-allowed`}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (value === undefined) setInternalValue(next);
            onValueChange?.(next);
            onChange?.(event);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            const field = event.currentTarget;
            const typing =
              (event.key.length === 1 || event.key === "Enter") && !event.metaKey && !event.ctrlKey;
            if (
              counting &&
              typing &&
              limit !== undefined &&
              field.value.length >= limit &&
              field.selectionStart === field.selectionEnd
            )
              shake();
          }}
        />
        <textarea
          ref={mirrorRef}
          aria-hidden="true"
          tabIndex={-1}
          readOnly
          rows={1}
          data-slot="textarea-mirror"
          className={`${TEXT_CLASSES} pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden`}
        />
      </motion.div>
      {(description || counting) && (
        <div data-slot="textarea-footer" className="mt-2 flex items-start gap-3">
          {description && (
            <div
              id={descriptionId}
              data-slot="textarea-description"
              className="text-muted-foreground min-w-0 flex-1"
            >
              {description}
            </div>
          )}
          {counting && (
            <span
              ref={counterScope}
              id={countId}
              data-slot="textarea-count"
              data-state={level}
              className={`ml-auto inline-flex shrink-0 tabular-nums transition-colors duration-200 motion-reduce:transition-none ${
                level === "limit"
                  ? "text-destructive"
                  : level === "near"
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              <span className="sr-only">{`${count} of ${limit} characters`}</span>
              <span aria-hidden="true" className="inline-flex">
                <RollingNumber value={count} seconds={seconds} />
                <span className="px-0.5">/</span>
                {limit}
              </span>
            </span>
          )}
        </div>
      )}
      <div aria-live="polite">
        <AnimatePresence initial={false}>
          {error && (
            <motion.div
              key="error"
              data-slot="textarea-error-frame"
              className="overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: seconds * 0.9, ease: [0.2, 0, 0, 1] }}
            >
              <motion.div
                id={errorId}
                data-slot="textarea-error"
                className="text-destructive pt-2"
                initial={{ y: -6 }}
                animate={{ y: 0 }}
                exit={{ y: -6 }}
                transition={{ duration: seconds * 0.9, ease: [0.2, 0, 0, 1] }}
              >
                {error}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RollingNumber({ value, seconds }: { value: number; seconds: number }) {
  const characters = String(value).split("");

  // Keys count from the right so ones, tens, and hundreds keep their columns as the number grows.
  return characters.map((character, index) => {
    const key = characters.length - index;
    const digit = DIGITS.indexOf(character);
    return (
      <span key={key} data-slot="textarea-digit" className="inline-block h-[1lh] overflow-hidden">
        <motion.span
          className="flex flex-col"
          initial={false}
          animate={{ y: `${-digit * 10}%` }}
          transition={seconds ? { type: "spring", visualDuration: seconds, bounce: 0.2 } : { duration: 0 }}
        >
          {DIGITS.map((option) => (
            <span key={option} className="h-[1lh]">
              {option}
            </span>
          ))}
        </motion.span>
      </span>
    );
  });
}
