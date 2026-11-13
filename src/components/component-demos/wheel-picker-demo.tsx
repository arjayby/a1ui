"use client";

import { useState } from "react";

import { DemoSelect, DemoSwitch } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { WheelPicker, WheelPickerGroup } from "@/registry/components/wheel-picker";

const hours = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1) }));
const minutes = Array.from({ length: 60 }, (_, index) => ({ value: String(index).padStart(2, "0") }));
const periods = [{ value: "AM" }, { value: "PM" }];
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, index) => ({ value: String(index + 1), label }));
const years = Array.from({ length: 11 }, (_, index) => ({ value: String(2020 + index) }));

const daysIn = (month: string, year: string) => new Date(Number(year), Number(month), 0).getDate();

export function WheelPickerPreview() {
  return (
    <WheelPickerGroup label="Time" className="w-52 px-2">
      <WheelPicker label="Hour" options={hours} defaultValue="9" className="flex-1" />
      <WheelPicker label="Minute" options={minutes} defaultValue="41" className="flex-1" />
      <WheelPicker label="AM or PM" options={periods} defaultValue="AM" className="flex-1" />
    </WheelPickerGroup>
  );
}

export function WheelPickerDemo() {
  const [picker, setPicker] = useState<"time" | "date">("date");
  const [haptics, setHaptics] = useState(true);
  const [time, setTime] = useState({ hour: "9", minute: "41", period: "AM" });
  const [date, setDate] = useState({ month: "2", day: "14", year: "2026" });
  // Every month lists 31 days; the ones it lacks are disabled, so the wheel passes over them.
  const days = Array.from({ length: 31 }, (_, index) => ({
    value: String(index + 1),
    disabled: index + 1 > daysIn(date.month, date.year),
  }));
  // Changing the month or year can leave the day past the end of the month; pull it back in.
  const changeDate = (next: Partial<typeof date>) =>
    setDate((current) => {
      const merged = { ...current, ...next };
      return { ...merged, day: String(Math.min(Number(merged.day), daysIn(merged.month, merged.year))) };
    });
  const setNow = () => {
    const now = new Date();
    setTime({
      hour: String(now.getHours() % 12 || 12),
      minute: String(now.getMinutes()).padStart(2, "0"),
      period: now.getHours() < 12 ? "AM" : "PM",
    });
    setDate({
      month: String(now.getMonth() + 1),
      day: String(now.getDate()),
      year: String(clampYear(now.getFullYear())),
    });
  };

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage flex-col gap-6">
        {picker === "time" ? (
          <WheelPickerGroup label="Time" className="w-56 px-2">
            <WheelPicker
              label="Hour"
              name="hour"
              options={hours}
              value={time.hour}
              onValueChange={(hour) => setTime((current) => ({ ...current, hour }))}
              haptics={haptics}
              className="flex-1"
            />
            <WheelPicker
              label="Minute"
              name="minute"
              options={minutes}
              value={time.minute}
              onValueChange={(minute) => setTime((current) => ({ ...current, minute }))}
              haptics={haptics}
              className="flex-1"
            />
            <WheelPicker
              label="AM or PM"
              name="period"
              options={periods}
              value={time.period}
              onValueChange={(period) => setTime((current) => ({ ...current, period }))}
              haptics={haptics}
              className="flex-1"
            />
          </WheelPickerGroup>
        ) : (
          <WheelPickerGroup label="Date" className="w-72 px-2">
            <WheelPicker
              label="Month"
              name="month"
              options={months}
              value={date.month}
              onValueChange={(month) => changeDate({ month })}
              haptics={haptics}
              className="flex-[2]"
            />
            <WheelPicker
              label="Day"
              name="day"
              options={days}
              value={date.day}
              onValueChange={(day) => changeDate({ day })}
              haptics={haptics}
              className="flex-1"
            />
            <WheelPicker
              label="Year"
              name="year"
              options={years}
              value={date.year}
              onValueChange={(year) => changeDate({ year })}
              haptics={haptics}
              className="flex-1"
            />
          </WheelPickerGroup>
        )}
        <div className="flex items-center gap-3">
          <p data-slot="wheel-picker-demo-value" className="text-muted-foreground m-0 text-sm tabular-nums">
            {picker === "time"
              ? `${time.hour}:${time.minute} ${time.period}`
              : `${months[Number(date.month) - 1].label} ${date.day}, ${date.year}`}
          </p>
          <Button variant="outline" size="sm" onClick={setNow}>
            {picker === "time" ? "Set to now" : "Set to today"}
          </Button>
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Picker" value={picker} options={["time", "date"]} onChange={setPicker} />
        <DemoSwitch label="Haptics" checked={haptics} onChange={setHaptics} />
      </div>
    </div>
  );
}

const clampYear = (year: number) => Math.min(2030, Math.max(2020, year));
