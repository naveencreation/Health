/**
 * Shared building blocks for Ria's in-chat cards: one card shell, header, notices,
 * the "done" bar with a timed Undo, the collapsed (dismissed) line and macro bars.
 */

import React, { useEffect, useState } from 'react';
import { View, Text as RNText, TextProps, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

// The web preview ignores the phone's font-size setting; capping growth keeps rows from
// breaking on phones while large text still gets bigger (same cap as the chat screen)
export const CardText: React.FC<TextProps> = props => (
  <RNText maxFontSizeMultiplier={1.3} {...props} />
);
const Text = CardText;

export type CardTone = 'cal' | 'water' | 'weight' | 'ria';

const TONES: Record<CardTone, { bg: string; fg: string }> = {
  cal: { bg: Colors.primaryLight, fg: Colors.primaryDark },
  water: { bg: Colors.waterTrack, fg: Colors.water },
  weight: { bg: Colors.weightTrack, fg: Colors.weightDark },
  ria: { bg: Colors.primaryLight, fg: Colors.primary },
};

export const slotLabel = (slot: string) =>
  slot === 'snack' || slot === 'snacks' ? 'Snack' : slot.charAt(0).toUpperCase() + slot.slice(1);

export const fmt = (n: number) => Math.round(n).toLocaleString();

export const CardShell: React.FC<{
  children: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}> = ({ children, testID, accessibilityLabel }) => (
  <View style={ui.card} testID={testID} accessibilityLabel={accessibilityLabel}>
    {children}
  </View>
);

export const CardHeader: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  tone: CardTone;
  title: string;
  subtitle?: string;
  /** Subtitle in the "done" colour, e.g. "Added to today". */
  subtitleDone?: boolean;
  thumbUri?: string;
  right?: React.ReactNode;
}> = ({ icon, tone, title, subtitle, subtitleDone, thumbUri, right }) => (
  <View style={ui.header}>
    <View style={ui.eyebrow}>
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={ui.thumb} accessibilityLabel="Meal photo" />
      ) : (
        <View style={[ui.icon, { backgroundColor: TONES[tone].bg }]}>
          <Ionicons name={icon} size={16} color={TONES[tone].fg} />
        </View>
      )}
      <View style={ui.flex1}>
        <Text style={ui.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[ui.subtitle, subtitleDone && ui.subtitleDone]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
    {right}
  </View>
);

export const BigValue: React.FC<{ value: string; unit: string }> = ({ value, unit }) => (
  <Text style={ui.big}>
    {value}
    <Text style={ui.bigUnit}> {unit}</Text>
  </Text>
);

export const CardNotice: React.FC<{ kind: 'warn' | 'info'; text: string }> = ({ kind, text }) => (
  <View
    style={[ui.notice, kind === 'warn' ? ui.noticeWarn : ui.noticeInfo]}
    accessibilityRole={kind === 'warn' ? 'alert' : undefined}
  >
    <Ionicons
      name={kind === 'warn' ? 'alert-circle-outline' : 'information-circle-outline'}
      size={16}
      color={kind === 'warn' ? Colors.warningDark : Colors.textSlate600}
    />
    <Text
      style={[ui.noticeText, { color: kind === 'warn' ? Colors.warningDark : Colors.textSlate600 }]}
    >
      {text}
    </Text>
  </View>
);

export const Divider = () => <View style={ui.divider} />;

/** 36 px pill with a 44 px touch area, for single-row cards. */
export const SmallButton: React.FC<{
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
}> = ({ label, onPress, variant = 'primary', icon, accessibilityLabel }) => {
  const primary = variant === 'primary';
  return (
    <Pressable
      style={({ pressed }) => [
        ui.small,
        primary ? ui.smallPrimary : ui.smallSecondary,
        pressed && ui.pressed,
      ]}
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {icon ? (
        <Ionicons name={icon} size={16} color={primary ? Colors.onPrimary : Colors.textPrimary} />
      ) : null}
      <Text style={[ui.smallText, { color: primary ? Colors.onPrimary : Colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const secondsLeft = (until: number) => Math.max(0, Math.ceil((until - Date.now()) / 1000));

/**
 * "Undo · 8s" that hides itself when the window closes. Render it with key={undoUntil}
 * so a new window restarts the count.
 */
export const UndoCountdown: React.FC<{
  undoUntil: number;
  onUndo: () => void;
  what: string;
  variant?: 'bar' | 'button';
}> = ({ undoUntil, onUndo, what, variant = 'bar' }) => {
  const [left, setLeft] = useState(() => secondsLeft(undoUntil));
  useEffect(() => {
    if (left <= 0) return;
    // Wake just after the next whole second so the shown value always changes
    const t = setTimeout(
      () => setLeft(secondsLeft(undoUntil)),
      ((undoUntil - Date.now() - 1) % 1000) + 21
    );
    return () => clearTimeout(t);
  }, [left, undoUntil]);
  if (left <= 0) return null;
  const label = `Undo · ${left}s`;
  const a11y = `Undo ${what}, ${left} seconds left`;
  return variant === 'button' ? (
    <SmallButton label={label} variant="secondary" onPress={onUndo} accessibilityLabel={a11y} />
  ) : (
    <Pressable
      style={({ pressed }) => [ui.undo, pressed && ui.pressed]}
      onPress={onUndo}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Text style={ui.undoText}>{label}</Text>
    </Pressable>
  );
};

export const DoneBar: React.FC<{ label: string; children?: React.ReactNode }> = ({
  label,
  children,
}) => (
  <View style={ui.done} accessibilityLiveRegion="polite">
    <View style={ui.doneLeft}>
      <Ionicons name="checkmark-circle" size={18} color={Colors.primaryDeep} />
      <Text style={ui.doneText}>{label}</Text>
    </View>
    {children}
  </View>
);

export const DoneChip: React.FC<{ label: string }> = ({ label }) => (
  <View style={ui.chip}>
    <Ionicons name="checkmark" size={12} color={Colors.primaryDeep} />
    <Text style={ui.chipText}>{label}</Text>
  </View>
);

/** One-line stand-in for a dismissed card. */
export const CollapsedCard: React.FC<{ text: string; onShow?: () => void; testID?: string }> = ({
  text,
  onShow,
  testID,
}) => (
  <View style={ui.collapsed} testID={testID}>
    <Text style={ui.collapsedText} numberOfLines={1}>
      {text}
    </Text>
    {onShow ? (
      <Pressable
        onPress={onShow}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Show card: ${text}`}
      >
        <Text style={ui.collapsedAction}>Show</Text>
      </Pressable>
    ) : null}
  </View>
);

/** Labelled paragraph under a hairline: Ria's comment, a win, a next step. */
export const CardNote: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  text: string;
}> = ({ icon, label, text }) => (
  <View>
    <View style={ui.noteLabelRow}>
      <Ionicons name={icon} size={14} color={Colors.textSecondary} />
      <Text style={ui.noteLabel}>{label}</Text>
    </View>
    <Text style={ui.noteText}>{text}</Text>
  </View>
);

type Macro = 'protein' | 'carbs' | 'fat';
const MACROS: { key: Macro; label: string; color: string; track: string; kcal: number }[] = [
  { key: 'protein', label: 'Protein', color: Colors.protein, track: Colors.proteinLight, kcal: 4 },
  { key: 'carbs', label: 'Carbs', color: Colors.carbs, track: Colors.carbsLight, kcal: 4 },
  { key: 'fat', label: 'Fat', color: Colors.fat, track: Colors.fatLight, kcal: 9 },
];

/**
 * Three macro columns. Bars show progress to `targets` when given (no bar if a target is
 * missing), otherwise each macro's share of the calories.
 */
export const MacroBars: React.FC<{
  grams: Record<Macro, number>;
  targets?: Partial<Record<Macro, number>>;
}> = ({ grams, targets }) => {
  const total = MACROS.reduce((s, m) => s + grams[m.key] * m.kcal, 0);
  return (
    <View style={ui.macros}>
      {MACROS.map(m => {
        const g = grams[m.key];
        const target = targets?.[m.key];
        const fill = targets ? (target ? g / target : null) : total > 0 ? (g * m.kcal) / total : 0;
        return (
          <View
            key={m.key}
            style={ui.macro}
            accessible
            accessibilityLabel={`${m.label} ${Math.round(g)}${target ? ` of ${Math.round(target)}` : ''} grams`}
          >
            <Text style={ui.macroLabel}>
              {m.label} <Text style={ui.macroValue}>{Math.round(g)}</Text>
              <Text style={ui.macroTarget}>{target ? ` / ${Math.round(target)} g` : ' g'}</Text>
            </Text>
            {fill !== null ? (
              <View style={[ui.bar, { backgroundColor: m.track }]}>
                <View
                  style={[
                    ui.barFill,
                    {
                      backgroundColor: m.color,
                      width: `${Math.min(100, Math.round(fill * 100))}%`,
                    },
                  ]}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

export const ui = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.85 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 14,
    gap: 12,
    elevation: 0,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  subtitleDone: { fontFamily: Fonts.urbanist.bold, color: Colors.primaryDeep },
  big: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  bigUnit: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  noticeWarn: { backgroundColor: Colors.warningLight },
  noticeInfo: {
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
  },
  noticeText: { flex: 1, fontFamily: Fonts.urbanist.medium, fontSize: 13, lineHeight: 18 },
  divider: { height: 1, backgroundColor: Colors.borderWhisper },
  // Wraps so "Not now" drops under the main button on narrow phones instead of squeezing it
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mainButton: { flexGrow: 1, flexBasis: 160 },
  small: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  smallPrimary: { backgroundColor: Colors.primary },
  smallSecondary: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
  },
  smallText: { fontFamily: Fonts.urbanist.bold, fontSize: 14 },
  done: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.primaryLight,
    paddingLeft: 12,
    paddingRight: 6,
  },
  doneLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  doneText: { fontFamily: Fonts.urbanist.bold, fontSize: 14, color: Colors.primaryDeep },
  undo: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.card,
    justifyContent: 'center',
  },
  undoText: { fontFamily: Fonts.urbanist.bold, fontSize: 13, color: Colors.primaryDeep },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: Colors.primaryLight,
  },
  chipText: { fontFamily: Fonts.urbanist.bold, fontSize: 12, color: Colors.primaryDeep },
  collapsed: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderMedium,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
  },
  collapsedText: {
    flex: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  collapsedAction: { fontFamily: Fonts.urbanist.bold, fontSize: 13, color: Colors.primaryDeep },
  noteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  noteLabel: { fontFamily: Fonts.urbanist.bold, fontSize: 12, color: Colors.textSecondary },
  noteText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSlate800,
  },
  macros: { flexDirection: 'row', gap: 10 },
  macro: { flex: 1, gap: 6 },
  macroLabel: { fontFamily: Fonts.urbanist.semiBold, fontSize: 12, color: Colors.textSlate600 },
  macroValue: { fontFamily: Fonts.urbanist.bold, color: Colors.textPrimary },
  macroTarget: { fontFamily: Fonts.urbanist.medium, color: Colors.textMuted },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
});
