import { Image, StyleSheet } from 'react-native';

type AppIconMarkProps = {
  size?: number;
  accessibilityLabel?: string;
};

export default function AppIconMark({ size = 68, accessibilityLabel = 'MindShift' }: AppIconMarkProps) {
  return (
    <Image
      source={require('@/assets/images/app-mark.png')}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.image,
        {
          width: size,
          height: size,
        },
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'transparent',
  },
});
