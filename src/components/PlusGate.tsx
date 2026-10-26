import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { PLUS_FEATURES, type PlusFeature } from '../core/plus';
import { useApp } from '../state/AppState';
import { space, type } from '../theme';
import { Card, SecondaryButton, T } from './ui';
import { t } from '../i18n';

/** Shows its children with Nuzzle Plus, or a short card saying what Plus adds here. */
export function PlusGate({ feature, children }: { feature: PlusFeature; children: ReactNode }) {
  const { plus } = useApp();
  if (plus) return <>{children}</>;
  return <PlusCard feature={feature} />;
}

export function PlusCard({ feature }: { feature: PlusFeature }) {
  const f = PLUS_FEATURES.find((x) => x.id === feature)!;
  return (
    <Card style={{ gap: space.m }}>
      <T tone="muted" style={type.small}>{t('NUZZLE PLUS')}</T>
      <T style={type.title}>{t(f.title)}</T>
      <T tone="muted" style={type.label}>{t(f.line)}</T>
      <SecondaryButton strong label={t('See Nuzzle Plus')} onPress={() => router.push(`/plus?feature=${feature}`)} testID={`plus-${feature}`} />
    </Card>
  );
}
