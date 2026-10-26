"use client";

import { CheckIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import type { ZodType } from "zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ValidatedInputProps extends Omit<
  ComponentProps<typeof Input>,
  "value" | "defaultValue" | "onChange" | "ref" | "children"
> {
  /** Visible label for the field. */
  label: ReactNode;
  /** Zod schema the text must pass. The message of its first issue is shown as the error. */
  schema: ZodType<unknown, string>;
  /** Hint shown under the field. */
  description?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function ValidatedInput({
  label,
  schema,
  description,
  value,
  defaultValue = "",
  onValueChange,
  onBlur,
  onInvalid,
  id: idProp,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: ValidatedInputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [internalValue, setInternalValue] = useState(defaultValue);
  // Errors stay hidden until the field is left after an edit or its form is submitted.
  const [touched, setTouched] = useState(false);
  const editedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const text = value ?? internalValue;
  const result = schema.safeParse(text);
  const error = result.success ? undefined : (result.error.issues[0]?.message ?? "Invalid value");
  const showError = touched && error !== undefined;
  const showValid = touched && error === undefined;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = showError ? `${id}-error` : undefined;

  // The schema result doubles as the native validity, so forms refuse to submit while it fails.
  useEffect(() => {
    inputRef.current?.setCustomValidity(error ?? "");
  }, [error]);

  return (
    <div
      data-slot="validated-input"
      data-invalid={showError || undefined}
      data-valid={showValid || undefined}
      className={`w-full ${className ?? ""}`}
    >
      <Label htmlFor={id}>{label}</Label>
      <div ref={scope} className="relative mt-2">
        <Input
          {...props}
          ref={inputRef}
          id={id}
          value={text}
          aria-invalid={showError || undefined}
          aria-describedby={[errorId, descriptionId, ariaDescribedBy].filter(Boolean).join(" ") || undefined}
          className="pr-9"
          onChange={(event) => {
            const next = event.currentTarget.value;
            editedRef.current = true;
            if (value === undefined) setInternalValue(next);
            onValueChange?.(next);
          }}
          onBlur={(event) => {
            if (editedRef.current) setTouched(true);
            onBlur?.(event);
          }}
          onInvalid={(event) => {
            onInvalid?.(event);
            // Leave other constraints, such as required or type, to the browser's own report.
            if (error === undefined) return;
            event.preventDefault();
            setTouched(true);
            const input = event.currentTarget;
            if (input.form?.querySelector("input:invalid, select:invalid, textarea:invalid") === input)
              input.focus();
            if (!reducedMotion) animate(scope.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.36 });
          }}
        />
        <AnimatePresence initial={false}>
          {showValid && (
            <motion.span
              key="valid"
              aria-hidden="true"
              data-slot="validated-input-icon"
              className="text-success pointer-events-none absolute inset-y-0 right-3 flex items-center"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.5, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", duration: reducedMotion ? 0 : 0.3, bounce: 0.3 }}
            >
              <CheckIcon weight="bold" className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {/* The description and error share one reserved line, so showing an error never moves the layout. */}
      <div data-slot="validated-input-message" className="mt-2 grid min-h-5 text-sm">
        {description && (
          <motion.p
            id={descriptionId}
            data-slot="validated-input-description"
            className="text-muted-foreground col-start-1 row-start-1"
            animate={
              showError
                ? { opacity: 0, y: reducedMotion ? 0 : 4, filter: reducedMotion ? "none" : "blur(4px)" }
                : { opacity: 1, y: 0, filter: reducedMotion ? "none" : "blur(0px)" }
            }
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
          >
            {description}
          </motion.p>
        )}
        <div aria-live="polite" className="col-start-1 row-start-1 grid">
          <AnimatePresence initial={false}>
            {showError && (
              <motion.p
                key="error"
                id={`${id}-error`}
                data-slot="validated-input-error"
                className="text-destructive col-start-1 row-start-1 flex items-center gap-1.5"
                initial={reducedMotion ? false : { opacity: 0, y: -4, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }}
                transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
              >
                <WarningCircleIcon aria-hidden="true" className="size-4 shrink-0" />
                <motion.span
                  key={error}
                  initial={reducedMotion ? false : { opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: reducedMotion ? 0 : 0.18 }}
                >
                  {error}
                </motion.span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
