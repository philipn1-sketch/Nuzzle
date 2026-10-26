import { getRandomBytes } from 'expo-crypto';
import { useState } from 'react';
import { Share, StyleSheet, TextInput, View } from 'react-native';

import { APP_NAME } from '../config';
import { span } from '../core/format';
import { CODE_LENGTH, cleanCode, isCode, makeCode, showCode } from '../core/sync';
import { deleteBackup } from '../services/sync';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { radius, space, TAP, type } from '../theme';
import { PlusCard } from './PlusGate';
import { QuietButton, SecondaryButton, T } from './ui';
import { t } from '../i18n';

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
  const [erase, setErase] = useState(false);
  const [eraseProblem, setEraseProblem] = useState<string | null>(null);

  if (!sync.available) {
    return <T tone="muted" style={type.label}>{t("Backup and sharing with a second phone aren't set up in this build yet.")}</T>;
  }

  if (!plus && !sync.code) return <PlusCard feature="sharing" />;
  if (!plus) {
    return (
      <View style={{ gap: space.s }}>
        <T style={type.label}>{t('Sharing is paused. Your feeds are safe on this phone, and sharing picks up again with Nuzzle Plus.')}</T>
        <PlusCard feature="sharing" />
      </View>
    );
  }

  if (sync.code) {
    const status =
      sync.state === 'offline'
        ? t("Can't reach the backup right now. Your feeds are safe here and will go up when there's a signal.")
        : sync.state === 'syncing' && !sync.lastOk
          ? t('Backing up for the first time.')
          : sync.lastOk
            ? now - sync.lastOk < 60_000
              ? t('Backed up and in step. Last checked just now.')
              : t('Backed up and in step. Last checked {time} ago.', { time: span(now - sync.lastOk) })
            : t('Backing up.');
    return (
      <View style={{ gap: space.s }}>
        <T tone="muted" style={type.label}>{t('Family code')}</T>
        <T testID="family-code" style={[type.title, styles.code]} selectable accessibilityLabel={t('Family code {code}', { code: [...sync.code].join(' ') })}>
          {showCode(sync.code)}
        </T>
        <T tone="muted" style={type.label} accessibilityLiveRegion="polite">{status}</T>
        <T tone="muted" style={type.label}>
          {t('On the other phone, open {app}, then Settings, then Join with a code. Anyone with this code can see and change these feeds.', { app: APP_NAME })}
        </T>
        {!settings.codeSaved && (
          <View testID="save-code-note" style={[styles.note, { borderColor: p.accent }]}>
            <T style={type.label}>
              {t('Keep this code somewhere safe, like Notes or a message to your partner. If this phone is lost, the code brings your feeds back.')}
            </T>
            <QuietButton label={t("I've saved it")} style={styles.left} onPress={() => updateSettings({ codeSaved: true })} testID="code-saved" />
          </View>
        )}
        <QuietButton
          label={settings.codeSaved ? t('Send the code ›') : t('Save or send the code ›')}
          tone="ink"
          style={styles.left}
          testID="send-code"
          onPress={() =>
            Share.share({
              message: t('Our {app} family code: {code}\n\nKeep this safe. On a new phone, open {app}, then Settings, then Join with a code.', { app: APP_NAME, code: showCode(sync.code ?? '') }),
            })
              .then((r) => r.action === Share.sharedAction && updateSettings({ codeSaved: true }))
              .catch(() => {})
          }
        />
        <QuietButton label={t('Check now ›')} tone="ink" style={styles.left} onPress={syncNow} testID="sync-now" />
        {sure ? (
          <View style={{ gap: space.xs }}>
            <T style={type.label}>{t('This phone stops sharing. Its feeds stay on it, and the backup stays for the other phone.')}</T>
            <SecondaryButton label={t('Stop sharing on this phone')} onPress={() => { stopSync(); setSure(false); }} />
            <SecondaryButton label={t('Keep sharing')} strong onPress={() => setSure(false)} />
          </View>
        ) : erase ? (
          <View style={{ gap: space.xs }}>
            <T style={type.label}>
              {t('This deletes the online copy for good, for every phone using this code. The feeds on this phone stay, and it stops sharing.')}
            </T>
            {eraseProblem && <T tone="muted" style={type.label} accessibilityLiveRegion="polite">{eraseProblem}</T>}
            <SecondaryButton
              label={t('Delete the online backup')}
              testID="delete-backup-confirm"
              onPress={() => {
                const code = sync.code ?? '';
                setEraseProblem(null);
                deleteBackup(code)
                  .then(() => {
                    stopSync();
                    setErase(false);
                  })
                  .catch(() => setEraseProblem(t("Couldn't reach the backup. Check the connection and try again.")));
              }}
            />
            <SecondaryButton label={t('Keep it')} strong onPress={() => setErase(false)} />
          </View>
        ) : (
          <>
            <QuietButton label={t('Stop sharing on this phone')} style={styles.left} onPress={() => setSure(true)} />
            <QuietButton label={t('Delete the online backup')} style={styles.left} onPress={() => setErase(true)} testID="delete-backup" />
          </>
        )}
      </View>
    );
  }

  const code = cleanCode(typed);
  return (
    <View style={{ gap: space.s }}>
      <T tone="muted" style={type.label}>
        {t('Keep a backup online and share feeds with a second phone, so both of you see the same timer and history. No account needed.')}
      </T>
      {joining ? (
        <View style={{ gap: space.s }}>
          <T style={type.label}>{t('Type the family code from the other phone.')}</T>
          <TextInput
            testID="join-code"
            value={typed}
            onChangeText={(t) => setTyped(t.slice(0, CODE_LENGTH + 4))}
            placeholder="K7QM 2XPA C4HW"
            placeholderTextColor={p.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel={t('Family code')}
            style={[type.title, styles.input, { color: p.ink, backgroundColor: p.surface }]}
          />
          {code.length === CODE_LENGTH && !isCode(code) && <T style={type.label}>{t("That doesn't look right. Check it against the other phone.")}</T>}
          <SecondaryButton label={t('Join')} strong testID="join" onPress={() => isCode(code) && startSync(code, true)} />
          <SecondaryButton label={t('Cancel')} onPress={() => { setJoining(false); setTyped(''); }} />
        </View>
      ) : (
        <View style={{ gap: space.xs }}>
          <SecondaryButton label={t('Start backup and sharing')} strong testID="start-sync" onPress={() => startSync(makeCode(getRandomBytes(CODE_LENGTH)), false)} />
          <SecondaryButton label={t('Join with a code')} testID="join-sync" onPress={() => setJoining(true)} />
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
