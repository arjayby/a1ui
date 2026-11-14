import { catalogDemos, catalogReveals, type CatalogGroup } from "@/components/catalog-demos";
import { CatalogFrame } from "@/components/catalog-frame";

/**
 * The top of a catalog card: the same demo the docs page shows. It is a picture of the
 * component, not a control, so it is inert and the whole card stays one link.
 */
export function CatalogPreview({ group, slug }: { group: CatalogGroup; slug: string }) {
  const Demo = catalogDemos[group][slug];
  if (!Demo) return null;

  return (
    <div inert aria-hidden="true" className="catalog-preview">
      {catalogReveals[group][slug] ? <CatalogFrame src={`/preview/${group}/${slug}`} /> : <Demo />}
    </div>
  );
}
