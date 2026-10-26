/**
 * Buying Nuzzle Plus through the App Store. Not connected yet: the store products and the purchase
 * library come once the App Store Connect side is set up. Until then nothing can be bought, and the
 * paywall says so plainly.
 */
export type Product = 'monthly' | 'lifetime';
export type BuyResult = 'bought' | 'cancelled' | 'unavailable';

export const purchasesAvailable = false;

export async function buy(_product: Product): Promise<BuyResult> {
  return 'unavailable';
}

/** Anything bought before on this Apple ID; null when nothing is found or the store can't be reached. */
export async function restore(): Promise<Product | null> {
  return null;
}
