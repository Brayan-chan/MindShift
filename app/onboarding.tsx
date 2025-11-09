import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Target, Zap } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

export default function OnboardingScreen() {
  const router = useRouter();
  const { saveIdentity } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [currentIdentity, setCurrentIdentity] = useState('');
  const [targetIdentity, setTargetIdentity] = useState('');
  const [whyTransform, setWhyTransform] = useState('');

  const handleComplete = async () => {
    await saveIdentity({
      currentIdentity,
      targetIdentity,
      whyTransform,
      setupComplete: true,
    });
    router.replace('/(tabs)/dashboard');
  };

  const steps = [
    {
      title: 'Who are you now?',
      subtitle: 'Be honest. No judgment.',
      placeholder: 'e.g., Procrastinator who scrolls 4h/day...',
      value: currentIdentity,
      onChange: setCurrentIdentity,
      icon: Target,
    },
    {
      title: 'Who do you want to become?',
      subtitle: 'Paint the picture of your best self.',
      placeholder: 'e.g., Disciplined entrepreneur who executes...',
      value: targetIdentity,
      onChange: setTargetIdentity,
      icon: Zap,
    },
    {
      title: 'Why transform?',
      subtitle: 'This is your anchor. Make it powerful.',
      placeholder: 'e.g., Tired of wasting my potential...',
      value: whyTransform,
      onChange: setWhyTransform,
      icon: Target,
      multiline: true,
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const canProceed = currentStep.value.trim().length > 10;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -500}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon size={32} color={Colors.dark.primary} strokeWidth={2} />
          </View>
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.subtitle}>{currentStep.subtitle}</Text>
        </View>

        <View style={styles.content}>
          <TextInput
            style={[
              styles.input,
              currentStep.multiline && styles.inputMultiline,
            ]}
            placeholder={currentStep.placeholder}
            placeholderTextColor={Colors.dark.textTertiary}
            value={currentStep.value}
            onChangeText={currentStep.onChange}
            multiline={currentStep.multiline}
            numberOfLines={currentStep.multiline ? 4 : 1}
            autoFocus
          />

          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === step && styles.progressDotActive,
                  index < step && styles.progressDotComplete,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              !canProceed && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed}
          >
            <Text style={styles.buttonText}>
              {step === steps.length - 1 ? 'Begin Transformation' : 'Continue'}
            </Text>
            <ArrowRight size={20} color={Colors.dark.text} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 48,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: Colors.dark.text,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    minHeight: 60,
  },
  inputMultiline: {
    minHeight: 140,
    paddingTop: 20,
    textAlignVertical: 'top',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.border,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: Colors.dark.primary,
  },
  progressDotComplete: {
    backgroundColor: Colors.dark.success,
  },
  footer: {
    paddingTop: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark.text,
  },
});