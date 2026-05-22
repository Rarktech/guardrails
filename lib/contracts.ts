import { Transaction } from "@mysten/sui/transactions";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? "0x0";
const CLOCK_ID = "0x6";

// DeepBook SUI/USDC pool on testnet
export const DEEPBOOK_POOL_SUI_USDC = "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";

export function buildMintCapTx(
  dailyCapMist: bigint,
  allowedVenues: string[],
  personality: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::cap::mint`,
    arguments: [
      tx.pure.u64(dailyCapMist),
      tx.pure.vector("address", allowedVenues),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(personality))),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildChargeTx(
  capObjectId: string,
  amountMist: bigint,
  venue: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::cap::charge`,
    arguments: [
      tx.object(capObjectId),
      tx.pure.u64(amountMist),
      tx.pure.address(venue),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildRevokeTx(capObjectId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::cap::revoke`,
    arguments: [
      tx.object(capObjectId),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildLogTx(
  registryId: string,
  capId: string,
  action: string,
  amountUsd: bigint,
  venue: string,
  allowed: boolean,
  walrusBlob: Uint8Array,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::audit::log`,
    arguments: [
      tx.object(registryId),
      tx.pure.id(capId),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(action))),
      tx.pure.u64(amountUsd),
      tx.pure.address(venue),
      tx.pure.bool(allowed),
      tx.pure.vector("u8", Array.from(walrusBlob)),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildDeepBookSwapTx(
  capObjectId: string,
  poolId: string,
  coinInType: string,
  coinOutType: string,
  amountMist: bigint,
  minOutMist: bigint,
  senderAddress: string,
): Transaction {
  const tx = new Transaction();

  // Split the input coin from gas
  const [splitCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);

  // Swap on DeepBook
  const [swapOut] = tx.moveCall({
    target: "0xdeep::pool::swap_exact_base_for_quote",
    typeArguments: [coinInType, coinOutType],
    arguments: [
      tx.object(poolId),
      splitCoin,
      tx.pure.u64(minOutMist),
      tx.object(CLOCK_ID),
    ],
  });

  // Charge the AgentCap — this aborts the whole tx if over budget
  tx.moveCall({
    target: `${PACKAGE_ID}::cap::charge`,
    arguments: [
      tx.object(capObjectId),
      tx.pure.u64(amountMist),
      tx.pure.address(poolId),
      tx.object(CLOCK_ID),
    ],
  });

  // Return the output coin to sender
  tx.transferObjects([swapOut], tx.pure.address(senderAddress));

  return tx;
}
