import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
    <label className="component-demo-control">
      <span>{label}</span>
      <Select
        value={value}
        className="w-28 capitalize"
        onChange={(event) => {
          const option = options.find((option) => option === event.target.value);
          if (option) onChange(option);
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </label>
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
