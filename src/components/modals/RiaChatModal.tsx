import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

interface ChatMessage {
  id: string;
  sender: 'ria' | 'user';
  text: string;
  timestamp: string;
}

interface RiaChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

const QUICK_QUESTIONS = [
  '🍗 High-protein dinner idea',
  '🍛 Can I eat biryani tonight?',
  '🍵 Snack under 120 calories',
  '💧 Water timing for fat loss',
];

export const RiaChatModal: React.FC<RiaChatModalProps> = ({
  visible,
  onClose,
  initialPrompt,
}) => {
  const { userGoals, totalConsumed, remainingCalories, totalProtein } = useHealth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      sender: 'ria',
      text: `Hi ${userGoals.name || 'Akshay'}! 👋 I am Ria, your AI Nutrition Coach. You have ${remainingCalories} kcal left today and your protein is at ${totalProtein}g. What can I help you plan or calculate?`,
      timestamp: 'Just now',
    },
  ]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');

    // Generate smart context-aware response
    setTimeout(() => {
      let reply = '';
      const q = text.toLowerCase();

      if (q.includes('protein') || q.includes('high-protein')) {
        reply = `For a strong protein boost, go with Paneer Bhurji (200g ~ 18g P) or 2 Grilled Chicken Breasts with steamed broccoli (~34g P). Pair with 1 multi-grain roti for sustained fullness!`;
      } else if (q.includes('biryani')) {
        reply = `Yes, you can! A 1-cup portion of Chicken or Vegetable Biryani is around 290–350 kcal. Eat it with a large katori of cucumber raita to add volume and control portion size.`;
      } else if (q.includes('snack') || q.includes('120') || q.includes('hunger')) {
        reply = `Try 30g of dry roasted chana (115 kcal, 6g protein) or a medium apple with a sprinkle of cinnamon (~95 kcal). Both provide steady energy without blood sugar spikes!`;
      } else if (q.includes('water') || q.includes('hydration')) {
        reply = `Drink 1 tall glass (300 ml) 30 minutes before your meals. This primes digestion and reduces overeating naturally. Aim for at least 2.5L throughout the day!`;
      } else if (q.includes('dinner')) {
        reply = `With ${remainingCalories} kcal remaining, a light dinner like 2 whole wheat rotis + Dal Tadka + cucumber salad is ideal (~360 kcal, 14g P, 8g fiber).`;
      } else {
        reply = `Great question! Staying consistent with your ${userGoals.dailyCalorieBudget} kcal budget is the #1 lever for sustainable body recomposition. Prioritize whole foods, fiber, and lean protein!`;
      }

      const riaMsg: ChatMessage = {
        id: `ria_${Date.now()}`,
        sender: 'ria',
        text: reply,
        timestamp: 'Just now',
      };

      setMessages((prev) => [...prev, riaMsg]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 600);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={styles.backdropDismiss}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.handleContainer}>
            <View style={styles.dragHandle} />
          </View>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Header */}
            <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerProfile}>
            <Image
              source={require('../../../assets/ria_avatar.jpg')}
              style={styles.headerAvatar}
            />
            <View style={styles.headerTextGroup}>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName}>Ria AI Coach</Text>
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.headerSub}>Healthify Intelligence • Active</Text>
            </View>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* Chat Scroll Area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            const isRia = msg.sender === 'ria';
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isRia ? styles.messageRowRia : styles.messageRowUser,
                ]}
              >
                {isRia && (
                  <Image
                    source={require('../../../assets/ria_avatar.jpg')}
                    style={styles.bubbleAvatar}
                  />
                )}
                <View
                  style={[
                    styles.bubble,
                    isRia ? styles.bubbleRia : styles.bubbleUser,
                  ]}
                >
                  <Text style={[styles.bubbleText, isRia ? styles.bubbleTextRia : styles.bubbleTextUser]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.timestamp, isRia ? styles.timestampRia : styles.timestampUser]}>
                    {msg.timestamp}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={styles.quickChipsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsScroll}>
            {QUICK_QUESTIONS.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickChip}
                onPress={() => handleSendMessage(chip)}
                activeOpacity={0.75}
              >
                <Text style={styles.quickChipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask Ria about food, calories, or workouts..."
            placeholderTextColor="#94A3B8"
            value={inputQuery}
            onChangeText={setInputQuery}
            onSubmitEditing={() => handleSendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              inputQuery.trim().length > 0 && styles.sendBtnActive,
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputQuery.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    height: '90%',
    maxHeight: 740,
    backgroundColor: '#FAFAFA',
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
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  headerTextGroup: {
    justifyContent: 'center',
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  headerSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  messageRowRia: {
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  bubbleRia: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  bubbleTextRia: {
    color: Colors.textPrimary,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9,
    marginTop: 4,
  },
  timestampRia: {
    color: '#94A3B8',
    textAlign: 'right',
  },
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'right',
  },
  quickChipsWrapper: {
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 22,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
  },
});
