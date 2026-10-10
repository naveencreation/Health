import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

export interface TimePickerModalProps {
  visible: boolean;
  title: string;
  initialTime?: string; // "HH:mm"
  presets?: string[];
  onSave: (time: string) => void;
  onClose: () => void;
}

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

  const handleSave = () => {
    haptics.impactLight();
    const formatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onSave(formatted);
    onClose();
  };

  const formattedDisplay = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          {/* Time Spinner Display */}
          <View style={styles.spinnerContainer}>
            {/* Hours */}
            <View style={styles.col}>
              <Pressable
                style={({ pressed }) => [styles.arrowBtn, pressed && styles.btnPressed]}
                onPress={() => adjustHour(1)}
                accessibilityLabel="Increase hour"
              >
                <Ionicons name="chevron-up" size={24} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.digits}>{String(hour).padStart(2, '0')}</Text>
              <Pressable
                style={({ pressed }) => [styles.arrowBtn, pressed && styles.btnPressed]}
                onPress={() => adjustHour(-1)}
                accessibilityLabel="Decrease hour"
              >
                <Ionicons name="chevron-down" size={24} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.colLabel}>HOUR</Text>
            </View>

            <Text style={styles.colon}>:</Text>

            {/* Minutes */}
            <View style={styles.col}>
              <Pressable
                style={({ pressed }) => [styles.arrowBtn, pressed && styles.btnPressed]}
                onPress={() => adjustMinute(5)}
                accessibilityLabel="Increase minutes"
              >
                <Ionicons name="chevron-up" size={24} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.digits}>{String(minute).padStart(2, '0')}</Text>
              <Pressable
                style={({ pressed }) => [styles.arrowBtn, pressed && styles.btnPressed]}
                onPress={() => adjustMinute(-5)}
                accessibilityLabel="Decrease minutes"
              >
                <Ionicons name="chevron-down" size={24} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.colLabel}>MIN</Text>
            </View>
          </View>

          {/* Preset Buttons */}
          {presets.length > 0 && (
            <View style={styles.presetsContainer}>
              <Text style={styles.presetsLabel}>Quick Presets:</Text>
              <View style={styles.presetsRow}>
                {presets.map(p => {
                  const isSelected = p === formattedDisplay;
                  return (
                    <Pressable
                      key={p}
                      style={[
                        styles.presetChip,
                        isSelected && styles.presetChipSelected,
                      ]}
                      onPress={() => selectPreset(p)}
                      accessibilityRole="button"
                      accessibilityLabel={`Preset ${p}`}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && styles.presetChipTextSelected,
                        ]}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && styles.btnPressed]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>Save Time</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  spinnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  col: {
    alignItems: 'center',
    width: 72,
  },
  colon: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 36,
    color: Colors.textPrimary,
    marginTop: -20,
  },
  arrowBtn: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surfaceLow,
  },
  btnPressed: {
    opacity: 0.7,
  },
  digits: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginVertical: 8,
  },
  colLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 4,
  },
  presetsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  presetsLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  presetChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetChipText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  presetChipTextSelected: {
    color: '#FFFFFF',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLow,
  },
  cancelBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
