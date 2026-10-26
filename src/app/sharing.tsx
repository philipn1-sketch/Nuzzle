import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { SyncSection } from '../components/SyncSection';
import { Card, PillButton, Screen, T, TopBar } from '../components/ui';
import { useApp } from '../state/AppState';
import { space, type } from '../theme';
import { t } from '../i18n';

/** Backup and the second phone, on their own screen so Settings stays short. */
export default function Sharing() {
  const { sync } = useApp();
  return (
    <Screen>
      <TopBar left={<PillButton label={t('Back')} onPress={() => router.back()} testID="back" />} title={t('Backup and sharing')} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: space.m }}>
          <SyncSection />
        </Card>
        <T tone="muted" style={type.label}>
          {sync.code ? t('Your feeds are on this phone and in the backup. Nothing else is sent anywhere.') : t('Until you start sharing, everything stays on this phone. Nothing is sent anywhere.')}
        </T>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingTop: space.s, paddingBottom: space.xxl, gap: space.l },
});
