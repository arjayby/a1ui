"use client";

import { ArrowDownLeft, ArrowUpRight, ArrowDownUp, Check, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import {
  CryptoWallet,
  type WalletAccount,
  type WalletActivity,
  type WalletAsset,
} from "@/registry/crypto-wallet";

// Illustrative values only. This demo never connects to a wallet or submits transactions.
const account: WalletAccount = {
  name: "Everyday wallet",
  address: "0x000000000000000000000000000000000000dEaD",
  network: "Ethereum · Demo account",
  balance: "$12,840.50",
  change: "+$284.32 · 2.26% today",
};

const assets: WalletAsset[] = [
  {
    id: "ethereum:eth",
    name: "Ethereum",
    symbol: "ETH",
    balance: "2.4500",
    value: "$7,840.00",
    icon: (
      <svg viewBox="0 0 16 20" fill="currentColor">
        <path d="m8 0 7 10-7 4-7-4L8 0Z" opacity=".55" />
        <path d="m8 15 7-4-7 9-7-9 7 4Z" />
      </svg>
    ),
  },
  {
    id: "ethereum:usdc",
    name: "USD Coin",
    symbol: "USDC",
    balance: "3,250.50",
    value: "$3,250.50",
    icon: <span>$</span>,
  },
  {
    id: "ethereum:uni",
    name: "Uniswap",
    symbol: "UNI",
    balance: "250.00",
    value: "$1,750.00",
    icon: <span>U</span>,
  },
];

const activity: WalletActivity[] = [
  {
    id: "1",
    type: "receive",
    label: "Received ETH",
    time: "Today, 10:42",
    amount: "+0.25 ETH",
    status: "confirmed",
  },
  {
    id: "2",
    type: "swap",
    label: "ETH → USDC",
    time: "Yesterday",
    amount: "+320.00 USDC",
    status: "confirmed",
  },
  {
    id: "3",
    type: "send",
    label: "Sent USDC",
    time: "Sep 3, 14:08",
    amount: "−50.00 USDC",
    status: "pending",
  },
];

export function CryptoWalletPreview() {
  return (
    <div className="not-prose demo-frame crypto-wallet-preview">
      <CryptoWallet
        account={account}
        assets={assets}
        onSend={() => {}}
        onReceive={() => {}}
        onSwap={() => {}}
      />
    </div>
  );
}

const actions = {
  send: { title: "Send crypto", icon: ArrowUpRight },
  receive: { title: "Receive crypto", icon: ArrowDownLeft },
  swap: { title: "Swap tokens", icon: ArrowDownUp },
};

export function CryptoWalletDemo() {
  const [connected, setConnected] = useState(true);
  const [action, setAction] = useState<keyof typeof actions>("receive");
  const [complete, setComplete] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const Icon = actions[action].icon;

  function open(next: keyof typeof actions) {
    setAction(next);
    setComplete(false);
    dialog.current?.showModal();
  }

  return (
    <>
      <div className="not-prose demo-frame crypto-wallet-demo">
        <CryptoWallet
          account={connected ? account : null}
          assets={assets}
          activity={activity}
          onConnect={() => setConnected(true)}
          onDisconnect={() => setConnected(false)}
          onSend={() => open("send")}
          onReceive={() => open("receive")}
          onSwap={() => open("swap")}
        />
        <span className="crypto-wallet-demo-note">Sample wallet and balances. No funds move.</span>
      </div>
      <p className="demo-caption">
        Hide balances, copy the sample address, or browse activity. Disconnect to try the connection state.
      </p>
      <dialog ref={dialog} aria-labelledby="wallet-dialog-title" className="crypto-wallet-dialog">
        <div className="flex items-center justify-between gap-4">
          <h3 id="wallet-dialog-title" className="text-sm font-bold">
            {complete ? "Demo complete" : actions[action].title}
          </h3>
          <button
            type="button"
            aria-label="Close wallet dialog"
            onClick={() => dialog.current?.close()}
            className="border-border flex size-9 cursor-pointer items-center justify-center rounded-full border"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          {complete ? (
            <Check aria-hidden="true" className="size-8" />
          ) : (
            <Icon aria-hidden="true" className="size-8" />
          )}
          {complete ? (
            <span role="status">No transaction was sent. Your sample balances are unchanged.</span>
          ) : action === "receive" ? (
            <>
              <span className="text-muted-foreground text-[11px]">Sample Ethereum address</span>
              <span className="w-full text-xs break-all select-all">{account.address}</span>
              <span className="text-muted-foreground text-[11px]">
                Demo address only. Do not send funds here.
              </span>
            </>
          ) : action === "send" ? (
            <>
              <span className="text-2xl">0.05 ETH</span>
              <span className="text-muted-foreground text-[11px]">Example transfer on Ethereum</span>
              <span className="text-[11px]">This demo simulates a transfer using sample funds.</span>
            </>
          ) : (
            <>
              <span>Choose tokens and networks in the Multichain Swap demo.</span>
              <Link
                href="/components/multichain-swap"
                className="bg-foreground text-background w-full rounded-lg px-4 py-3 text-xs"
              >
                Open swap demo
              </Link>
            </>
          )}
        </div>
        {action === "send" && !complete ? (
          <button
            type="button"
            onClick={() => setComplete(true)}
            className="bg-foreground text-background min-h-11 w-full cursor-pointer rounded-lg px-4 py-3 text-xs"
          >
            Simulate send
          </button>
        ) : null}
      </dialog>
    </>
  );
}
