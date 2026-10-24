"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { useTheme } from "fumadocs-ui/provider/base";
import { GithubLogoIcon, MoonIcon, MagnifyingGlassIcon, SunIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import registry from "../../registry.json";

function GitHubLink() {
  return (
    <a
      href="https://github.com/arjayby/a1ui"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View a1ui on GitHub (opens in a new tab)"
      title="View on GitHub"
      className="ui-button hidden sm:inline-flex"
      data-variant="ghost"
      data-size="icon"
    >
      <GithubLogoIcon aria-hidden="true" className="size-4" weight="fill" />
    </a>
  );
}

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <MoonIcon aria-hidden="true" className="size-4 dark:hidden" />
      <SunIcon aria-hidden="true" className="hidden size-4 dark:block" />
    </Button>
  );
}

function SearchButton() {
  const { setOpenSearch } = useSearchContext();
  const { setOpenMobile } = useSidebar();

  return (
    <Button
      variant="secondary"
      aria-label="Search documentation"
      className="text-muted-foreground w-9 justify-center px-0 sm:w-56 sm:justify-between sm:px-3"
      onClick={() => {
        setOpenMobile(false);
        setOpenSearch(true);
      }}
    >
      <span className="flex items-center gap-2">
        <MagnifyingGlassIcon aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Search...</span>
      </span>
      <kbd className="hidden text-xs sm:inline">⌘ K</kbd>
    </Button>
  );
}

export function DocsHeader() {
  const pathname = usePathname();
  const item = registry.items.find(
    ({ name, type }) => pathname === `/${type === "registry:block" ? "blocks" : "components"}/${name}`,
  );
  const group = item?.type === "registry:component" ? "Components" : "Blocks";
  const title =
    item?.title ??
    (pathname === "/agents" ? "Install with an agent" : pathname === "/components" ? "Components" : "Blocks");

  return (
    <header className="bg-background border-border sticky top-0 z-20 flex min-h-14 shrink-0 items-center gap-2 border-b px-3 md:rounded-t-2xl md:px-4">
      <SidebarTrigger className="shrink-0" />
      <Separator orientation="vertical" className="mr-1 min-h-4 self-center" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap gap-2 text-xs">
          <BreadcrumbItem className="hidden md:inline-flex">
            <BreadcrumbLink render={<Link href="/" />}>Documentation</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          {item ? (
            <>
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink render={<Link href={group === "Components" ? "/components" : "/blocks"} />}>
                  {group}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
            </>
          ) : null}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex shrink-0 items-center gap-1">
        <SearchButton />
        <GitHubLink />
        <ThemeButton />
      </div>
    </header>
  );
}
