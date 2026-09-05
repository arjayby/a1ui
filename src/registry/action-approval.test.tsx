import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionApproval, type ProposedAction } from "./action-approval";
const action: ProposedAction = {
  id: "a",
  revision: 1,
  title: "Write draft",
  tool: "write_file",
  input: { content: "<script>alert(1)</script>" },
};
describe("ActionApproval", () => {
  it("submits the exact revision and note, locks pending decisions and shows acknowledgement", async () => {
    let resolve!: () => void;
    const onDecision = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const { container } = render(<ActionApproval action={action} status="pending" onDecision={onDecision} />);
    expect(container.querySelector("script")).toBeNull();
    fireEvent.change(screen.getByLabelText("Decision note, optional"), {
      target: { value: " Only a draft " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve action" }));
    expect(screen.getByRole("button", { name: "Reject action" })).toBeDisabled();
    expect(onDecision).toHaveBeenCalledWith({
      actionId: "a",
      revision: 1,
      decision: "approved",
      note: "Only a draft",
    });
    resolve();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Approved"));
    expect(screen.queryByRole("button", { name: "Approve action" })).not.toBeInTheDocument();
  });
  it("retains a rejected save and resets notes when the request revision changes", async () => {
    const onDecision = vi.fn().mockRejectedValue(new Error("Save failed"));
    const { rerender } = render(<ActionApproval action={action} status="pending" onDecision={onDecision} />);
    fireEvent.change(screen.getByLabelText("Decision note, optional"), { target: { value: "Needs review" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
    expect(screen.getByLabelText("Decision note, optional")).toHaveValue("Needs review");
    rerender(<ActionApproval action={{ ...action, revision: 2 }} status="pending" onDecision={onDecision} />);
    expect(screen.getByLabelText("Decision note, optional")).toHaveValue("");
    rerender(<ActionApproval action={action} status="expired" onDecision={onDecision} />);
    expect(screen.queryByRole("button", { name: "Approve action" })).not.toBeInTheDocument();
  });
  it("blocks approval when tool inputs cannot be displayed", () => {
    const input: Record<string, unknown> = {};
    input.self = input;
    render(<ActionApproval action={{ ...action, input }} status="pending" onDecision={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Approve action" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject action" })).toBeEnabled();
  });
});
