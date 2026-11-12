import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { ProfileButton, dialogCard, sheetStyles } from '@/components/profile/ProfileUI';

export interface TimePickerModalProps {
  visible: boolean;
  title: string;
  initialTime?: string; // "HH:mm"
  presets?: string[];
  onSave: (time: string) => void;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

const StepButton: React.FC<{ up?: boolean; label: string; onPress: () => void }> = ({
  up,
  label,
  onPress,
}) => (
  <Pressable
    style={({ pressed }) => [styles.step, pressed && styles.pressed]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Ionicons name={up ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textPrimary} />
  </Pressable>
);

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  title,
  initialTime = '12:00',
  presets = [],
  onSave,
  onClose,
}) => {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (visible && initialTime) {
      const [h, m] = initialTime.split(':').map(Number);
      setHour(isNaN(h) ? 12 : Math.min(23, Math.max(0, h)));
      setMinute(isNaN(m) ? 0 : Math.min(59, Math.max(0, m)));
    }
  }, [visible, initialTime]);

  const adjustHour = (delta: number) => {
    haptics.selection();
    setHour(prev => (prev + delta + 24) % 24);
  };

  const adjustMinute = (delta: number) => {
    haptics.selection();
    setMinute(prev => (prev + delta + 60) % 60);
  };

  const selectPreset = (presetTime: string) => {
    haptics.selection();
    const [h, m] = presetTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      setHour(h);
      setMinute(m);
    }
  };

  const formatted = `${pad(hour)}:${pad(minute)}`;

  const handleSave = () => {
    haptics.impactLight();
    onSave(formatted);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={sheetStyles.centeredScrim}>
        <Pressable
          style={sheetStyles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss time picker"
        />
        <View style={[dialogCard, styles.card]} accessibilityViewIsModal>
          <View>
            <Text style={sheetStyles.dialogTitle} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.subtitle}>24-hour time</Text>
          </View>

          <View style={styles.spinner} accessible={false}>
            <View style={styles.col}>
              <StepButton up label="Increase hour" onPress={() => adjustHour(1)} />
              <Text style={styles.digits} accessibilityLabel={`${hour} hours`}>
                {pad(hour)}
              </Text>
              <StepButton label="Decrease hour" onPress={() => adjustHour(-1)} />
              <Text style={styles.colLabel}>Hour</Text>
            </View>
            <Text style={[styles.digits, styles.colon]}>:</Text>
            <View style={styles.col}>
              <StepButton up label="Increase minutes" onPress={() => adjustMinute(5)} />
              <Text style={styles.digits} accessibilityLabel={`${minute} minutes`}>
                {pad(minute)}
              </Text>
              <StepButton label="Decrease minutes" onPress={() => adjustMinute(-5)} />
              <Text style={styles.colLabel}>Minute</Text>
            </View>
          </View>

          {presets.length > 0 && (
            <View>
              <Text style={[styles.colLabel, styles.presetsLabel]}>Suggested</Text>
              <View style={styles.presetsRow}>
                {presets.map(p => {
                  const selected = p === formatted;
                  return (
                    <Pressable
                      key={p}
                      style={({ pressed }) => [
                        styles.chip,
                        selected && styles.chipSelected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => selectPreset(p)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Preset ${p}`}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{p}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.btnRow}>
            <ProfileButton label="Cancel" onPress={onClose} style={styles.flex} />
            <ProfileButton
              label="Save"
              variant="primary"
              onPress={handleSave}
              accessibilityLabel={`Save ${formatted}`}
              style={styles.flex}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: { maxWidth: 360, gap: 20 },
  subtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  spinner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  col: { alignItems: 'center', gap: 6, minWidth: 72 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  pressed: { opacity: 0.85 },
  digits: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 48,
    lineHeight: 56,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  colon: { marginBottom: 22 },
  colLabel: { fontFamily: Fonts.urbanist.semiBold, fontSize: 12, color: Colors.textSecondary },
  presetsLabel: { marginBottom: 8 },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipSelected: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  chipText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textSlate700,
    fontVariant: ['tabular-nums'],
  },
  chipTextSelected: { color: Colors.textInverse },
  btnRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
