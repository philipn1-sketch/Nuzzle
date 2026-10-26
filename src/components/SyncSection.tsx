import { getRandomBytes } from 'expo-crypto';
import { useState } from 'react';
import { Share, StyleSheet, TextInput, View } from 'react-native';

import { APP_NAME } from '../config';
import { span } from '../core/format';
import { CODE_LENGTH, cleanCode, isCode, makeCode, showCode } from '../core/sync';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { radius, space, TAP, type } from '../theme';
import { PlusCard } from './PlusGate';
import { QuietButton, SecondaryButton, T } from './ui';

/**
 * Backup and the second phone. No accounts: one phone starts and gets a family code, the other
 * types it in. Both then keep the same feeds, and the online copy is the backup.
 */
export function SyncSection() {
  const { sync, startSync, stopSync, syncNow, settings, updateSettings, plus } = useApp();
  const p = usePalette();
  const now = useNow(30_000);
  const [joining, setJoining] = useState(false);
  const [typed, setTyped] = useState('');
  const [sure, setSure] = useState(false);

  if (!sync.available) {
    return <T tone="muted" style={type.label}>Backup and sharing with a second phone aren't set up in this build yet.</T>;
  }

  if (!plus && !sync.code) return <PlusCard feature="sharing" />;
  if (!plus) {
    return (
      <View style={{ gap: space.s }}>
        <T style={type.label}>Sharing is paused. Your feeds are safe on this phone, and sharing picks up again with Nuzzle Plus.</T>
        <PlusCard feature="sharing" />
      </View>
    );
  }

  if (sync.code) {
    const status =
      sync.state === 'offline'
        ? "Can't reach the backup right now. Your feeds are safe here and will go up when there's a signal."
        : sync.state === 'syncing' && !sync.lastOk
          ? 'Backing up for the first time.'
          : sync.lastOk
            ? `Backed up and in step. Last checked ${now - sync.lastOk < 60_000 ? 'just now' : `${span(now - sync.lastOk)} ago`}.`
            : 'Backing up.';
    return (
      <View style={{ gap: space.s }}>
        <T tone="muted" style={type.label}>Family code</T>
        <T testID="family-code" style={[type.title, styles.code]} selectable accessibilityLabel={`Family code ${[...sync.code].join(' ')}`}>
          {showCode(sync.code)}
        </T>
        <T tone="muted" style={type.label} accessibilityLiveRegion="polite">{status}</T>
        <T tone="muted" style={type.label}>
          On the other phone, open {APP_NAME}, then Settings, then Join with a code. Anyone with this code can see and change these feeds.
        </T>
        {!settings.codeSaved && (
          <View testID="save-code-note" style={[styles.note, { borderColor: p.accent }]}>
            <T style={type.label}>
              Keep this code somewhere safe, like Notes or a message to your partner. If this phone is lost, the code brings your feeds
              back.
            </T>
            <QuietButton label="I've saved it" style={styles.left} onPress={() => updateSettings({ codeSaved: true })} testID="code-saved" />
          </View>
        )}
        <QuietButton
          label={settings.codeSaved ? 'Send the code ›' : 'Save or send the code ›'}
          tone="ink"
          style={styles.left}
          testID="send-code"
          onPress={() =>
            Share.share({
              message: `Our ${APP_NAME} family code: ${showCode(sync.code ?? '')}\n\nKeep this safe. On a new phone, open ${APP_NAME}, then Settings, then Join with a code.`,
            })
              .then((r) => r.action === Share.sharedAction && updateSettings({ codeSaved: true }))
              .catch(() => {})
          }
        />
        <QuietButton label="Check now ›" tone="ink" style={styles.left} onPress={syncNow} testID="sync-now" />
        {sure ? (
          <View style={{ gap: space.xs }}>
            <T style={type.label}>This phone stops sharing. Its feeds stay on it, and the backup stays for the other phone.</T>
            <SecondaryButton label="Stop sharing on this phone" onPress={() => { stopSync(); setSure(false); }} />
            <SecondaryButton label="Keep sharing" strong onPress={() => setSure(false)} />
          </View>
        ) : (
          <QuietButton label="Stop sharing on this phone" style={styles.left} onPress={() => setSure(true)} />
        )}
      </View>
    );
  }

  const code = cleanCode(typed);
  return (
    <View style={{ gap: space.s }}>
      <T tone="muted" style={type.label}>
        Keep a backup online and share feeds with a second phone, so both of you see the same timer and history. No account needed.
      </T>
      {joining ? (
        <View style={{ gap: space.s }}>
          <T style={type.label}>Type the family code from the other phone.</T>
          <TextInput
            testID="join-code"
            value={typed}
            onChangeText={(t) => setTyped(t.slice(0, CODE_LENGTH + 4))}
            placeholder="K7QM 2XPA C4HW"
            placeholderTextColor={p.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Family code"
            style={[type.title, styles.input, { color: p.ink, backgroundColor: p.surface }]}
          />
          {code.length === CODE_LENGTH && !isCode(code) && <T style={type.label}>That doesn't look right. Check it against the other phone.</T>}
          <SecondaryButton label="Join" strong testID="join" onPress={() => isCode(code) && startSync(code, true)} />
          <SecondaryButton label="Cancel" onPress={() => { setJoining(false); setTyped(''); }} />
        </View>
      ) : (
        <View style={{ gap: space.xs }}>
          <SecondaryButton label="Start backup and sharing" strong testID="start-sync" onPress={() => startSync(makeCode(getRandomBytes(CODE_LENGTH)), false)} />
          <SecondaryButton label="Join with a code" testID="join-sync" onPress={() => setJoining(true)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { borderWidth: 1.5, borderRadius: radius.row, paddingHorizontal: space.l, paddingTop: space.m, gap: space.xs },
  code: { fontSize: 28, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  input: { minHeight: TAP, borderRadius: radius.row, paddingHorizontal: space.l, letterSpacing: 2 },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
});
