import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Components",
  description: "Reusable UI components for building your own interfaces.",
};

export default function ComponentsPage() {
  return (
    <div className="page-frame">
      <header>
        <h1 className="page-heading">Components</h1>
        <p className="page-description">Reusable UI components for building your own interfaces.</p>
      </header>
      <p className="text-muted-foreground mt-10">No components published yet.</p>
    </div>
  );
}
