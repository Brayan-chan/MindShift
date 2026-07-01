import { type ComponentType, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockKeyhole, Mail, UserRound } from 'lucide-react-native';
import { fulltoast } from 'fulltoast';
import Colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { loginWithPassword, registerWithPassword } from '@/lib/api';
import AppIconMark from '@/components/AppIconMark';

type AuthMode = 'login' | 'register';
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { refreshSessionData } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  const focusedFieldRef = useRef<string | null>(null);

  const isRegister = mode === 'register';
  const normalizedUsername = username.trim().toLowerCase();
  const isUsernameValid =
    normalizedUsername.length >= 3 &&
    normalizedUsername.length <= 24 &&
    USERNAME_PATTERN.test(normalizedUsername);
  const canSubmit = isRegister
    ? email.trim().includes('@') && isUsernameValid && password.length >= 8
    : identifier.trim().length >= 3 && password.length >= 8;

  useEffect(() => {
    if (Platform.OS === 'ios') return;

    const showSubscription = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates.height);
      if (focusedFieldRef.current) {
        smoothScrollToField(focusedFieldRef.current, 120);
      }
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      focusedFieldRef.current = null;
      smoothScrollToTop();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const registerFieldOffset = (field: string, event: LayoutChangeEvent) => {
    fieldOffsetsRef.current[field] = event.nativeEvent.layout.y;
  };

  const smoothScrollToTop = () => {
    requestAnimationFrame(() => {
      InteractionManager.runAfterInteractions(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    });
  };

  const smoothScrollToField = (field: string, delay = 80) => {
    if (Platform.OS === 'ios') return;

    window.setTimeout(() => {
      const y = fieldOffsetsRef.current[field] ?? 0;
      requestAnimationFrame(() => {
        InteractionManager.runAfterInteractions(() => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - 104),
            animated: true,
          });
        });
      });
    }, delay);
  };

  const handleFieldFocus = (field: string) => {
    focusedFieldRef.current = field;
    smoothScrollToField(field);
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await registerWithPassword({
          email: email.trim(),
          username: normalizedUsername,
          password,
          displayName: displayName.trim() || username.trim(),
        });
      } else {
        await loginWithPassword(identifier.trim(), password);
      }

      await refreshSessionData();
      router.replace('/');
    } catch (error) {
      fulltoast.error({
        title: t('auth.errorTitle'),
        description: error instanceof Error ? error.message : t('auth.errorBody'),
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        overScrollMode="never"
        decelerationRate="normal"
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          keyboardHeight > 0 && styles.contentKeyboardOpen,
          {
            paddingTop: insets.top + 38,
            paddingBottom: insets.bottom + 32 + keyboardHeight,
          },
        ]}
      >
        <View style={styles.formShell}>
          <View style={styles.brandSlot}>
            <AppIconMark size={74} />
          </View>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

          <View style={styles.segmented}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setMode('login')}
              style={[styles.segment, mode === 'login' && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>
                {t('auth.login')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setMode('register')}
              style={[styles.segment, mode === 'register' && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>
                {t('auth.register')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {isRegister ? (
              <>
                <AuthField
                  fieldKey="email"
                  icon={Mail}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => handleFieldFocus('email')}
                  onLayout={event => registerFieldOffset('email', event)}
                />
                <AuthField
                  fieldKey="username"
                  icon={UserRound}
                  value={username}
                  onChangeText={setUsername}
                  placeholder={t('auth.username')}
                  autoCapitalize="none"
                  onFocus={() => handleFieldFocus('username')}
                  onLayout={event => registerFieldOffset('username', event)}
                />
                <Text style={[
                  styles.fieldHint,
                  username.trim().length > 0 && !isUsernameValid && styles.fieldHintError,
                ]}>
                  {t('auth.usernameHint')}
                </Text>
                <AuthField
                  fieldKey="displayName"
                  icon={UserRound}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={t('auth.displayName')}
                  onFocus={() => handleFieldFocus('displayName')}
                  onLayout={event => registerFieldOffset('displayName', event)}
                />
              </>
            ) : (
              <AuthField
                fieldKey="identifier"
                icon={UserRound}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={t('auth.identifier')}
                autoCapitalize="none"
                onFocus={() => handleFieldFocus('identifier')}
                onLayout={event => registerFieldOffset('identifier', event)}
              />
            )}

            <AuthField
              fieldKey="password"
              icon={LockKeyhole}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.password')}
              secureTextEntry
              autoCapitalize="none"
              onFocus={() => handleFieldFocus('password')}
              onLayout={event => registerFieldOffset('password', event)}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            disabled={!canSubmit || isSubmitting}
            onPress={handleSubmit}
            style={[styles.submitButton, (!canSubmit || isSubmitting) && styles.submitButtonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.dark.background} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isRegister ? t('auth.createAccount') : t('auth.enter')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type AuthFieldProps = {
  fieldKey: string;
  icon: ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onFocus?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

function AuthField({
  fieldKey,
  icon: Icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  autoCapitalize,
  onFocus,
  onLayout,
}: AuthFieldProps) {
  return (
    <View style={styles.inputWrap} onLayout={onLayout}>
      <Icon size={20} color={Colors.dark.textSecondary} strokeWidth={2.2} />
      <TextInput
        nativeID={fieldKey}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.textTertiary}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  contentKeyboardOpen: {
    justifyContent: 'flex-start',
  },
  formShell: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  brandSlot: {
    marginBottom: 22,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.dark.textSecondary,
  },
  segmented: {
    minHeight: 48,
    flexDirection: 'row',
    padding: 4,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: 28,
  },
  segment: {
    flex: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.dark.primary,
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: Colors.dark.textSecondary,
  },
  segmentTextActive: {
    color: Colors.dark.background,
  },
  form: {
    gap: 10,
    marginTop: 18,
  },
  inputWrap: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 20,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    minHeight: 52,
    color: Colors.dark.text,
    fontSize: 15,
    marginLeft: 10,
  },
  fieldHint: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: -4,
    marginLeft: 4,
  },
  fieldHintError: {
    color: Colors.dark.warning,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: Colors.dark.background,
  },
});
