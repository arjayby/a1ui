"use client";

import { CheckIcon, EyeIcon, EyeSlashIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PasswordRule {
  /** Requirement shown in the checklist, such as "At least 8 characters". */
  label: string;
  test: (value: string) => boolean;
}

export interface PasswordInputProps extends Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange" | "ref" | "children"
> {
  /** Visible label for the field. */
  label: ReactNode;
  /** Requirements the password must meet. Each one passed fills a segment of the meter. */
  rules?: PasswordRule[];
  /** Hint shown between the meter and the checklist. */
  description?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export const defaultPasswordRules: PasswordRule[] = [
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  { label: "Upper and lowercase letters", test: (value) => /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value) },
  { label: "A number", test: (value) => /\d/.test(value) },
  { label: "A symbol", test: (value) => /[^\p{L}\d\s]/u.test(value) },
];

const levels = [
  { label: "Weak", color: "bg-(--status-danger)", text: "text-(--status-danger)" },
  { label: "Fair", color: "bg-(--status-warning)", text: "text-(--status-warning)" },
  { label: "Good", color: "bg-(--status-warning)", text: "text-(--status-warning)" },
  { label: "Strong", color: "bg-(--status-success)", text: "text-(--status-success)" },
] as const;

// Weak covers up to a third of the rules, Fair up to two thirds, Good anything short of all, Strong all.
const levelFor = (passed: number, total: number) =>
  levels[passed === total ? 3 : passed / total > 2 / 3 ? 2 : passed / total > 1 / 3 ? 1 : 0];

export function PasswordInput({
  label,
  rules = defaultPasswordRules,
  description,
  value,
  defaultValue = "",
  onValueChange,
  onBlur,
  onInvalid,
  id: idProp,
  className,
  autoComplete = "new-password",
  disabled,
  "aria-describedby": ariaDescribedBy,
  ...props
}: PasswordInputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [visible, setVisible] = useState(false);
  // Unmet rules turn red only after the field is left following an edit, or its form is submitted.
  const [touched, setTouched] = useState(false);
  const editedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const text = value ?? internalValue;
  const results = rules.map((rule) => rule.test(text));
  const passed = results.filter(Boolean).length;
  const strong = passed === rules.length;
  const level = text ? levelFor(passed, rules.length) : undefined;
  const showInvalid = touched && !strong;
  const strengthId = `${id}-strength`;
  const descriptionId = description ? `${id}-description` : undefined;
  const rulesId = `${id}-rules`;

  // Unmet rules double as the native validity, so forms refuse to submit until every rule passes.
  useEffect(() => {
    inputRef.current?.setCustomValidity(strong ? "" : "Choose a password that meets every requirement.");
  }, [strong]);

  return (
    <div
      data-slot="password-input"
      data-strength={level?.label.toLowerCase()}
      data-invalid={showInvalid || undefined}
      className={`w-full ${className ?? ""}`}
    >
      <Label htmlFor={id}>{label}</Label>
      <div ref={scope} className="relative mt-2">
        <Input
          {...props}
          ref={inputRef}
          id={id}
          type={visible ? "text" : "password"}
          value={text}
          disabled={disabled}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={showInvalid || undefined}
          aria-describedby={[strengthId, descriptionId, rulesId, ariaDescribedBy].filter(Boolean).join(" ")}
          className="pr-10"
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
            // Leave other constraints, such as required, to the browser's own report.
            if (strong) return;
            event.preventDefault();
            setTouched(true);
            const input = event.currentTarget;
            if (input.form?.querySelector("input:invalid, select:invalid, textarea:invalid") === input)
              input.focus();
            if (!reducedMotion) animate(scope.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.36 });
          }}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={id}
          aria-pressed={visible}
          data-slot="password-input-toggle"
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 my-auto grid size-7 place-items-center rounded-sm transition-colors disabled:pointer-events-none"
          // Keeps focus and the caret in the input while toggling.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={visible ? "hide" : "show"}
              className="grid place-items-center"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.6, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", duration: reducedMotion ? 0 : 0.25, bounce: 0.2 }}
            >
              {visible ? (
                <EyeSlashIcon aria-hidden="true" className="size-4" />
              ) : (
                <EyeIcon aria-hidden="true" className="size-4" />
              )}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <div aria-hidden="true" data-slot="password-input-meter" className="flex flex-1 gap-1">
          {rules.map((rule, index) => (
            <span key={rule.label} className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
              <motion.span
                className={`block h-full origin-left rounded-full transition-colors ${level?.color ?? ""}`}
                initial={false}
                animate={{ scaleX: index < passed ? 1 : 0 }}
                transition={{
                  type: "spring",
                  duration: reducedMotion ? 0 : 0.35,
                  bounce: 0,
                  // Segments fill left to right as a cascade when several rules pass at once.
                  delay: reducedMotion ? 0 : index * 0.03,
                }}
              />
            </span>
          ))}
        </div>
        <span
          id={strengthId}
          aria-live="polite"
          data-slot="password-input-strength"
          className={`min-w-12 text-right text-xs font-medium transition-colors ${level?.text ?? "text-muted-foreground"}`}
        >
          <span className="sr-only">Password strength: </span>
          {level?.label ?? <span className="sr-only">empty</span>}
        </span>
      </div>
      {description && (
        <p
          id={descriptionId}
          data-slot="password-input-description"
          className="text-muted-foreground mt-2 text-sm"
        >
          {description}
        </p>
      )}
      <ul id={rulesId} role="list" aria-label="Requirements" className="mt-2 grid gap-1 text-sm">
        {rules.map((rule, index) => {
          const met = results[index];
          return (
            <li
              key={rule.label}
              data-slot="password-input-rule"
              data-met={met || undefined}
              className={`flex items-center gap-2 transition-colors ${met ? "text-foreground" : showInvalid ? "text-destructive" : "text-muted-foreground"}`}
            >
              <span aria-hidden="true" className="relative grid size-4 shrink-0 place-items-center">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={met ? "met" : showInvalid ? "unmet" : "pending"}
                    className="grid place-items-center"
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={
                      reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.5 }
                    }
                    transition={{ type: "spring", duration: reducedMotion ? 0 : 0.3, bounce: 0.3 }}
                  >
                    {met ? (
                      <CheckIcon weight="bold" className="size-3.5 text-(--status-success)" />
                    ) : showInvalid ? (
                      <XIcon weight="bold" className="size-3.5" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current opacity-60" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </span>
              {rule.label}
              <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
