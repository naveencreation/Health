/**
 * RiaMealCardView.tsx
 *
 * Double-bezel Action Card for Proposed & Confirmed Meals.
 * Features 10-second live countdown Undo, duplicate warnings,
 * Atwater-verified macro pills, and haptic feedback per RIA_Chat.md.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { MealCardData } from '@/services/ai/types/ai.types';

export interface RiaMealCardViewProps {
  data: MealCardData;
  onConfirm: () => void;
  onUndo: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
  testID?: string;
}

const SLOT_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline', color: '#D97706', bg: '#FEF3C7' },
  lunch: { label: 'Lunch', icon: 'restaurant-outline', color: '#059669', bg: '#D1FAE5' },
  dinner: { label: 'Dinner', icon: 'moon-outline', color: '#4F46E5', bg: '#EEF2FF' },
  snack: { label: 'Snack', icon: 'nutrition-outline', color: '#EA580C', bg: '#FFEDD5' },
};

export const RiaMealCardView: React.FC<RiaMealCardViewProps> = ({
  data,
  onConfirm,
  onUndo,
  onEdit,
  onDismiss,
  testID = 'ria-meal-card',
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (data.state === 'logged' && data.undoUntil) {
      return Math.max(0, Math.ceil((data.undoUntil - Date.now()) / 1000));
    }
    return 0;
  });

  const slotMeta = SLOT_CONFIG[data.slot] || SLOT_CONFIG.lunch;

  // Active 10-second ticker when logged and within undo window
  useEffect(() => {
    if (data.state !== 'logged' || !data.undoUntil) return;

    const tick = () => {
      const diffMs = (data.undoUntil || 0) - Date.now();
      const s = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsRemaining(s);
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [data.state, data.undoUntil]);

  const totalKcal = data.items.reduce((sum, i) => sum + (i.kcal || 0), 0);
  const totalProtein = data.items.reduce((sum, i) => sum + (i.protein || 0), 0);

  const handleConfirmPress = async () => {
    await haptics.impactLight();
    onConfirm();
  };

  const handleUndoPress = async () => {
    await haptics.impactLight();
    onUndo();
  };

  const handleEditPress = async () => {
    await haptics.selection();
    onEdit?.();
  };

  const handleDismissPress = async () => {
    await haptics.selection();
    onDismiss?.();
  };

  // State: Undone
  if (data.state === 'undone') {
    return (
      <View style={[styles.outerShell, styles.inactiveShell]} testID={`${testID}-undone`}>
        <View style={styles.undoneRow}>
          <Ionicons name="arrow-undo-outline" size={14} color="#94A3B8" />
          <Text style={styles.undoneText}>Removed from {slotMeta.label}</Text>
        </View>
      </View>
    );
  }

  // State: Dismissed
  if (data.state === 'dismissed') {
    return (
      <View style={[styles.outerShell, styles.inactiveShell]} testID={`${testID}-dismissed`}>
        <View style={styles.undoneRow}>
          <Ionicons name="close-circle-outline" size={14} color="#94A3B8" />
          <Text style={styles.undoneText}>Suggestion dismissed</Text>
        </View>
      </View>
    );
  }

  // State: Logged (with 10-second undo countdown)
  if (data.state === 'logged') {
    const isUndoAvailable = secondsRemaining > 0;

    return (
      <View style={[styles.outerShell, styles.loggedShell]} testID={`${testID}-logged`}>
        <View style={styles.loggedInnerCore}>
          <View style={styles.loggedHeaderRow}>
            <View style={styles.loggedBadge}>
              {Boolean(data.photoThumbUri) && (
                <Image
                  source={{ uri: data.photoThumbUri }}
                  style={styles.loggedMiniThumb}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={styles.loggedBadgeText}>Logged to {slotMeta.label}</Text>
            </View>
            <Text style={styles.loggedKcalText}>{totalKcal} kcal</Text>
          </View>

          <View style={styles.loggedItemsPreview}>
            <Text style={styles.loggedItemsText} numberOfLines={1}>
              {data.items.map(i => `${i.name} (${i.qty} ${i.unit})`).join(' · ')}
            </Text>
          </View>

          {isUndoAvailable && (
            <View style={styles.undoFooterRow}>
              <View style={styles.undoTimerBadge}>
                <Ionicons name="timer-outline" size={13} color="#EA580C" />
                <Text style={styles.undoTimerText}>Undo expires in {secondsRemaining}s</Text>
              </View>
              <Pressable
                style={styles.undoBtn}
                onPress={handleUndoPress}
                accessibilityRole="button"
                accessibilityLabel="Undo meal logging"
                testID={`${testID}-undo-btn`}
              >
                <Text style={styles.undoBtnText}>Undo</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }

  // State: Proposed (Default rich card)
  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={[styles.slotChip, { backgroundColor: slotMeta.bg }]}>
            <Ionicons name={slotMeta.icon as any} size={13} color={slotMeta.color} />
            <Text style={[styles.slotChipText, { color: slotMeta.color }]}>{slotMeta.label}</Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalKcalText}>{totalKcal} kcal</Text>
            <Text style={styles.totalProteinText}>• {totalProtein}g P</Text>
          </View>
        </View>

        {/* 10-Minute Duplicate Warning Banner */}
        {Boolean(data.duplicateWarning) && (
          <View style={styles.duplicateBanner} testID={`${testID}-duplicate-banner`}>
            <Ionicons name="alert-circle" size={14} color="#D97706" />
            <Text style={styles.duplicateBannerText}>{data.duplicateWarning}</Text>
          </View>
        )}

        {/* Photo Thumbnail Banner (Phase R6) */}
        {Boolean(data.photoThumbUri) && (
          <View style={styles.cardPhotoBanner} testID={`${testID}-photo-thumb`}>
            <Image
              source={{ uri: data.photoThumbUri }}
              style={styles.cardPhotoImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={styles.cardPhotoBadge}>
              <Ionicons name="camera" size={11} color="#FFFFFF" />
              <Text style={styles.cardPhotoBadgeText}>Scanned plate</Text>
            </View>
          </View>
        )}

        {/* Items List */}
        <View style={styles.itemsList}>
          {data.items.map((item, idx) => (
            <View key={item.id || idx} style={styles.itemRow}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemNameText}>{item.name}</Text>
                <Text style={styles.itemQtyText}>
                  {item.qty} {item.unit}
                </Text>
              </View>

              {/* Macro Pills */}
              <View style={styles.macroPillsRow}>
                <View style={[styles.macroPill, styles.kcalPill]}>
                  <Text style={styles.kcalPillText}>{item.kcal} kcal</Text>
                </View>
                <View style={[styles.macroPill, styles.proteinPill]}>
                  <Text style={styles.proteinPillText}>{item.protein}g P</Text>
                </View>
                <View style={[styles.macroPill, styles.carbsPill]}>
                  <Text style={styles.carbsPillText}>{item.carbs}g C</Text>
                </View>
                <View style={[styles.macroPill, styles.fatPill]}>
                  <Text style={styles.fatPillText}>{item.fat}g F</Text>
                </View>
                <View style={styles.sourceTag}>
                  <Text style={styles.sourceTagText}>{item.source}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Assumption Footnote */}
        {Boolean(data.assumption) && (
          <View style={styles.assumptionRow}>
            <Ionicons name="information-circle-outline" size={13} color="#94A3B8" />
            <Text style={styles.assumptionText}>{data.assumption}</Text>
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.primaryAddBtn, pressed && styles.btnPressed]}
            onPress={handleConfirmPress}
            accessibilityRole="button"
            accessibilityLabel={`Add to ${slotMeta.label}`}
            testID={`${testID}-confirm-btn`}
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text style={styles.primaryAddBtnText}>Add to {slotMeta.label}</Text>
          </Pressable>

          {onEdit && (
            <Pressable
              style={({ pressed }) => [styles.secondaryEditBtn, pressed && styles.btnPressed]}
              onPress={handleEditPress}
              accessibilityRole="button"
              accessibilityLabel="Edit meal details"
              testID={`${testID}-edit-btn`}
            >
              <Ionicons name="pencil-outline" size={14} color="#475569" />
              <Text style={styles.secondaryEditBtnText}>Edit</Text>
            </Pressable>
          )}

          {onDismiss && (
            <Pressable
              style={({ pressed }) => [styles.dismissBtn, pressed && styles.btnPressed]}
              onPress={handleDismissPress}
              accessibilityRole="button"
              accessibilityLabel="Dismiss meal proposal"
              testID={`${testID}-dismiss-btn`}
            >
              <Text style={styles.dismissBtnText}>Not now</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Double-Bezel Architecture
  outerShell: {
    backgroundColor: '#FFF7F2',
    borderWidth: 1,
    borderColor: '#FFE4D6',
    borderRadius: 20,
    padding: 3,
    marginVertical: 6,
    width: '100%',
  },
  inactiveShell: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    padding: 6,
  },
  loggedShell: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 13,
  },
  loggedInnerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 12,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  slotChipText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalKcalText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  totalProteinText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#64748B',
  },

  // Duplicate Banner
  duplicateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  duplicateBannerText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#B45309',
    flex: 1,
  },

  // Items List
  itemsList: {
    gap: 8,
    marginBottom: 8,
  },
  itemRow: {
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: '#F1EFE9',
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  itemNameText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  itemQtyText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#64748B',
  },

  // Macro Pills
  macroPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  macroPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kcalPill: {
    backgroundColor: '#FFF0EB',
  },
  kcalPillText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: Colors.primary,
  },
  proteinPill: {
    backgroundColor: '#EEF2FF',
  },
  proteinPillText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#4F46E5',
  },
  carbsPill: {
    backgroundColor: '#FEF3C7',
  },
  carbsPillText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#D97706',
  },
  fatPill: {
    backgroundColor: '#FFE4E6',
  },
  fatPillText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#E11D48',
  },
  sourceTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  sourceTagText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9.5,
    color: '#64748B',
    textTransform: 'uppercase',
  },

  // Assumption
  assumptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  assumptionText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#64748B',
    fontStyle: 'italic',
    flex: 1,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flex: 1,
  },
  primaryAddBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  secondaryEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryEditBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#475569',
  },
  dismissBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  dismissBtnText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#94A3B8',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Logged & Undo States
  loggedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loggedBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#15803D',
  },
  loggedKcalText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  loggedItemsPreview: {
    marginTop: 4,
  },
  loggedItemsText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  undoFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  undoTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  undoTimerText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#EA580C',
  },
  undoBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFD7CC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  undoBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: Colors.primary,
  },

  // Undone / Inactive
  undoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  undoneText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#94A3B8',
  },

  // Photo Banner (Phase R6)
  cardPhotoBanner: {
    height: 120,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 4,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  cardPhotoImage: {
    width: '100%',
    height: '100%',
  },
  cardPhotoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardPhotoBadgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  loggedMiniThumb: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginRight: 4,
  },
});
