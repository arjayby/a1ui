import { CaretLeftIcon } from "@phosphor-icons/react/ssr";

import { CondensingHeader } from "@/registry/blocks/condensing-header";

const notes = [
  {
    title: "Launch checklist",
    preview: "Confirm the redirect map, then freeze copy on Thursday.",
    date: "9:41",
  },
  {
    title: "Interview with Dana",
    preview: "She exports every Monday and never opens the dashboard.",
    date: "8:15",
  },
  { title: "Pricing page", preview: "Three plans read as two. Try a single comparison row.", date: "Mon" },
  {
    title: "Onboarding emails",
    preview: "Day 3 is the one people answer. Move the question there.",
    date: "Mon",
  },
  {
    title: "Reading list",
    preview: "Designing fluid interfaces, the typography talk, Butterick.",
    date: "Sun",
  },
  {
    title: "Standup, Nov 6",
    preview: "Search ships behind a flag. Filters wait for the new index.",
    date: "Fri",
  },
  { title: "Empty states", preview: "Say what will appear here and how to make it appear.", date: "Thu" },
  {
    title: "Offsite ideas",
    preview: "A cabin with one long table beats a hotel with four rooms.",
    date: "Wed",
  },
  {
    title: "Support themes",
    preview: "Billing dates, CSV encoding, and who can invite whom.",
    date: "Nov 3",
  },
  {
    title: "Changelog draft",
    preview: "Lead with the export fix. The rest fits in one line each.",
    date: "Nov 2",
  },
  { title: "Icon audit", preview: "Eleven icons do the job of four. Keep the four.", date: "Oct 30" },
  {
    title: "Keyboard map",
    preview: "Slash focuses search everywhere except inside a field.",
    date: "Oct 29",
  },
  {
    title: "Retention notes",
    preview: "Teams that invite a second person in week one stay.",
    date: "Oct 27",
  },
  {
    title: "Docs outline",
    preview: "Start with the task, then the reference, then the theory.",
    date: "Oct 24",
  },
  {
    title: "Things to cut",
    preview: "The tour, the confetti, and the second settings page.",
    date: "Oct 22",
  },
  { title: "Quarter goals", preview: "Fewer, written as outcomes, with one owner each.", date: "Oct 20" },
];

const action =
  "text-foreground hover:bg-muted focus-visible:outline-ring inline-flex h-8 items-center gap-0.5 rounded-md px-2 text-[0.9375rem] font-medium transition-[scale,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.96] motion-reduce:transition-none";

const panel =
  "border-border bg-card mx-auto w-full max-w-[26rem] rounded-xl border [--condensing-header-background:var(--card)] [--condensing-header-safe-top:0px]";

function NoteRows({ count = notes.length }: { count?: number }) {
  return (
    <ul className="m-0 list-none px-4 pb-2">
      {notes.slice(0, count).map(({ title, preview, date }) => (
        <li key={title} className="border-border flex items-baseline gap-3 border-b py-3 last:border-b-0">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.9375rem] leading-5 font-medium">{title}</div>
            <div className="text-muted-foreground truncate text-sm leading-5">{preview}</div>
          </div>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{date}</span>
        </li>
      ))}
    </ul>
  );
}

export function CondensingHeaderDemo() {
  return (
    <>
      <div className="not-prose demo-frame p-4 sm:p-8">
        <div
          className={`${panel} focus-visible:outline-ring h-[min(34rem,70svh)] overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-2`}
          role="region"
          aria-label="Scrollable Condensing Header demo"
          tabIndex={0}
        >
          <CondensingHeader
            title="Notes"
            headingLevel={3}
            subtitle="16 notes, updated today"
            leading={
              <button type="button" className={action}>
                <CaretLeftIcon aria-hidden="true" className="size-4" />
                Folders
              </button>
            }
            trailing={
              <button type="button" className={action}>
                Edit
              </button>
            }
            accessory={
              <input
                type="search"
                aria-label="Search notes"
                placeholder="Search"
                className="bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-ring h-9 w-full rounded-lg px-3 text-[0.9375rem] focus-visible:outline-2 focus-visible:outline-offset-2"
              />
            }
          />
          <NoteRows />
        </div>
      </div>
      <p className="demo-caption text-center">
        Scroll the panel. The title travels into the bar, and scrolling back reverses it exactly.
      </p>
    </>
  );
}
