import { TextStyle } from 'react-native';
import { moderateScale as ms } from '../utils/responsive';

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: ms(28), fontWeight: '700', letterSpacing: -0.5 },
  h2: { fontSize: ms(24), fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: ms(20), fontWeight: '600', letterSpacing: -0.3 },
  h4: { fontSize: ms(18), fontWeight: '600' },
  body: { fontSize: ms(16), fontWeight: '400', lineHeight: ms(24) },
  bodySmall: { fontSize: ms(14), fontWeight: '400', lineHeight: ms(20) },
  caption: { fontSize: ms(12), fontWeight: '400', lineHeight: ms(16) },
  label: { fontSize: ms(14), fontWeight: '500' },
  button: { fontSize: ms(16), fontWeight: '600' },
  tabLabel: { fontSize: ms(12), fontWeight: '500' },
};
