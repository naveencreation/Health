import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

/** Shared building blocks for the Profile tab and every Profile sub-screen. */

interface SubScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  right?: React.ReactNode;
}

export const SubScreenHeader: React.FC<SubScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  backLabel = 'Back to profile',
  right,
}) => (
    // App.tsx already applies the top safe-area inset
    <View style={styles.header}>
      <Pressable
        style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
      >
        <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
);

/** 44 px round icon button used in headers. */
export const HeaderIconButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => (
  <Pressable
    style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Ionicons name={icon} size={20} color={Colors.textPrimary} />
  </Pressable>
);

export const SettingsSection: React.FC<{
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ title, footer, children, style }) => (
  <View style={style}>
    {title ? (
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
    ) : null}
    <View style={profileCard}>
      {React.Children.toArray(children)
        .filter(Boolean)
        .map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {child}
          </React.Fragment>
        ))}
    </View>
    {footer ? <Text style={styles.sectionFooter}>{footer}</Text> : null}
  </View>
);

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBackground?: string;
  /** Rendered on the right instead of the chevron (a Switch, a time button, a tag). */
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  title,
  subtitle,
  icon,
  iconColor = Colors.textSlate700,
  iconBackground = Colors.surfaceContainer,
  trailing,
  onPress,
  accessibilityLabel,
  destructive,
  disabled,
}) => {
  const body = (
    <>
      {icon ? (
        <View style={[styles.tile, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, destructive && styles.rowTitleDanger]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ??
        (onPress ? <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} /> : null)}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible={!trailing} accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      {body}
    </Pressable>
  );
};

/** Full-width 52 px action button: primary (filled), secondary (outlined) or danger. */
export const ProfileButton: React.FC<{
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'dark';
  disabled?: boolean;
  /** Shows a spinner in place of the label and blocks presses. */
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}> = ({ label, onPress, variant = 'secondary', disabled, loading, accessibilityLabel, style }) => {
  const onFill = variant === 'primary' || variant === 'dark';
  const textColor = onFill ? Colors.textInverse : variant === 'danger' ? Colors.dangerDark : Colors.textPrimary;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'dark' && styles.buttonDark,
        variant === 'danger' && styles.buttonDanger,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
};

/** Title + optional subtitle on the left, 44 px round close button on the right: the header of every Profile sheet. */
export const SheetHeader: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeLabel?: string;
}> = ({ title, subtitle, onClose, closeLabel = 'Close' }) => (
  <View style={styles.sheetHeader}>
    <View style={styles.headerText}>
      <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
    <HeaderIconButton icon="close" label={closeLabel} onPress={onClose} />
  </View>
);

/** Surface of a centred dialog: white, 16 px corners, hairline, no shadow. */
export const dialogCard: ViewStyle = {
  width: '100%',
  maxWidth: 380,
  backgroundColor: Colors.card,
  borderRadius: 16,
  borderCurve: 'continuous',
  borderWidth: 1,
  borderColor: Colors.borderSubtle,
  padding: 20,
  paddingTop: 24,
  elevation: 0,
};

/** Surface of a bottom sheet: porcelain background, 16 px top corners, capped at the 480 px phone frame. */
export const sheetSurface: ViewStyle = {
  width: '100%',
  maxWidth: 480,
  maxHeight: '90%',
  backgroundColor: Colors.background,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  borderCurve: 'continuous',
  overflow: 'hidden',
  elevation: 0,
};

export const sheetStyles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: Colors.overlayScrim, justifyContent: 'flex-end', alignItems: 'center' },
  centeredScrim: {
    flex: 1,
    backgroundColor: Colors.overlayScrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderMedium,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 24 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
    backgroundColor: Colors.background,
  },
  /** Inline status box under a field: error or confirmation. */
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginTop: 8,
  },
  noticeError: { backgroundColor: Colors.errorLight },
  noticeOk: { backgroundColor: Colors.waterTrack },
  noticeText: { flex: 1, fontFamily: Fonts.urbanist.semiBold, fontSize: 14, lineHeight: 19 },
  noticeTextError: { color: Colors.dangerDark },
  noticeTextOk: { color: Colors.waterDark },
  dialogTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  dialogMessage: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

/** Error or confirmation line shown under a field in a sheet or dialog. */
export const SheetNotice: React.FC<{ kind: 'error' | 'ok'; text: string }> = ({ kind, text }) => (
  <View
    style={[sheetStyles.notice, kind === 'error' ? sheetStyles.noticeError : sheetStyles.noticeOk]}
    accessibilityRole={kind === 'error' ? 'alert' : undefined}
    accessibilityLiveRegion="polite"
  >
    <Ionicons
      name={kind === 'error' ? 'alert-circle-outline' : 'checkmark'}
      size={16}
      color={kind === 'error' ? Colors.dangerDark : Colors.waterDark}
    />
    <Text
      style={[
        sheetStyles.noticeText,
        kind === 'error' ? sheetStyles.noticeTextError : sheetStyles.noticeTextOk,
      ]}
    >
      {text}
    </Text>
  </View>
);

export const profileCard: ViewStyle = {
  backgroundColor: Colors.card,
  borderRadius: 10,
  borderCurve: 'continuous',
  borderWidth: 1,
  borderColor: Colors.borderSubtle,
  overflow: 'hidden',
  elevation: 0,
};

export const profileScreenStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48, gap: 24 },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontFamily: Fonts.urbanist.extraBold, fontSize: 22, color: Colors.textPrimary },
  headerSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sectionTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  sectionFooter: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginHorizontal: 4,
    marginTop: 8,
  },
  divider: { height: 1, backgroundColor: Colors.borderWhisper },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowPressed: { backgroundColor: Colors.surfaceLow },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: Fonts.urbanist.semiBold, fontSize: 15, color: Colors.textPrimary },
  rowTitleDanger: { color: Colors.dangerDark },
  rowSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  button: {
    minHeight: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  buttonPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  buttonDark: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  buttonDanger: { backgroundColor: Colors.errorLight, borderColor: Colors.dangerLight },
  buttonText: { fontFamily: Fonts.urbanist.bold, fontSize: 16 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
