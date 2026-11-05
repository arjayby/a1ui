"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Pagination } from "@/registry/components/pagination";

const pageCounts = ["10", "20", "100"] as const;
type PageCount = (typeof pageCounts)[number];
const siblingCounts = ["0", "1", "2"] as const;
type SiblingCount = (typeof siblingCounts)[number];

const perPage = 12;

export function PaginationPreview() {
  return <Pagination defaultPage={5} pageCount={10} siblingCount={0} previousLabel={null} nextLabel={null} />;
}

export function PaginationDemo() {
  const [pages, setPages] = useState<PageCount>("10");
  const [siblings, setSiblings] = useState<SiblingCount>("1");
  const [duration, setDuration] = useState(0.35);
  const [page, setPage] = useState(1);
  const total = Number(pages) * perPage - 5;
  const first = (page - 1) * perPage + 1;
  const last = Math.min(total, page * perPage);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="grid w-full justify-items-center gap-4">
          <Pagination
            page={page}
            pageCount={Number(pages)}
            onPageChange={setPage}
            siblingCount={Number(siblings)}
            aria-label="Search results"
            duration={duration}
          />
          <p className="text-muted-foreground text-sm tabular-nums" data-slot="demo-results">
            Showing {first}–{last} of {total} results
          </p>
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect
          label="Pages"
          value={pages}
          options={pageCounts}
          onChange={(next) => {
            setPages(next);
            setPage((current) => Math.min(current, Number(next)));
          }}
        />
        <DemoSelect label="Siblings" value={siblings} options={siblingCounts} onChange={setSiblings} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
