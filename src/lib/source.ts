import { loader } from "fumadocs-core/source";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { applyMdxPreset } from "fumadocs-mdx/config";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    mdxOptions: applyMdxPreset({
      remarkStructureOptions: {
        mdxTypes: (node) => node.children.length === 0,
      },
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const source = loader({
  baseUrl: "/",
  source: docs.toFumadocsSource(),
});
