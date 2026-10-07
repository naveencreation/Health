import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface CupSizeOption {
  ml: number;
  label: string;
  isCustom?: boolean;
}

export interface BeverageOption {
  id: string;
  name: string;
  iconName: any;
  iconFamily: 'ionicons' | 'mci' | 'svg';
  color: string;
}

const CUP_PRESETS: CupSizeOption[] = [
  { ml: 100, label: '100 mL' },
  { ml: 125, label: '125 mL' },
  { ml: 150, label: '150 mL' },
  { ml: 200, label: '200 mL' },
  { ml: 250, label: '250 mL' },
  { ml: 300, label: '300 mL' },
  { ml: 350, label: '350 mL' },
  { ml: 400, label: '400 mL' },
  { ml: 500, label: '500 mL' },
  { ml: 600, label: '600 mL' },
];

const BEVERAGE_TYPES: BeverageOption[] = [
  { id: 'water', name: 'Water', iconName: 'water', iconFamily: 'svg', color: '#0284C7' },
  {
    id: 'coffee',
    name: 'Coffee',
    iconName: 'cafe-outline',
    iconFamily: 'ionicons',
    color: '#854D0E',
  },
  { id: 'tea', name: 'Tea', iconName: 'tea', iconFamily: 'mci', color: '#15803D' },
  { id: 'juice', name: 'Juice', iconName: 'cup-water', iconFamily: 'mci', color: '#EA580C' },
  {
    id: 'sport',
    name: 'Sport Drink',
    iconName: 'bottle-tonic-outline',
    iconFamily: 'mci',
    color: '#0284C7',
  },
  {
    id: 'coconut',
    name: 'Coconut Water',
    iconName: 'leaf-outline',
    iconFamily: 'ionicons',
    color: '#16A34A',
  },
  {
    id: 'smoothie',
    name: 'Smoothie',
    iconName: 'blender-outline',
    iconFamily: 'mci',
    color: '#9333EA',
  },
  { id: 'chocolate', name: 'Chocolate', iconName: 'coffee', iconFamily: 'mci', color: '#78350F' },
  {
    id: 'carbonated',
    name: 'Carbonated',
    iconName: 'glass-cocktail',
    iconFamily: 'mci',
    color: '#F97316',
  },
  { id: 'soda', name: 'Soda', iconName: 'glass-flute', iconFamily: 'mci', color: '#E11D48' },
  { id: 'wine', name: 'Wine', iconName: 'wine-outline', iconFamily: 'ionicons', color: '#9F1239' },
  { id: 'beer', name: 'Beer', iconName: 'beer-outline', iconFamily: 'ionicons', color: '#D97706' },
  {
    id: 'liquor',
    name: 'Liquor',
    iconName: 'bottle-tonic-plus-outline',
    iconFamily: 'mci',
    color: Colors.textSlate600,
  },
];

// Mini SVG glass vector for presets & water option
const MiniGlassSvg: React.FC<{ fillPercent?: number }> = ({ fillPercent = 0.65 }) => (
  <Svg width={20} height={24} viewBox="0 0 20 24">
    <Path
      d="M 3 2 L 5 21 C 5.2 22.5 7 23 10 23 C 13 23 14.8 22.5 15 21 L 17 2 Z"
      fill={Colors.waterTrack}
      stroke={Colors.waterSecondary}
      strokeWidth={1.2}
    />
    <Path
      d={`M 4.2 ${24 - 24 * fillPercent} L 5 21 C 5.2 22.5 7 23 10 23 C 13 23 14.8 22.5 15 21 L 15.8 ${24 - 24 * fillPercent} Z`}
      fill={Colors.water}
    />
    <Circle cx="8" cy="18" r="0.8" fill={Colors.textInverse} opacity={0.9} />
    <Circle cx="12" cy="15" r="0.9" fill={Colors.textInverse} opacity={0.9} />
  </Svg>
);

export interface CupSizeModalProps {
  visible: boolean;
  currentCupSize: number;
  currentBeverage?: string;
  onClose: () => void;
  onSelect: (sizeMl: number, beverageType: string) => void;
}

export const CupSizeModal: React.FC<CupSizeModalProps> = ({
  visible,
  currentCupSize,
  currentBeverage = 'water',
  onClose,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedSize, setSelectedSize] = useState<number>(currentCupSize);
  const [selectedBeverage, setSelectedBeverage] = useState<string>(currentBeverage);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customMlInput, setCustomMlInput] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<number[]>([]);

  // Load persistent custom cup presets
  useEffect(() => {
    AsyncStorage.getItem('@calori_custom_cup_presets')
      .then(val => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              setCustomPresets(
                parsed.filter((n: any) => typeof n === 'number' && n >= 50 && n <= 3000)
              );
            }
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  // Sync state whenever modal opens
  useEffect(() => {
    if (visible) {
      setSelectedSize(currentCupSize);
      setSelectedBeverage(currentBeverage);
      setIsCustomMode(false);
      setCustomMlInput('');
      setCustomError(null);
    }
  }, [visible, currentCupSize, currentBeverage]);

  // Combine default presets with user custom presets
  const allPresets = useMemo(() => {
    const customList: CupSizeOption[] = customPresets
      .filter(ml => !CUP_PRESETS.some(p => p.ml === ml))
      .map(ml => ({
        ml,
        label: `${ml} mL`,
        isCustom: true,
      }));
    const merged = [...CUP_PRESETS, ...customList];
    merged.sort((a, b) => a.ml - b.ml);
    return merged;
  }, [customPresets]);

  const handleSelectCup = (ml: number) => {
    setSelectedSize(ml);
    setIsCustomMode(false);
    setCustomError(null);
  };

  const handleSelectBeverage = (beverageId: string) => {
    setSelectedBeverage(beverageId);
  };

  const handleApplyCustomMl = () => {
    const parsed = parseInt(customMlInput.trim(), 10);
    if (isNaN(parsed) || parsed < 50 || parsed > 3000) {
      setCustomError('Please enter an amount between 50 and 3,000 mL');
      return;
    }
    setSelectedSize(parsed);
    setCustomError(null);
    setIsCustomMode(false);
    setCustomMlInput('');

    // Save as persistent preset if not already present
    const isBase = CUP_PRESETS.some(p => p.ml === parsed);
    if (!isBase && !customPresets.includes(parsed)) {
      const updated = [...customPresets, parsed].sort((a, b) => a - b);
      setCustomPresets(updated);
      AsyncStorage.setItem('@calori_custom_cup_presets', JSON.stringify(updated)).catch(() => {});
    }
  };

  const handleConfirm = () => {
    onSelect(selectedSize, selectedBeverage);
    onClose();
  };

  const activeBeverage = BEVERAGE_TYPES.find(b => b.id === selectedBeverage) || BEVERAGE_TYPES[0];

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close container selector"
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>

            <Text style={styles.headerTitle}>Container & Beverage</Text>

            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Section: Container Size */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Container Size</Text>
              <Text style={styles.sectionSubtitle}>Tap to choose volume</Text>
            </View>

            <View style={styles.gridContainer}>
              {allPresets.map(preset => {
                const isSelected = selectedSize === preset.ml && !isCustomMode;
                return (
                  <Pressable
                    key={`preset_${preset.ml}`}
                    style={({ pressed }) => [styles.gridItem, pressed && styles.btnPressed]}
                    onPress={() => handleSelectCup(preset.ml)}
                    accessibilityRole="button"
                    accessibilityLabel={`${preset.label} container size`}
                  >
                    <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                      {preset.ml <= 150 ? (
                        <Ionicons
                          name="cafe"
                          size={22}
                          color={isSelected ? Colors.water : Colors.waterSecondary}
                        />
                      ) : preset.ml <= 400 ? (
                        <MiniGlassSvg fillPercent={preset.ml / 500} />
                      ) : (
                        <MaterialCommunityIcons
                          name="cup"
                          size={24}
                          color={isSelected ? Colors.water : Colors.water}
                        />
                      )}
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark" size={10} color={Colors.onPrimary} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.itemLabel, isSelected && styles.itemLabelSelected]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Add Custom New Volume Button */}
              <Pressable
                style={({ pressed }) => [styles.gridItem, pressed && styles.btnPressed]}
                onPress={() => {
                  setIsCustomMode(!isCustomMode);
                  setCustomError(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Add custom container volume"
              >
                <View
                  style={[
                    styles.iconCircle,
                    styles.addCircle,
                    isCustomMode && styles.iconCircleSelected,
                  ]}
                >
                  <Ionicons name={isCustomMode ? 'remove' : 'add'} size={26} color={Colors.water} />
                </View>
                <Text style={[styles.itemLabel, isCustomMode && styles.itemLabelSelected]}>
                  {isCustomMode ? 'Cancel' : 'Add New'}
                </Text>
              </Pressable>
            </View>

            {/* Custom Input Inline Box */}
            {isCustomMode && (
              <View style={styles.customInputContainer}>
                <View style={styles.customInputHeader}>
                  <Text style={styles.customInputTitle}>Enter Custom Amount (mL)</Text>
                  <Pressable
                    onPress={() => {
                      setIsCustomMode(false);
                      setCustomError(null);
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.cancelCustomText}>Cancel</Text>
                  </Pressable>
                </View>

                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.customInput, customError ? styles.customInputError : null]}
                    placeholder="e.g. 750"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    value={customMlInput}
                    onChangeText={t => {
                      setCustomMlInput(t.replace(/[^0-9]/g, ''));
                      if (customError) setCustomError(null);
                    }}
                    maxLength={4}
                    autoFocus={true}
                  />
                  <Pressable
                    style={({ pressed }) => [styles.applyBtn, pressed && styles.btnPressed]}
                    onPress={handleApplyCustomMl}
                  >
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </Pressable>
                </View>
                {customError && <Text style={styles.errorText}>{customError}</Text>}
              </View>
            )}

            {/* 2. Section: Beverage Type */}
            <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>Beverage Type</Text>
              <Text style={styles.sectionSubtitle}>{"Select what you're drinking"}</Text>
            </View>

            <View style={styles.gridContainer}>
              {BEVERAGE_TYPES.map(bev => {
                const isSelected = selectedBeverage === bev.id;
                return (
                  <Pressable
                    key={`bev_${bev.id}`}
                    style={({ pressed }) => [styles.gridItem, pressed && styles.btnPressed]}
                    onPress={() => handleSelectBeverage(bev.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${bev.name} beverage`}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        isSelected && [
                          styles.iconCircleSelected,
                          { borderColor: bev.color, backgroundColor: `${bev.color}15` },
                        ],
                      ]}
                    >
                      {bev.id === 'water' ? (
                        <MiniGlassSvg fillPercent={0.75} />
                      ) : bev.iconFamily === 'ionicons' ? (
                        <Ionicons name={bev.iconName} size={22} color={bev.color} />
                      ) : (
                        <MaterialCommunityIcons name={bev.iconName} size={22} color={bev.color} />
                      )}
                      {isSelected && (
                        <View style={[styles.selectedBadge, { backgroundColor: bev.color }]}>
                          <Ionicons name="checkmark" size={10} color={Colors.onPrimary} />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.itemLabel,
                        isSelected && [styles.itemLabelSelected, { color: bev.color }],
                      ]}
                      numberOfLines={1}
                    >
                      {bev.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Sticky Bottom Confirmation Button */}
          <View style={styles.footerContainer}>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.btnPressed]}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel={`Set container to ${selectedSize} mL ${activeBeverage.name}`}
            >
              <Text style={styles.confirmBtnText}>
                Set Container · {selectedSize} mL {activeBeverage.name}
              </Text>
              <Ionicons name="checkmark-circle" size={19} color={Colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: Colors.overlayScrim,
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
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderCurve: 'continuous',
    maxHeight: '85%',
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceInset,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 38,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1.5,
    borderColor: Colors.borderInset,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  iconCircleSelected: {
    borderWidth: 2,
    borderColor: Colors.water,
    backgroundColor: Colors.waterLight,
    ...Platform.select({
      ios: {
        shadowColor: Colors.water,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  selectedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.water,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.card,
  },
  addCircle: {
    borderStyle: 'dashed',
    borderColor: Colors.water,
    backgroundColor: Colors.waterLight,
  },
  itemLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSlate600,
    textAlign: 'center',
  },
  itemLabelSelected: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.water,
  },
  // Custom Input Box
  customInputContainer: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  customInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customInputTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSlate700,
  },
  cancelCustomText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    paddingHorizontal: 14,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  customInputError: {
    borderColor: Colors.danger,
  },
  applyBtn: {
    backgroundColor: Colors.water,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  errorText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.danger,
    marginTop: 6,
  },
  // Sticky Bottom Confirmation Footer
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceInset,
    backgroundColor: Colors.card,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.water,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  confirmBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.onPrimary,
    letterSpacing: -0.2,
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
