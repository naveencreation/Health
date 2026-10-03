import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { useDailyLog } from '@/context/HealthContext';
import { WaterLogEntry } from '@/types';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import {
  BEVERAGE_DEFINITIONS,
  getBeverageName,
  getBeverageBg,
  renderBeverageIconElement,
} from '@/utils/beverageUtils';
import { WaterEntryActionPopover } from '@/components/water/WaterEntryActionPopover';

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

// --- Custom Beverage SVG Icons matching reference screenshot ---

const GlassWaterIcon: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <Svg width={size} height={Math.round(size * 1.3)} viewBox="0 0 24 32">
    <Path
      d="M 4 2 L 6 28 C 6.3 30 8.5 31 12 31 C 15.5 31 17.7 30 18 28 L 20 2 Z"
      fill="#E0F2FE"
      stroke="#7DD3FC"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <Path
      d="M 5 11 L 6 27.8 C 6.3 29.4 8.5 30 12 30 C 15.5 30 17.7 29.4 18 27.8 L 19 11 Z"
      fill="#0284C7"
    />
    <Circle cx="9.5" cy="22" r="1.2" fill="#FFFFFF" opacity={0.9} />
    <Circle cx="14" cy="17" r="1.3" fill="#FFFFFF" opacity={0.9} />
    <Circle cx="11" cy="26" r="0.9" fill="#FFFFFF" opacity={0.75} />
  </Svg>
);

const WaterMugIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <Svg width={size} height={Math.round(size * 0.9)} viewBox="0 0 32 28">
    {/* Mug Handle */}
    <Path
      d="M 23 7 C 28 7 28 19 23 19"
      stroke="#0284C7"
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
    />
    {/* Mug Body */}
    <Rect x="4" y="4" width="20" height="20" rx="4" fill="#0284C7" />
    <Rect x="4" y="6" width="20" height="4" fill="#38BDF8" opacity={0.6} />
    <Rect x="4" y="14" width="20" height="4" fill="#38BDF8" opacity={0.6} />
  </Svg>
);

const CoffeeCupIcon: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <Svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 24 30">
    {/* Cup Lid */}
    <Rect x="3" y="2" width="18" height="4" rx="2" fill="#78350F" />
    {/* Cup Body */}
    <Path d="M 4 6 L 6 27 C 6.2 28.5 7.5 29 12 29 C 16.5 29 17.8 28.5 18 27 L 20 6 Z" fill="#F5F5F4" stroke="#D6D3D1" strokeWidth={1.2} />
    {/* Brown Kraft Sleeve */}
    <Path d="M 4.9 12 L 5.5 21 C 7 21.5 12 21.5 12 21.5 C 12 21.5 17 21.5 18.5 21 L 19.1 12 Z" fill="#A16207" />
    <Circle cx="12" cy="16.5" r="2.5" fill="#FFFFFF" opacity={0.9} />
  </Svg>
);

const JuiceGlassIcon: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <Svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 24 30">
    {/* Glass Body */}
    <Path d="M 4 6 L 6 26 C 6.2 27.5 7.5 28 12 28 C 16.5 28 17.8 27.5 18 26 L 20 6 Z" fill="#FFEDD5" stroke="#FDBA74" strokeWidth={1.2} />
    {/* Orange Juice Liquid */}
    <Path d="M 4.8 12 L 6 25.8 C 6.2 27 7.5 27.5 12 27.5 C 16.5 27.5 17.8 27 18 25.8 L 19.2 12 Z" fill="#F97316" />
    {/* Citrus Wedge on Rim */}
    <Circle cx="18" cy="6" r="4.5" fill="#FBBF24" stroke="#F59E0B" strokeWidth={1} />
    <Path d="M 18 6 L 15.5 9" stroke="#FFFFFF" strokeWidth={1} />
    <Path d="M 18 6 L 20.5 9" stroke="#FFFFFF" strokeWidth={1} />
    <Path d="M 18 6 L 18 2" stroke="#FFFFFF" strokeWidth={1} />
  </Svg>
);

const TeaCupIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <Svg width={size} height={Math.round(size * 1.05)} viewBox="0 0 28 28">
    {/* Steam Waves */}
    <Path d="M 9 2 Q 8 4 9 6 Q 10 8 9 10" stroke="#EF4444" strokeWidth={1.4} strokeLinecap="round" fill="none" />
    <Path d="M 14 1 Q 13 3 14 5 Q 15 7 14 9" stroke="#EF4444" strokeWidth={1.4} strokeLinecap="round" fill="none" />
    <Path d="M 19 2 Q 18 4 19 6 Q 20 8 19 10" stroke="#EF4444" strokeWidth={1.4} strokeLinecap="round" fill="none" />
    {/* Cup Body */}
    <Path d="M 5 12 L 6 21 C 6.2 23 8.5 24 14 24 C 19.5 24 21.8 23 22 21 L 23 12 Z" fill="#EF4444" />
    {/* Handle */}
    <Path d="M 23 14 C 26 14 26 19 23 19" stroke="#EF4444" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    {/* Saucer */}
    <Path d="M 3 25 L 25 25" stroke="#EF4444" strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

const TumblerBottleIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <Svg width={size} height={Math.round(size * 1.3)} viewBox="0 0 22 30">
    <Rect x="4" y="2" width="14" height="26" rx="3" fill="#0284C7" />
    <Rect x="7" y="0.5" width="8" height="3" rx="1.5" fill="#38BDF8" />
  </Svg>
);

// Empty Clipboard graphic
const EmptyClipboardIllustration: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Svg width={90} height={75} viewBox="0 0 100 85" fill="none">
      <G transform="rotate(-9 35 42)">
        <Rect x="12" y="14" width="46" height="58" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        <Rect x="25" y="8" width="20" height="9" rx="2" fill="#0284C7" />
      </G>
      <G>
        <Rect x="38" y="16" width="48" height="62" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        <Rect x="48" y="36" width="28" height="3" rx="1.5" fill="#E2E8F0" />
        <Rect x="48" y="45" width="22" height="3" rx="1.5" fill="#E2E8F0" />
        <Rect x="48" y="54" width="16" height="3" rx="1.5" fill="#E2E8F0" />
        <Rect x="52" y="10" width="20" height="9" rx="2.5" fill="#0284C7" />
        <Path d="M 57 10 L 57 6 C 57 4.8 58.5 3.8 62 3.8 C 65.5 3.8 67 4.8 67 6 L 67 10" stroke="#38BDF8" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </G>
    </Svg>
    <Text style={styles.emptyTitle}>No records logged</Text>
  </View>
);

const formatTime = (isoString?: string): string => {
  if (!isoString) return '08:00 AM';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '08:00 AM';
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
  } catch {
    return '08:00 AM';
  }
};

const formatDateGroupHeader = (dateStr: string): string => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const targetDate = new Date(dateStr + 'T12:00:00');
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const formatted = targetDate.toLocaleDateString('en-US', options);

    if (dateStr === todayStr) {
      return `Today, ${formatted}`;
    }
    if (dateStr === yesterdayStr) {
      return `Yesterday, ${formatted}`;
    }
    return formatted;
  } catch {
    return dateStr;
  }
};

export interface WaterIntakeHistoryScreenProps {
  onBack: () => void;
  onOpenReport?: () => void;
}

export const WaterIntakeHistoryScreen: React.FC<WaterIntakeHistoryScreenProps> = ({
  onBack,
  onOpenReport,
}) => {
  const insets = useSafeAreaInsets();
  const {
    dailyLogs,
    selectedDate,
    setSelectedDate,
    removeWaterEntry,
    updateWaterEntry,
    addWater,
  } = useDailyLog();

  // Floating Popover state for Edit / Delete
  const [activeMenu, setActiveMenu] = useState<{
    entry: WaterLogEntry;
    date: string;
    positionY: number;
    positionX?: number;
  } | null>(null);

  // 1-Tap Undo Delete Toast State
  const [undoToast, setUndoToast] = useState<{
    entry: WaterLogEntry;
    date: string;
  } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState<{
    entry: WaterLogEntry;
    date: string;
  } | null>(null);
  const [editVolume, setEditVolume] = useState<number>(300);
  const [editBeverage, setEditBeverage] = useState<string>('water');


  // Group dates chronologically descending
  const dateGroups = useMemo(() => {
    const dates = new Set<string>(Object.keys(dailyLogs));
    dates.add(selectedDate);

    // Filter to dates that have entries or waterMl > 0 (or selectedDate)
    const validDates = Array.from(dates).filter((d) => {
      const log = dailyLogs[d];
      return d === selectedDate || (log && (log.waterMl > 0 || (log.waterEntries && log.waterEntries.length > 0)));
    });

    // Sort descending
    validDates.sort((a, b) => b.localeCompare(a));

    return validDates.map((dateStr) => {
      const log = dailyLogs[dateStr];
      let entries = log?.waterEntries ?? [];
      const totalMl = log?.waterMl ?? 0;

      // Synthesize fallback entry if waterMl > 0 but entries array is empty
      if (entries.length === 0 && totalMl > 0) {
        entries = [
          {
            id: `synth_${dateStr}`,
            amountMl: totalMl,
            beverageType: 'water',
            loggedAt: new Date(dateStr + 'T08:00:00').toISOString(),
          },
        ];
      }

      return {
        dateStr,
        headerTitle: formatDateGroupHeader(dateStr),
        entries,
        totalMl,
      };
    });
  }, [dailyLogs, selectedDate]);

  // Open popover menu next to the 3-dots trigger
  const handleOpenMenu = (entry: WaterLogEntry, date: string, event: any) => {
    const y = event?.nativeEvent?.pageY || 300;
    const x = event?.nativeEvent?.pageX;
    setActiveMenu({ entry, date, positionY: y, positionX: x });
  };

  const handleDelete = () => {
    if (!activeMenu) return;
    const { entry, date } = activeMenu;
    removeWaterEntry(entry.id, date);
    setActiveMenu(null);

    // Show floating Undo snackbar for 4.5 seconds
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setUndoToast({ entry, date });
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 4500);
  };

  const handleUndoDelete = () => {
    if (!undoToast) return;
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    addWater(undoToast.entry.amountMl, undoToast.entry.beverageType);
    setUndoToast(null);
  };

  const handleStartEdit = () => {
    if (!activeMenu) return;
    setEditingEntry({ entry: activeMenu.entry, date: activeMenu.date });
    setEditVolume(activeMenu.entry.amountMl);
    setEditBeverage(activeMenu.entry.beverageType || 'water');
    setActiveMenu(null);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    updateWaterEntry(
      editingEntry.entry.id,
      { amountMl: editVolume, beverageType: editBeverage },
      editingEntry.date
    );
    setEditingEntry(null);
  };

  const renderBeverageIcon = (entry: WaterLogEntry) => {
    return renderBeverageIconElement(entry.beverageType, 20);
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: 6 }]}>
      {/* 1. Header Bar matching screenshot */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Pressable
            style={({ pressed }) => [
              styles.navCircleBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Back to Water Tracker"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.iconNavy} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Water Intake History
            </Text>
          </View>

          {/* Report Button */}
          {onOpenReport ? (
            <Pressable
              style={({ pressed }) => [
                styles.navCircleBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={onOpenReport}
              hitSlop={HIT_SLOP_10}
              accessibilityRole="button"
              accessibilityLabel="View Hydration Report"
            >
              <Ionicons name="stats-chart-outline" size={19} color={Colors.iconNavy} />
            </Pressable>
          ) : (
            <View style={styles.headerRightSpacer} />
          )}
        </View>
      </View>

      {/* 2. Scrollable Grouped History Feed */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {dateGroups.map((group) => (
          <View key={`group_${group.dateStr}`} style={styles.groupSection}>
            {/* Date Group Header */}
            <Text style={styles.groupHeaderTitle}>{group.headerTitle}</Text>

            {/* Date Group Card */}
            <View style={styles.groupCard}>
              {group.entries.length === 0 ? (
                <EmptyClipboardIllustration />
              ) : (
                group.entries.map((entry, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <View
                      key={entry.id || `entry_${group.dateStr}_${idx}`}
                      style={[styles.entryRow, !isFirst && styles.rowBorderTop]}
                    >
                      {/* Left Beverage Icon */}
                      <View
                        style={[
                          styles.beverageIconCol,
                          { backgroundColor: getBeverageBg(entry.beverageType) },
                        ]}
                      >
                        {renderBeverageIcon(entry)}
                      </View>

                      {/* Beverage Name & Timestamp */}
                      <View style={styles.beverageInfoCol}>
                        <Text style={styles.beverageName}>
                          {getBeverageName(entry.beverageType)}
                        </Text>
                        <Text style={styles.beverageTime}>
                          {formatTime(entry.loggedAt)}
                        </Text>
                      </View>

                      {/* Logged Volume Readout */}
                      <Text style={styles.beverageAmount}>{entry.amountMl} mL</Text>

                      {/* 3-Dots Action Menu Trigger */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.menuTriggerBtn,
                          pressed && styles.btnPressed,
                        ]}
                        onPress={(e) => handleOpenMenu(entry, group.dateStr, e)}
                        hitSlop={HIT_SLOP_10}
                        accessibilityRole="button"
                        accessibilityLabel={`Options for ${entry.amountMl} mL entry`}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color="#64748B" />
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 3. Floating Action Popover Menu (Matching Reference Screenshot) */}
      <WaterEntryActionPopover
        visible={!!activeMenu}
        positionY={activeMenu?.positionY || 300}
        positionX={activeMenu?.positionX}
        onEdit={handleStartEdit}
        onDelete={handleDelete}
        onClose={() => setActiveMenu(null)}
      />

      {/* 4. Edit Entry Modal Sheet */}
      <Modal
        visible={!!editingEntry}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingEntry(null)}
      >
        <View style={styles.editModalOverlay}>
          <Pressable
            style={styles.editModalBackdrop}
            onPress={() => setEditingEntry(null)}
          />
          <View style={styles.editModalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.editHeaderRow}>
              <Text style={styles.editModalTitle}>Edit Water Entry</Text>
              <Pressable
                style={styles.editCloseBtn}
                onPress={() => setEditingEntry(null)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Stepper Volume Editor */}
            <View style={styles.stepperContainer}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setEditVolume((v) => Math.max(50, v - 50))}
              >
                <Ionicons name="remove" size={20} color={Colors.water} />
              </Pressable>
              <View style={styles.stepperValueBox}>
                <Text style={styles.stepperValueText}>{editVolume}</Text>
                <Text style={styles.stepperUnitText}>mL</Text>
              </View>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setEditVolume((v) => Math.min(3000, v + 50))}
              >
                <Ionicons name="add" size={20} color={Colors.water} />
              </Pressable>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetChipsRow}>
              {[150, 250, 300, 400, 500].map((preset) => (
                <Pressable
                  key={`edit_preset_${preset}`}
                  style={[
                    styles.presetChip,
                    editVolume === preset && styles.presetChipActive,
                  ]}
                  onPress={() => setEditVolume(preset)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      editVolume === preset && styles.presetChipTextActive,
                    ]}
                  >
                    {preset} mL
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Beverage Type Selector Chips */}
            <View style={styles.editSectionRow}>
              <Text style={styles.editSectionLabel}>Beverage Type</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.editBeverageChipsRow}
            >
              {BEVERAGE_DEFINITIONS.map((bev) => {
                const isSelected = editBeverage === bev.id;
                return (
                  <Pressable
                    key={`edit_bev_${bev.id}`}
                    style={({ pressed }) => [
                      styles.editBeverageChip,
                      isSelected && [
                        styles.editBeverageChipSelected,
                        { borderColor: bev.color, backgroundColor: `${bev.color}15` },
                      ],
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => setEditBeverage(bev.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${bev.name} beverage`}
                  >
                    {renderBeverageIconElement(bev.id, 16)}
                    <Text
                      style={[
                        styles.editBeverageChipText,
                        isSelected && [styles.editBeverageChipTextSelected, { color: bev.color }],
                      ]}
                    >
                      {bev.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Save Button */}
            <Pressable
              style={({ pressed }) => [
                styles.saveEditBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={handleSaveEdit}
            >
              <Text style={styles.saveEditBtnText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>


      {/* 5. Floating Undo Toast (Industry Standard) */}
      {undoToast && (
        <View style={[styles.undoToastWrapper, { pointerEvents: 'box-none' as any }]}>
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(180)}
            style={styles.undoToastCard}
          >
            <View style={styles.undoToastInfo}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.undoToastText} numberOfLines={1}>
                Deleted {undoToast.entry.amountMl} mL {getBeverageName(undoToast.entry.beverageType)}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.undoBtn, pressed && styles.btnPressed]}
              onPress={handleUndoDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Undo deleting ${undoToast.entry.amountMl} mL ${getBeverageName(undoToast.entry.beverageType)}`}
            >
              <Ionicons name="arrow-undo" size={13} color="#38BDF8" />
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  navCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  groupSection: {
    marginBottom: 16,
  },
  groupHeaderTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#94A3B8',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  beverageIconCol: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  beverageInfoCol: {
    flex: 1,
  },
  beverageName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  beverageTime: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  beverageAmount: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
    marginRight: 12,
  },
  menuTriggerBtn: {
    padding: 6,
  },
  // Floating Action Popover Menu
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 32,
  },
  popoverCard: {
    position: 'absolute',
    right: 28,
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  popoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  popoverRowPressed: {
    backgroundColor: '#F8FAFC',
  },
  popoverEditText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  popoverDeleteText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#EF4444',
  },
  popoverDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 10,
  },
  // Edit Modal Sheet
  editModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  editModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  editModalSheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderCurve: 'continuous',
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  editHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  editModalTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  editCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 12,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  stepperValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  stepperValueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 36,
    color: '#0F172A',
  },
  stepperUnitText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    color: '#64748B',
  },
  presetChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 14,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#F0F9FF',
    borderColor: Colors.water,
  },
  presetChipText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  presetChipTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.water,
  },
  saveEditBtn: {
    height: 52,
    backgroundColor: Colors.water,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveEditBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  headerRightSpacer: {
    width: 38,
    height: 38,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyTitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
  editSectionRow: {
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  editSectionLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#334155',
  },
  editBeverageChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  editBeverageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editBeverageChipSelected: {
    borderWidth: 1.5,
  },
  editBeverageChipText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#475569',
  },
  editBeverageChipTextSelected: {
    fontFamily: Fonts.urbanist.semiBold,
  },
  btnPressed: {
    opacity: 0.75,
  },
  undoToastWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  undoToastCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  undoToastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  undoToastText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  undoBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#38BDF8',
  },
});
