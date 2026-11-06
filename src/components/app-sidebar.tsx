"use client";

import { BookOpenIcon, CaretRightIcon, CubeIcon, SquaresFourIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Menu, MenuItem } from "@/registry/components/menu";
import { blocks } from "@/lib/block-catalog";
import { componentCategories } from "@/lib/component-catalog";

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const closeMobile = () => setOpenMobile(false);

  useEffect(() => {
    const closeOnSearch = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) setOpenMobile(false);
    };
    window.addEventListener("keydown", closeOnSearch);
    return () => window.removeEventListener("keydown", closeOnSearch);
  }, [setOpenMobile]);

  return (
    <Sidebar variant="inset" className="docs-sidebar">
      <SidebarHeader className="gap-4 px-3 py-4">
        <div className="flex items-center justify-between px-2">
          <Link href="/" onClick={closeMobile} className="flex min-h-11 items-center gap-2 no-underline">
            <span className="brand-mark" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="font-heading text-lg leading-6 font-medium">a1ui</span>
              <span className="text-muted-foreground text-xs">Documentation</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={closeMobile}
            aria-label="Close documentation navigation"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      </SidebarHeader>
      <Menu
        value={pathname}
        data-slot="sidebar-content"
        data-sidebar="content"
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto"
      >
        <nav aria-label="Guides">
          <SidebarGroup className="py-1">
            <SidebarGroupLabel className="h-6">Get started</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="sm"
                  isActive={pathname === "/agents"}
                  render={
                    <MenuItem
                      value="/agents"
                      render={
                        <Link
                          href="/agents"
                          onClick={closeMobile}
                          aria-current={pathname === "/agents" ? "page" : undefined}
                        />
                      }
                    />
                  }
                >
                  <BookOpenIcon aria-hidden="true" />
                  <span>Install with an agent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </nav>
        <nav aria-label="Library">
          <SidebarGroup className="py-1">
            <SidebarGroupLabel className="h-6">Library</SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible defaultOpen render={<SidebarMenuItem />}>
                <SidebarMenuButton
                  size="sm"
                  isActive={pathname === "/components"}
                  render={
                    <MenuItem
                      value="/components"
                      render={
                        <Link
                          href="/components"
                          onClick={closeMobile}
                          aria-current={pathname === "/components" ? "page" : undefined}
                        />
                      }
                    />
                  }
                >
                  <SquaresFourIcon aria-hidden="true" />
                  <span>Components</span>
                </SidebarMenuButton>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction
                      aria-label="Toggle component navigation"
                      className="data-panel-open:rotate-90"
                    />
                  }
                >
                  <CaretRightIcon aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="mr-0 gap-3 border-l-0 pr-0">
                    {componentCategories.map((category) => {
                      const labelId = `component-category-${category.title.replace(/\W+/g, "-").toLowerCase()}`;
                      return (
                        <Collapsible
                          key={category.title}
                          defaultOpen
                          render={<li />}
                          className="flex flex-col gap-1"
                        >
                          <CollapsibleTrigger
                            id={labelId}
                            className="text-sidebar-foreground/60 hover:text-sidebar-foreground focus-visible:ring-sidebar-ring flex h-6 w-full items-center justify-between rounded-md px-2 text-[11px] font-medium outline-hidden transition-colors focus-visible:ring-2 [&[data-panel-open]>svg]:rotate-90"
                          >
                            {category.title}
                            <CaretRightIcon aria-hidden="true" className="size-3 transition-transform" />
                          </CollapsibleTrigger>
                          <CollapsibleContent
                            render={<ul aria-labelledby={labelId} />}
                            className="flex flex-col gap-1"
                          >
                            {category.components.map((component) => {
                              const href = `/components/${component.slug}`;
                              const current = pathname === href;
                              return (
                                <SidebarMenuSubItem key={component.slug}>
                                  <SidebarMenuSubButton
                                    size="sm"
                                    isActive={current}
                                    render={
                                      <MenuItem
                                        value={href}
                                        render={
                                          <Link
                                            href={href}
                                            onClick={closeMobile}
                                            aria-current={current ? "page" : undefined}
                                          />
                                        }
                                      />
                                    }
                                  >
                                    <span>{component.title}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen render={<SidebarMenuItem />}>
                <SidebarMenuButton
                  size="sm"
                  isActive={pathname === "/blocks"}
                  render={
                    <MenuItem
                      value="/blocks"
                      render={
                        <Link
                          href="/blocks"
                          onClick={closeMobile}
                          aria-current={pathname === "/blocks" ? "page" : undefined}
                        />
                      }
                    />
                  }
                >
                  <CubeIcon aria-hidden="true" />
                  <span>Blocks</span>
                </SidebarMenuButton>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction
                      aria-label="Toggle block navigation"
                      className="data-panel-open:rotate-90"
                    />
                  }
                >
                  <CaretRightIcon aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="mr-0 border-l-0 pr-0">
                    {blocks.map((block) => {
                      const href = `/blocks/${block.slug}`;
                      const current = pathname === href;
                      return (
                        <SidebarMenuSubItem key={block.slug}>
                          <SidebarMenuSubButton
                            size="sm"
                            isActive={current}
                            render={
                              <MenuItem
                                value={href}
                                render={
                                  <Link
                                    href={href}
                                    onClick={closeMobile}
                                    aria-current={current ? "page" : undefined}
                                    aria-description={block.isNew ? "New block shipped" : undefined}
                                  />
                                }
                              />
                            }
                          >
                            <span className="flex-1">{block.title}</span>
                            {block.isNew ? (
                              <Badge variant="dot" className="size-1.5" aria-hidden="true" />
                            ) : null}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </Menu>
      <SidebarFooter className="text-muted-foreground px-5 py-4 text-xs">
        React components and ready-made blocks
      </SidebarFooter>
    </Sidebar>
  );
}
