"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { components } from "@/lib/component-catalog";
import { cn } from "@/lib/utils";

function SearchButton({ compact = false }: { compact?: boolean }) {
  const { setOpenSearch } = useSearchContext();

  return (
    <button
      type="button"
      aria-label={compact ? "Search documentation" : undefined}
      className={cn(
        compact
          ? "hover:bg-muted flex size-8 items-center justify-center rounded-sm"
          : "border-border hover:border-foreground flex w-full items-center justify-between rounded-sm border px-2.5 py-2 text-left",
      )}
      onClick={() => setOpenSearch(true)}
    >
      <span className={cn(compact && "sr-only")}>Search...</span>
      {compact ? <Search aria-hidden="true" /> : <kbd className="text-muted-foreground">⌘ K</kbd>}
    </button>
  );
}

export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <aside className="border-border sticky top-0 hidden h-dvh flex-col border-r px-5 py-7 md:flex">
      <Link href="/" className="w-fit font-bold no-underline">
        a1ui
      </Link>
      <div className="mt-6">
        <SearchButton />
      </div>
      <nav aria-label="Components" className="mt-8">
        <p className="mb-3 font-bold">Components</p>
        <ul className="flex list-none flex-col gap-1 p-0">
          {components.map((component) => {
            const href = `/components/${component.slug}`;
            const current = pathname === href;

            return (
              <li key={component.slug}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className="hover:bg-muted aria-[current=page]:bg-foreground aria-[current=page]:text-background block rounded-sm px-2 py-1.5 no-underline"
                >
                  {component.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="bg-background border-border sticky top-0 z-20 flex items-center gap-3 border-b px-3 py-2 md:hidden">
      <Link href="/" className="mr-auto font-bold no-underline">
        a1ui
      </Link>
      <label className="sr-only" htmlFor="component-select">
        Choose a component
      </label>
      <select
        id="component-select"
        value={pathname.startsWith("/components/") ? pathname : "/"}
        className="border-border bg-background max-w-44 min-w-0 rounded-sm border px-2 py-1.5"
        onChange={(event) => router.push(event.target.value)}
      >
        <option value="/">Components</option>
        {components.map((component) => (
          <option key={component.slug} value={`/components/${component.slug}`}>
            {component.title}
          </option>
        ))}
      </select>
      <SearchButton compact />
    </header>
  );
}
