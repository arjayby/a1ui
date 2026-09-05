import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanViewer, type ChatPlan } from "./plan-viewer";
const plan: ChatPlan = {
  id: "p",
  revision: 1,
  title: "A plan",
  status: "proposed",
  steps: [
    { id: "a", title: "First", status: "pending" },
    { id: "b", title: "Second", status: "pending" },
  ],
};
describe("PlanViewer", () => {
  it("saves an edited reordered snapshot without mutating the source", async () => {
    const onStepsChange = vi.fn();
    render(<PlanViewer plan={plan} onStepsChange={onStepsChange} onApprove={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
    fireEvent.change(screen.getByLabelText("Step 1 title"), { target: { value: " Revised " } });
    fireEvent.click(screen.getByRole("button", { name: "Move step 1 down" }));
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    await waitFor(() =>
      expect(onStepsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          revision: 1,
          steps: [plan.steps[1], { ...plan.steps[0], title: "Revised" }],
        }),
      ),
    );
    expect(plan.steps[0].title).toBe("First");
  });
  it("shows rejection, locks successful approval, and resets on a new revision", async () => {
    const onApprove = vi.fn().mockRejectedValueOnce(new Error("Stale revision")).mockResolvedValue(undefined);
    const { rerender } = render(<PlanViewer plan={plan} onApprove={onApprove} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Stale revision");
    fireEvent.click(screen.getByRole("button", { name: "Approve plan" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Approve plan" })).not.toBeInTheDocument(),
    );
    rerender(<PlanViewer plan={{ ...plan, revision: 2 }} onApprove={onApprove} />);
    expect(screen.getByRole("button", { name: "Approve plan" })).toBeEnabled();
  });
  it("renders execution state and prevents empty approval", () => {
    const { rerender } = render(<PlanViewer plan={{ ...plan, steps: [] }} onApprove={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Approve plan" })).toBeDisabled();
    rerender(
      <PlanViewer
        plan={{
          ...plan,
          status: "running",
          steps: [
            { ...plan.steps[0], status: "complete" },
            { ...plan.steps[1], status: "running" },
          ],
        }}
        onApprove={vi.fn()}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
    expect(screen.getAllByRole("listitem")[1]).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("button", { name: "Approve plan" })).not.toBeInTheDocument();
  });
});
