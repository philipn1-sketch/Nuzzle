import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PillButton, PrimaryButton, QuietButton, Screen, T, TopBar } from '../components/ui';
import { PLUS_FEATURES, plusStatus, PRICES, TRIAL_DAYS, type PlusFeature } from '../core/plus';
import { buy, restore, type Product } from '../services/purchases';
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
  const owned = settings.plus?.owned !== undefined;

  const first = PLUS_FEATURES.find((f) => f.id === (feature as PlusFeature));
  const list = first ? [first, ...PLUS_FEATURES.filter((f) => f !== first)] : PLUS_FEATURES;

  const unlock = (what: Product) => updateSettings({ plus: { ...settings.plus, owned: what } });
  const onBuy = async () => {
    const r = await buy(product);
    if (r === 'bought') {
      unlock(product);
      router.back();
    } else if (r === 'unavailable') setMessage('Nuzzle Plus can be bought once Nuzzle is in the App Store.');
  };
  const onRestore = async () => {
    const r = await restore();
    if (r) unlock(r);
    setMessage(r ? 'Nuzzle Plus is back on this phone.' : 'No earlier purchase was found for this Apple ID.');
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
                  <T tone="muted" style={type.label}>{PRICES[k]}</T>
                </Pressable>
              );
            })}
          </View>
          {message && <T accessibilityLiveRegion="polite" style={[type.label, { textAlign: 'center' }]}>{message}</T>}
          <PrimaryButton label={product === 'lifetime' ? 'Get Nuzzle Plus for life' : 'Get Nuzzle Plus'} onPress={onBuy} testID="plus-buy" />
          <T tone="muted" style={[type.small, { textAlign: 'center' }]}>
            New phones get {TRIAL_DAYS} days free. Monthly renews until you cancel in your Apple ID settings.
          </T>
          <QuietButton label="Restore an earlier purchase" onPress={onRestore} testID="plus-restore" />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingBottom: space.xl, gap: space.l },
  feature: { borderRadius: radius.row, paddingHorizontal: space.l, paddingVertical: space.m, gap: 2 },
  bottom: { paddingHorizontal: space.side, gap: space.s },
  option: { flex: 1, borderRadius: radius.row, borderWidth: 2, paddingHorizontal: space.l, paddingVertical: space.m, gap: 2 },
});
