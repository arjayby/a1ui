import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <label className="component-demo-control">
      <span>{label}</span>
      <span className="flex h-8 items-center gap-3">
        <Input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={value}
          aria-valuetext={`${value.toFixed(1)} seconds`}
          className="h-4 w-28 cursor-pointer border-0 p-0 shadow-none"
          onChange={(event) => onChange(event.target.valueAsNumber)}
        />
        <span aria-hidden="true" className="w-8 tabular-nums">
          {value.toFixed(1)}s
        </span>
      </span>
    </label>
  );
}
