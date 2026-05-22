import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

export const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet" | "devnet") ?? "testnet";
export const SUI_RPC = process.env.NEXT_PUBLIC_SUI_RPC ?? getFullnodeUrl(NETWORK);

export const suiClient = new SuiClient({ url: SUI_RPC });

export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? "0x0";

export function buildChargeTransaction(
  capObjectId: string,
  amountMist: bigint,
  venueAddress: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::agent_cap::charge`,
    arguments: [
      tx.object(capObjectId),
      tx.pure.u64(amountMist),
      tx.pure.address(venueAddress),
      tx.object("0x6"), // clock
    ],
  });
  return tx;
}

export function buildRevokeTransaction(capObjectId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::agent_cap::revoke`,
    arguments: [tx.object(capObjectId)],
  });
  return tx;
}

export function buildMintCapTransaction(
  dailyCapMist: bigint,
  allowedVenues: string[]
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::agent_cap::create`,
    arguments: [
      tx.pure.u64(dailyCapMist),
      tx.pure.vector("address", allowedVenues),
      tx.object("0x6"),
    ],
  });
  return tx;
}

export function mistToUsd(mist: bigint, suiPriceUsd = 4.18): number {
  return Number(mist) / 1_000_000_000 * suiPriceUsd;
}

export function usdToMist(usd: number, suiPriceUsd = 4.18): bigint {
  return BigInt(Math.floor((usd / suiPriceUsd) * 1_000_000_000));
}

export const DEEPBOOK_PACKAGE = "0x000000000000000000000000000000000000000000000000000000000000dee9";
export const SUI_USDC_POOL = "0x4405b50d791fd3346754e8171aaab6bc2ed26c2c46efdd033c14b30ae507ac33";
