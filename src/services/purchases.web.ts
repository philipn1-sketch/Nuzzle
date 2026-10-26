// The web preview has no App Store; these stand ins keep the paywall working on screen.
export type Product = 'monthly' | 'lifetime';
export type BuyResult = 'bought' | 'pending' | 'cancelled' | 'failed';
export const PRODUCT_IDS: Record<Product, string> = { monthly: 'com.philipnader.nuzzle.plus.monthly', lifetime: 'com.philipnader.nuzzle.plus.lifetime' };
export const storePrices = async (): Promise<Partial<Record<Product, string>>> => ({});
export const buy = async (_product: Product): Promise<BuyResult> => 'failed';
export const owned = async (): Promise<Product | null> => {
  throw new Error('store unavailable');
};
export const restore = owned;
