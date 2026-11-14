import type { ComponentType } from "react";

import { SectionRailDemo, SpiralTextDemo } from "@/components/block-demos";
import { ActivityPillDemo } from "@/components/block-demos/activity-pill-demo";
import { ArcReelDemo } from "@/components/block-demos/arc-reel-demo";
import { AsciiLensDemo } from "@/components/block-demos/ascii-lens-demo";
import { AsciiMorphDemo } from "@/components/block-demos/ascii-morph-demo";
import { AsciiTerrainDemo } from "@/components/block-demos/ascii-terrain-demo";
import { CommandPaletteDemo } from "@/components/block-demos/command-palette-demo";
import { CondensingHeaderDemo } from "@/components/block-demos/condensing-header-demo";
import { ParticleMenuDemo } from "@/components/block-demos/particle-menu-demo";
import { ShapeFlowDemo } from "@/components/block-demos/shape-flow-demo";
import { TaskStepsDemo } from "@/components/block-demos/task-steps-demo";
import { TextBannerDemo } from "@/components/block-demos/text-banner-demo";
import { TextScrambleDemo } from "@/components/block-demos/text-scramble-demo";
import { AccordionDemo } from "@/components/component-demos/accordion-demo";
import { AlertDialogDemo } from "@/components/component-demos/alert-dialog-demo";
import { AvatarGroupDemo } from "@/components/component-demos/avatar-group-demo";
import { BadgeDemo } from "@/components/component-demos/badge-demo";
import { BreadcrumbDemo } from "@/components/component-demos/breadcrumb-demo";
import { CheckboxDemo } from "@/components/component-demos/checkbox-demo";
import { ChipGroupDemo } from "@/components/component-demos/chip-group-demo";
import { ConfirmButtonDemo } from "@/components/component-demos/confirm-button-demo";
import { ContextMenuDemo } from "@/components/component-demos/context-menu-demo";
import { CopyButtonDemo } from "@/components/component-demos/copy-button-demo";
import { DialogDemo } from "@/components/component-demos/dialog-demo";
import { DropdownMenuDemo } from "@/components/component-demos/dropdown-menu-demo";
import { HoverCardDemo } from "@/components/component-demos/hover-card-demo";
import { IconToggleDemo } from "@/components/component-demos/icon-toggle-demo";
import { KbdDemo } from "@/components/component-demos/kbd-demo";
import { LightboxDemo } from "@/components/component-demos/lightbox-demo";
import { LoaderDemo } from "@/components/component-demos/loader-demo";
import { LoadingButtonDemo } from "@/components/component-demos/loading-button-demo";
import { MenuDemo } from "@/components/component-demos/menu-demo";
import { OtpInputDemo } from "@/components/component-demos/otp-input-demo";
import { PaginationDemo } from "@/components/component-demos/pagination-demo";
import { PasswordInputDemo } from "@/components/component-demos/password-input-demo";
import { PopoverDemo } from "@/components/component-demos/popover-demo";
import { RadioGroupDemo } from "@/components/component-demos/radio-group-demo";
import { RollingNumberDemo } from "@/components/component-demos/rolling-number-demo";
import { SegmentedControlDemo } from "@/components/component-demos/segmented-control-demo";
import { SelectDemo } from "@/components/component-demos/select-demo";
import { SheetDemo } from "@/components/component-demos/sheet-demo";
import { SkeletonDemo } from "@/components/component-demos/skeleton-demo";
import { SliderDemo } from "@/components/component-demos/slider-demo";
import { SwipeRowDemo } from "@/components/component-demos/swipe-row-demo";
import { SwitchDemo } from "@/components/component-demos/switch-demo";
import { TabsDemo } from "@/components/component-demos/tabs-demo";
import { TagInputDemo } from "@/components/component-demos/tag-input-demo";
import { ToastDemo } from "@/components/component-demos/toast-demo";
import { TooltipDemo } from "@/components/component-demos/tooltip-demo";
import { ValidatedInputDemo } from "@/components/component-demos/validated-input-demo";
import { WheelPickerDemo } from "@/components/component-demos/wheel-picker-demo";

export type CatalogGroup = "components" | "blocks";

/** The docs demo for every catalog entry. The catalog cards show these same demos. */
export const catalogDemos: Record<CatalogGroup, Record<string, ComponentType>> = {
  components: {
    accordion: AccordionDemo,
    "alert-dialog": AlertDialogDemo,
    "avatar-group": AvatarGroupDemo,
    badge: BadgeDemo,
    breadcrumb: BreadcrumbDemo,
    checkbox: CheckboxDemo,
    "chip-group": ChipGroupDemo,
    "confirm-button": ConfirmButtonDemo,
    "context-menu": ContextMenuDemo,
    "copy-button": CopyButtonDemo,
    dialog: DialogDemo,
    "dropdown-menu": DropdownMenuDemo,
    "hover-card": HoverCardDemo,
    "icon-toggle": IconToggleDemo,
    kbd: KbdDemo,
    lightbox: LightboxDemo,
    loader: LoaderDemo,
    "loading-button": LoadingButtonDemo,
    menu: MenuDemo,
    "otp-input": OtpInputDemo,
    pagination: PaginationDemo,
    "password-input": PasswordInputDemo,
    popover: PopoverDemo,
    "radio-group": RadioGroupDemo,
    "rolling-number": RollingNumberDemo,
    "segmented-control": SegmentedControlDemo,
    select: SelectDemo,
    sheet: SheetDemo,
    skeleton: SkeletonDemo,
    slider: SliderDemo,
    "swipe-row": SwipeRowDemo,
    switch: SwitchDemo,
    tabs: TabsDemo,
    "tag-input": TagInputDemo,
    toast: ToastDemo,
    tooltip: TooltipDemo,
    "validated-input": ValidatedInputDemo,
    "wheel-picker": WheelPickerDemo,
  },
  blocks: {
    "activity-pill": ActivityPillDemo,
    "arc-reel": ArcReelDemo,
    "ascii-lens": AsciiLensDemo,
    "ascii-morph": AsciiMorphDemo,
    "ascii-terrain": AsciiTerrainDemo,
    "command-palette": CommandPaletteDemo,
    "condensing-header": CondensingHeaderDemo,
    "particle-menu": ParticleMenuDemo,
    "section-rail": SectionRailDemo,
    "shape-flow": ShapeFlowDemo,
    "spiral-text": SpiralTextDemo,
    "task-steps": TaskStepsDemo,
    "text-banner": TextBannerDemo,
    "text-scramble": TextScrambleDemo,
  },
};

/**
 * How to bring a demo's main content on screen when it stays hidden until someone
 * interacts with it. Each entry repeats the gesture a visitor would make on the docs
 * page, so the card shows the real component in its open state.
 */
export type CatalogReveal = {
  /** The element the gesture lands on, looked up inside the demo. */
  target: string;
  gesture: "click" | "hover" | "context-menu";
  /** Repeat the gesture on this interval, for content that leaves by itself. */
  everyMs?: number;
  /** Sit the demo at the top of its frame, for content that opens downwards from its trigger. */
  place?: "top";
};

/**
 * Entries whose main content opens over the page: a dialog, a sheet, a menu, a toast.
 * Each gets a frame of its own inside its card, so its overlay, scroll lock and focus
 * stay inside the card instead of taking over the catalog.
 */
export const catalogReveals: Record<CatalogGroup, Record<string, CatalogReveal>> = {
  components: {
    "alert-dialog": { target: '[data-slot="alert-dialog-trigger"]', gesture: "click" },
    "context-menu": { target: '[data-slot="context-menu-trigger"]', gesture: "context-menu", place: "top" },
    dialog: { target: '[data-slot="dialog-trigger"]', gesture: "click" },
    "dropdown-menu": { target: ".demo-frame button", gesture: "click", place: "top" },
    "hover-card": { target: '[data-slot="hover-card-trigger"]', gesture: "hover" },
    lightbox: { target: '[data-slot="lightbox-thumbnail"]', gesture: "click" },
    popover: { target: '[data-slot="popover-trigger"]', gesture: "click" },
    select: { target: '.component-demo-stage [data-slot="select-trigger"]', gesture: "click" },
    sheet: { target: '[data-slot="sheet-trigger"]', gesture: "click" },
    toast: { target: ".component-demo-stage button", gesture: "click", everyMs: 4000 },
    tooltip: { target: '[data-slot="tooltip-trigger"]', gesture: "hover" },
  },
  blocks: {
    "activity-pill": { target: ".component-demo-stage button", gesture: "click", everyMs: 9000 },
    "command-palette": { target: '[data-slot="command-palette-trigger"]', gesture: "click" },
  },
};
