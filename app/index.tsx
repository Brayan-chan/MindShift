import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

export default function IndexScreen() {
  const router = useRouter();
  const { identity, isAuthenticated, isLoading } = useApp();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/auth');
      } else if (!identity.setupComplete) {
        router.replace('/onboarding');
      } else if (!identity.videoIntroComplete) {
        router.replace('/video-intro');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [identity.setupComplete, identity.videoIntroComplete, isAuthenticated, isLoading, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
