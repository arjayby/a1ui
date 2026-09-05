"use client";

import { Select } from "@base-ui/react/select";
import { clsx as cn } from "clsx";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState, type CSSProperties, type ReactNode } from "react";

export interface SelectMenuOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  detail?: string;
  /** A unique single letter or digit. Active only while the menu is open. */
  shortcut?: string;
  disabled?: boolean;
}

export interface SelectMenuProps {
  options: SelectMenuOption[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  variant?: "outline" | "ghost" | "pill";
  align?: "start" | "center" | "end";
  id?: string;
  name?: string;
  className?: string;
  /** Applied to both the trigger and its portalled menu. */
  style?: CSSProperties;
}

const theme = {
  "--select-menu-background": "var(--background, #f7f7f5)",
  "--select-menu-foreground": "var(--foreground, #222320)",
  "--select-menu-muted": "var(--muted-foreground, #6e706a)",
  "--select-menu-border": "var(--border, #d6d7d1)",
  "--select-menu-highlight":
    "color-mix(in oklab, var(--select-menu-background) 92%, var(--select-menu-foreground))",
} as CSSProperties;

function OptionIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center [&_svg]:size-4">
      {children}
    </span>
  );
}

export function SelectMenu({
  options,
  value,
  onValueChange,
  ariaLabel,
  placeholder = "Select an option",
  disabled = false,
  variant = "outline",
  align = "start",
  id,
  name,
  className,
  style,
}: SelectMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const unavailable = disabled || !options.some((option) => !option.disabled);
  const colors = { ...theme, ...style };

  return (
    <Select.Root<string>
      items={options}
      open={open}
      onOpenChange={setOpen}
      value={selected?.value ?? null}
      disabled={unavailable}
      name={name}
      onValueChange={(next) => {
        if (
          next !== null &&
          !unavailable &&
          options.some((option) => option.value === next && !option.disabled)
        )
          onValueChange(next);
      }}
    >
      <Select.Trigger
        id={id}
        type="button"
        aria-label={ariaLabel}
        data-select-menu-trigger=""
        style={colors}
        className={cn(
          "group inline-flex min-w-0 cursor-pointer items-center justify-between gap-2 font-mono text-xs leading-normal text-[var(--select-menu-foreground)] transition-colors outline-none hover:bg-[var(--select-menu-highlight)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--select-menu-foreground)] disabled:cursor-not-allowed disabled:opacity-45 data-[placeholder]:text-[var(--select-menu-muted)] motion-reduce:transition-none",
          variant === "outline" &&
            "min-h-10 rounded-lg border border-[var(--select-menu-border)] bg-[var(--select-menu-background)] px-3 py-2",
          variant === "ghost" && "min-h-7 rounded-md bg-transparent px-1 py-1 text-[11px]",
          variant === "pill" &&
            "min-h-10 rounded-full border border-[var(--select-menu-border)] bg-[var(--select-menu-background)] py-1.5 pr-3 pl-1.5",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon ? <OptionIcon>{selected.icon}</OptionIcon> : null}
          <span className="truncate">
            <Select.Value placeholder={placeholder} />
          </span>
        </span>
        <Select.Icon className="shrink-0">
          <ChevronDown
            aria-hidden="true"
            className="size-3 transition-transform group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
          />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          alignItemWithTrigger={false}
          sideOffset={6}
          align={align}
          collisionPadding={12}
          style={colors}
        >
          <Select.Popup
            onKeyDownCapture={(event) => {
              if (
                !open ||
                unavailable ||
                event.repeat ||
                event.nativeEvent.isComposing ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                !/^[a-z0-9]$/i.test(event.key)
              )
                return;
              const option = options.find(
                (option) => !option.disabled && option.shortcut?.toLowerCase() === event.key.toLowerCase(),
              );
              if (!option) return;
              event.preventDefault();
              event.stopPropagation();
              if (option.value !== selected?.value) onValueChange(option.value);
              setOpen(false);
            }}
            className="relative max-w-[min(22rem,calc(100vw-1.5rem))] min-w-[max(12rem,var(--anchor-width))] overflow-hidden rounded-xl border border-[var(--select-menu-border)] bg-[var(--select-menu-background)] font-mono text-xs leading-normal text-[var(--select-menu-foreground)] shadow-lg transition-opacity duration-150 outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none"
          >
            <Select.ScrollUpArrow className="absolute inset-x-0 top-0 flex h-6 items-center justify-center bg-[var(--select-menu-background)] text-[var(--select-menu-muted)]">
              <ChevronUp aria-hidden="true" className="size-3" />
            </Select.ScrollUpArrow>
            <Select.List
              aria-label={ariaLabel}
              className="max-h-[min(20rem,var(--available-height))] overflow-y-auto p-1 outline-none"
            >
              <Select.Group>
                <Select.GroupLabel className="px-3 pt-2 pb-2.5 text-[10px] tracking-wide text-[var(--select-menu-muted)]">
                  {ariaLabel}
                </Select.GroupLabel>
                {options.map((option, index) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    label={option.label}
                    aria-label={option.label}
                    aria-keyshortcuts={open && !option.disabled ? option.shortcut : undefined}
                    aria-describedby={option.description ? `${menuId}-${index}-description` : undefined}
                    className="relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 pr-8 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-[var(--select-menu-highlight)]"
                  >
                    {option.icon ? <OptionIcon>{option.icon}</OptionIcon> : null}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Select.ItemText>{option.label}</Select.ItemText>
                      {option.description ? (
                        <span
                          id={`${menuId}-${index}-description`}
                          className="text-[10px] text-[var(--select-menu-muted)]"
                        >
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {option.shortcut ? (
                      <kbd
                        aria-hidden="true"
                        className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded border border-[var(--select-menu-border)] bg-[var(--select-menu-background)] px-1 font-mono text-[10px] leading-none text-[var(--select-menu-muted)]"
                      >
                        {option.shortcut.toUpperCase()}
                      </kbd>
                    ) : option.detail ? (
                      <span
                        className="max-w-28 truncate text-[10px] text-[var(--select-menu-muted)]"
                        title={option.detail}
                      >
                        {option.detail}
                      </span>
                    ) : null}
                    <Select.ItemIndicator className="absolute right-2.5 flex items-center">
                      <Check aria-hidden="true" className="size-3.5" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.List>
            <Select.ScrollDownArrow className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-[var(--select-menu-background)] text-[var(--select-menu-muted)]">
              <ChevronDown aria-hidden="true" className="size-3" />
            </Select.ScrollDownArrow>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
