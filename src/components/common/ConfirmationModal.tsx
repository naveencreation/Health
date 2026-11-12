import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { ProfileButton, dialogCard, sheetStyles } from '@/components/profile/ProfileUI';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'destructive' | 'primary';
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  /** Extra content between the message and the buttons (e.g. a password field) */
  children?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'primary',
  iconName = 'help-circle-outline',
  iconColor,
  iconBgColor,
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}) => {
  const isDestructive = confirmStyle === 'destructive';
  const dismiss = () => {
    if (!isLoading) onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={sheetStyles.centeredScrim}>
        <Pressable
          style={sheetStyles.backdrop}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss confirmation"
        />

        <View style={[dialogCard, styles.card]} accessibilityViewIsModal>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: iconBgColor || (isDestructive ? Colors.errorLight : Colors.primaryLight) },
            ]}
          >
            <Ionicons
              name={iconName}
              size={26}
              color={iconColor || (isDestructive ? Colors.dangerDark : Colors.primary)}
            />
          </View>

          <Text style={[sheetStyles.dialogTitle, styles.title]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={sheetStyles.dialogMessage}>{message}</Text>
          {children ? <View style={styles.extra}>{children}</View> : null}

          <View style={styles.actions}>
            <ProfileButton
              label={confirmText}
              variant={isDestructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={isLoading}
            />
            <ProfileButton label={cancelText} onPress={onCancel} disabled={isLoading} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  title: { marginTop: 16 },
  extra: { alignSelf: 'stretch', marginTop: 16 },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 20 },
});
