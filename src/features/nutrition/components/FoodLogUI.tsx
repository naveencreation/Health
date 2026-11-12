import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MealType } from '@/types';

/** Shared building blocks for Log food, Snap and log, and the barcode result. */

export const MEAL_OPTIONS: { id: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }[] =
  [
    { id: 'breakfast', label: 'Breakfast', icon: 'partly-sunny-outline' },
    { id: 'lunch', label: 'Lunch', icon: 'sunny-outline' },
    { id: 'snacks', label: 'Snacks', icon: 'cafe-outline' },
    { id: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  ];

/** 'lunch' → 'Lunch'. */
export const mealLabel = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** "2", "1.5", "0.5" without trailing zeros. */
export const formatQty = (n: number): string => String(Math.round(n * 100) / 100);

/** Grams: one decimal under 10 g ("3.2"), whole numbers above ("14"). */
export const formatGrams = (g: number): string =>
  String(g < 10 ? Math.round(g * 10) / 10 : Math.round(g));

/** Segmented Breakfast / Lunch / Snacks / Dinner switcher. */
export const MealSwitcher: React.FC<{
  value: MealType;
  onChange: (meal: MealType) => void;
  showIcons?: boolean;
}> = ({ value, onChange, showIcons = true }) => (
  <View style={styles.seg} accessibilityRole="tablist">
    {MEAL_OPTIONS.map(m => {
      const on = m.id === value;
      return (
        <Pressable
          key={m.id}
          style={[styles.segItem, on && styles.segItemOn]}
          onPress={() => onChange(m.id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: on }}
          accessibilityLabel={`Select ${m.label}`}
        >
          {showIcons ? (
            <Ionicons name={m.icon} size={15} color={on ? Colors.primary : Colors.textSecondary} />
          ) : null}
          <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>
            {m.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/** Thin meal budget bar: logged part solid, the item being added lighter, overflow amber. */
export const MealBudgetBar: React.FC<{ logged: number; adding?: number; target: number }> = ({
  logged,
  adding = 0,
  target,
}) => {
  const max = Math.max(target, logged + adding, 1);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%` as const;
  const over = logged + adding > target;
  return (
    <View style={styles.bar}>
      <View style={[styles.barFill, { width: pct(logged) }]} />
      {adding > 0 ? (
        <View style={[styles.barAdd, over && styles.barOver, { width: pct(adding) }]} />
      ) : null}
    </View>
  );
};

/** Footer line under a log action: bar plus "570 of 650 · 80 left". */
export const MealImpact: React.FC<{ logged: number; adding: number; target: number }> = ({
  logged,
  adding,
  target,
}) => {
  const total = logged + adding;
  const left = target - total;
  return (
    <View style={styles.impact}>
      <MealBudgetBar logged={logged} adding={adding} target={target} />
      <Text style={styles.impactText} numberOfLines={1}>
        <Text style={styles.strong}>{total}</Text> of {target} ·{' '}
        <Text style={[styles.strong, left < 0 && styles.overText]}>
          {left >= 0 ? `${left} left` : `${-left} over`}
        </Text>
      </Text>
    </View>
  );
};

/** Calories + protein / carbs / fat in one card with a proportion bar. */
export const MacroSummary: React.FC<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}> = ({ calories, protein, carbs, fat }) => {
  const p = protein * 4;
  const c = carbs * 4;
  const f = fat * 9;
  const sum = p + c + f;
  const cols = [
    { label: 'Protein', value: protein, color: Colors.protein },
    { label: 'Carbs', value: carbs, color: Colors.carbs },
    { label: 'Fat', value: fat, color: Colors.fat },
  ];
  return (
    <View style={styles.card}>
      <View style={styles.macroRow}>
        <View
          style={styles.macroCol}
          accessible
          accessibilityLabel={`${Math.round(calories)} calories`}
        >
          <Text style={[styles.macroValue, { color: Colors.primary }]}>{Math.round(calories)}</Text>
          <Text style={styles.macroLabel}>kcal</Text>
        </View>
        {cols.map(col => (
          <View
            key={col.label}
            style={[styles.macroCol, styles.macroColBorder]}
            accessible
            accessibilityLabel={`${col.label} ${formatGrams(col.value)} grams`}
          >
            <Text style={styles.macroValue}>
              {formatGrams(col.value)}
              <Text style={styles.macroUnit}>g</Text>
            </Text>
            <View style={styles.macroLabelRow}>
              <View style={[styles.dot, { backgroundColor: col.color }]} />
              <Text style={styles.macroLabel}>{col.label}</Text>
            </View>
          </View>
        ))}
      </View>
      {sum > 0 ? (
        <View style={styles.split}>
          <View style={[styles.splitSeg, { flex: p, backgroundColor: Colors.protein }]} />
          <View style={[styles.splitSeg, { flex: c, backgroundColor: Colors.carbs }]} />
          <View style={[styles.splitSeg, { flex: f, backgroundColor: Colors.fat }]} />
        </View>
      ) : null}
    </View>
  );
};

/** −/value/+ stepper with quick preset chips. */
export const PortionStepper: React.FC<{
  value: number;
  unit: string;
  onChange: (v: number) => void;
  presets?: number[];
  step?: number;
  min?: number;
  max?: number;
  /** Shown on chips, e.g. 0.5 → "½" or "½×". */
  formatPreset?: (v: number) => string;
}> = ({
  value,
  unit,
  onChange,
  presets = [0.5, 1, 2, 3],
  step = 0.5,
  min = 0.5,
  max = 20,
  formatPreset = v => (v === 0.5 ? '½' : formatQty(v)),
}) => {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  return (
    <View style={[styles.card, styles.stepperCard]}>
      <View style={styles.stepperRow}>
        <Pressable
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed, value <= min && styles.disabled]}
          onPress={() => onChange(clamp(value - step))}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel={`Decrease portion by ${step}`}
        >
          <Ionicons name="remove" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.stepValue} accessibilityLiveRegion="polite">
          <Text style={styles.stepNumber}>{formatQty(value)}</Text>
          <Text style={styles.stepUnit} numberOfLines={1}>
            {unit}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed, value >= max && styles.disabled]}
          onPress={() => onChange(clamp(value + step))}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel={`Increase portion by ${step}`}
        >
          <Ionicons name="add" size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>
      <PresetChips value={value} presets={presets} onChange={onChange} format={formatPreset} />
    </View>
  );
};

/** Row of equal-width portion chips; the selected one is dark. */
export const PresetChips: React.FC<{
  value: number;
  presets: number[];
  onChange: (v: number) => void;
  format: (v: number) => string;
}> = ({ value, presets, onChange, format }) => (
  <View style={styles.chips}>
    {presets.map(v => {
      const on = Math.abs(value - v) < 0.001;
      return (
        <Pressable
          key={v}
          style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
          onPress={() => onChange(v)}
          accessibilityRole="button"
          accessibilityState={{ selected: on }}
          accessibilityLabel={`Select ${formatQty(v)} servings`}
        >
          <Text style={[styles.chipText, on && styles.chipTextOn]}>{format(v)}</Text>
        </Pressable>
      );
    })}
  </View>
);

/** Label above an input, optional unit inside it. */
export const LabeledInput: React.FC<
  TextInputProps & { label: string; unit?: string; error?: boolean }
> = ({ label, unit, error, style, ...input }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputBox, error && styles.inputBoxError]}>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Colors.textMuted}
        accessibilityLabel={input.accessibilityLabel ?? label}
        {...input}
      />
      {unit ? <Text style={styles.inputUnit}>{unit}</Text> : null}
    </View>
  </View>
);

/** Section caption: label on the left, optional muted note on the right. */
export const SectionLabel: React.FC<{ title: string; note?: string }> = ({ title, note }) => (
  <View style={styles.sectionRow}>
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {title}
    </Text>
    {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
  </View>
);

export const foodUiStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    elevation: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  divider: { height: 1, backgroundColor: Colors.borderWhisper, marginLeft: 16 },
  rowTitle: { fontFamily: Fonts.urbanist.semiBold, fontSize: 15, color: Colors.textPrimary },
  rowSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { fontFamily: Fonts.urbanist.regular, fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  title: { fontFamily: Fonts.urbanist.extraBold, fontSize: 24, lineHeight: 30, color: Colors.textPrimary },
  pressed: { opacity: 0.85 },
});

const styles = StyleSheet.create({
  card: foodUiStyles.card,
  pressed: foodUiStyles.pressed,
  disabled: { opacity: 0.4 },
  strong: { fontFamily: Fonts.urbanist.bold, color: Colors.textPrimary },
  overText: { color: Colors.warningDark },

  seg: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 3,
    gap: 2,
  },
  segItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segItemOn: { backgroundColor: Colors.card, borderColor: Colors.borderSubtle },
  segText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSecondary },
  segTextOn: { fontFamily: Fonts.urbanist.bold, color: Colors.textPrimary },

  bar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryLight,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barFill: { height: '100%', backgroundColor: Colors.primary },
  barAdd: { height: '100%', backgroundColor: Colors.primaryMuted },
  barOver: { backgroundColor: Colors.warning },
  impact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  impactText: { fontFamily: Fonts.urbanist.medium, fontSize: 13, color: Colors.textSecondary },

  macroRow: { flexDirection: 'row' },
  macroCol: { flex: 1, alignItems: 'center', paddingTop: 14, paddingBottom: 12, paddingHorizontal: 4 },
  macroColBorder: { borderLeftWidth: 1, borderLeftColor: Colors.borderWhisper },
  macroValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  macroUnit: { fontFamily: Fonts.urbanist.bold, fontSize: 14 },
  macroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  macroLabel: { fontFamily: Fonts.urbanist.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 2 },
  split: { flexDirection: 'row', height: 6, gap: 2, marginHorizontal: 16, marginBottom: 14, borderRadius: 3, overflow: 'hidden' },
  splitSeg: { height: '100%' },

  stepperCard: { paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { flex: 1, alignItems: 'center' },
  stepNumber: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  stepUnit: { fontFamily: Fonts.urbanist.medium, fontSize: 13, color: Colors.textSecondary },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: Colors.inverseSurface, borderColor: Colors.inverseSurface },
  chipText: { fontFamily: Fonts.urbanist.bold, fontSize: 15, color: Colors.textPrimary },
  chipTextOn: { color: Colors.textInverse },

  field: { gap: 6 },
  fieldLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
  },
  inputBoxError: { borderColor: Colors.dangerDark },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputUnit: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSecondary, marginLeft: 6 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 4, marginBottom: 8 },
  sectionTitle: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSecondary },
  sectionNote: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textMuted },
});
