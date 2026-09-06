# Crypto Wallet

A wallet overview with token balances, recent activity, and send, receive, and swap actions.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Wallet account overview, token holdings, and transaction activity.

## Limitations

- Presentation only. No wallet SDK, balance fetching, signing, or transaction submission is included.

## Integration requirements

- Supply account data and callbacks from the app wallet integration.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/crypto-wallet)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/crypto-wallet.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/crypto-wallet.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/crypto-wallet.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/crypto-wallet.json --yes
```

## Code


### Usage

```tsx
"use client";

import { CryptoWallet, type CryptoWalletProps } from "@/components/ui/crypto-wallet";

// Supply account data and callbacks from your wallet integration.
export function WalletPanel({
  account,
  assets,
  activity,
  status,
  error,
  onConnect,
  onDisconnect,
  onSend,
  onReceive,
  onSwap,
}: CryptoWalletProps) {
  return (
    <CryptoWallet
      account={account}
      assets={assets}
      activity={activity}
      status={status}
      error={error}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      onSend={onSend}
      onReceive={onReceive}
      onSwap={onSwap}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/crypto-wallet.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop                            | Type                                             | Default          | Purpose                                                                                |
| ------------------------------- | ------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------- |
| `account`                       | `WalletAccount \| null`                          | Required         | Connected account, or `null` for the connection screen.                                |
| `assets`                        | `WalletAsset[]`                                  | `[]`             | Token holdings for the current account and network.                                    |
| `activity`                      | `WalletActivity[]`                               | `[]`             | Transactions in the order you want to display them.                                    |
| `status`                        | `"idle" \| "connecting" \| "loading" \| "error"` | `"idle"`         | Connection or data state. Non-idle states hide balances and lists and disable actions. |
| `error`                         | `string`                                         | Built-in message | Connection or data error displayed when status is `"error"`.                           |
| `onConnect`                     | `() => void`                                     | None             | Opens your connection flow. Required to enable Connect wallet.                         |
| `onDisconnect`                  | `() => void`                                     | None             | Disconnects through your adapter. Omit to hide the button.                             |
| `onSend`, `onReceive`, `onSwap` | `(account: WalletAccount) => void`               | None             | Opens the corresponding flow for the current account. Omitted actions are disabled.    |
| `className`, `style`            | `string`, `CSSProperties`                        | None             | Layout and theme overrides.                                                            |

`WalletAccount` requires `name`, `address`, `network`, and `balance`. `balance` is a formatted display string, such as `"$12,840.50"`. The optional `change` is also a display string, such as `"+$284.32 · 2.26% today"`. The component does not calculate prices or balances.

Each `WalletAsset` requires a unique `id`, `name`, `symbol`, `balance`, and `value`. Pass token quantities as formatted strings and fiat values with their currency symbols. An optional `icon` replaces the symbol's first letter. Each `WalletActivity` requires a unique `id`, `type` of `"send"`, `"receive"`, or `"swap"`, a `label`, formatted `time`, formatted `amount`, and `status` of `"confirmed"`, `"pending"`, or `"failed"`.

Set `status="connecting"` while your wallet connection is pending and `status="loading"` while fetching holdings. On failure, use `status="error"` and supply an error message with recovery instructions. Return to `"idle"` after resolving the request. Clear or replace the account's assets and activity when the address or network changes, and discard responses for previous accounts. Callbacks hand control to your app; your adapter owns connections, data fetching, recipient validation, approvals, and transaction submission.

Hiding balances removes monetary values from both the visible content and the accessibility tree, including activity amounts. It is a display preference, not encryption. The copy button writes the full address to the clipboard. If clipboard access fails, it shows the full selectable address. Copy feedback resets when the account address or network changes.

Tokens and Activity use [Base UI Tabs](https://base-ui.com/react/components/tabs) for arrow-key navigation and panel associations. Buttons have keyboard focus styles, empty lists show an empty state, and copy, loading, and error messages are announced to assistive technology. Transitions respect reduced motion. The component inherits the app's theme; override `--wallet-background`, `--wallet-foreground`, `--wallet-muted`, `--wallet-border`, and `--wallet-panel` through `style` to change its colors.

The demo uses sample data. Connect and disconnect only change its local state. Send simulates completion, Receive shows a sample address, and Swap links to [Multichain Swap](http://localhost:3000/components/multichain-swap). Installation includes the wallet component and its dependencies, without a wallet SDK.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
