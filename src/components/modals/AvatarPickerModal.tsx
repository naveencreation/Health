import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { AVATAR_PRESETS, DEFAULT_AVATAR_URL } from '@/data/avatars';
import { UserAvatar } from '@/components/common/UserAvatar';

interface AvatarPickerModalProps {
  visible: boolean;
  currentAvatarUrl?: string;
  onClose: () => void;
  onSelectAvatar: (url: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  currentAvatarUrl = DEFAULT_AVATAR_URL,
  onClose,
  onSelectAvatar,
}) => {
  const sanitizeUrl = (url?: string) => {
    if (!url) return DEFAULT_AVATAR_URL;
    const exists = AVATAR_PRESETS.some((a) => a.url === url);
    return exists ? url : DEFAULT_AVATAR_URL;
  };

  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(sanitizeUrl(currentAvatarUrl));

  // Synchronize when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedAvatarUrl(sanitizeUrl(currentAvatarUrl));
    }
  }, [visible, currentAvatarUrl]);

  // Find currently selected preset details for hero preview
  const activePreset = useMemo(() => {
    return (
      AVATAR_PRESETS.find((a) => a.url === selectedAvatarUrl) ||
      AVATAR_PRESETS[0]
    );
  }, [selectedAvatarUrl]);

  const handleConfirm = () => {
    onSelectAvatar(selectedAvatarUrl);
    onClose();
  };

  const getPresetBorder = (id?: string) => {
    switch (id) {
      case 'avatar_men': return styles.borderMen;
      case 'avatar_women': return styles.borderWomen;
      case 'avatar_boy': return styles.borderBoy;
      case 'avatar_girl': return styles.borderGirl;
      case 'avatar_grandpa': return styles.borderGrandpa;
      case 'avatar_grandma': return styles.borderGrandma;
      default: return styles.borderDefault;
    }
  };

  const getPresetBg = (id?: string) => {
    switch (id) {
      case 'avatar_men': return styles.bgMen;
      case 'avatar_women': return styles.bgWomen;
      case 'avatar_boy': return styles.bgBoy;
      case 'avatar_girl': return styles.bgGirl;
      case 'avatar_grandpa': return styles.bgGrandpa;
      case 'avatar_grandma': return styles.bgGrandma;
      default: return styles.bgDefault;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Click outside to dismiss backdrop */}
        <Pressable
          style={styles.backdropDismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss avatar picker modal backdrop"
        />

        {/* Mobile-Constrained Bottom Sheet Container */}
        <View style={styles.sheetContainer}>
          {/* Top Grab Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header Bar */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedCloseBtn : null]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close avatar picker"
            >
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </Pressable>

            <View style={styles.headerTitleCenter}>
              <Text style={styles.headerTitle}>Select Avatar</Text>
              <Text style={styles.headerSubtitle}>Choose your persona</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero Live Preview Card */}
            <View style={styles.heroPreviewCard}>
              <View style={[styles.heroAvatarRing, getPresetBorder(activePreset?.id)]}>
                <UserAvatar avatarUrl={selectedAvatarUrl} size={72} />
                <View style={[styles.heroCheckBadge, getPresetBg(activePreset?.id)]}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.heroAvatarName}>{activePreset?.name || 'Selected Avatar'}</Text>
            </View>

            {/* 3-Column Compact Avatar Grid (Curated Avatars) */}
            <View style={styles.gridContainer}>
              {AVATAR_PRESETS.map((item) => {
                const isSelected = selectedAvatarUrl === item.url;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.avatarGridCard,
                      isSelected ? styles.avatarGridCardActive : null,
                      isSelected ? getPresetBorder(item.id) : null,
                      pressed ? styles.pressedGridCard : null,
                    ]}
                    onPress={() => setSelectedAvatarUrl(item.url)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Select ${item.name} avatar`}
                  >
                    <View
                      style={[
                        styles.avatarThumbWrapper,
                        isSelected ? getPresetBorder(item.id) : null,
                      ]}
                    >
                      <UserAvatar avatarUrl={item.url} size={56} />
                      {isSelected ? (
                        <View style={[styles.selectedOverlayBadge, getPresetBg(item.id)]}>
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.gridAvatarName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Sticky Bottom Confirmation Bar */}
          <View style={styles.bottomBar}>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed ? styles.pressedConfirmBtn : null]}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Use this avatar"
            >
              <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" style={styles.confirmIcon} />
              <Text style={styles.confirmBtnText}>Use This Avatar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    height: '84%',
    maxHeight: 700,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    zIndex: 10000,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedCloseBtn: {
    opacity: 0.7,
    backgroundColor: '#E2E8F0',
  },
  headerSpacer: {
    width: 34,
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },

  // Hero Live Preview Card
  heroPreviewCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroAvatarRing: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    padding: 3,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  heroCheckBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroAvatarName: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 8,
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 8,
    justifyContent: 'flex-start',
  },
  avatarGridCard: {
    width: '31.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  avatarGridCardActive: {
    backgroundColor: '#FFFBF9',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  pressedGridCard: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  avatarThumbWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: 'transparent',
    padding: 2,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOverlayBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  gridAvatarName: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },

  // Bottom Sticky Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  confirmBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedConfirmBtn: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  confirmIcon: {
    marginRight: 6,
  },
  confirmBtnText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Preset Colors
  borderMen: { borderColor: '#1E293B' },
  borderWomen: { borderColor: '#EA580C' },
  borderBoy: { borderColor: '#3B82F6' },
  borderGirl: { borderColor: '#F43F5E' },
  borderGrandpa: { borderColor: '#475569' },
  borderGrandma: { borderColor: '#059669' },
  borderDefault: { borderColor: Colors.primary },
  bgMen: { backgroundColor: '#1E293B' },
  bgWomen: { backgroundColor: '#EA580C' },
  bgBoy: { backgroundColor: '#3B82F6' },
  bgGirl: { backgroundColor: '#F43F5E' },
  bgGrandpa: { backgroundColor: '#475569' },
  bgGrandma: { backgroundColor: '#059669' },
  bgDefault: { backgroundColor: Colors.primary },
});
