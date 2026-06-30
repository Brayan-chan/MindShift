import { useState, useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { LayoutDashboard, ListChecks, Target, BarChart3, Settings } from 'lucide-react-native';
import { fulltoast } from 'fulltoast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import DailyVideoModal from '@/components/DailyVideoModal';

export default function TabLayout() {
  const router = useRouter();
  const { t } = useLanguage();
  const {
    identity,
    isAuthenticated,
    isLoading,
    shouldShowVideo,
    getTodayVideo,
    markVideoAsWatched,
    skipVideo,
    videoStreak,
  } = useApp();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const todayVideo = getTodayVideo();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }

    if (!identity.setupComplete) {
      router.replace('/onboarding');
      return;
    }

    if (!identity.videoIntroComplete) {
      router.replace('/video-intro');
    }
  }, [identity.setupComplete, identity.videoIntroComplete, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && identity.videoIntroComplete && shouldShowVideo && todayVideo && !todayVideo.watched) {
      console.log('shouldShowVideo changed to true - showing modal');
      setShowVideoModal(true);
    }
  }, [identity.videoIntroComplete, isAuthenticated, shouldShowVideo, todayVideo]);

  const handleVideoComplete = async (videoId: string) => {
    try {
      await markVideoAsWatched(videoId);
      setShowVideoModal(false);
    } catch (error) {
      fulltoast.error({
        title: t('auth.errorTitle'),
        description: error instanceof Error ? error.message : t('auth.errorBody'),
      });
    }
  };

  const handleVideoSkip = () => {
    skipVideo();
    setShowVideoModal(false);
  };
  
  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: Colors.dark.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.dark.surface,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: t('tabs.habits'),
          tabBarIcon: ({ color }) => <ListChecks size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: t('tabs.focus'),
          tabBarIcon: ({ color }) => <Target size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ color }) => <BarChart3 size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <Settings size={24} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
    {todayVideo && (
      <DailyVideoModal
        visible={showVideoModal}
        videoUrl={todayVideo.videoUrl}
        videoId={todayVideo.id}
        onComplete={handleVideoComplete}
        onSkip={handleVideoSkip}
        videoStreak={videoStreak}
      />
    )}
  </>
  );
}
