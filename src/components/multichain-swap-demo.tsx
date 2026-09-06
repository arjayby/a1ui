"use client";

import { ArrowDown, Check, X } from "lucide-react";
import { useRef, useState } from "react";

import { MultichainSwap, type SwapAsset, type SwapQuote, type SwapValue } from "@/registry/multichain-swap";

function TokenMark({ symbol }: { symbol: string }) {
  if (symbol === "ETH")
    return (
      <svg viewBox="0 0 16 20" fill="currentColor">
        <path d="m8 0 7 10-7 4-7-4L8 0Z" opacity=".55" />
        <path d="m8 15 7-4-7 9-7-9 7 4Z" />
      </svg>
    );
  if (symbol === "SOL")
    return (
      <svg viewBox="0 0 20 16" fill="currentColor">
        <path d="M4 1h15l-3 3H1l3-3Zm-3 5h15l3 3H4L1 6Zm3 5h15l-3 3H1l3-3Z" />
      </svg>
    );
  return <span>$</span>;
}

const assets: SwapAsset[] = [
  {
    id: "ethereum:eth",
    chainId: "1",
    chainName: "Ethereum",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    spendableBalance: "1.284",
  },
  {
    id: "ethereum:usdc",
    chainId: "1",
    chainName: "Ethereum",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    spendableBalance: "2400",
  },
  {
    id: "base:eth",
    chainId: "8453",
    chainName: "Base",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    spendableBalance: "0.82",
  },
  {
    id: "base:usdc",
    chainId: "8453",
    chainName: "Base",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    spendableBalance: "860.50",
  },
  {
    id: "arbitrum:eth",
    chainId: "42161",
    chainName: "Arbitrum",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    spendableBalance: "0.45",
  },
  {
    id: "arbitrum:usdc",
    chainId: "42161",
    chainName: "Arbitrum",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    spendableBalance: "1250",
  },
  {
    id: "solana:sol",
    chainId: "solana",
    chainName: "Solana",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    spendableBalance: "12.5",
  },
  {
    id: "solana:usdc",
    chainId: "solana",
    chainName: "Solana",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    spendableBalance: "320",
  },
].map((asset) => ({ ...asset, icon: <TokenMark symbol={asset.symbol} /> }));

const initialValue: SwapValue = {
  fromAssetId: "ethereum:eth",
  toAssetId: "base:usdc",
  amount: "0.25",
  slippageBps: 50,
};

// Fixed illustrative prices for this demo only. There is no quote or wallet service.
const samplePrices: Record<string, number> = { ETH: 3200, USDC: 1, SOL: 150 };

function sampleQuote(value: SwapValue): SwapQuote | null {
  const from = assets.find((asset) => asset.id === value.fromAssetId);
  const to = assets.find((asset) => asset.id === value.toAssetId);
  const amount = Number(value.amount);
  if (!from || !to || !Number.isFinite(amount) || amount <= 0) return null;
  const output = ((amount * samplePrices[from.symbol]) / samplePrices[to.symbol]) * 0.997;
  if (!Number.isFinite(output) || output >= 1e12) return null;
  const decimals = Math.min(to.decimals, 6);
  return {
    value,
    amountOut: output.toFixed(decimals).replace(/\.?0+$/, ""),
    minimumReceived: (
      Math.floor(output * (1 - value.slippageBps / 10000) * 10 ** decimals) /
      10 ** decimals
    ).toFixed(decimals),
    networkFee: from.chainId === to.chainId ? "$0.12" : "$0.42",
    estimatedTime: from.chainId === to.chainId ? "~15 seconds" : "~2 minutes",
    route: from.chainId === to.chainId ? "Demo pool" : "Demo bridge → Demo pool",
  };
}

export function MultichainSwapPreview() {
  return (
    <div className="not-prose demo-frame multichain-swap-preview">
      <MultichainSwap
        assets={assets}
        value={initialValue}
        onValueChange={() => {}}
        quote={sampleQuote(initialValue)}
        connected
        onReview={() => {}}
        label="Demo · 4 networks"
      />
    </div>
  );
}

export function MultichainSwapDemo() {
  const [value, setValue] = useState(initialValue);
  const [connected, setConnected] = useState(false);
  const [review, setReview] = useState<SwapQuote | null>(null);
  const [complete, setComplete] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const from = assets.find((asset) => asset.id === review?.value.fromAssetId);
  const to = assets.find((asset) => asset.id === review?.value.toAssetId);

  return (
    <>
      <div className="not-prose demo-frame multichain-swap-demo">
        <MultichainSwap
          assets={assets}
          value={value}
          onValueChange={setValue}
          quote={sampleQuote(value)}
          connected={connected}
          onConnect={() => setConnected(true)}
          label="Demo · 4 networks"
          onReview={(_, quote) => {
            setReview(quote);
            setComplete(false);
            dialog.current?.showModal();
          }}
        />
        <span className="multichain-swap-demo-note">Sample balances and quotes. No funds move.</span>
      </div>
      <p className="demo-caption">
        Connect the demo wallet, choose your networks, and review a swap. Ethereum, Base, Arbitrum, and Solana
        are included.
      </p>
      <dialog ref={dialog} aria-labelledby="swap-review-title" className="multichain-swap-review">
        <div className="flex items-center justify-between gap-4">
          <h3 id="swap-review-title" className="text-sm font-bold">
            {complete ? "Demo complete" : "Review demo swap"}
          </h3>
          <button
            type="button"
            aria-label="Close swap review"
            onClick={() => dialog.current?.close()}
            className="border-border flex size-8 cursor-pointer items-center justify-center rounded-full border"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        {complete ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center" role="status">
            <Check aria-hidden="true" className="size-8" />
            <span>No transaction was sent.</span>
            <span className="text-muted-foreground">This demo uses sample balances and quotes.</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 py-7">
              <span className="text-muted-foreground">You pay on {from?.chainName}</span>
              <span className="text-2xl break-all">
                {review?.value.amount} {from?.symbol}
              </span>
              <ArrowDown aria-hidden="true" className="text-muted-foreground size-4" />
              <span className="text-muted-foreground">You receive on {to?.chainName}</span>
              <span className="text-2xl break-all">
                {review?.amountOut} {to?.symbol}
              </span>
              <span className="text-muted-foreground text-[11px]">
                Minimum {review?.minimumReceived} {to?.symbol} · Fee {review?.networkFee}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setComplete(true)}
              className="bg-foreground text-background min-h-12 w-full cursor-pointer rounded-lg px-4 py-3 font-bold"
            >
              Simulate swap
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
