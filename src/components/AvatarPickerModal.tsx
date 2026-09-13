import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { AVATAR_PRESETS, AVATAR_CATEGORIES, DEFAULT_AVATAR_URL } from '../data/avatars';

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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(currentAvatarUrl);

  // Synchronize when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedAvatarUrl(currentAvatarUrl);
    }
  }, [visible, currentAvatarUrl]);

  // Filter avatars by active category
  const filteredAvatars = useMemo(() => {
    if (selectedCategory === 'all') return AVATAR_PRESETS;
    return AVATAR_PRESETS.filter((a) => a.category === selectedCategory);
  }, [selectedCategory]);

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Click outside to dismiss backdrop */}
        <TouchableOpacity
          style={styles.backdropDismiss}
          onPress={onClose}
          activeOpacity={1}
        />

        {/* Mobile-Constrained Bottom Sheet Container */}
        <View style={styles.sheetContainer}>
          {/* Top Grab Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitleCenter}>
              <Text style={styles.headerTitle}>Select Avatar</Text>
              <Text style={styles.headerSubtitle}>Choose your fitness persona</Text>
            </View>

            <View style={{ width: 34 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero Live Preview Card */}
            <View style={styles.heroPreviewCard}>
              <View
                style={[
                  styles.heroAvatarRing,
                  { borderColor: activePreset?.accentColor || Colors.primary },
                ]}
              >
                <Image source={{ uri: selectedAvatarUrl }} style={styles.heroAvatarImg as ImageStyle} />
                <View
                  style={[
                    styles.heroCheckBadge,
                    { backgroundColor: activePreset?.accentColor || Colors.primary },
                  ]}
                >
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.heroAvatarName}>{activePreset?.name || 'Selected Avatar'}</Text>
              <View style={styles.heroTagBadge}>
                <Text style={styles.heroTagBadgeText}>{activePreset?.categoryLabel || 'Profile'}</Text>
              </View>
            </View>

            {/* Category Filter Pills Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {AVATAR_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 3-Column Compact Avatar Grid */}
            <View style={styles.gridContainer}>
              {filteredAvatars.map((item) => {
                const isSelected = selectedAvatarUrl === item.url;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.avatarGridCard,
                      isSelected && [
                        styles.avatarGridCardActive,
                        { borderColor: item.accentColor || Colors.primary },
                      ],
                    ]}
                    onPress={() => setSelectedAvatarUrl(item.url)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.avatarThumbWrapper,
                        isSelected && { borderColor: item.accentColor || Colors.primary },
                      ]}
                    >
                      <Image source={{ uri: item.url }} style={styles.gridAvatarImg as ImageStyle} />
                      {isSelected && (
                        <View
                          style={[
                            styles.selectedOverlayBadge,
                            { backgroundColor: item.accentColor || Colors.primary },
                          ]}
                        >
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                        </View>
                      )}
                    </View>

                    <Text style={styles.gridAvatarName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.gridAvatarCategory} numberOfLines={1}>
                      {item.categoryLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Sticky Bottom Confirmation Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>Use This Avatar</Text>
            </TouchableOpacity>
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
    maxWidth: 480, // Strictly constrained to phone width on all screens
    height: '88%',
    maxHeight: 740,
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
    marginBottom: 8,
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
  heroAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
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
  heroTagBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  heroTagBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#EA580C',
  },

  // Category Pills
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#FFFFFF',
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 8,
    marginTop: 4,
    justifyContent: 'space-between',
  },
  avatarGridCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: 4,
  },
  avatarGridCardActive: {
    backgroundColor: '#FFFBF9',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarThumbWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: 'transparent',
    padding: 2,
    marginBottom: 4,
  },
  gridAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
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
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: Colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  gridAvatarCategory: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
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
  confirmBtnText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
