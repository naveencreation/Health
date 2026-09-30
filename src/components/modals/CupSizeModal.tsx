import React, { useState } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

export interface CupSizeOption {
  ml: number;
  label: string;
}

export interface BeverageOption {
  id: string;
  name: string;
  iconName: any;
  iconFamily: 'ionicons' | 'mci';
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
  { id: 'coffee', name: 'Coffee', iconName: 'cafe-outline', iconFamily: 'ionicons', color: '#854D0E' },
  { id: 'tea', name: 'Tea', iconName: 'tea', iconFamily: 'mci', color: '#15803D' },
  { id: 'juice', name: 'Juice', iconName: 'cup-water', iconFamily: 'mci', color: '#EA580C' },
  { id: 'sport', name: 'Sport Drink', iconName: 'bottle-tonic-outline', iconFamily: 'mci', color: '#0284C7' },
  { id: 'coconut', name: 'Coconut Water', iconName: 'leaf-outline', iconFamily: 'ionicons', color: '#16A34A' },
  { id: 'smoothie', name: 'Smoothie', iconName: 'blender-outline', iconFamily: 'mci', color: '#9333EA' },
  { id: 'chocolate', name: 'Chocolate', iconName: 'coffee', iconFamily: 'mci', color: '#78350F' },
  { id: 'carbonated', name: 'Carbonated', iconName: 'glass-cocktail', iconFamily: 'mci', color: '#F97316' },
  { id: 'soda', name: 'Soda', iconName: 'glass-flute', iconFamily: 'mci', color: '#E11D48' },
  { id: 'wine', name: 'Wine', iconName: 'wine-outline', iconFamily: 'ionicons', color: '#9F1239' },
  { id: 'beer', name: 'Beer', iconName: 'beer-outline', iconFamily: 'ionicons', color: '#D97706' },
  { id: 'liquor', name: 'Liquor', iconName: 'bottle-tonic-plus-outline', iconFamily: 'mci', color: '#475569' },
];

// Mini SVG glass vector for the 250 - 350 mL options
const MiniGlassSvg: React.FC<{ fillPercent?: number }> = ({ fillPercent = 0.65 }) => (
  <Svg width={20} height={24} viewBox="0 0 20 24">
    <Path
      d="M 3 2 L 5 21 C 5.2 22.5 7 23 10 23 C 13 23 14.8 22.5 15 21 L 17 2 Z"
      fill="#E0F2FE"
      stroke="#38BDF8"
      strokeWidth={1.2}
    />
    <Path
      d={`M 4.2 ${24 - 24 * fillPercent} L 5 21 C 5.2 22.5 7 23 10 23 C 13 23 14.8 22.5 15 21 L 15.8 ${24 - 24 * fillPercent} Z`}
      fill="#0284C7"
    />
    <Circle cx="8" cy="18" r="0.8" fill="#FFFFFF" opacity={0.9} />
    <Circle cx="12" cy="15" r="0.9" fill="#FFFFFF" opacity={0.9} />
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
  const [selectedSize, setSelectedSize] = useState<number>(currentCupSize);
  const [selectedBeverage, setSelectedBeverage] = useState<string>(currentBeverage);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customMlInput, setCustomMlInput] = useState<string>('');

  const handleSelectCup = (ml: number) => {
    setSelectedSize(ml);
    setIsCustomMode(false);
    onSelect(ml, selectedBeverage);
    onClose();
  };

  const handleSelectBeverage = (beverageId: string) => {
    setSelectedBeverage(beverageId);
    onSelect(selectedSize, beverageId);
    onClose();
  };

  const handleApplyCustomMl = () => {
    const parsed = parseInt(customMlInput, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 5000) {
      setSelectedSize(parsed);
      setIsCustomMode(false);
      setCustomMlInput('');
      onSelect(parsed, selectedBeverage);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close cup size selector"
            >
              <Ionicons name="close" size={24} color="#0F172A" />
            </Pressable>

            <Text style={styles.headerTitle}>Switch Cup Size</Text>

            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Cup Volume Presets Grid */}
            <View style={styles.gridContainer}>
              {CUP_PRESETS.map((preset) => {
                const isSelected = selectedSize === preset.ml && !isCustomMode;
                return (
                  <Pressable
                    key={`preset_${preset.ml}`}
                    style={({ pressed }) => [
                      styles.gridItem,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => handleSelectCup(preset.ml)}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        isSelected && styles.iconCircleSelected,
                      ]}
                    >
                      {preset.ml <= 150 ? (
                        <Ionicons
                          name="cafe"
                          size={22}
                          color={isSelected ? Colors.water : '#38BDF8'}
                        />
                      ) : preset.ml <= 400 ? (
                        <MiniGlassSvg fillPercent={preset.ml / 500} />
                      ) : (
                        <MaterialCommunityIcons
                          name="cup"
                          size={24}
                          color={isSelected ? Colors.water : '#0284C7'}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.itemLabel,
                        isSelected && styles.itemLabelSelected,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Add Custom New Volume */}
              <Pressable
                style={({ pressed }) => [
                  styles.gridItem,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => setIsCustomMode(true)}
              >
                <View
                  style={[
                    styles.iconCircle,
                    styles.addCircle,
                    isCustomMode && styles.iconCircleSelected,
                  ]}
                >
                  <Ionicons name="add" size={26} color={Colors.water} />
                </View>
                <Text
                  style={[
                    styles.itemLabel,
                    isCustomMode && styles.itemLabelSelected,
                  ]}
                >
                  Add New
                </Text>
              </Pressable>
            </View>

            {/* Custom Input Inline Box */}
            {isCustomMode && (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputTitle}>Enter Custom Amount (mL)</Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="e.g. 750"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    value={customMlInput}
                    onChangeText={setCustomMlInput}
                    maxLength={4}
                    autoFocus={true}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.applyBtn,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={handleApplyCustomMl}
                  >
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* 2. "Or Drink" Section Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or Drink</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 3. Beverage Types Grid */}
            <View style={styles.gridContainer}>
              {BEVERAGE_TYPES.map((bev) => {
                const isSelected = selectedBeverage === bev.id;
                return (
                  <Pressable
                    key={`bev_${bev.id}`}
                    style={({ pressed }) => [
                      styles.gridItem,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => handleSelectBeverage(bev.id)}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        isSelected && styles.iconCircleSelected,
                      ]}
                    >
                      {bev.iconFamily === 'ionicons' ? (
                        <Ionicons name={bev.iconName} size={22} color={bev.color} />
                      ) : (
                        <MaterialCommunityIcons
                          name={bev.iconName}
                          size={22}
                          color={bev.color}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.itemLabel,
                        isSelected && styles.itemLabelSelected,
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    maxHeight: '85%',
    paddingTop: 16,
    paddingBottom: 28,
    shadowColor: '#0F172A',
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 36,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconCircleSelected: {
    borderColor: Colors.water,
    backgroundColor: '#F0F9FF',
    shadowColor: Colors.water,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  addCircle: {
    borderStyle: 'dashed',
    borderColor: Colors.water,
    backgroundColor: '#F0F9FF',
  },
  itemLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },
  itemLabelSelected: {
    fontFamily: Fonts.poppins.semiBold,
    color: Colors.water,
  },
  // Custom Input Box
  customInputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customInputTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#334155',
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 16,
    color: '#0F172A',
  },
  applyBtn: {
    backgroundColor: Colors.water,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#94A3B8',
    marginHorizontal: 12,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
