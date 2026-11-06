"use client";

import {
  ArrowUpIcon,
  FileCssIcon,
  FileIcon,
  FileHtmlIcon,
  FileJpgIcon,
  FileMdIcon,
  FilePdfIcon,
  FileSvgIcon,
  FileTsIcon,
  FileTsxIcon,
  FileTxtIcon,
  FileXlsIcon,
  FolderIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Breadcrumb, type BreadcrumbSegment } from "@/registry/components/breadcrumb";
import { Menu, MenuItem } from "@/registry/components/menu";

type Folder = { name: string; children?: Folder[] };

const root: Folder = {
  name: "Home",
  children: [
    {
      name: "Projects",
      children: [
        {
          name: "a1ui",
          children: [
            {
              name: "src",
              children: [
                {
                  name: "registry",
                  children: [
                    {
                      name: "components",
                      children: [{ name: "breadcrumb.tsx" }, { name: "tabs.tsx" }, { name: "select.tsx" }],
                    },
                    { name: "blocks", children: [{ name: "section-rail.tsx" }] },
                    { name: "utils.ts" },
                  ],
                },
                {
                  name: "app",
                  children: [{ name: "layout.tsx" }, { name: "page.tsx" }, { name: "globals.css" }],
                },
              ],
            },
            { name: "public", children: [{ name: "llms.txt" }, { name: "logo.svg" }] },
            { name: "README.md" },
          ],
        },
        {
          name: "Website",
          children: [{ name: "index.html" }, { name: "styles.css" }, { name: "hero.jpg" }],
        },
      ],
    },
    {
      name: "Documents",
      children: [{ name: "Invoices", children: [{ name: "2026.pdf" }, { name: "totals.xlsx" }] }],
    },
  ],
};

const fileIcons: Record<string, Icon> = {
  css: FileCssIcon,
  html: FileHtmlIcon,
  jpg: FileJpgIcon,
  md: FileMdIcon,
  pdf: FilePdfIcon,
  svg: FileSvgIcon,
  ts: FileTsIcon,
  tsx: FileTsxIcon,
  txt: FileTxtIcon,
  xlsx: FileXlsIcon,
};

const iconFor = (name: string) => fileIcons[name.split(".").pop()!.toLowerCase()] ?? FileIcon;

type Collapse = "4 items" | "3 items" | "fit only";
const collapses: Collapse[] = ["4 items", "3 items", "fit only"];
const maxItemsFor: Record<Collapse, number | undefined> = {
  "4 items": 4,
  "3 items": 3,
  "fit only": undefined,
};

function trailFor(path: string[]) {
  const folders: Folder[] = [root];
  for (const name of path) {
    const next = folders.at(-1)!.children?.find((child) => child.name === name);
    if (!next) break;
    folders.push(next);
  }
  return folders;
}

const hrefFor = (folders: Folder[], depth: number) =>
  `#/${folders
    .slice(1, depth + 1)
    .map((folder) => folder.name)
    .join("/")}`;

export function BreadcrumbPreview() {
  // The card centers its preview, so the trail sizes to its content and collapses by count only.
  return (
    <div className="w-fit">
      <Breadcrumb
        maxItems={3}
        collapseToFit={false}
        items={[
          { label: "Home", href: "#" },
          { label: "Projects", href: "#" },
          { label: "a1ui", href: "#" },
          { label: "Breadcrumb" },
        ]}
      />
    </div>
  );
}

const row =
  "focus-visible:ring-ring/30 flex items-center gap-2 px-2.5 py-1.5 text-left text-sm outline-none focus-visible:ring-3";

export function BreadcrumbDemo() {
  const [path, setPath] = useState(["Projects", "a1ui", "src", "registry", "components"]);
  const [collapse, setCollapse] = useState<Collapse>("4 items");
  const [duration, setDuration] = useState(0.3);
  const [hovered, setHovered] = useState<string | null>(null);
  const navigate = (next: string[]) => {
    setPath(next);
    setHovered(null);
  };
  const folders = trailFor(path);
  const current = folders.at(-1)!;
  const items: BreadcrumbSegment[] = folders.map((folder, depth) => ({
    key: hrefFor(folders, depth),
    label: folder.name,
    href: hrefFor(folders, depth),
  }));

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="flex w-full max-w-lg flex-col gap-4 px-4">
          <Breadcrumb
            key={`${collapse}-${duration}`}
            items={items}
            maxItems={maxItemsFor[collapse]}
            duration={duration}
            renderLink={(props, item) => (
              <a
                {...props}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(path.slice(0, items.indexOf(item)));
                }}
              />
            )}
          />
          <Menu
            value={hovered ?? ""}
            onPointerLeave={() => setHovered(null)}
            className="border-border flex flex-col rounded-lg border p-1"
          >
            <MenuItem
              value="up"
              disabled={path.length === 0}
              onPointerMove={() => setHovered("up")}
              onClick={() => navigate(path.slice(0, -1))}
              className={`${row} text-muted-foreground data-highlighted:text-foreground disabled:pointer-events-none disabled:opacity-40`}
            >
              <ArrowUpIcon aria-hidden="true" className="size-4" />
              Up one level
            </MenuItem>
            {current.children?.map((child) => {
              const value = `${child.children ? "folder" : "file"}:${child.name}`;
              if (child.children)
                return (
                  <MenuItem
                    key={value}
                    value={value}
                    onPointerMove={() => setHovered(value)}
                    onClick={() => navigate([...path, child.name])}
                    className={row}
                  >
                    <FolderIcon aria-hidden="true" weight="fill" className="text-muted-foreground size-4" />
                    {child.name}
                  </MenuItem>
                );
              const FileTypeIcon = iconFor(child.name);
              return (
                <MenuItem
                  key={value}
                  value={value}
                  render={<div />}
                  onPointerMove={() => setHovered(value)}
                  className={`${row} text-muted-foreground data-highlighted:text-foreground`}
                >
                  <FileTypeIcon aria-hidden="true" className="size-4" />
                  {child.name}
                </MenuItem>
              );
            })}
          </Menu>
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Collapse at" value={collapse} options={collapses} onChange={setCollapse} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
