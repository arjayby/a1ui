import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CryptoWallet, type CryptoWalletProps, type WalletAccount } from "@/registry/crypto-wallet";

const account: WalletAccount = {
  name: "Test wallet",
  address: "0x1234567890abcdef1234567890abcdef12345678",
  network: "Ethereum",
  balance: "$1,234.56",
  change: "+$12.34 today",
};
const holdings: CryptoWalletProps = {
  account,
  assets: [{ id: "eth", name: "Ethereum", symbol: "ETH", balance: "0.123456789012345678", value: "$400.25" }],
  activity: [
    {
      id: "tx",
      type: "receive",
      label: "Received ETH",
      time: "Today",
      amount: "+0.01 ETH",
      status: "pending",
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("CryptoWallet", () => {
  it("connects through the host and never exposes supplied holdings when disconnected", () => {
    const onConnect = vi.fn();
    const { rerender } = render(<CryptoWallet {...holdings} account={null} onConnect={onConnect} />);
    expect(screen.queryByText(account.balance)).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(onConnect).toHaveBeenCalledOnce();
    rerender(<CryptoWallet account={null} status="connecting" onConnect={onConnect} />);
    expect(screen.getByRole("button", { name: "Connecting…" })).toBeDisabled();
    rerender(
      <CryptoWallet account={null} status="error" error="Connection rejected." onConnect={onConnect} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Connection rejected.");
    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeEnabled();
  });

  it("passes the current account to actions and disables callbacks that are missing", () => {
    const onSend = vi.fn();
    const onReceive = vi.fn();
    const onSwap = vi.fn();
    const onDisconnect = vi.fn();
    const { rerender } = render(
      <CryptoWallet
        {...holdings}
        onSend={onSend}
        onReceive={onReceive}
        onSwap={onSwap}
        onDisconnect={onDisconnect}
      />,
    );
    for (const [name, callback] of [
      ["Send", onSend],
      ["Receive", onReceive],
      ["Swap", onSwap],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(callback).toHaveBeenCalledWith(account);
    }
    fireEvent.click(screen.getByRole("button", { name: "Disconnect wallet" }));
    expect(onDisconnect).toHaveBeenCalledOnce();
    const next = { ...account, address: "different-account" };
    rerender(<CryptoWallet account={next} onSend={onSend} />);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenLastCalledWith(next);
    expect(screen.getByRole("button", { name: "Receive" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Swap" })).toBeDisabled();
  });

  it("removes all amounts while hidden, including activity, and preserves display precision", () => {
    render(<CryptoWallet {...holdings} />);
    expect(screen.getByText("0.123456789012345678 ETH")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide balances" }));
    for (const text of [account.balance, account.change!, "$400.25", "0.123456789012345678"]) {
      expect(screen.getByRole("region", { name: "Crypto wallet" })).not.toHaveTextContent(text);
    }
    fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
    expect(screen.getByText("Received ETH")).toBeInTheDocument();
    expect(screen.queryByText("+0.01 ETH")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show balances" }));
    expect(screen.getByText("+0.01 ETH")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it.each(["loading", "error"] as const)("hides stale data and blocks actions during %s", (status) => {
    const onSend = vi.fn();
    render(
      <CryptoWallet {...holdings} status={status} error="Try refreshing the account." onSend={onSend} />,
    );
    expect(screen.queryByText(account.balance)).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).not.toHaveBeenCalled();
    expect(
      screen.getByRole(status === "error" ? "alert" : "status", { name: "Wallet status" }).textContent,
    ).toContain(status === "error" ? "Try refreshing" : "Loading");
  });

  it("copies the full address and resets success when the account changes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { rerender } = render(<CryptoWallet {...holdings} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy wallet address" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Address copied."));
    expect(writeText).toHaveBeenCalledWith(account.address);
    rerender(<CryptoWallet account={{ ...account, address: "new-address" }} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole("button", { name: "Copy wallet address" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("new-address"));
  });

  it("offers a selectable address when the clipboard rejects access", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    render(<CryptoWallet {...holdings} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy wallet address" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Could not copy."));
    expect(screen.getByText(account.address)).toBeInTheDocument();
    expect(screen.queryByText("Address copied.")).not.toBeInTheDocument();
  });

  it("shows empty token and activity states", () => {
    render(<CryptoWallet account={account} />);
    expect(screen.getByText("No tokens yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });
});
