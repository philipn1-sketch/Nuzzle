import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { usePalette } from '../state/theme';
import { radius, space, type } from '../theme';
import { PrimaryButton, QuietButton, T } from './ui';
import { t } from '../i18n';

/**
 * A calendar to pick a day from, in a sheet over the screen. Apple's own calendar, so it reads and
 * behaves like every other iPhone date picker. Nothing changes until Done.
 */
export function CalendarSheet({
  visible, title, value, max, onDone, onCancel,
}: {
  visible: boolean;
  title: string;
  /** The day shown first, in ms. */
  value: number;
  /** The latest day she can pick, in ms. */
  max: number;
  onDone: (day: number) => void;
  onCancel: () => void;
}) {
  const p = usePalette();
  const [picked, setPicked] = useState(value);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} onShow={() => setPicked(value)}>
      <Pressable style={styles.shade} onPress={onCancel} accessibilityLabel={t('Close the calendar')} />
      <View style={[styles.sheet, { backgroundColor: p.surface }]}>
        <T style={[type.title, { textAlign: 'center' }]} accessibilityRole="header">{title}</T>
        <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }}>
          <DatePicker
            selection={new Date(picked)}
            range={{ end: new Date(max) }}
            displayedComponents={['date']}
            onDateChange={(d) => setPicked(d.getTime())}
            modifiers={[datePickerStyle('graphical'), tint(p.accent)]}
          />
        </Host>
        <PrimaryButton label={t('Done')} onPress={() => onDone(picked)} testID="calendar-done" />
        <QuietButton label={t('Cancel')} onPress={onCancel} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: '#00000066' },
  sheet: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: space.xl, paddingBottom: space.xxl, gap: space.m },
});
