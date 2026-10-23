import { loader } from "fumadocs-core/source";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { applyMdxPreset } from "fumadocs-mdx/config";
import { defaultStringifier } from "fumadocs-core/mdx-plugins/remark-structure";

const stringifySearchContent = defaultStringifier({});

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    mdxOptions: applyMdxPreset({
      remarkStructureOptions: {
        mdxTypes: (node) => node.name === "AgentOnly" || node.children.length === 0,
        stringify(node, context) {
          if (node.type === "mdxJsxFlowElement" && node.name === "AgentOnly") return "";
          return stringifySearchContent.call(this, node, context);
        },
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
