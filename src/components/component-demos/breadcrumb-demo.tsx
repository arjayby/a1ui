"use client";

import { ArrowUpIcon, FileIcon, FolderIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Breadcrumb, type BreadcrumbSegment } from "@/registry/components/breadcrumb";

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
                  ],
                },
                { name: "app", children: [{ name: "layout.tsx" }, { name: "page.tsx" }] },
              ],
            },
            { name: "public", children: [{ name: "llms.txt" }] },
          ],
        },
        { name: "Website", children: [{ name: "index.html" }] },
      ],
    },
    { name: "Documents", children: [{ name: "Invoices", children: [{ name: "2026.pdf" }] }] },
  ],
};

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

export function BreadcrumbDemo() {
  const [path, setPath] = useState(["Projects", "a1ui", "src", "registry", "components"]);
  const [collapse, setCollapse] = useState<Collapse>("4 items");
  const [duration, setDuration] = useState(0.3);
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
                  setPath(path.slice(0, items.indexOf(item)));
                }}
              />
            )}
          />
          <div className="border-border flex flex-col rounded-lg border p-1">
            <button
              type="button"
              disabled={path.length === 0}
              onClick={() => setPath(path.slice(0, -1))}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowUpIcon aria-hidden="true" className="size-4" />
              Up one level
            </button>
            {current.children?.map((child) =>
              child.children ? (
                <button
                  key={child.name}
                  type="button"
                  onClick={() => setPath([...path, child.name])}
                  className="hover:bg-muted focus-visible:ring-ring/30 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-none focus-visible:ring-3"
                >
                  <FolderIcon aria-hidden="true" weight="fill" className="text-muted-foreground size-4" />
                  {child.name}
                </button>
              ) : (
                <div
                  key={child.name}
                  className="text-muted-foreground flex items-center gap-2 px-2.5 py-1.5 text-sm"
                >
                  <FileIcon aria-hidden="true" className="size-4" />
                  {child.name}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Collapse at" value={collapse} options={collapses} onChange={setCollapse} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
