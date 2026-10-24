import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/registry/components/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/components/dropdown-menu";

export function DemoSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="component-demo-control">
      <span>{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`${label}: ${value}`}
          render={
            <Button
              variant="outline"
              size="sm"
              data-slot="demo-select-trigger"
              className="w-28 justify-between capitalize"
            />
          }
        >
          {value}
          <ChevronDown aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent aria-label={label} className="min-w-(--anchor-width)">
          {options.map((option) => (
            <DropdownMenuItem
              key={option}
              aria-current={option === value ? "true" : undefined}
              className="capitalize"
              onClick={() => onChange(option)}
            >
              {option}
              {option === value && <Check aria-hidden="true" className="ml-auto size-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function DemoDuration({
  label = "Animation duration",
  value,
  min = 0,
  max = 1,
  onChange,
}: {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Slider
      label={label}
      min={min}
      max={max}
      step={0.1}
      stops={[min, 0.3, 0.5, 1, 1.5, 2, max]}
      value={value}
      onValueChange={onChange}
      formatValue={(seconds) => `${seconds.toFixed(1)} seconds`}
      className="max-w-52 [&_[data-slot=slider-control]]:h-9 [&_[data-slot=slider-header]]:mb-0 [&_[data-slot=slider-header]]:text-[11px]"
    />
  );
}
