// API reference tables are authored with a separate "Description" column so the
// Markdown guides for agents stay a plain table. On the HTML page, the
// description reads better under the prop name, so this folds that column into
// the "Prop" cell (or the first cell when a table has no "Prop").

type Node = { type: string; value?: string; children?: Node[] };
type Element = Node & {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children: Node[];
};

const isElement = (node: Node, tagName?: string): node is Element =>
  node.type === "element" && (!tagName || (node as Element).tagName === tagName);

const textOf = (node: Node): string =>
  node.type === "text" ? (node.value ?? "") : (node.children ?? []).map(textOf).join("");

const cellsOf = (row: Element) => row.children.filter((n) => isElement(n, "th") || isElement(n, "td")) as Element[];

const rowsOf = (section: Element) => section.children.filter((n) => isElement(n, "tr")) as Element[];

function addClass(element: Element, name: string) {
  const current = element.properties?.className;
  const list = Array.isArray(current) ? current : typeof current === "string" ? [current] : [];
  element.properties = { ...element.properties, className: [...list, name] };
}

function removeCell(row: Element, cell: Element) {
  row.children = row.children.filter((n) => n !== cell);
}

export function foldDescriptionColumn(table: Element) {
  const thead = table.children.find((n) => isElement(n, "thead")) as Element | undefined;
  const headerRow = thead && rowsOf(thead)[0];
  if (!headerRow) return;
  const headers = cellsOf(headerRow).map((cell) => textOf(cell).trim());
  const column = headers.indexOf("Description");
  if (column === -1) return;
  const prop = headers.indexOf("Prop");
  const target = prop === -1 ? 0 : prop;
  if (target === column) return;

  addClass(cellsOf(headerRow)[target], "docs-table-prop");
  removeCell(headerRow, cellsOf(headerRow)[column]);

  for (const section of table.children.filter((n) => isElement(n, "tbody")) as Element[]) {
    for (const row of rowsOf(section)) {
      const cells = cellsOf(row);
      const description = cells[column];
      const name = cells[target];
      if (!description || !name) continue;
      addClass(name, "docs-table-prop");
      if (textOf(description).trim()) {
        name.children.push({
          type: "element",
          tagName: "p",
          properties: { className: ["docs-table-description"] },
          children: description.children,
        } as Element);
      }
      removeCell(row, description);
    }
  }
}

function visit(node: Node) {
  if (isElement(node, "table")) foldDescriptionColumn(node);
  for (const child of node.children ?? []) visit(child);
}

export default function rehypePropDescription() {
  return (tree: Node) => visit(tree);
}
