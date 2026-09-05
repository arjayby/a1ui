"use client";

import { Tabs } from "@base-ui/react/tabs";
import { clsx as cn } from "clsx";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  Wallet,
} from "lucide-react";
import { useId, useState, type CSSProperties, type ReactNode } from "react";

export interface WalletAccount {
  name: string;
  address: string;
  network: string;
  /** Formatted display value, including the currency symbol. */
  balance: string;
  change?: string;
}

export interface WalletAsset {
  /** Unique across networks. */
  id: string;
  name: string;
  symbol: string;
  balance: string;
  value: string;
  icon?: ReactNode;
}

export interface WalletActivity {
  id: string;
  type: "send" | "receive" | "swap";
  label: string;
  /** Formatted date or relative time supplied by the host. */
  time: string;
  amount: string;
  status: "confirmed" | "pending" | "failed";
}

export interface CryptoWalletProps {
  account: WalletAccount | null;
  assets?: WalletAsset[];
  activity?: WalletActivity[];
  status?: "idle" | "connecting" | "loading" | "error";
  error?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSend?: (account: WalletAccount) => void;
  onReceive?: (account: WalletAccount) => void;
  onSwap?: (account: WalletAccount) => void;
  className?: string;
  style?: CSSProperties;
}

const theme = {
  "--wallet-background": "var(--background, #f7f7f5)",
  "--wallet-foreground": "var(--foreground, #222320)",
  "--wallet-muted": "var(--muted-foreground, #6e706a)",
  "--wallet-border": "var(--border, #d6d7d1)",
  "--wallet-panel": "color-mix(in oklab, var(--wallet-background) 94%, var(--wallet-foreground))",
} as CSSProperties;

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wallet-foreground)]";
const iconButton =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[var(--wallet-panel)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-4";
const activityIcons = { send: ArrowUpRight, receive: ArrowDownLeft, swap: ArrowDownUp };
const activityLabels = { confirmed: "Confirmed", pending: "Pending", failed: "Failed" };

function CopyAddress({ address }: { address: string }) {
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const messageId = useId();

  async function copy() {
    setStatus("copying");
    try {
      await navigator.clipboard.writeText(address);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        onClick={copy}
        disabled={status === "copying"}
        aria-label="Copy wallet address"
        aria-describedby={status === "error" ? messageId : undefined}
        title={address}
        className={cn(
          "flex min-h-8 w-fit max-w-full cursor-pointer items-center gap-2 rounded text-[11px] text-[var(--wallet-muted)] disabled:cursor-wait [&_svg]:size-3",
          focus,
        )}
      >
        <span className="truncate">
          {address.length > 16 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address}
        </span>
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
      <span
        id={messageId}
        role="status"
        className={cn("text-[10px] text-[var(--wallet-muted)]", status !== "error" && "sr-only")}
      >
        {status === "copied"
          ? "Address copied."
          : status === "error"
            ? "Could not copy. Select the address below."
            : ""}
      </span>
      {status === "error" ? <span className="text-[11px] break-all select-all">{address}</span> : null}
    </div>
  );
}

function PrivateAmount({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  return hidden ? (
    <span>
      <span aria-hidden="true">••••••</span>
      <span className="sr-only">Balance hidden</span>
    </span>
  ) : (
    <>{children}</>
  );
}

export function CryptoWallet({
  account,
  assets = [],
  activity = [],
  status = "idle",
  error,
  onConnect,
  onDisconnect,
  onSend,
  onReceive,
  onSwap,
  className,
  style,
}: CryptoWalletProps) {
  const id = useId();
  const [hidden, setHidden] = useState(false);
  const busy = status === "connecting" || status === "loading";
  const unavailable = status !== "idle";

  return (
    <section
      aria-label="Crypto wallet"
      data-crypto-wallet=""
      style={{ ...theme, ...style }}
      className={cn(
        "w-full max-w-[25rem] rounded-2xl border border-[var(--wallet-border)] bg-[var(--wallet-background)] font-mono text-xs leading-normal text-[var(--wallet-foreground)]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--wallet-foreground)] text-[var(--wallet-background)]"
          >
            <Wallet className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xs font-bold">{account?.name ?? "Your wallet"}</h3>
            <span className="block truncate pt-1 text-[10px] text-[var(--wallet-muted)]">
              {account?.network ?? "Connect to get started"}
            </span>
          </div>
        </div>
        {account && onDisconnect ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={busy}
            aria-label="Disconnect wallet"
            className={cn(iconButton, focus)}
          >
            <LogOut aria-hidden="true" />
          </button>
        ) : null}
      </header>

      {account ? (
        <>
          <div className="px-5 pt-7 pb-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-[var(--wallet-muted)]">Total balance</span>
              <button
                type="button"
                aria-label={hidden ? "Show balances" : "Hide balances"}
                aria-pressed={hidden}
                onClick={() => setHidden((value) => !value)}
                className={cn(iconButton, focus)}
              >
                {hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            <div className="mt-1 text-[clamp(1.75rem,7vw,2.5rem)] leading-tight tracking-[-0.06em] break-all tabular-nums">
              {unavailable ? (
                <span>
                  <span aria-hidden="true">••••••</span>
                  <span className="sr-only">Balance unavailable</span>
                </span>
              ) : (
                <PrivateAmount hidden={hidden}>{account.balance}</PrivateAmount>
              )}
            </div>
            {account.change && !unavailable ? (
              <div className="mt-2 text-[11px] text-[var(--wallet-muted)]">
                <PrivateAmount hidden={hidden}>{account.change}</PrivateAmount>
              </div>
            ) : null}
            <div className="mt-3">
              <CopyAddress key={`${account.network}:${account.address}`} address={account.address} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 px-5 pb-6">
            {[
              { label: "Send", icon: ArrowUpRight, action: onSend },
              { label: "Receive", icon: ArrowDownLeft, action: onReceive },
              { label: "Swap", icon: ArrowDownUp, action: onSwap },
            ].map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                type="button"
                disabled={unavailable || !action}
                onClick={() => action?.(account)}
                className={cn(
                  "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-[var(--wallet-panel)] text-[11px] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none [&_svg]:size-4",
                  focus,
                )}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <Tabs.Root defaultValue="tokens" className="border-t border-[var(--wallet-border)]">
            <Tabs.List aria-label="Wallet details" activateOnFocus className="flex gap-6 px-5">
              {[
                { value: "tokens", label: "Tokens" },
                { value: "activity", label: "Activity" },
              ].map((tab) => (
                <Tabs.Tab
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "min-h-12 cursor-pointer border-b-2 border-transparent text-[11px] text-[var(--wallet-muted)] data-[active]:border-[var(--wallet-foreground)] data-[active]:text-[var(--wallet-foreground)]",
                    focus,
                  )}
                >
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            {unavailable ? (
              <div
                className="flex min-h-48 items-center justify-center px-5 py-8 text-center text-[var(--wallet-muted)]"
                role={status === "error" ? "alert" : "status"}
                aria-label="Wallet status"
              >
                {status === "error"
                  ? error || "Could not load wallet. Try again in your app."
                  : "Loading wallet…"}
              </div>
            ) : null}
            <Tabs.Panel value="tokens" className={cn("px-5 pb-2", focus)}>
              {!unavailable ? (
                assets.length ? (
                  <ul aria-label="Token balances" className="m-0 list-none p-0">
                    {assets.map((asset) => (
                      <li
                        key={asset.id}
                        className="flex items-center gap-3 border-b border-[var(--wallet-border)] py-4 last:border-0"
                      >
                        <span
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--wallet-border)] text-sm font-bold [&_svg]:size-4"
                        >
                          {asset.icon ?? asset.symbol.slice(0, 1)}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate">{asset.name}</span>
                          <span className="text-[10px] break-all text-[var(--wallet-muted)]">
                            <PrivateAmount hidden={hidden}>{asset.balance}</PrivateAmount> {asset.symbol}
                          </span>
                        </div>
                        <span className="max-w-[45%] text-right break-all tabular-nums">
                          <PrivateAmount hidden={hidden}>{asset.value}</PrivateAmount>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-16 text-center text-[var(--wallet-muted)]">No tokens yet.</div>
                )
              ) : null}
            </Tabs.Panel>
            <Tabs.Panel value="activity" className={cn("px-5 pb-2", focus)}>
              {!unavailable ? (
                activity.length ? (
                  <ul aria-label="Wallet activity" className="m-0 list-none p-0">
                    {activity.map((item) => {
                      const Icon = activityIcons[item.type];
                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 border-b border-[var(--wallet-border)] py-4 last:border-0"
                        >
                          <span
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--wallet-panel)]"
                          >
                            <Icon className="size-4" />
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate">{item.label}</span>
                            <span className="text-[10px] text-[var(--wallet-muted)]">{item.time}</span>
                          </div>
                          <div className="flex max-w-[45%] flex-col gap-1 text-right">
                            <span className="break-all tabular-nums">
                              <PrivateAmount hidden={hidden}>{item.amount}</PrivateAmount>
                            </span>
                            <span className="text-[10px] text-[var(--wallet-muted)]">
                              {activityLabels[item.status]}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="py-16 text-center text-[var(--wallet-muted)]">No activity yet.</div>
                )
              ) : null}
            </Tabs.Panel>
          </Tabs.Root>
        </>
      ) : (
        <div className="flex min-h-80 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
          <Wallet aria-hidden="true" className="size-8 text-[var(--wallet-muted)]" />
          <div className="flex flex-col gap-2">
            <span className="text-base">Connect your wallet</span>
            <span className="max-w-60 text-[11px] leading-relaxed text-[var(--wallet-muted)]">
              Connect a wallet to see your tokens and recent activity.
            </span>
          </div>
          <button
            type="button"
            onClick={onConnect}
            disabled={busy || !onConnect}
            aria-describedby={status === "error" ? `${id}-error` : undefined}
            className={cn(
              "min-h-11 w-full cursor-pointer rounded-xl bg-[var(--wallet-foreground)] px-4 py-3 text-[var(--wallet-background)] disabled:cursor-not-allowed disabled:opacity-45",
              focus,
            )}
          >
            {busy ? "Connecting…" : "Connect wallet"}
          </button>
          <span className="sr-only" role="status">
            {busy ? "Connecting wallet…" : ""}
          </span>
          {status === "error" ? (
            <span id={`${id}-error`} role="alert" className="text-[11px] text-[var(--wallet-muted)]">
              {error || "Could not connect. Try again."}
            </span>
          ) : null}
        </div>
      )}
    </section>
  );
}
