import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Button,
  Platform,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { connectHealth, getTodaySteps } from './healthService';

export interface HealthScreenProps {
  onBack?: () => void;
}

export function HealthScreen({ onBack }: HealthScreenProps) {
  const [steps, setSteps] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const connectAndLoad = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const connection = await connectHealth();

      if (!connection.success) {
        setMessage(connection.reason || 'Connection failed');
        return;
      }

      const todaySteps = await getTodaySteps();

      setSteps(todaySteps);
      setMessage('Health Connect connected successfully.');
    } catch (error) {
      console.error('[HealthScreen]', error);
      setMessage('Failed to read health data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      connectAndLoad();
    }
  }, [connectAndLoad]);

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        {onBack && (
          <Pressable style={styles.backBtn} onPress={onBack} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>
        )}
        <Text style={styles.platformWarning}>Health Connect is only available on Android.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {onBack && (
        <Pressable style={styles.backBtn} onPress={onBack} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
      )}

      <Text style={styles.title}>{"Today's Steps"}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#EA580C" style={styles.loader} />
      ) : (
        <Text style={styles.steps}>{steps !== null ? steps.toLocaleString() : '--'}</Text>
      )}

      <Text style={styles.message}>{message}</Text>

      <Button
        title="Connect Health Connect"
        onPress={connectAndLoad}
        disabled={loading}
        color="#EA580C"
      />
    </View>
  );
}

export default HealthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FAF9F6',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  platformWarning: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  loader: {
    marginVertical: 18,
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 24,
    marginBottom: 16,
    color: '#0F172A',
  },
  steps: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 48,
    marginBottom: 16,
    color: '#0F172A',
  },
  message: {
    fontFamily: Fonts.urbanist.regular,
    textAlign: 'center',
    marginBottom: 24,
    color: '#64748B',
    fontSize: 14,
  },
});
