import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, ListChecks, Target, BarChart3 } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import DailyVideoModal from '@/components/DailyVideoModal';

export default function TabLayout() {
  const { t } = useLanguage();
  const { shouldShowVideo, getTodayVideo, markVideoAsWatched, skipVideo, videoStreak } = useApp();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const todayVideo = getTodayVideo();

  // Escuchar cambios en shouldShowVideo (cuando se toca la notificación)
  useEffect(() => {
    if (shouldShowVideo && todayVideo && !todayVideo.watched) {
      console.log('shouldShowVideo changed to true - showing modal');
      setShowVideoModal(true);
    }
  }, [shouldShowVideo, todayVideo]);

  const handleVideoComplete = (videoId: string) => {
    markVideoAsWatched(videoId);
    setShowVideoModal(false);
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