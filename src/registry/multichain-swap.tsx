"use client";

import { ArrowDownUp, ArrowRight, Clock3, Route, Wallet } from "lucide-react";
import { useId, type CSSProperties, type ReactNode } from "react";

import { SelectMenu } from "./select-menu";

export interface SwapAsset {
  /** Unique across chains, for example "base:usdc". */
  id: string;
  chainId: string;
  chainName: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Decimal units available to swap, after reserving native gas fees. */
  spendableBalance?: string;
  icon?: ReactNode;
}

export interface SwapValue {
  fromAssetId: string;
  toAssetId: string;
  amount: string;
  slippageBps: number;
}

export interface SwapQuote {
  /** The exact input used to request this quote. */
  value: SwapValue;
  amountOut: string;
  minimumReceived: string;
  networkFee: string;
  estimatedTime: string;
  route: string;
}

export interface MultichainSwapProps {
  assets: SwapAsset[];
  value: SwapValue;
  onValueChange: (value: SwapValue) => void;
  quote?: SwapQuote | null;
  quoteStatus?: "idle" | "loading" | "error";
  quoteError?: string;
  connected?: boolean;
  onConnect?: () => void;
  onReview?: (value: SwapValue, quote: SwapQuote) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

// Compare token amounts without converting them to floating-point numbers.
function toUnits(amount: string, decimals: number): bigint | null {
  if (
    amount.length > 100 ||
    !/^(\d+\.?\d*|\.\d+)$/.test(amount) ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 36
  )
    return null;
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) return null;
  return BigInt((whole || "0") + fraction.padEnd(decimals, "0"));
}

function fromUnits(amount: bigint, decimals: number): string {
  const digits = amount.toString().padStart(decimals + 1, "0");
  if (!decimals) return digits;
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return `${digits.slice(0, -decimals)}${fraction ? `.${fraction}` : ""}`;
}

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--swap-foreground)]";
const theme = {
  "--swap-background": "var(--background, #f7f7f5)",
  "--swap-foreground": "var(--foreground, #222320)",
  "--swap-muted": "var(--muted-foreground, #6e706a)",
  "--swap-border": "var(--border, #d6d7d1)",
  "--swap-panel": "color-mix(in oklab, var(--swap-background) 95%, var(--swap-foreground))",
} as CSSProperties;

function AssetIcon({ asset }: { asset?: SwapAsset }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--swap-border)] bg-[var(--swap-background)] text-xs font-bold [&_svg]:size-4"
    >
      {asset?.icon ?? asset?.symbol.slice(0, 1) ?? "?"}
    </span>
  );
}

export function MultichainSwap({
  assets,
  value,
  onValueChange,
  quote,
  quoteStatus = "idle",
  quoteError,
  connected = false,
  onConnect,
  onReview,
  disabled = false,
  label = "Multichain",
  className = "",
  style,
}: MultichainSwapProps) {
  const id = useId();
  // Portals render outside the form, so carry its palette into each menu.
  const menuStyle = {
    ...theme,
    ...style,
    "--select-menu-background": "var(--swap-background)",
    "--select-menu-foreground": "var(--swap-foreground)",
    "--select-menu-muted": "var(--swap-muted)",
    "--select-menu-border": "var(--swap-border)",
    "--select-menu-highlight": "var(--swap-panel)",
  } as CSSProperties;
  const from = assets.find((asset) => asset.id === value.fromAssetId);
  const to = assets.find((asset) => asset.id === value.toAssetId);
  const chains = [...new Map(assets.map((asset) => [asset.chainId, asset.chainName])).entries()];
  const amount = from ? toUnits(value.amount, from.decimals) : null;
  const balance = from?.spendableBalance !== undefined ? toUnits(from.spendableBalance, from.decimals) : null;
  const amountError =
    value.amount && (amount === null || amount <= BigInt(0))
      ? `Enter a positive amount with up to ${from?.decimals ?? 0} decimals.`
      : connected && amount !== null && balance !== null && amount > balance
        ? `Insufficient ${from?.symbol} balance.`
        : null;
  const selectionError =
    !from || !to
      ? "Select a token on each network."
      : from.id === to.id
        ? "Choose two different assets."
        : !Number.isInteger(value.slippageBps) || value.slippageBps < 1 || value.slippageBps > 500
          ? "Select slippage between 0.01% and 5%."
          : null;
  const matches =
    quote &&
    quote.value.fromAssetId === value.fromAssetId &&
    quote.value.toAssetId === value.toAssetId &&
    quote.value.amount === value.amount &&
    quote.value.slippageBps === value.slippageBps;
  const output = quote && to ? toUnits(quote.amountOut, to.decimals) : null;
  const minimum = quote && to ? toUnits(quote.minimumReceived, to.decimals) : null;
  const currentQuote =
    matches &&
    quoteStatus === "idle" &&
    output !== null &&
    output > BigInt(0) &&
    minimum !== null &&
    minimum > BigInt(0) &&
    minimum <= output
      ? quote
      : null;
  const ready =
    !disabled && !amountError && !selectionError && amount !== null && amount > BigInt(0) && currentQuote;
  const message =
    selectionError ??
    amountError ??
    (quoteStatus === "error" ? quoteError || "Could not get a quote. Try another amount or route." : null);

  function update(patch: Partial<SwapValue>) {
    if (!disabled) onValueChange({ ...value, ...patch });
  }

  function chooseChain(side: "from" | "to", chainId: string) {
    const current = side === "from" ? from : to;
    const other = side === "from" ? to : from;
    const candidates = assets.filter((asset) => asset.chainId === chainId && asset.id !== other?.id);
    const next = candidates.find((asset) => asset.symbol === current?.symbol) ?? candidates[0];
    if (next) update({ [side === "from" ? "fromAssetId" : "toAssetId"]: next.id });
  }

  return (
    <form
      aria-label="Multichain swap"
      noValidate
      className={`w-full max-w-[26rem] rounded-2xl border border-[var(--swap-border)] bg-[var(--swap-background)] p-3 font-mono text-xs leading-normal text-[var(--swap-foreground)] shadow-[0_12px_40px_-24px_var(--swap-muted)] ${className}`}
      style={{ ...theme, ...style }}
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) return;
        if (!connected) onConnect?.();
        else if (ready && currentQuote) onReview?.({ ...value }, currentQuote);
      }}
    >
      <header className="flex items-center justify-between gap-3 px-2 pt-2 pb-5">
        <span className="flex items-center gap-2 text-sm font-bold">
          <ArrowDownUp aria-hidden="true" className="size-4" /> Swap
        </span>
        <span className="text-[10px] tracking-widest text-[var(--swap-muted)] uppercase">{label}</span>
      </header>

      <fieldset
        disabled={disabled || assets.length === 0}
        className="relative m-0 flex min-w-0 flex-col gap-2 border-0 p-0 disabled:opacity-60"
      >
        <legend className="sr-only">Swap assets and amount</legend>
        {(["from", "to"] as const).map((side) => {
          const asset = side === "from" ? from : to;
          const other = side === "from" ? to : from;
          return (
            <div
              key={side}
              data-invalid={(side === "from" && Boolean(amountError)) || undefined}
              className="flex min-w-0 flex-col gap-5 rounded-xl border border-[var(--swap-border)] bg-[var(--swap-panel)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`${id}-${side}-amount`} className="text-[var(--swap-muted)]">
                  {side === "from" ? "You pay" : "You receive"}
                </label>
                <SelectMenu
                  ariaLabel={`${side === "from" ? "Source" : "Destination"} network`}
                  value={asset?.chainId ?? ""}
                  onValueChange={(chainId) => chooseChain(side, chainId)}
                  options={chains.map(([chainId, name]) => ({
                    value: chainId,
                    label: name,
                    disabled: !assets.some((item) => item.chainId === chainId && item.id !== other?.id),
                  }))}
                  placeholder="Select network"
                  disabled={disabled || assets.length === 0}
                  variant="ghost"
                  align="end"
                  className="max-w-36"
                  style={menuStyle}
                />
              </div>
              <div className="flex min-w-0 items-center gap-3">
                {side === "from" ? (
                  <input
                    id={`${id}-from-amount`}
                    aria-describedby={message ? `${id}-message` : undefined}
                    aria-invalid={Boolean(amountError)}
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={100}
                    placeholder="0.00"
                    value={value.amount}
                    onChange={(event) => update({ amount: event.target.value })}
                    className={`w-full min-w-0 bg-transparent text-[28px] leading-tight tracking-tighter outline-none placeholder:text-[var(--swap-muted)] ${focus}`}
                  />
                ) : (
                  <output
                    id={`${id}-to-amount`}
                    className="min-w-0 flex-1 truncate text-[28px] leading-tight tracking-tighter"
                    title={currentQuote?.amountOut}
                    aria-live="polite"
                  >
                    {currentQuote?.amountOut ?? "—"}
                  </output>
                )}
                <SelectMenu
                  ariaLabel={`${side === "from" ? "Source" : "Destination"} token`}
                  value={asset?.id ?? ""}
                  onValueChange={(assetId) =>
                    update({ [side === "from" ? "fromAssetId" : "toAssetId"]: assetId })
                  }
                  options={assets
                    .filter((item) => item.chainId === asset?.chainId)
                    .map((item) => ({
                      value: item.id,
                      label: item.symbol,
                      description: item.name,
                      detail: connected ? item.spendableBalance : undefined,
                      icon: <AssetIcon asset={item} />,
                      disabled: item.id === other?.id,
                    }))}
                  placeholder="Token"
                  disabled={disabled || assets.length === 0}
                  variant="pill"
                  align="end"
                  className="max-w-[52%] shrink-0"
                  style={menuStyle}
                />
              </div>
              <div className="flex min-h-4 items-center justify-between gap-2 text-[10px] text-[var(--swap-muted)]">
                <span className="truncate" title={asset?.name}>
                  {asset?.name ?? "Choose an asset"}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate" title={asset?.spendableBalance}>
                    Available {connected ? (asset?.spendableBalance ?? "—") : "—"}
                  </span>
                  {side === "from" && connected && balance !== null && balance > BigInt(0) ? (
                    <>
                      <button
                        type="button"
                        aria-label="Use half of available balance"
                        onClick={() => update({ amount: fromUnits(balance / BigInt(2), from!.decimals) })}
                        className={`shrink-0 cursor-pointer font-bold text-[var(--swap-foreground)] ${focus}`}
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => update({ amount: from!.spendableBalance! })}
                        className={`shrink-0 cursor-pointer font-bold text-[var(--swap-foreground)] ${focus}`}
                      >
                        MAX
                      </button>
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          aria-label="Reverse swap direction"
          disabled={!from || !to}
          onClick={() =>
            update({
              fromAssetId: value.toAssetId,
              toAssetId: value.fromAssetId,
              amount: currentQuote?.amountOut ?? "",
            })
          }
          className={`absolute top-1/2 left-1/2 flex size-8 -translate-1/2 cursor-pointer items-center justify-center rounded-lg border border-[var(--swap-border)] bg-[var(--swap-background)] transition-transform hover:rotate-180 disabled:cursor-not-allowed motion-reduce:transition-none ${focus}`}
        >
          <ArrowDownUp aria-hidden="true" className="size-3.5" />
        </button>
      </fieldset>

      <div className="flex items-center justify-between gap-3 px-2 py-4 text-[10px] text-[var(--swap-muted)]">
        <span className="flex min-w-0 items-center gap-1.5">
          <Route aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">
            {from && to && from.chainId !== to.chainId ? "Cross-chain route" : "Same-chain swap"}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-1">
          Slippage
          <SelectMenu
            ariaLabel="Slippage"
            value={String(value.slippageBps)}
            onValueChange={(bps) => update({ slippageBps: Number(bps) })}
            options={[...new Set([10, 50, 100, value.slippageBps])]
              .sort((a, b) => a - b)
              .map((bps) => ({ value: String(bps), label: `${bps / 100}%` }))}
            disabled={disabled}
            variant="ghost"
            align="end"
            style={menuStyle}
          />
        </div>
      </div>

      <div
        aria-busy={quoteStatus === "loading"}
        className="rounded-lg border border-dashed border-[var(--swap-border)] px-3 py-3"
      >
        <dl className="m-0 flex flex-col gap-2 text-[10px]">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[var(--swap-muted)]">Route</dt>
            <dd className="m-0 truncate" title={currentQuote?.route}>
              {quoteStatus === "loading" ? "Finding a route…" : (currentQuote?.route ?? "Awaiting quote")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[var(--swap-muted)]">Minimum received</dt>
            <dd
              className="m-0 min-w-0 truncate"
              title={currentQuote ? `${currentQuote.minimumReceived} ${to?.symbol}` : undefined}
            >
              {currentQuote ? `${currentQuote.minimumReceived} ${to?.symbol}` : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[var(--swap-muted)]">Network fee</dt>
            <dd className="m-0 truncate">{currentQuote?.networkFee ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div
        id={`${id}-message`}
        role="status"
        aria-label="Swap status"
        className="flex min-h-10 items-center justify-center gap-1.5 px-1 py-2 text-center text-[10px] text-[var(--swap-muted)]"
      >
        {message ? (
          message
        ) : currentQuote ? (
          <>
            <Clock3 aria-hidden="true" className="size-3" /> Estimated time: {currentQuote.estimatedTime}
          </>
        ) : quoteStatus === "loading" ? (
          "Updating quote…"
        ) : amount !== null && amount > BigInt(0) ? (
          "Waiting for a quote."
        ) : (
          "Enter an amount to preview your swap."
        )}
      </div>
      <button
        type="submit"
        disabled={disabled || (connected ? !ready || !onReview : !onConnect)}
        className={`flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--swap-foreground)] px-4 py-3 font-bold text-[var(--swap-background)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none ${focus}`}
      >
        {!connected ? (
          <>
            <Wallet aria-hidden="true" className="size-3.5" /> Connect wallet
          </>
        ) : quoteStatus === "loading" ? (
          "Getting quote…"
        ) : (
          <>
            Review swap <ArrowRight aria-hidden="true" className="size-3.5" />
          </>
        )}
      </button>
    </form>
  );
}
