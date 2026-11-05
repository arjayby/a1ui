import type { Metadata } from "next";
import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { MenuPreview } from "@/components/component-demos/menu-demo";
import { DropdownMenuPreview } from "@/components/component-demos/dropdown-menu-demo";
import { ConfirmButtonPreview } from "@/components/component-demos/confirm-button-demo";
import { CopyButton } from "@/registry/components/copy-button";
import { IconToggle } from "@/registry/components/icon-toggle";
import { SwitchPreview } from "@/components/component-demos/switch-demo";
import { CheckboxPreview } from "@/components/component-demos/checkbox-demo";
import { TabsPreview } from "@/components/component-demos/tabs-demo";
import { RadioGroupPreview } from "@/components/component-demos/radio-group-demo";
import { ToggleGroupPreview } from "@/components/component-demos/toggle-group-demo";
import { AccordionPreview } from "@/components/component-demos/accordion-demo";
import { ProgressPreview } from "@/components/component-demos/progress-demo";
import { DialogPreview } from "@/components/component-demos/dialog-demo";
import { AlertDialogPreview } from "@/components/component-demos/alert-dialog-demo";
import { DrawerPreview } from "@/components/component-demos/drawer-demo";
import { ToastPreview } from "@/components/component-demos/toast-demo";
import { TooltipPreview } from "@/components/component-demos/tooltip-demo";
import { HoverCardPreview } from "@/components/component-demos/hover-card-demo";
import { PopoverPreview } from "@/components/component-demos/popover-demo";
import { SelectPreview } from "@/components/component-demos/select-demo";
import { CommandPreview } from "@/components/component-demos/command-demo";
import { AvatarGroupPreview } from "@/components/component-demos/avatar-group-demo";
import { BadgePreview } from "@/components/component-demos/badge-demo";
import { PaginationPreview } from "@/components/component-demos/pagination-demo";
import { NavigationMenuPreview } from "@/components/component-demos/navigation-menu-demo";
import { KbdPreview } from "@/components/component-demos/kbd-demo";
import { SkeletonPreview } from "@/components/component-demos/skeleton-demo";
import { TextareaPreview } from "@/components/component-demos/textarea-demo";
import { LoadingButtonPreview } from "@/components/component-demos/loading-button-demo";
import { SliderPreview } from "@/components/component-demos/slider-demo";
import { OtpInputPreview } from "@/components/component-demos/otp-input-demo";
import { ValidatedInputPreview } from "@/components/component-demos/validated-input-demo";
import { TagInputPreview } from "@/components/component-demos/tag-input-demo";
import { PasswordInputPreview } from "@/components/component-demos/password-input-demo";
import { components } from "@/lib/component-catalog";

export const metadata: Metadata = {
  title: "Components",
  description: "Animated components built with Motion, with live previews and editable source.",
  alternates: { canonical: "/components" },
};

const previews: Record<string, ReactNode> = {
  "dropdown-menu": <DropdownMenuPreview />,
  menu: <MenuPreview />,
  "confirm-button": <ConfirmButtonPreview />,
  "copy-button": <CopyButton value="hello@a1ui.dev" />,
  "icon-toggle": <IconToggle label="Dark mode" />,
  switch: <SwitchPreview />,
  checkbox: <CheckboxPreview />,
  tabs: <TabsPreview />,
  "radio-group": <RadioGroupPreview />,
  "toggle-group": <ToggleGroupPreview />,
  accordion: <AccordionPreview />,
  progress: <ProgressPreview />,
  dialog: <DialogPreview />,
  "alert-dialog": <AlertDialogPreview />,
  drawer: <DrawerPreview />,
  toast: <ToastPreview />,
  tooltip: <TooltipPreview />,
  "hover-card": <HoverCardPreview />,
  popover: <PopoverPreview />,
  select: <SelectPreview />,
  command: <CommandPreview />,
  "avatar-group": <AvatarGroupPreview />,
  badge: <BadgePreview />,
  pagination: <PaginationPreview />,
  "navigation-menu": <NavigationMenuPreview />,
  kbd: <KbdPreview />,
  skeleton: <SkeletonPreview />,
  textarea: <TextareaPreview />,
  "loading-button": <LoadingButtonPreview />,
  slider: <SliderPreview />,
  "otp-input": <OtpInputPreview />,
  "validated-input": <ValidatedInputPreview />,
  "tag-input": <TagInputPreview />,
  "password-input": <PasswordInputPreview />,
};

export default function ComponentsPage() {
  return (
    <div className="page-frame">
      <header>
        <p className="graphite-eyebrow">a1ui / Component library</p>
        <h1 className="page-heading">Components</h1>
        <p className="page-description">
          Animated components built with Motion, with live previews and editable source.
        </p>
      </header>
      <div className="catalog-grid">
        {components.map((component) => (
          <Card key={component.slug} role="article" className="catalog-card">
            <div inert aria-hidden="true" className="catalog-preview flex items-center justify-center">
              {previews[component.slug]}
            </div>
            <CardContent className="catalog-card-content">
              <h2 className="ui-card-title">
                <Link href={`/components/${component.slug}`} className="catalog-card-link">
                  {component.title}
                  <ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0" />
                </Link>
              </h2>
              <CardDescription>{component.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
