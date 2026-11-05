"use client";

import {
  BookOpenIcon,
  BuildingsIcon,
  ChartLineIcon,
  CubeIcon,
  DatabaseIcon,
  GraduationCapIcon,
  LifebuoyIcon,
  LightningIcon,
  NewspaperIcon,
  RocketIcon,
  ShieldCheckIcon,
  StorefrontIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { useState, type MouseEvent, type ReactNode } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  type NavigationMenuProps,
} from "@/registry/components/navigation-menu";

type Align = NonNullable<NavigationMenuProps["align"]>;
// Both alignments keep every section inside the demo frame at desktop widths.
const aligns: Align[] = ["center", "start"];

const products = [
  { icon: LightningIcon, title: "Edge Functions", text: "Run code next to your users." },
  { icon: DatabaseIcon, title: "Postgres", text: "Serverless SQL that scales to zero." },
  { icon: ChartLineIcon, title: "Analytics", text: "Real-time traffic and vitals." },
  { icon: ShieldCheckIcon, title: "Firewall", text: "Block bots before they land." },
];

const solutions = [
  { icon: RocketIcon, title: "Startups", text: "Ship fast on a free tier." },
  { icon: BuildingsIcon, title: "Enterprise", text: "SSO, audit logs, and SLAs." },
  { icon: StorefrontIcon, title: "Commerce", text: "Storefronts that stay up." },
  { icon: UsersIcon, title: "Agencies", text: "One team, many clients." },
  { icon: CubeIcon, title: "Platforms", text: "Multi-tenant by default." },
  { icon: GraduationCapIcon, title: "Education", text: "Discounts for students." },
];

const resources = [
  { icon: BookOpenIcon, title: "Documentation" },
  { icon: NewspaperIcon, title: "Changelog" },
  { icon: LifebuoyIcon, title: "Support" },
];

// The demo links go nowhere, so keep the docs page where it is.
const stay = (event: MouseEvent) => event.preventDefault();

function DemoLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <NavigationMenuLink href="#" closeOnClick onClick={stay} className={className}>
      {children}
    </NavigationMenuLink>
  );
}

// Four top-level items wrap onto two rows on a phone, and an open panel would cover the second.
// A smaller size there keeps Resources on the first row.
const phoneSize = "max-sm:text-xs";

function SiteNavigation(props: Omit<NavigationMenuProps, "children">) {
  return (
    <NavigationMenu aria-label="Main" {...props}>
      <NavigationMenuList>
        <NavigationMenuItem value="products">
          <NavigationMenuTrigger className={phoneSize}>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-1 sm:w-[23rem] sm:grid-cols-2">
              {products.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <DemoLink className="flex gap-3">
                    <span className="border-border bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border">
                      <Icon aria-hidden="true" className="size-4.5" />
                    </span>
                    <span>
                      <span className="block font-medium">{title}</span>
                      <span className="text-muted-foreground block text-xs">{text}</span>
                    </span>
                  </DemoLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="solutions">
          <NavigationMenuTrigger className={phoneSize}>Solutions</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-x-2 sm:w-[24rem] sm:grid-cols-2">
              {solutions.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <DemoLink className="flex items-start gap-2.5 py-2">
                    <Icon aria-hidden="true" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="block font-medium">{title}</span>
                      <span className="text-muted-foreground block text-xs">{text}</span>
                    </span>
                  </DemoLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="resources">
          <NavigationMenuTrigger className={phoneSize}>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid sm:w-52">
              {resources.map(({ icon: Icon, title }) => (
                <li key={title}>
                  <DemoLink className="flex items-center gap-2.5 py-2">
                    <Icon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                    {title}
                  </DemoLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="pricing">
          <NavigationMenuLink href="#" onClick={stay} className={phoneSize}>
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export function NavigationMenuPreview() {
  return (
    <div className="flex flex-col items-center gap-2">
      <NavigationMenu aria-label="Main" duration={0}>
        <NavigationMenuList className="flex-nowrap">
          {["Products", "Solutions"].map((label) => (
            <NavigationMenuItem key={label}>
              <NavigationMenuTrigger>{label}</NavigationMenuTrigger>
            </NavigationMenuItem>
          ))}
          <NavigationMenuItem>
            <NavigationMenuLink href="#">Pricing</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      {/* The catalog card is inert, so sketch the open panel instead of opening a real one. */}
      <div className="border-border bg-background grid w-60 grid-cols-2 gap-1 rounded-xl border p-1.5 shadow-lg">
        {products.map(({ icon: Icon, title }) => (
          <div key={title} className="flex items-center gap-2 rounded-md p-1.5 text-xs whitespace-nowrap">
            <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded">
              <Icon aria-hidden="true" className="size-3.5" />
            </span>
            {title.replace("Edge ", "")}
          </div>
        ))}
      </div>
    </div>
  );
}

export function NavigationMenuDemo() {
  const [align, setAlign] = useState<Align>("center");
  const [duration, setDuration] = useState(0.35);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage min-h-[24rem]! items-start!">
        <header className="border-border flex w-full max-w-2xl flex-col items-center gap-2 border-b pb-3 sm:flex-row sm:justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true" className="bg-foreground size-4 rounded-full" />
            Northwind
          </span>
          <SiteNavigation align={align} duration={duration} />
          <span aria-hidden="true" className="hidden w-24 sm:block" />
        </header>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Align" value={align} options={aligns} onChange={setAlign} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
