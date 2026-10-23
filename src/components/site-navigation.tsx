"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { useTheme } from "fumadocs-ui/provider/base";
import { GithubLogoIcon, MoonIcon, MagnifyingGlassIcon, SunIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { blocks, newBlockCount } from "@/lib/block-catalog";
import { cn } from "@/lib/utils";

function GitHubLink() {
  return (
    <a
      href="https://github.com/arjayby/a1ui"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View a1ui on GitHub (opens in a new tab)"
      title="View on GitHub"
      className="hover:bg-muted flex size-11 shrink-0 items-center justify-center rounded-sm"
    >
      <GithubLogoIcon aria-hidden="true" className="size-4" weight="fill" />
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
      className="hover:bg-muted flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <MoonIcon aria-hidden="true" className="size-4 dark:hidden" />
      <SunIcon aria-hidden="true" className="hidden size-4 dark:block" />
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
          ? "hover:bg-muted flex size-11 shrink-0 items-center justify-center rounded-sm"
          : "border-border hover:border-foreground flex min-h-11 w-full items-center justify-between rounded-sm border px-2.5 py-2 text-left",
      )}
      onClick={() => setOpenSearch(true)}
    >
      <span className={cn(compact && "sr-only")}>Search...</span>
      {compact ? (
        <MagnifyingGlassIcon aria-hidden="true" className="size-4" />
      ) : (
        <kbd className="text-muted-foreground">⌘ K</kbd>
      )}
    </button>
  );
}

export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <aside className="border-border sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r px-5 py-7 md:flex">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex min-h-11 min-w-11 items-center font-semibold no-underline">
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
        <p className="mb-3 font-semibold">Get started</p>
        <Link
          href="/agents"
          aria-current={pathname === "/agents" ? "page" : undefined}
          className="hover:bg-muted aria-[current=page]:bg-foreground aria-[current=page]:text-background block rounded-sm px-2 py-3 no-underline"
        >
          Install with an agent
        </Link>
      </nav>
      <nav aria-label="Components" className="mt-8">
        <Link
          href="/components"
          aria-current={pathname === "/components" ? "page" : undefined}
          className="hover:bg-muted aria-[current=page]:bg-foreground aria-[current=page]:text-background block rounded-sm px-2 py-3 font-semibold no-underline"
        >
          Components
        </Link>
      </nav>
      <nav aria-label="Blocks" className="mt-8">
        <Link
          href="/blocks"
          aria-current={pathname === "/blocks" || pathname === "/" ? "page" : undefined}
          className="hover:bg-muted aria-[current=page]:bg-foreground aria-[current=page]:text-background mb-3 block rounded-sm px-2 py-3 font-semibold no-underline"
        >
          Blocks
        </Link>
        <ul className="flex list-none flex-col gap-1 p-0">
          {blocks.map((block) => {
            const href = `/blocks/${block.slug}`;
            const current = pathname === href;

            return (
              <li key={block.slug}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  aria-description={block.isNew ? "New block shipped" : undefined}
                  className="hover:bg-muted aria-[current=page]:bg-foreground aria-[current=page]:text-background flex items-center justify-between gap-2 rounded-sm px-2 py-3 no-underline"
                >
                  {block.title}
                  {block.isNew ? <Badge variant="dot" aria-hidden="true" /> : null}
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
  const newBlockLabel = `${newBlockCount} new block${newBlockCount === 1 ? "" : "s"} shipped`;

  return (
    <header className="bg-background border-border sticky top-0 z-20 flex items-center gap-1 border-b px-3 py-2 md:hidden">
      <Link
        href="/"
        className="mr-auto inline-flex min-h-11 min-w-11 items-center font-semibold no-underline"
      >
        a1ui
      </Link>
      <label className="sr-only" htmlFor="documentation-select">
        Choose documentation
      </label>
      <div className="relative min-w-0">
        <select
          id="documentation-select"
          value={pathname === "/" ? "/blocks" : pathname}
          className="border-border bg-background min-h-11 w-full max-w-32 min-w-0 rounded-sm border px-2 py-3 text-xs"
          onChange={(event) => router.push(event.target.value)}
        >
          <option value="/components">Components</option>
          <option value="/blocks">Blocks</option>
          <option value="/agents">Install with an agent</option>
          <optgroup label="Blocks">
            {blocks.map((block) => (
              <option
                key={block.slug}
                value={`/blocks/${block.slug}`}
                aria-label={block.isNew ? `${block.title}, new block shipped` : undefined}
              >
                {block.title}
                {block.isNew ? " ●" : ""}
              </option>
            ))}
          </optgroup>
        </select>
        {newBlockCount > 0 ? (
          <Badge className="pointer-events-none absolute -top-1.5 right-1.5" title={newBlockLabel}>
            <span aria-hidden="true">{newBlockCount}</span>
            <span className="sr-only">{newBlockLabel}</span>
          </Badge>
        ) : null}
      </div>
      <SearchButton compact />
      <GitHubLink />
      <ThemeButton />
    </header>
  );
}
