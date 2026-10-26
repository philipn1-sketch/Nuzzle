// The web preview has no iPhone calendar; a plain date box stands in so the screens can still be tried.
import { createElement, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { usePalette } from '../state/theme';
import { radius, space, type } from '../theme';
import { PrimaryButton, QuietButton, T } from './ui';

const iso = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function CalendarSheet({
  visible, title, value, max, onDone, onCancel,
}: { visible: boolean; title: string; value: number; max: number; onDone: (day: number) => void; onCancel: () => void }) {
  const p = usePalette();
  const [picked, setPicked] = useState(value);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} onShow={() => setPicked(value)}>
      <Pressable style={styles.shade} onPress={onCancel} />
      <View style={[styles.sheet, { backgroundColor: p.surface }]}>
        <T style={[type.title, { textAlign: 'center' }]}>{title}</T>
        {createElement('input', {
          type: 'date', value: iso(picked), max: iso(max), 'data-testid': 'calendar-input',
          onChange: (e: { target: { value: string } }) => {
            const [y, m, d] = e.target.value.split('-').map(Number);
            if (y) setPicked(new Date(y, m - 1, d).getTime());
          },
          style: { fontSize: 20, padding: 12 },
        })}
        <PrimaryButton label="Done" onPress={() => onDone(picked)} testID="calendar-done" />
        <QuietButton label="Cancel" onPress={onCancel} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: '#00000066' },
  sheet: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: space.xl, paddingBottom: space.xxl, gap: space.m },
});
