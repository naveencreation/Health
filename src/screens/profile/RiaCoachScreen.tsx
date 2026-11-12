import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useGoals } from '@/context/HealthContext';
import { AIService } from '@/services/ai';
import { BYOKSetupModal } from '@/components/modals/BYOKSetupModal';
import { GeminiIcon } from '@/components/common/GeminiIcon';
import {
  SubScreenHeader,
  SettingsSection,
  ProfileButton,
  profileCard,
  profileScreenStyles,
} from '@/components/profile/ProfileUI';

type RiaTone = 'supportive' | 'focused' | 'scientific';

const TONES: { id: RiaTone; title: string; description: string }[] = [
  {
    id: 'supportive',
    title: 'Warm & encouraging',
    description: 'Celebrates your wins and coaches with positive reinforcement.',
  },
  {
    id: 'focused',
    title: 'Disciplined & direct',
    description: 'Firm accountability and straightforward calorie targets.',
  },
  {
    id: 'scientific',
    title: 'Nutritional scientist',
    description: 'Explains the why: glycemic response, micronutrients, recovery.',
  },
];

export const RIA_TONE_LABELS: Record<RiaTone, string> = {
  supportive: 'Warm & encouraging',
  focused: 'Disciplined & direct',
  scientific: 'Nutritional scientist',
};

export const RiaCoachScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { userGoals, updateGoals } = useGoals();
  const tone: RiaTone = userGoals.riaTone || 'supportive';
  const [byokVisible, setByokVisible] = useState(false);
  const [status, setStatus] = useState<'loading' | 'connected' | 'missing' | 'error'>('loading');
  const [maskedKey, setMaskedKey] = useState('');

  const refreshStatus = useCallback(
    () =>
      AIService.isKeyConfigured()
        .then(async configured => {
          setMaskedKey(configured ? await AIService.getMaskedKey() : '');
          setStatus(configured ? 'connected' : 'missing');
        })
        .catch(() => setStatus('error')),
    []
  );

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const statusText =
    status === 'loading'
      ? 'Checking…'
      : status === 'connected'
        ? 'Connected'
        : status === 'error'
          ? "Couldn't read the key on this device"
          : 'Not connected';

  return (
    <View style={profileScreenStyles.root}>
      <SubScreenHeader title="Ria coach" subtitle="Tone and AI connection" onBack={onBack} />
      <ScrollView
        style={profileScreenStyles.scroll}
        contentContainerStyle={profileScreenStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Coaching style
          </Text>
          <View
            style={profileCard}
            accessibilityRole="radiogroup"
            accessibilityLabel="Coaching style"
          >
            {TONES.map((t, i) => {
              const selected = tone === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={({ pressed }) => [
                    styles.toneRow,
                    i > 0 && styles.toneDivider,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => updateGoals({ riaTone: t.id })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${t.title}. ${t.description}`}
                >
                  <View style={[styles.radio, selected && styles.radioOn]} />
                  <View style={styles.flex1}>
                    <Text style={styles.toneTitle}>{t.title}</Text>
                    <Text style={styles.toneDesc}>{t.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SettingsSection
          title="Gemini API key"
          footer={
            Platform.OS === 'web'
              ? 'On web the key is kept in this browser and sent only to Google. Ria needs it for chat, food photos and daily insights.'
              : 'The key is encrypted on this device and sent only to Google. Ria needs it for chat, food photos and daily insights.'
          }
        >
          <View style={styles.keyCard}>
            <View style={styles.keyRow}>
              <View style={styles.geminiTile}>
                <GeminiIcon size={20} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.toneTitle}>{statusText}</Text>
                {status === 'connected' && maskedKey ? (
                  <Text style={styles.maskedKey}>{maskedKey}</Text>
                ) : (
                  <Text style={styles.toneDesc}>
                    Bring your own free key from Google AI Studio.
                  </Text>
                )}
              </View>
              {status === 'connected' ? (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              ) : null}
            </View>
            <ProfileButton
              label={status === 'connected' ? 'Manage key' : 'Connect Gemini key'}
              variant={status === 'connected' ? 'secondary' : 'primary'}
              onPress={() => setByokVisible(true)}
              accessibilityLabel="Manage Gemini API key"
            />
          </View>
        </SettingsSection>
      </ScrollView>

      <BYOKSetupModal
        visible={byokVisible}
        onClose={() => {
          setByokVisible(false);
          refreshStatus();
        }}
        onKeyConfigured={refreshStatus}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  sectionTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toneDivider: { borderTopWidth: 1, borderTopColor: Colors.borderWhisper },
  pressed: { backgroundColor: Colors.surfaceLow },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderMedium,
  },
  radioOn: { borderWidth: 7, borderColor: Colors.primary },
  toneTitle: { fontFamily: Fonts.urbanist.semiBold, fontSize: 15, color: Colors.textPrimary },
  toneDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  keyCard: { padding: 16, gap: 14 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  geminiTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.waterLight,
  },
  maskedKey: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activePill: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: Colors.waterTrack,
  },
  activePillText: { fontFamily: Fonts.urbanist.bold, fontSize: 12, color: Colors.waterDark },
});
