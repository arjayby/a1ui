import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

type CatalogEntry = { slug: string; title: string; description: string; isNew?: boolean };

/**
 * A catalog page's index: one numbered row per entry, in the order given. The name is
 * the link and it covers the whole row, so the row is one target with a short name.
 */
export function CatalogList({ group, items }: { group: "components" | "blocks"; items: CatalogEntry[] }) {
  return (
    <ol className="catalog-list">
      {items.map((item, index) => (
        <li key={item.slug} className="catalog-row">
          <span aria-hidden="true" className="catalog-row-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h2 className="catalog-row-title">
            <Link
              href={`/${group}/${item.slug}`}
              aria-description={item.isNew ? "Newly shipped" : undefined}
              className="catalog-row-link"
            >
              {item.title}
            </Link>
            {item.isNew ? <Badge variant="dot" aria-hidden="true" /> : null}
          </h2>
          <p className="catalog-row-description">{item.description}</p>
          <ArrowUpRightIcon aria-hidden="true" className="catalog-row-arrow" />
        </li>
      ))}
    </ol>
  );
}
