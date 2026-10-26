import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PillButton, PrimaryButton, QuietButton, Screen, T, TopBar } from '../components/ui';
import { PLUS_FEATURES, plusStatus, PRICES, TRIAL_DAYS, type PlusFeature } from '../core/plus';
import { PRIVACY_URL, TERMS_URL } from '../config';
import { buy, restore, storePrices, type Product } from '../services/purchases';
import { useApp } from '../state/AppState';
import { usePalette } from '../state/theme';
import { radius, space, type, wash } from '../theme';

/** What Nuzzle Plus adds, and how to get it. The feature she tapped comes first. */
export default function Plus() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const { settings, updateSettings, plus } = useApp();
  const p = usePalette();
  const now = Date.now();
  const [product, setProduct] = useState<Product>('lifetime');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // the App Store's own prices for her country; the Australian prices show until they arrive
  const [prices, setPrices] = useState<Partial<Record<Product, string>>>({});
  useEffect(() => {
    storePrices().then(setPrices).catch(() => {});
  }, []);
  const price = (k: Product) => (prices[k] ? `${prices[k]} ${k === 'lifetime' ? 'once' : 'a month'}` : PRICES[k]);
  const owned = settings.plus?.owned !== undefined;

  const first = PLUS_FEATURES.find((f) => f.id === (feature as PlusFeature));
  const list = first ? [first, ...PLUS_FEATURES.filter((f) => f !== first)] : PLUS_FEATURES;

  const unlock = (what: Product) => updateSettings({ plus: { ...settings.plus, owned: what } });
  const onBuy = async () => {
    setMessage(null);
    setBusy(true);
    const r = await buy(product);
    setBusy(false);
    if (r === 'bought') {
      unlock(product);
      router.back();
    } else if (r === 'pending') setMessage('Waiting for approval. Nuzzle Plus turns on as soon as it is approved.');
    else if (r === 'failed') setMessage("The App Store couldn't finish that. Nothing was charged; please try again.");
  };
  const onRestore = async () => {
    setMessage(null);
    try {
      const r = await restore();
      if (r) unlock(r);
      setMessage(r ? 'Nuzzle Plus is back on this phone.' : 'No earlier purchase was found for this Apple ID.');
    } catch {
      setMessage("Couldn't reach the App Store. Check the connection and try again.");
    }
  };

  return (
    <Screen>
      <TopBar left={<PillButton label="Close" onPress={() => router.back()} testID="plus-close" />} title="Nuzzle Plus" />
      <ScrollView contentContainerStyle={styles.body}>
        <T tone="muted" style={type.body}>{plusStatus(settings, now)}</T>
        {plus && <T tone="muted" style={type.label}>The feed timer, reminders, logging and history are always free.</T>}
        <View style={{ gap: space.m }}>
          {list.map((f) => (
            <View key={f.id} style={[styles.feature, { backgroundColor: p.surface }]}>
              <T style={type.body}>{f.title}</T>
              <T tone="muted" style={type.label}>{f.line}</T>
            </View>
          ))}
        </View>
      </ScrollView>
      {!owned && (
        <View style={styles.bottom}>
          <View style={{ flexDirection: 'row', gap: space.s }} accessibilityRole="radiogroup" accessibilityLabel="Choose how to pay">
            {(['lifetime', 'monthly'] as Product[]).map((k) => {
              const on = product === k;
              return (
                <Pressable
                  key={k}
                  testID={`plus-${k}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setProduct(k)}
                  style={[styles.option, { backgroundColor: on ? wash(p.accent, '26') : p.surface, borderColor: on ? p.accent : 'transparent' }]}
                >
                  <T style={type.body}>{k === 'lifetime' ? 'For life' : 'Monthly'}</T>
                  <T tone="muted" style={type.label}>{price(k)}</T>
                </Pressable>
              );
            })}
          </View>
          {message && <T accessibilityLiveRegion="polite" style={[type.label, { textAlign: 'center' }]}>{message}</T>}
          <PrimaryButton
            label={busy ? 'Opening the App Store' : product === 'lifetime' ? `Get Nuzzle Plus for ${price('lifetime')}` : `Get Nuzzle Plus for ${price('monthly')}`}
            onPress={busy ? () => {} : onBuy}
            testID="plus-buy"
          />
          <T tone="muted" style={[type.small, { textAlign: 'center' }]}>
            {product === 'monthly'
              ? `Payment is charged to your Apple ID. Monthly renews automatically at ${price('monthly')} unless cancelled at least 24 hours before the month ends, in Settings, your name, Subscriptions.`
              : 'One payment, charged to your Apple ID. Shared with your Apple family.'}
            {' '}New phones get {TRIAL_DAYS} days of Plus free.
          </T>
          <View style={styles.links}>
            <QuietButton label="Restore" onPress={onRestore} testID="plus-restore" />
            <QuietButton label="Terms" onPress={() => Linking.openURL(TERMS_URL)} testID="plus-terms" />
            <QuietButton label="Privacy" onPress={() => Linking.openURL(PRIVACY_URL)} testID="plus-privacy" />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingBottom: space.xl, gap: space.l },
  feature: { borderRadius: radius.row, paddingHorizontal: space.l, paddingVertical: space.m, gap: 2 },
  bottom: { paddingHorizontal: space.side, gap: space.s },
  links: { flexDirection: 'row', justifyContent: 'center', gap: space.l },
  option: { flex: 1, borderRadius: radius.row, borderWidth: 2, paddingHorizontal: space.l, paddingVertical: space.m, gap: 2 },
});
