import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { PressableScale } from './PressableScale';

export interface MetricTrend {
  text: string;
  /** 'good' = success green, 'neutral' = slate */
  tone: 'good' | 'neutral';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

export interface MetricCardProps {
  title: string;
  /** Muted line under the title, e.g. '16–22 Nov · goal 8,000' */
  description?: string;
  /** Big number row; omit for cards that have no headline value */
  value?: string;
  unit?: string;
  /** Bold trend line in the footer */
  trend?: MetricTrend | null;
  /** Muted second footer line */
  note?: string;
  /** Replaces the chart when the metric has no data this period */
  empty?: { message: string; hint: string } | null;
  onDetails?: () => void;
  /** Children draw their own horizontal padding (the donut) */
  bleed?: boolean;
  children?: React.ReactNode;
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 8 };

/** shadcn-style chart card: title + description, big value, chart, then a trend footer. */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  description,
  value,
  unit,
  trend,
  note,
  empty,
  onDetails,
  bleed,
  children,
}) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <View style={styles.titleWrap}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {onDetails ? (
        <PressableScale
          onPress={onDetails}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`${title} details`}
          style={styles.detailsBtn}
        >
          <Text style={styles.detailsText}>Details</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textPrimary} />
        </PressableScale>
      ) : null}
    </View>

    {value !== undefined ? (
      <View
        style={styles.valueRow}
        accessible
        accessibilityLabel={`${title}, ${value} ${unit ?? ''}`}
      >
        <Text style={[styles.value, !!empty && styles.valueEmpty]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    ) : null}

    {empty ? (
      <View style={styles.empty}>
        <Text style={styles.emptyMessage}>{empty.message}</Text>
        <Text style={styles.emptyHint}>{empty.hint}</Text>
      </View>
    ) : (
      <>
        <View style={bleed ? undefined : styles.body}>{children}</View>
        {trend || note ? (
          <View style={styles.footer}>
            {trend ? (
              <View style={styles.trendRow}>
                <Text style={styles.trendText}>{trend.text}</Text>
                {trend.icon ? (
                  <Ionicons
                    name={trend.icon}
                    size={15}
                    color={trend.tone === 'good' ? Colors.success : Colors.textSecondary}
                  />
                ) : null}
              </View>
            ) : null}
            {note ? <Text style={styles.note}>{note}</Text> : null}
          </View>
        ) : null}
      </>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  description: {
    marginTop: 2,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  detailsText: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  value: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  valueEmpty: {
    color: Colors.borderMedium,
  },
  unit: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  body: {
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 3,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendText: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  note: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  empty: {
    margin: 16,
    marginTop: 18,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceLow,
  },
  emptyMessage: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
