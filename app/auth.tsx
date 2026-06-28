import { type ComponentType, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

  const isRegister = mode === 'register';
  const normalizedUsername = username.trim().toLowerCase();
  const isUsernameValid =
    normalizedUsername.length >= 3 &&
    normalizedUsername.length <= 24 &&
    USERNAME_PATTERN.test(normalizedUsername);
  const canSubmit = isRegister
    ? email.trim().includes('@') && isUsernameValid && password.length >= 8
    : identifier.trim().length >= 3 && password.length >= 8;

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 38, paddingBottom: insets.bottom + 32 },
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
                  icon={Mail}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <AuthField
                  icon={UserRound}
                  value={username}
                  onChangeText={setUsername}
                  placeholder={t('auth.username')}
                  autoCapitalize="none"
                />
                <Text style={[
                  styles.fieldHint,
                  username.trim().length > 0 && !isUsernameValid && styles.fieldHintError,
                ]}>
                  {t('auth.usernameHint')}
                </Text>
                <AuthField
                  icon={UserRound}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={t('auth.displayName')}
                />
              </>
            ) : (
              <AuthField
                icon={UserRound}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={t('auth.identifier')}
                autoCapitalize="none"
              />
            )}

            <AuthField
              icon={LockKeyhole}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.password')}
              secureTextEntry
              autoCapitalize="none"
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
  icon: ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

function AuthField({
  icon: Icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  autoCapitalize,
}: AuthFieldProps) {
  return (
    <View style={styles.inputWrap}>
      <Icon size={20} color={Colors.dark.textSecondary} strokeWidth={2.2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
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
