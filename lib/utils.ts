const SUI_ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const WAL_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randStr(seed: number, alpha: string, len: number): string {
  const r = mulberry32(seed);
  let out = "";
  for (let i = 0; i < len; i++) out += alpha[Math.floor(r() * alpha.length)];
  return out;
}

export function suiDigest(seed: number): string { return randStr(seed, SUI_ALPHA, 44); }
export function walrusBlob(seed: number): string { return randStr(seed + 7717, WAL_ALPHA, 43); }
export function shortId(s: string, h = 6, t = 4): string {
  return s.length > h + t + 1 ? `${s.slice(0, h)}…${s.slice(-t)}` : s;
}

export function withProofs<T = Record<string, unknown>>(item: Record<string, unknown>): T {
  const seed = ((Number(item.id) * 2654435761) >>> 0);
  return {
    gas: 12345 + (seed % 4200),
    epoch: 612 + ((seed >>> 4) % 3),
    checkpoint: 84201399 + ((seed >>> 8) % 9000),
    signer: "0x7a…f3",
    txDigest: item.txDigest ?? suiDigest(seed),
    walrusCid: item.walrusCid ?? walrusBlob(seed),
    ...item,
  } as unknown as T;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function timeNow(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
