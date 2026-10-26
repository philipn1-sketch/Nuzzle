import {
  fetchProducts, finishTransaction, getAvailablePurchases, initConnection, isUserCancelledError, purchaseErrorListener,
  purchaseUpdatedListener, requestPurchase, restorePurchases, type Purchase,
} from 'expo-iap';

/**
 * Buying Nuzzle Plus through Apple's own in-app purchases: a monthly subscription, or once for life.
 * Both are set up in App Store Connect with these product IDs, and both have Family Sharing on, so
 * one purchase covers everyone in the same Apple family.
 */
export type Product = 'monthly' | 'lifetime';
export type BuyResult = 'bought' | 'pending' | 'cancelled' | 'failed';

export const PRODUCT_IDS: Record<Product, string> = {
  monthly: 'com.philipnader.nuzzle.plus.monthly',
  lifetime: 'com.philipnader.nuzzle.plus.lifetime',
};
const productFor = (id: string): Product | null => (id === PRODUCT_IDS.lifetime ? 'lifetime' : id === PRODUCT_IDS.monthly ? 'monthly' : null);

let connecting: Promise<boolean> | null = null;
function connect(): Promise<boolean> {
  connecting ??= initConnection().then(
    () => true,
    () => {
      connecting = null;
      return false;
    },
  );
  return connecting;
}

/** The App Store's own prices for her country, such as "A$9.99"; empty when the store can't be reached. */
export async function storePrices(): Promise<Partial<Record<Product, string>>> {
  if (!(await connect())) return {};
  try {
    const [subs, once] = await Promise.all([
      fetchProducts({ skus: [PRODUCT_IDS.monthly], type: 'subs' }),
      fetchProducts({ skus: [PRODUCT_IDS.lifetime], type: 'in-app' }),
    ]);
    const out: Partial<Record<Product, string>> = {};
    for (const p of [...(subs ?? []), ...(once ?? [])]) {
      const k = productFor(p.id);
      if (k) out[k] = p.displayPrice;
    }
    return out;
  } catch {
    return {};
  }
}

/** Opens Apple's purchase sheet and waits for the answer. */
export async function buy(product: Product): Promise<BuyResult> {
  if (!(await connect())) return 'failed';
  const sku = PRODUCT_IDS[product];
  return new Promise<BuyResult>((resolve) => {
    let done = false;
    const finish = (r: BuyResult) => {
      if (done) return;
      done = true;
      ok.remove();
      bad.remove();
      resolve(r);
    };
    const ok = purchaseUpdatedListener((p: Purchase) => {
      if (p.productId !== sku) return;
      // Ask to Buy: a parent has to approve it first; it arrives later and is picked up on the next launch
      if (p.purchaseState === 'pending') return finish('pending');
      finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
      finish('bought');
    });
    const bad = purchaseErrorListener((e) => finish(isUserCancelledError(e) ? 'cancelled' : 'failed'));
    const request = { apple: { sku } };
    (product === 'monthly' ? requestPurchase({ request, type: 'subs' }) : requestPurchase({ request, type: 'in-app' })).catch((e: unknown) =>
      finish(isUserCancelledError(e) ? 'cancelled' : 'failed'),
    );
  });
}

/**
 * What this Apple ID owns right now: lifetime, an active monthly subscription, or nothing (null).
 * Throws when the store can't be reached, so a phone that is offline never loses Plus by mistake.
 */
export async function owned(): Promise<Product | null> {
  if (!(await connect())) throw new Error('store unavailable');
  const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
  const ids = new Set((purchases ?? []).map((p) => p.productId));
  if (ids.has(PRODUCT_IDS.lifetime)) return 'lifetime';
  if (ids.has(PRODUCT_IDS.monthly)) return 'monthly';
  return null;
}

/** Restore purchases: asks the App Store again, then reports what this Apple ID owns. */
export async function restore(): Promise<Product | null> {
  if (!(await connect())) throw new Error('store unavailable');
  await restorePurchases();
  return owned();
}
