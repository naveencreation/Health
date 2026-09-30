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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useDailyLog } from '@/context/HealthContext';
import { WaterLogEntry } from '@/types';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

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

export const WaterHistoryCard: React.FC<WaterHistoryCardProps> = ({
  onViewAll,
  style,
}) => {
  const { selectedDate, dailyLogs, removeWaterEntry, resetWater } = useDailyLog();

  const currentLog = dailyLogs[selectedDate];
  const waterEntries = currentLog?.waterEntries ?? [];
  const totalWaterMl = currentLog?.waterMl ?? 0;

  // Synthesize entry if waterMl > 0 but entries array is empty (fallback persistence)
  const displayEntries: WaterLogEntry[] = React.useMemo(() => {
    if (waterEntries.length > 0) return waterEntries;
    if (totalWaterMl > 0) {
      return [
        {
          id: 'synthetic_initial',
          amountMl: totalWaterMl,
          beverageType: 'water',
          loggedAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  }, [waterEntries, totalWaterMl]);

  // View All Modal state
  const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);

  // Selected entry for action menu
  const [selectedEntry, setSelectedEntry] = useState<WaterLogEntry | null>(null);

  const handleOpenActionMenu = (entry: WaterLogEntry) => {
    setSelectedEntry(entry);
  };

  const handleDeleteEntry = () => {
    if (!selectedEntry) return;
    if (selectedEntry.id === 'synthetic_initial') {
      resetWater();
    } else {
      removeWaterEntry(selectedEntry.id);
    }
    setSelectedEntry(null);
  };

  const handleViewAllPress = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      setIsViewAllModalOpen(true);
    }
  };

  // Preview shows up to 3 entries in the card
  const previewEntries = displayEntries.slice(0, 3);
  const hasEntries = displayEntries.length > 0;

  return (
    <View style={[styles.card, style]}>
      {/* 1. Header Row (History & View All -> matching reference screenshot) */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>History</Text>

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
                <View style={styles.beverageIconBox}>
                  <WaterGlassIcon size={22} />
                </View>

                {/* Beverage Name & Timestamp */}
                <View style={styles.beverageInfo}>
                  <Text style={styles.beverageName}>
                    {entry.beverageType === 'coffee'
                      ? 'Coffee'
                      : entry.beverageType === 'tea'
                      ? 'Tea'
                      : entry.beverageType === 'juice'
                      ? 'Juice'
                      : entry.beverageType === 'sport'
                      ? 'Sport Drink'
                      : entry.beverageType === 'smoothie'
                      ? 'Smoothie'
                      : 'Water'}
                  </Text>
                  <Text style={styles.beverageTime}>
                    {formatLogTime(entry.loggedAt)}
                  </Text>
                </View>

                {/* Logged Volume Readout */}
                <Text style={styles.beverageAmount}>{entry.amountMl} mL</Text>

                {/* 3-Dots Action Trigger */}
                <Pressable
                  style={({ pressed }) => [
                    styles.menuTriggerBtn,
                    pressed && styles.btnPressed,
                  ]}
                  onPress={() => handleOpenActionMenu(entry)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Options for ${entry.amountMl} mL entry`}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#64748B" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* 3. Action Sheet / Delete Confirmation Modal */}
      <Modal
        visible={!!selectedEntry}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedEntry(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedEntry(null)}
        >
          <Pressable
            style={styles.actionSheetContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.actionSheetHeader}>
              <View style={styles.actionSheetIconBox}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </View>
              <Text style={styles.actionSheetTitle}>Delete Hydration Entry?</Text>
              <Text style={styles.actionSheetSubtitle}>
                This will remove {selectedEntry?.amountMl} mL from today’s logged total.
              </Text>
            </View>

            <View style={styles.actionButtonsCol}>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteConfirmBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={handleDeleteEntry}
                accessibilityRole="button"
                accessibilityLabel="Confirm delete entry"
              >
                <Text style={styles.deleteConfirmBtnText}>Delete Entry</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => setSelectedEntry(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel delete"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 4. Full View All History Modal Sheet */}
      <Modal
        visible={isViewAllModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsViewAllModalOpen(false)}
      >
        <View style={styles.viewAllOverlay}>
          <Pressable
            style={styles.viewAllBackdrop}
            onPress={() => setIsViewAllModalOpen(false)}
          />
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
                    <View style={styles.beverageIconBox}>
                      <WaterGlassIcon size={22} />
                    </View>
                    <View style={styles.beverageInfo}>
                      <Text style={styles.beverageName}>
                        {entry.beverageType === 'coffee'
                          ? 'Coffee'
                          : entry.beverageType === 'tea'
                          ? 'Tea'
                          : entry.beverageType === 'juice'
                          ? 'Juice'
                          : entry.beverageType === 'sport'
                          ? 'Sport Drink'
                          : 'Water'}
                      </Text>
                      <Text style={styles.beverageTime}>
                        {formatLogTime(entry.loggedAt)}
                      </Text>
                    </View>
                    <Text style={styles.beverageAmount}>{entry.amountMl} mL</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.menuTriggerBtn,
                        pressed && styles.btnPressed,
                      ]}
                      onPress={() => handleOpenActionMenu(entry)}
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
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
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
    fontFamily: Fonts.poppins.semiBold,
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
    fontFamily: Fonts.poppins.regular,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  beverageInfo: {
    flex: 1,
  },
  beverageName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  beverageTime: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  beverageAmount: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#0F172A',
    marginRight: 8,
  },
  menuTriggerBtn: {
    padding: 6,
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
    borderRadius: 20,
    borderCurve: 'continuous',
    width: '100%',
    maxWidth: 340,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  actionSheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionSheetIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionSheetTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  actionSheetSubtitle: {
    fontFamily: Fonts.poppins.regular,
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
    fontFamily: Fonts.poppins.semiBold,
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
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#475569',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  viewAllModalSubtitle: {
    fontFamily: Fonts.poppins.regular,
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
  btnPressed: {
    opacity: 0.75,
  },
});
