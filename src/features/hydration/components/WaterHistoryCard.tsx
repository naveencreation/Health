import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useHydration } from '../hooks/useHydration';
import { WaterLogEntry } from '@/types';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import {
  BEVERAGE_DEFINITIONS,
  getBeverageName,
  getBeverageBg,
  renderBeverageIconElement,
} from '@/utils/beverageUtils';
import { WaterEntryActionPopover } from './WaterEntryActionPopover';

const formatLogTime = (isoString?: string): string => {
  if (!isoString) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
  }
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

// 1. Dual Overlapping Clipboard SVG Illustration for Empty State (matching media_1790783254746)
const EmptyClipboardIllustration: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Svg width={100} height={85} viewBox="0 0 100 85" fill="none">
      {/* Back Clipboard (Tilted -9 deg) */}
      <G transform="rotate(-9 35 42)">
        {/* Board Surface */}
        <Rect
          x="12"
          y="14"
          width="46"
          height="58"
          rx="6"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
        {/* Back Clip */}
        <Rect x="25" y="8" width="20" height="9" rx="2" fill="#0284C7" />
        <Rect x="29" y="5" width="12" height="4" rx="1.5" fill="#38BDF8" opacity={0.6} />
      </G>

      {/* Front Clipboard (Straight) */}
      <G>
        {/* Shadow Card Surface */}
        <Rect
          x="38"
          y="16"
          width="48"
          height="62"
          rx="6"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
        {/* Blank Checklist Rows */}
        <Rect x="48" y="36" width="28" height="3" rx="1.5" fill="#E2E8F0" />
        <Rect x="48" y="45" width="22" height="3" rx="1.5" fill="#E2E8F0" />
        <Rect x="48" y="54" width="16" height="3" rx="1.5" fill="#E2E8F0" />

        {/* Front Clip Body */}
        <Rect x="52" y="10" width="20" height="9" rx="2.5" fill="#0284C7" />
        {/* Wire Loop */}
        <Path
          d="M 57 10 L 57 6 C 57 4.8 58.5 3.8 62 3.8 C 65.5 3.8 67 4.8 67 6 L 67 10"
          stroke="#38BDF8"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </G>
    </Svg>
    <Text style={styles.emptyTitle}>No records yet</Text>
  </View>
);

// 2. Beverage Glass with Water & Bubbles (matching media_1790783273356)
const WaterGlassIcon: React.FC<{ size?: number }> = ({ size = 26 }) => {
  const height = Math.round(size * 1.35);
  return (
    <Svg width={size} height={height} viewBox="0 0 24 32">
      {/* Translucent Glass Body with rounded bottom corners */}
      <Path
        d="M 4 2 L 6 28 C 6.3 30 8.5 31 12 31 C 15.5 31 17.7 30 18 28 L 20 2 Z"
        fill="#E0F2FE"
        stroke="#7DD3FC"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Vivid Water Liquid Level */}
      <Path
        d="M 5 11 L 6 27.8 C 6.3 29.4 8.5 30 12 30 C 15.5 30 17.7 29.4 18 27.8 L 19 11 Z"
        fill="#0284C7"
      />
      {/* Effervescent White Water Bubbles */}
      <Circle cx="9.5" cy="22" r="1.2" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="14" cy="17" r="1.3" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="11" cy="26" r="0.9" fill="#FFFFFF" opacity={0.75} />
      <Circle cx="14.8" cy="23" r="1.0" fill="#FFFFFF" opacity={0.75} />
    </Svg>
  );
};

export interface WaterHistoryCardProps {
  onViewAll?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const WaterHistoryCard: React.FC<WaterHistoryCardProps> = ({ onViewAll, style }) => {
  const {
    date,
    currentWaterMl: totalWaterMl,
    waterEntries,
    removeWaterEntry,
    updateWaterEntry,
    resetWater,
    addWater,
  } = useHydration();

  // Synthesize entry if waterMl > 0 but entries array is empty or partial (guarantees entries match total)
  const displayEntries: WaterLogEntry[] = React.useMemo(() => {
    if (waterEntries.length > 0) {
      const entriesSum = waterEntries.reduce((sum, e) => sum + (e.amountMl || 0), 0);
      const diff = totalWaterMl - entriesSum;
      if (diff > 0) {
        return [
          ...waterEntries,
          {
            id: 'legacy_balance',
            amountMl: diff,
            beverageType: 'water',
            loggedAt: date ? `${date}T08:00:00.000Z` : new Date().toISOString(),
          },
        ];
      }
      return waterEntries;
    }
    if (totalWaterMl > 0) {
      return [
        {
          id: 'synthetic_initial',
          amountMl: totalWaterMl,
          beverageType: 'water',
          loggedAt: date ? `${date}T08:00:00.000Z` : new Date().toISOString(),
        },
      ];
    }
    return [];
  }, [waterEntries, totalWaterMl, date]);

  // View All Modal state
  const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);

  // Floating Popover state for Edit / Delete
  const [actionMenu, setActionMenu] = useState<{
    entry: WaterLogEntry;
    positionY: number;
    positionX?: number;
  } | null>(null);

  // Edit entry modal state
  const [editingEntry, setEditingEntry] = useState<WaterLogEntry | null>(null);
  const [editVolume, setEditVolume] = useState<number>(300);
  const [editBeverage, setEditBeverage] = useState<string>('water');

  // Entry pending delete confirmation
  const [entryToDelete, setEntryToDelete] = useState<WaterLogEntry | null>(null);

  const handleOpenActionMenu = (entry: WaterLogEntry, event?: any) => {
    const y = event?.nativeEvent?.pageY || 350;
    const x = event?.nativeEvent?.pageX;
    setActionMenu({ entry, positionY: y, positionX: x });
  };

  const handleStartEdit = () => {
    if (!actionMenu) return;
    const entryToEdit = actionMenu.entry;
    setActionMenu(null);
    setEditVolume(entryToEdit.amountMl);
    setEditBeverage(entryToEdit.beverageType || 'water');
    setEditingEntry(entryToEdit);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    if (editingEntry.id === 'synthetic_initial') {
      resetWater();
      addWater(editVolume, editBeverage);
    } else if (editingEntry.id === 'legacy_balance') {
      addWater(editVolume - editingEntry.amountMl, editBeverage);
    } else {
      updateWaterEntry(editingEntry.id, { amountMl: editVolume, beverageType: editBeverage }, date);
    }
    setEditingEntry(null);
  };

  const handlePromptDelete = () => {
    if (!actionMenu) return;
    const toDelete = actionMenu.entry;
    setActionMenu(null);
    setEntryToDelete(toDelete);
  };

  const handleConfirmDelete = () => {
    if (!entryToDelete) return;
    if (entryToDelete.id === 'synthetic_initial') {
      resetWater();
    } else if (entryToDelete.id === 'legacy_balance') {
      addWater(-entryToDelete.amountMl);
    } else {
      removeWaterEntry(entryToDelete.id, date);
    }
    setEntryToDelete(null);
  };

  const handleViewAllPress = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      setIsViewAllModalOpen(true);
    }
  };

  // Preview shows up to 3 recent entries in the card
  const previewEntries = displayEntries.slice(0, 3);
  const hasEntries = displayEntries.length > 0;

  return (
    <View style={[styles.card, style]}>
      {/* 1. Header Row (History & View All with counter badge) */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeftRow}>
          <Text style={styles.headerTitle}>History</Text>
          {displayEntries.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{displayEntries.length}</Text>
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.viewAllBtn, pressed && styles.btnPressed]}
          onPress={handleViewAllPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="View all water history logs"
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.water} />
        </Pressable>
      </View>

      {/* Divider line below header */}
      <View style={styles.headerDivider} />

      {/* 2. Content Area: Empty State Illustration vs. Chronological List */}
      {!hasEntries ? (
        <EmptyClipboardIllustration />
      ) : (
        <View style={styles.listContainer}>
          {previewEntries.map((entry, index) => {
            const isFirst = index === 0;
            return (
              <View
                key={entry.id || `entry_${index}`}
                style={[styles.historyRow, !isFirst && styles.rowBorderTop]}
              >
                {/* Beverage Visual Icon */}
                <View
                  style={[
                    styles.beverageIconBox,
                    { backgroundColor: getBeverageBg(entry.beverageType) },
                  ]}
                >
                  {renderBeverageIconElement(entry.beverageType, 18)}
                </View>

                {/* Beverage Name & Timestamp */}
                <View style={styles.beverageInfo}>
                  <Text style={styles.beverageName}>{getBeverageName(entry.beverageType)}</Text>
                  <Text style={styles.beverageTime}>{formatLogTime(entry.loggedAt)}</Text>
                </View>

                {/* Logged Volume Readout */}
                <Text style={styles.beverageAmount}>{entry.amountMl} mL</Text>

                {/* 3-Dots Action Trigger */}
                <Pressable
                  style={({ pressed }) => [styles.menuTriggerBtn, pressed && styles.btnPressed]}
                  onPress={e => handleOpenActionMenu(entry, e)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Options for ${entry.amountMl} mL entry`}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#64748B" />
                </Pressable>
              </View>
            );
          })}

          {/* Footer indicator for remaining records if > 3 */}
          {displayEntries.length > 3 && (
            <Pressable
              style={({ pressed }) => [styles.moreFooterBtn, pressed && styles.btnPressed]}
              onPress={handleViewAllPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`View all ${displayEntries.length} water logs`}
            >
              <Text style={styles.moreFooterText}>
                +{displayEntries.length - 3} more{' '}
                {displayEntries.length - 3 === 1 ? 'record' : 'records'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 3. Floating Action Popover Menu (Matching Reference Screenshot) */}
      <WaterEntryActionPopover
        visible={!!actionMenu}
        positionY={actionMenu?.positionY || 350}
        positionX={actionMenu?.positionX}
        onEdit={handleStartEdit}
        onDelete={handlePromptDelete}
        onClose={() => setActionMenu(null)}
      />

      {/* 4. Edit Entry Modal Sheet */}
      <Modal
        visible={!!editingEntry}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingEntry(null)}
      >
        <View style={styles.editModalOverlay}>
          <Pressable style={styles.editModalBackdrop} onPress={() => setEditingEntry(null)} />
          <View style={styles.editModalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.editHeaderRow}>
              <View>
                <Text style={styles.editModalTitle}>Edit Water Entry</Text>
                <Text style={styles.editModalSubtitle}>
                  Logged at {formatLogTime(editingEntry?.loggedAt)}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.editCloseBtn, pressed && styles.btnPressed]}
                onPress={() => setEditingEntry(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close edit modal"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Stepper Volume Editor */}
            <View style={styles.stepperContainer}>
              <Pressable
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                onPress={() => setEditVolume(v => Math.max(50, v - 50))}
                accessibilityRole="button"
                accessibilityLabel="Decrease 50 mL"
              >
                <Ionicons name="remove" size={22} color={Colors.water} />
              </Pressable>
              <View style={styles.stepperValueBox}>
                <Text style={styles.stepperValueText}>{editVolume}</Text>
                <Text style={styles.stepperUnitText}>mL</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                onPress={() => setEditVolume(v => Math.min(3000, v + 50))}
                accessibilityRole="button"
                accessibilityLabel="Increase 50 mL"
              >
                <Ionicons name="add" size={22} color={Colors.water} />
              </Pressable>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetChipsRow}>
              {[150, 250, 300, 400, 500].map(preset => {
                const isActive = editVolume === preset;
                return (
                  <Pressable
                    key={`edit_preset_${preset}`}
                    style={({ pressed }) => [
                      styles.presetChip,
                      isActive && styles.presetChipActive,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => setEditVolume(preset)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set to ${preset} mL`}
                  >
                    <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                      {preset} mL
                    </Text>
                  </Pressable>
                );
              })}
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
              {BEVERAGE_DEFINITIONS.map(bev => {
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
              style={({ pressed }) => [styles.saveEditBtn, pressed && styles.btnPressed]}
              onPress={handleSaveEdit}
              accessibilityRole="button"
              accessibilityLabel="Save Changes"
            >
              <Text style={styles.saveEditBtnText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 5. Delete Confirmation Modal */}
      <Modal
        visible={!!entryToDelete}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEntryToDelete(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEntryToDelete(null)}>
          <Pressable style={styles.actionSheetContent} onPress={e => e.stopPropagation()}>
            <View style={styles.deleteConfirmHeader}>
              <View style={styles.deleteConfirmIconBox}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </View>
              <Text style={styles.deleteConfirmTitle}>Delete Hydration Entry?</Text>
              <Text style={styles.deleteConfirmSubtitle}>
                This will remove {entryToDelete?.amountMl} mL from today’s logged total.
              </Text>
            </View>

            <View style={styles.actionButtonsCol}>
              <Pressable
                style={({ pressed }) => [styles.deleteConfirmBtn, pressed && styles.btnPressed]}
                onPress={handleConfirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Confirm delete entry"
              >
                <Text style={styles.deleteConfirmBtnText}>Delete Entry</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                onPress={() => setEntryToDelete(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel delete"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 6. Full View All History Modal Sheet */}
      <Modal
        visible={isViewAllModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsViewAllModalOpen(false)}
      >
        <View style={styles.viewAllOverlay}>
          <Pressable style={styles.viewAllBackdrop} onPress={() => setIsViewAllModalOpen(false)} />
          <View style={styles.viewAllSheet}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Sheet Header */}
            <View style={styles.viewAllHeader}>
              <View>
                <Text style={styles.viewAllModalTitle}>Water History</Text>
                <Text style={styles.viewAllModalSubtitle}>
                  {displayEntries.length} entries • {totalWaterMl} mL total
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
                onPress={() => setIsViewAllModalOpen(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Full Entries List */}
            <ScrollView
              style={styles.viewAllList}
              contentContainerStyle={styles.viewAllListContent}
              showsVerticalScrollIndicator={false}
            >
              {displayEntries.length === 0 ? (
                <EmptyClipboardIllustration />
              ) : (
                displayEntries.map((entry, index) => (
                  <View
                    key={entry.id || `full_entry_${index}`}
                    style={[styles.historyRow, index > 0 && styles.rowBorderTop]}
                  >
                    <View
                      style={[
                        styles.beverageIconBox,
                        { backgroundColor: getBeverageBg(entry.beverageType) },
                      ]}
                    >
                      {renderBeverageIconElement(entry.beverageType, 18)}
                    </View>
                    <View style={styles.beverageInfo}>
                      <Text style={styles.beverageName}>{getBeverageName(entry.beverageType)}</Text>
                      <Text style={styles.beverageTime}>{formatLogTime(entry.loggedAt)}</Text>
                    </View>
                    <Text style={styles.beverageAmount}>{entry.amountMl} mL</Text>
                    <Pressable
                      style={({ pressed }) => [styles.menuTriggerBtn, pressed && styles.btnPressed]}
                      onPress={e => handleOpenActionMenu(entry, e)}
                      hitSlop={8}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color="#64748B" />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
  },
  countBadgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: '#0284C7',
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.water,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 12,
    marginBottom: 6,
  },
  // Empty State Styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
  // List Container Styles
  listContainer: {
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  beverageIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  beverageInfo: {
    flex: 1,
  },
  beverageName: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
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
    fontSize: 14,
    color: '#0F172A',
    marginRight: 8,
  },
  menuTriggerBtn: {
    padding: 6,
  },
  moreFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    gap: 4,
  },
  moreFooterText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  // Modal / Action Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  actionSheetContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderCurve: 'continuous',
    width: '100%',
    maxWidth: 340,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  actionSheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  actionEntryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionSheetTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  actionSheetSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  actionMenuRowsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 2,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
  },
  editActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deleteActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionMenuTextContainer: {
    flex: 1,
  },
  actionMenuPrimaryText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  deleteActionPrimaryText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#EF4444',
  },
  actionMenuSecondaryText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  // Delete Confirmation Styles
  deleteConfirmHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  deleteConfirmIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteConfirmTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  deleteConfirmSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  actionButtonsCol: {
    gap: 10,
  },
  deleteConfirmBtn: {
    backgroundColor: '#EF4444',
    height: 46,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    height: 46,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: '#475569',
  },
  // Edit Modal Sheet Styles
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
  editHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  editModalTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  editModalSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
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
    height: 48,
    backgroundColor: Colors.water,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveEditBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  // View All Modal Sheet
  viewAllOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  viewAllBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  viewAllSheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    maxHeight: '80%',
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
  viewAllHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  viewAllModalTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  viewAllModalSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllList: {
    marginTop: 8,
  },
  viewAllListContent: {
    paddingTop: 4,
    paddingBottom: 24,
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
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
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
});
