import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

export type ReportCategory = 'nutrition' | 'steps' | 'water' | 'weight';

export interface ReportCategoryItem {
  id: ReportCategory;
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
}

export const REPORT_CATEGORIES: ReportCategoryItem[] = [
  {
    id: 'nutrition',
    title: 'Nutrition & Calories',
    subtitle: 'Daily calorie budget, macros & workout burn',
    iconName: 'restaurant-outline',
    iconBg: '#FFF7ED',
    iconColor: '#EA580C',
  },
  {
    id: 'steps',
    title: 'Step Activity',
    subtitle: 'Step counts, walking distance & duration',
    iconName: 'footsteps-outline',
    iconBg: '#FFF5F1',
    iconColor: '#F47551',
  },
  {
    id: 'water',
    title: 'Hydration Intake',
    subtitle: 'Water volume, glasses & beverage breakdown',
    iconName: 'water-outline',
    iconBg: '#F0F9FF',
    iconColor: '#0284C7',
  },
  {
    id: 'weight',
    title: 'Weight & Body',
    subtitle: 'Weight trend, milestone progress & BMI',
    iconName: 'scale-outline',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
  },
];

export interface ReportPickerModalProps {
  visible: boolean;
  activeReport: ReportCategory;
  onSelectReport: (report: ReportCategory) => void;
  onClose: () => void;
}

export const ReportPickerModal: React.FC<ReportPickerModalProps> = ({
  visible,
  activeReport,
  onSelectReport,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Backdrop Scrim */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close report selector"
        />

        {/* Bottom Sheet */}
        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Mobile Drag Indicator Handle */}
          <View style={styles.handleBarWrap}>
            <View style={styles.handleBar} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Select Health Report</Text>
              <Text style={styles.headerSubtitle}>Choose a health pillar to view insights</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={20} color="#0F172A" />
            </Pressable>
          </View>

          {/* Report Options List */}
          <View style={styles.optionsList}>
            {REPORT_CATEGORIES.map(item => {
              const isSelected = activeReport === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                    pressed && styles.btnPressed,
                  ]}
                  onPress={() => {
                    onSelectReport(item.id);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} report option`}
                  accessibilityState={{ selected: isSelected }}
                >
                  {/* Icon badge */}
                  <View style={[styles.iconBadge, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.iconName} size={20} color={item.iconColor} />
                  </View>

                  {/* Title and subtitle */}
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                      {item.title}
                    </Text>
                    <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                  </View>

                  {/* Selection indicator */}
                  <View style={styles.checkWrap}>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    ) : (
                      <View style={styles.unselectedRing} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderCurve: 'continuous',
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBarWrap: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  optionsList: {
    paddingTop: 12,
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  optionCardSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: 'rgba(244, 117, 81, 0.35)',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  optionTitleSelected: {
    color: '#C2410C',
  },
  optionSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  checkWrap: {
    marginLeft: 8,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 23, 42, 0.2)',
  },
});
