import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Play, Pause } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';

type DailyVideoModalProps = {
  visible: boolean;
  videoUrl: string;
  videoId: string;
  onComplete: (videoId: string) => void;
  onSkip: () => void;
  videoStreak: number;
  onProgressSave?: (videoId: string, progress: number) => void;
};

type VideoProgress = {
  videoId: string;
  position: number;
  duration: number;
  percentWatched: number;
  lastUpdated: number;
};

const STORAGE_KEY = '@apex_video_progress';
const PROGRESS_THRESHOLD = 50; // Guardar automáticamente cuando se alcance el 50%
const AUTO_COMPLETE_THRESHOLD = 90; // Marcar como visto automáticamente al 90%

export default function DailyVideoModal({
  visible,
  videoUrl,
  videoId,
  onComplete,
  onSkip,
  videoStreak,
  onProgressSave,
}: DailyVideoModalProps) {
  const { t } = useLanguage();
  const [hasWatched, setHasWatched] = useState(false);
  const [savedProgress, setSavedProgress] = useState<VideoProgress | null>(null);
  const hasReachedThreshold = useRef(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    player.muted = false;
  });

  const loadProgress = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const allProgress: VideoProgress[] = stored ? JSON.parse(stored) : [];
      const videoProgress = allProgress.find(progress => progress.videoId === videoId);

      setSavedProgress(videoProgress ?? null);
      hasReachedThreshold.current =
        (videoProgress?.percentWatched ?? 0) >= PROGRESS_THRESHOLD;
    } catch (error) {
      console.error('Error loading video progress:', error);
    }
  }, [videoId]);

  const saveProgress = useCallback(async (progress: VideoProgress) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let allProgress: VideoProgress[] = stored ? JSON.parse(stored) : [];
      const existingIndex = allProgress.findIndex(item => item.videoId === videoId);

      if (existingIndex >= 0) {
        allProgress[existingIndex] = progress;
      } else {
        allProgress.push(progress);
      }

      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      allProgress = allProgress.filter(item => item.lastUpdated > sevenDaysAgo);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
      setSavedProgress(progress);
      onProgressSave?.(videoId, progress.percentWatched);
    } catch (error) {
      console.error('Error saving video progress:', error);
    }
  }, [onProgressSave, videoId]);

  useEffect(() => {
    if (visible) {
      setHasWatched(false);
      setSavedProgress(null);
      hasReachedThreshold.current = false;
      loadProgress();
    }
  }, [loadProgress, visible]);

  // Restaurar posición del video si hay progreso guardado
  useEffect(() => {
    if (savedProgress && savedProgress.percentWatched < AUTO_COMPLETE_THRESHOLD && player) {
      player.currentTime = savedProgress.position / 1000; // convertir de ms a segundos
    }
  }, [savedProgress, player]);

  // Monitorear progreso del video cuando se reproduce
  useEffect(() => {
    if (!visible || !player) return;

    const interval = setInterval(() => {
      if (player.playing && player.duration > 0) {
        const currentPosition = player.currentTime * 1000; // convertir a ms
        const duration = player.duration * 1000; // convertir a ms
        const percentWatched = (currentPosition / duration) * 100;

        // Guardar progreso cuando se alcance el 50%
        if (percentWatched >= PROGRESS_THRESHOLD && !hasReachedThreshold.current) {
          hasReachedThreshold.current = true;
          const progress: VideoProgress = {
            videoId,
            position: currentPosition,
            duration: duration,
            percentWatched,
            lastUpdated: Date.now(),
          };
          saveProgress(progress);
        }

        // Marcar como visto si se alcanza el 90%
        if (percentWatched >= AUTO_COMPLETE_THRESHOLD) {
          setHasWatched(true);
        }
      }
    }, 500); // revisar cada 500ms

    progressIntervalRef.current = interval;

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Guardar progreso al desmontar si no se ha marcado como visto
      if (!hasWatched && player) {
        const currentPosition = player.currentTime * 1000;
        const duration = player.duration * 1000;
        if (duration > 0) {
          const percentWatched = (currentPosition / duration) * 100;
          const progress: VideoProgress = {
            videoId,
            position: currentPosition,
            duration: duration,
            percentWatched,
            lastUpdated: Date.now(),
          };
          saveProgress(progress);
        }
      }
    };
  }, [visible, player, hasWatched, videoId, saveProgress]);

  const handlePlayPause = () => {
    if (!player) return;
    
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleComplete = async () => {
    // Limpiar progreso guardado ya que el video se completó
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        let allProgress: VideoProgress[] = JSON.parse(stored);
        allProgress = allProgress.filter(p => p.videoId !== videoId);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
      }
    } catch (error) {
      console.error('Error clearing video progress:', error);
    }
    
    onComplete(videoId);
  };

  const handleSkip = () => {
    // El useEffect ya guarda el progreso al desmontar
    if (player) {
      player.pause();
    }
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {t('dailyVideo.title')}
            </Text>
            <Text style={styles.subtitle}>
              {t('dailyVideo.subtitle')}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
            <X size={28} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>

        {videoStreak > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakText}>
              🔥 {t('dailyVideo.streakMessage').replace('{count}', videoStreak.toString())}
            </Text>
          </View>
        )}

        {savedProgress && savedProgress.percentWatched > 0 && savedProgress.percentWatched < AUTO_COMPLETE_THRESHOLD && (
          <View style={styles.progressBanner}>
            <Text style={styles.progressText}>
              📼 {t('dailyVideo.resumeFrom')} {Math.round(savedProgress.percentWatched)}%
            </Text>
          </View>
        )}

        <View style={styles.videoContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.placeholderText}>
                {t('dailyVideo.loading')}
              </Text>
              <Text style={styles.placeholderSubtext}>
                {t('dailyVideo.webUnavailable')}
              </Text>
              <TouchableOpacity 
                style={styles.webWatchedButton}
                onPress={() => setHasWatched(true)}
              >
                <Text style={styles.webWatchedButtonText}>
                  {t('dailyVideo.webMarkAsWatched')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <VideoView
              player={player}
              style={styles.video}
              contentFit="contain"
              nativeControls
            />
          )}
        </View>

        <View style={styles.controls}>
          {Platform.OS !== 'web' && (
            <TouchableOpacity 
              style={styles.playButton} 
              onPress={handlePlayPause}
            >
              {player?.playing ? (
                <Pause size={32} color={Colors.dark.background} />
              ) : (
                <Play size={32} color={Colors.dark.background} />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.completeButton,
              !hasWatched && styles.completeButtonDisabled
            ]} 
            onPress={handleComplete}
            disabled={!hasWatched}
          >
            <Text style={styles.completeButtonText}>
              {t('dailyVideo.markAsWatched')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>
              {t('dailyVideo.skip')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
  },
  streakBanner: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.background,
    textAlign: 'center',
  },
  progressBanner: {
    backgroundColor: Colors.dark.warning + '20',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.dark.warning,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.warning,
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  controls: {
    padding: 20,
    gap: 12,
  },
  playButton: {
    backgroundColor: Colors.dark.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  completeButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.dark.background,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  webWatchedButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  webWatchedButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.background,
  },
});
