import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ControlHeights, ControlRadii } from '@/theme/controls';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/context/HealthContext';
import { OnboardingHeader } from '../components/OnboardingHeader';

export interface EarlyAccessScreenProps {
  name?: string;
  onContinue: () => void;
  onBack: () => void;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

type Row = { icon: keyof typeof Ionicons.glyphMap; title: string; description: string };

const SHARED_ROWS: Row[] = [
  {
    icon: 'camera-outline',
    title: 'Photo logging',
    description: 'Snap a meal and Ria counts it, using your own Gemini key.',
  },
  {
    icon: 'chatbubble-outline',
    title: 'Ria, your coach',
    description: 'Ask about swaps, portions and your plan.',
  },
  {
    icon: 'stats-chart-outline',
    title: 'Monthly and yearly trends',
    description: 'Calories, water, steps and weight over time.',
  },
];

const BACKUP_ROW: Row = {
  icon: 'cloud-outline',
  title: 'Backup with your account',
  description: 'Your plan and logs, on any phone you sign in to.',
};

const GUEST_ROW: Row = {
  icon: 'phone-portrait-outline',
  title: 'Your plan on this phone',
  description: 'Create an account any time in Profile to back it up.',
};

export const EarlyAccessScreen: React.FC<EarlyAccessScreenProps> = ({
  name = '',
  onContinue,
  onBack,
  sectionIndex = 3,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  const { currentUser } = useAuth();
  const id = currentUser?.id ?? '';
  const isGuest =
    !currentUser ||
    Boolean(currentUser.isGuest) ||
    id.startsWith('guest_') ||
    id.startsWith('demo_');

  const displayName = name.trim();
  const rows = [...SHARED_ROWS, isGuest ? GUEST_ROW : BACKUP_ROW];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.phoneFrame}>
        <OnboardingHeader
          onBack={onBack}
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          sectionProgress={sectionProgress}
          testID="header-early-access"
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.tag}>
            <Text style={styles.tagText} maxFontSizeMultiplier={1.3}>
              EARLY ACCESS
            </Text>
          </View>
          <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {displayName ? `It’s all free for now, ${displayName}` : 'It’s all free for now'}
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            Calorify is new, so every feature is open while we build it. No card, no trial.
          </Text>

          <View style={styles.card}>
            {rows.map((row, i) => (
              <View
                key={row.title}
                style={[styles.row, i > 0 && styles.rowDivider]}
                accessible
                accessibilityLabel={`${row.title}. ${row.description}`}
              >
                <View style={styles.iconTile}>
                  <Ionicons name={row.icon} size={18} color={Colors.primaryDeep} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} maxFontSizeMultiplier={1.3}>
                    {row.title}
                  </Text>
                  <Text style={styles.rowDesc} maxFontSizeMultiplier={1.3}>
                    {row.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.fine} maxFontSizeMultiplier={1.3}>
            If paid plans come later, we’ll tell you in the app before anything changes.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={() => {
              haptics.impactMedium();
              onContinue();
            }}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            testID="btn-early-access-continue"
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 22, paddingBottom: 20 },
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    backgroundColor: Colors.primaryLight,
  },
  tagText: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    color: Colors.primaryDeep,
  },
  question: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  card: {
    marginTop: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    borderCurve: 'continuous',
    elevation: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderSubtle },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderCurve: 'continuous',
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: Fonts.urbanist.extraBold, fontSize: 15, color: Colors.textPrimary },
  rowDesc: {
    marginTop: 2,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  fine: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  footer: { paddingTop: 12, paddingBottom: 12 },
  button: {
    height: ControlHeights.button + 4,
    borderRadius: ControlRadii.button,
    borderCurve: 'continuous',
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  buttonText: { fontFamily: Fonts.urbanist.bold, fontSize: 17, color: Colors.textInverse },
});
