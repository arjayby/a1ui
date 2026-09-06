# Multichain Swap

A crypto swap form with network selection, token balances, and cross-chain quote details.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Token swap forms with network selection, balances, slippage, and quote review.

## Limitations

- No live quotes, wallet connection, bridge execution, or transaction submission is included.

## Integration requirements

- Control the form value and supply wallet and quote callbacks. Select Menu is included in this item.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/multichain-swap)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/multichain-swap.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/multichain-swap.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/multichain-swap.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/multichain-swap.json --yes
```

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import {
  MultichainSwap,
  type SwapAsset,
  type SwapQuote,
  type SwapValue,
} from "@/components/ui/multichain-swap";

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
    id: "base:usdc",
    chainId: "8453",
    chainName: "Base",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    spendableBalance: "860.50",
  },
];

// Supply these callbacks from your wallet and quote integrations.
export function SwapPanel({
  connected,
  quote,
  quoteStatus,
  connectWallet,
  requestQuote,
  reviewSwap,
}: {
  connected: boolean;
  quote: SwapQuote | null;
  quoteStatus: "idle" | "loading" | "error";
  connectWallet: () => void;
  requestQuote: (value: SwapValue) => void;
  reviewSwap: (value: SwapValue, quote: SwapQuote) => void;
}) {
  const [value, setValue] = useState<SwapValue>({
    fromAssetId: "ethereum:eth",
    toAssetId: "base:usdc",
    amount: "",
    slippageBps: 50,
  });

  return (
    <MultichainSwap
      assets={assets}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        requestQuote(next);
      }}
      quote={quote}
      quoteStatus={quoteStatus}
      connected={connected}
      onConnect={connectWallet}
      onReview={reviewSwap}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/multichain-swap.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop                 | Type                                           | Default          | Purpose                                                        |
| -------------------- | ---------------------------------------------- | ---------------- | -------------------------------------------------------------- |
| `assets`             | `SwapAsset[]`                                  | Required         | Available tokens grouped by chain.                             |
| `value`              | `SwapValue`                                    | Required         | Selected assets, decimal amount, and slippage in basis points. |
| `onValueChange`      | `(value: SwapValue) => void`                   | Required         | Receives edits, balance shortcuts, and direction changes.      |
| `quote`              | `SwapQuote \| null`                            | None             | Provider quote tied to its original input.                     |
| `quoteStatus`        | `"idle" \| "loading" \| "error"`               | `"idle"`         | Shows quote loading or failure and disables review.            |
| `quoteError`         | `string`                                       | Built-in message | Explains a quote failure.                                      |
| `connected`          | `boolean`                                      | `false`          | Shows spendable balances and enables review.                   |
| `onConnect`          | `() => void`                                   | None             | Opens your wallet connection flow.                             |
| `onReview`           | `(value: SwapValue, quote: SwapQuote) => void` | None             | Opens your review flow for the current valid quote.            |
| `disabled`           | `boolean`                                      | `false`          | Locks the form during wallet or transaction work.              |
| `label`              | `string`                                       | `"Multichain"`   | Small label in the header.                                     |
| `className`, `style` | `string`, `CSSProperties`                      | None             | Layout and theme overrides.                                    |

Give every asset a unique `id` across chains. `chainId` and `chainName` group the network options. `symbol`, `name`, and `decimals` describe the token. An optional `icon` replaces the letter fallback. Token decimals must be integers between 0 and 36. Keep contract addresses and provider-specific chain identifiers in your adapter, keyed by asset ID.

Pass `spendableBalance` as an unformatted decimal string after reserving any native token needed for gas. The form uses it for the 50% and MAX shortcuts and exact balance checks. An omitted balance displays as unknown and skips the balance check. The example balances are samples; replace them with balances for the connected wallet.

`SwapValue` contains `fromAssetId`, `toAssetId`, `amount`, and `slippageBps`. Amounts stay as strings, and validation uses integer token units to preserve precision. The slippage menu offers 0.1%, 0.5%, and 1%. You can also supply a value between 1 and 500 basis points. Changing a network keeps the current token symbol when available, then falls back to another token. The same token on different chains is allowed. Reversing the route uses the quoted output as the new input, or clears the amount when no current quote exists.

`SwapQuote` contains the original `value`, decimal strings for `amountOut` and `minimumReceived`, and display strings for `networkFee`, `estimatedTime`, and `route`. The form hides quotes whose input differs from the current selection. It also disables review for missing quotes, loading, failures, invalid amounts, insufficient known balances, and identical source and destination assets.

The component handles the form and calls `onReview`; your app handles wallet connections, quote requests, recipient selection, token approvals, and transaction submission. Debounce requests in your quote adapter, discard responses for obsolete requests, and set `quote` to `null` when it expires or the wallet changes. Refetch and validate the quote, balances, destination account, and network before submission. Set `disabled` while a connection or submission is pending. Never attach a new input to an old quote.

The demo uses fixed sample prices, fees, and balances. Its review dialog only simulates completion. Installation includes the swap component, [Select Menu](http://localhost:3000/components/select-menu), and their dependencies. It does not include a wallet or swap SDK.

Networks, tokens, and slippage use the shared [Select Menu](http://localhost:3000/components/select-menu). Menus show the selected option, support arrow keys and typeahead, and close with Escape or an outside click. Token options show their name, icon, and available balance. Menus render outside the card to avoid clipping and carry the swap's theme into the portal. Inputs and quote status have accessible labels, each instance has unique field IDs, and transitions respect reduced motion. The form inherits the project's theme. Override `--swap-background`, `--swap-foreground`, `--swap-muted`, `--swap-border`, and `--swap-panel` through `style` to change its colors.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
