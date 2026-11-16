import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design dimensions (standard Android phone ~360dp wide)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale a value linearly based on screen width.
 * Use for horizontal spacing, widths, paddings, margins.
 */
export const scale = (size: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size);
};

/**
 * Scale a value linearly based on screen height.
 * Use for vertical spacing, heights, top/bottom margins.
 */
export const verticalScale = (size: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size);
};

/**
 * Scale with a dampening factor (0–1). Default factor = 0.5.
 * Grows/shrinks more gently than linear scale.
 * Best for font sizes, icon sizes, border radii.
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return PixelRatio.roundToNearestPixel(
    size + (scale(size) - size) * factor,
  );
};

export const ms = moderateScale;
export const s = scale;
export const vs = verticalScale;

export { SCREEN_WIDTH, SCREEN_HEIGHT };
