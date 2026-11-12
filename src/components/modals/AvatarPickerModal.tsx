import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { AVATAR_PRESETS, DEFAULT_AVATAR_URL } from '@/data/avatars';
import { UserAvatar } from '@/components/common/UserAvatar';
import {
  ProfileButton,
  SheetHeader,
  sheetStyles,
  sheetSurface,
} from '@/components/profile/ProfileUI';

interface AvatarPickerModalProps {
  visible: boolean;
  currentAvatarUrl?: string;
  onClose: () => void;
  onSelectAvatar: (url: string) => void;
}

const sanitizeUrl = (url?: string) =>
  url && AVATAR_PRESETS.some(a => a.url === url) ? url : DEFAULT_AVATAR_URL;

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  currentAvatarUrl = DEFAULT_AVATAR_URL,
  onClose,
  onSelectAvatar,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(sanitizeUrl(currentAvatarUrl));

  // Start from the saved avatar every time the sheet opens
  React.useEffect(() => {
    if (visible) setSelectedAvatarUrl(sanitizeUrl(currentAvatarUrl));
  }, [visible, currentAvatarUrl]);

  const handleConfirm = () => {
    onSelectAvatar(selectedAvatarUrl);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheetStyles.scrim}>
        <Pressable
          style={sheetStyles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss avatar picker"
        />
        <View style={sheetSurface} accessibilityViewIsModal>
          <View style={sheetStyles.handle} />
          <SheetHeader
            title="Choose avatar"
            subtitle="Shown on your profile"
            onClose={onClose}
            closeLabel="Close avatar picker"
          />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[sheetStyles.body, styles.grid]}
            showsVerticalScrollIndicator={false}
          >
            {AVATAR_PRESETS.map(item => {
              const isSelected = selectedAvatarUrl === item.url;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.cell,
                    isSelected && styles.cellSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelectedAvatarUrl(item.url)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Select ${item.name} avatar`}
                >
                  <UserAvatar avatarUrl={item.url} size={60} />
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {isSelected ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={13} color={Colors.textInverse} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[sheetStyles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
            <ProfileButton
              label="Use this avatar"
              variant="primary"
              onPress={handleConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    // three per row: a fourth (4 × 30%) never fits, and grow fills the leftover gap
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLow,
    paddingTop: 13,
    paddingBottom: 11,
    paddingHorizontal: 5,
  },
  pressed: { opacity: 0.85 },
  name: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
