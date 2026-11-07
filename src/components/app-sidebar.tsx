"use client";

import { CaretRightIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

  // Categories start closed, and the one holding the current page opens on every navigation, so
  // the sidebar always shows where you are. Others keep whatever state the reader gave them.
  const currentCategory = componentCategories.find((category) =>
    category.components.some(({ slug }) => pathname === `/components/${slug}`),
  )?.title;
  const [openCategories, setOpenCategories] = useState<string[]>(currentCategory ? [currentCategory] : []);
  const [revealed, setRevealed] = useState(currentCategory);
  if (currentCategory !== revealed) {
    setRevealed(currentCategory);
    if (currentCategory && !openCategories.includes(currentCategory))
      setOpenCategories([...openCategories, currentCategory]);
  }

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
                  <span>Install with an agent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </nav>
        <nav aria-label="Components">
          <SidebarGroup className="py-1">
            <SidebarGroupLabel className="h-6">Components</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
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
                  <span>All components</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {componentCategories.map((category) => (
                <Collapsible
                  key={category.title}
                  open={openCategories.includes(category.title)}
                  onOpenChange={(open) =>
                    setOpenCategories((current) =>
                      open
                        ? [...current, category.title]
                        : current.filter((title) => title !== category.title),
                    )
                  }
                  render={<SidebarMenuItem />}
                >
                  {/* A category only discloses its components, so it stays out of the menu's
                      highlight: clicking it opens the group without marking it as the selection. */}
                  <SidebarMenuButton
                    size="sm"
                    render={<CollapsibleTrigger />}
                    className="[&[data-panel-open]>svg]:rotate-90"
                  >
                    <CaretRightIcon aria-hidden="true" className="transition-transform" />
                    <span className="flex-1">{category.title}</span>
                  </SidebarMenuButton>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mr-0 pr-0">
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
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </nav>
        <nav aria-label="Blocks">
          <SidebarGroup className="py-1">
            <SidebarGroupLabel className="h-6">Blocks</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
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
                  <span>All blocks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {blocks.map((block) => {
                const href = `/blocks/${block.slug}`;
                const current = pathname === href;
                return (
                  <SidebarMenuItem key={block.slug}>
                    <SidebarMenuButton
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
                      {block.isNew ? <Badge variant="dot" className="size-1.5" aria-hidden="true" /> : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
