import { scale, moderateScale } from '../utils/responsive';

export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  '2xl': scale(24),
  '3xl': scale(32),
  '4xl': scale(40),
  '5xl': scale(48),
} as const;

export const radius = {
  sm: moderateScale(6),
  md: moderateScale(10),
  lg: moderateScale(16),
  xl: moderateScale(24),
  full: 9999,
} as const;
