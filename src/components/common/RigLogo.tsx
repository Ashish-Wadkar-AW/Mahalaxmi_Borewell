import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';

interface RigLogoProps {
  size?: number;
  color?: string;
  showText?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export const RigLogo: React.FC<RigLogoProps> = ({
  size = 56,
  style,
  imageStyle,
}) => {
  // logoquotation has aspect ratio 1024 : 597 (~ 1.715 : 1)
  const width = Math.round(size * 1.6);
  const height = Math.round(size * 0.95);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../assets/images/logoquotation.png')}
        style={[{ width, height }, styles.image, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    resizeMode: 'contain',
  },
});
