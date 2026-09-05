import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  MultichainSwap,
  type MultichainSwapProps,
  type SwapAsset,
  type SwapQuote,
  type SwapValue,
} from "@/registry/multichain-swap";

const assets: SwapAsset[] = [
  {
    id: "eth",
    chainId: "1",
    chainName: "Ethereum",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    spendableBalance: "1.000000000000000001",
  },
  {
    id: "eth-usdc",
    chainId: "1",
    chainName: "Ethereum",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    spendableBalance: "100",
  },
  {
    id: "base-usdc",
    chainId: "8453",
    chainName: "Base",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    spendableBalance: "800",
  },
  {
    id: "sol",
    chainId: "solana",
    chainName: "Solana",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    spendableBalance: "2",
  },
];
const value: SwapValue = { fromAssetId: "eth", toAssetId: "base-usdc", amount: "0.25", slippageBps: 50 };
const quote: SwapQuote = {
  value,
  amountOut: "797.6",
  minimumReceived: "793.612",
  networkFee: "$0.42",
  estimatedTime: "2 minutes",
  route: "Test bridge",
};

function renderSwap(overrides: Partial<MultichainSwapProps> = {}) {
  const onReview = vi.fn();
  const onValueChange = vi.fn();
  const result = render(
    <MultichainSwap
      assets={assets}
      value={value}
      onValueChange={onValueChange}
      quote={quote}
      connected
      onReview={onReview}
      {...overrides}
    />,
  );
  return { ...result, onReview, onValueChange };
}

describe("MultichainSwap", () => {
  it("hands the current quote to review and lets the host connect a wallet", () => {
    const onConnect = vi.fn();
    const { onReview, rerender } = renderSwap();
    fireEvent.click(screen.getByRole("button", { name: "Review swap" }));
    expect(onReview).toHaveBeenCalledWith(value, quote);
    rerender(
      <MultichainSwap
        assets={assets}
        value={value}
        onValueChange={vi.fn()}
        quote={quote}
        onConnect={onConnect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it.each([
    { ...value, amount: "0.5" },
    { ...value, toAssetId: "sol" },
    { ...value, fromAssetId: "eth-usdc" },
    { ...value, slippageBps: 100 },
  ])("rejects a stale quote after changing $amount / $fromAssetId / $toAssetId / $slippageBps", (changed) => {
    const { onReview } = renderSwap({ value: changed });
    expect(screen.getByRole("button", { name: "Review swap" })).toBeDisabled();
    expect(screen.queryByText("Test bridge")).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole("form", { name: "Multichain swap" }));
    expect(onReview).not.toHaveBeenCalled();
  });

  it.each(["-1", "0", "1e3", "NaN", "abc", "0.1234567890123456789", "1.000000000000000002"])(
    "blocks invalid or unaffordable amount %s",
    (amount) => {
      const next = { ...value, amount };
      renderSwap({ value: next, quote: { ...quote, value: next } });
      expect(screen.getByLabelText("You pay")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("button", { name: "Review swap" })).toBeDisabled();
    },
  );

  it("preserves token precision for MAX and half balance", () => {
    const { onValueChange } = renderSwap();
    fireEvent.click(screen.getByRole("button", { name: "MAX" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ ...value, amount: "1.000000000000000001" });
    fireEvent.click(screen.getByRole("button", { name: "Use half of available balance" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ ...value, amount: "0.5" });
  });

  it("accepts the exact spendable balance and leading decimal notation", () => {
    const next = { ...value, amount: assets[0].spendableBalance! };
    const { rerender } = renderSwap({ value: next, quote: { ...quote, value: next } });
    expect(screen.getByRole("button", { name: "Review swap" })).toBeEnabled();
    const fractional = { ...value, amount: ".5" };
    rerender(
      <MultichainSwap
        assets={assets}
        value={fractional}
        onValueChange={vi.fn()}
        quote={{ ...quote, value: fractional }}
        connected
        onReview={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Review swap" })).toBeEnabled();
  });

  it("keeps tokens available on the chosen network and prevents identical assets", () => {
    function Harness() {
      const [selected, setSelected] = useState(value);
      return <MultichainSwap assets={assets} value={selected} onValueChange={setSelected} />;
    }
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Destination network"), { target: { value: "1" } });
    expect(screen.getByLabelText("Destination token")).toHaveValue("eth-usdc");
    expect(screen.getByLabelText("Destination token").querySelector('option[value="eth"]')).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Destination network"), { target: { value: "solana" } });
    expect(screen.getByLabelText("Destination token")).toHaveValue("sol");
    expect(screen.getByLabelText("Destination token").querySelectorAll("option")).toHaveLength(1);
  });

  it("reverses the assets and uses only a current quote as the new amount", () => {
    const { onValueChange } = renderSwap();
    fireEvent.click(screen.getByRole("button", { name: "Reverse swap direction" }));
    expect(onValueChange).toHaveBeenCalledWith({
      fromAssetId: "base-usdc",
      toAssetId: "eth",
      amount: "797.6",
      slippageBps: 50,
    });
  });

  it.each(["loading", "error"] as const)("disables review while the quote is %s", (quoteStatus) => {
    renderSwap({ quoteStatus, quoteError: "No route available." });
    expect(
      screen.getByRole("button", { name: quoteStatus === "loading" ? "Getting quote…" : "Review swap" }),
    ).toBeDisabled();
    expect(screen.queryByText("797.6")).not.toBeInTheDocument();
    if (quoteStatus === "error")
      expect(screen.getByRole("status", { name: "Swap status" })).toHaveTextContent("No route available.");
  });

  it.each([{ amountOut: "0" }, { minimumReceived: "800" }, { minimumReceived: "-1" }, { amountOut: "NaN" }])(
    "blocks malformed quotes %j",
    (patch) => {
      renderSwap({ quote: { ...quote, ...patch } });
      expect(screen.getByRole("button", { name: "Review swap" })).toBeDisabled();
    },
  );

  it("disables all edits and callbacks while the host is busy", () => {
    const { onReview, onValueChange } = renderSwap({ disabled: true });
    expect(screen.getByLabelText("You pay")).toBeDisabled();
    expect(screen.getByLabelText("Source network")).toBeDisabled();
    expect(screen.getByLabelText("Slippage")).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Multichain swap" }));
    fireEvent.change(screen.getByLabelText("You pay"), { target: { value: "1" } });
    expect(onReview).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("handles an empty asset list", () => {
    renderSwap({ assets: [] });
    expect(screen.getByRole("status", { name: "Swap status" })).toHaveTextContent(
      "Select a token on each network.",
    );
    expect(screen.getByRole("button", { name: "Review swap" })).toBeDisabled();
  });
});
