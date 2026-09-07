"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { useTheme } from "fumadocs-ui/provider/base";
import { Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { components } from "@/lib/component-catalog";
import { cn } from "@/lib/utils";

function GitHubLink() {
  return (
    <a
      href="https://github.com/arjayby/a1ui"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View a1ui on GitHub (opens in a new tab)"
      title="View on GitHub"
      className="hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-sm"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.087-.744.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.334-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.52 11.52 0 0 1 3-.404c1.02.005 2.045.138 3 .404 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    </a>
  );
}

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      className="hover:bg-muted flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
    </button>
  );
}

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
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="w-fit font-bold no-underline">
          a1ui
        </Link>
        <div className="flex items-center gap-1">
          <GitHubLink />
          <ThemeButton />
        </div>
      </div>
      <div className="mt-6">
        <SearchButton />
      </div>
      <nav aria-label="Guides" className="mt-8">
        <p className="mb-3 font-bold">Get started</p>
        <Link
          href="/agents"
          aria-current={pathname === "/agents" ? "page" : undefined}
          className="hover:bg-muted aria-[current=page]:bg-foreground aria-[current=page]:text-background block rounded-sm px-2 py-1.5 no-underline"
        >
          Install with an agent
        </Link>
      </nav>
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
        Choose documentation
      </label>
      <select
        id="component-select"
        value={pathname.startsWith("/components/") || pathname === "/agents" ? pathname : "/"}
        className="border-border bg-background max-w-44 min-w-0 rounded-sm border px-2 py-1.5"
        onChange={(event) => router.push(event.target.value)}
      >
        <option value="/">Components</option>
        <option value="/agents">Install with an agent</option>
        {components.map((component) => (
          <option key={component.slug} value={`/components/${component.slug}`}>
            {component.title}
          </option>
        ))}
      </select>
      <SearchButton compact />
      <GitHubLink />
      <ThemeButton />
    </header>
  );
}
