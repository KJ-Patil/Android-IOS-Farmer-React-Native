import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../app/providers/ThemeProvider';
import { useLocalizedFormat } from '../../shared/hooks/useLocalizedFormat';

interface DataPoint {
  label: string;
  income: number;
  expense: number;
}

interface AreaChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
}

export function AreaChart({ data, width = 320, height = 160 }: AreaChartProps) {
  const { colors } = useTheme();
  const { toNative } = useLocalizedFormat();

  if (data.length < 2) return null;

  const paddingLeft = 40;
  const paddingBottom = 24;
  const paddingTop = 10;
  const chartW = width - paddingLeft - 10;
  const chartH = height - paddingBottom - paddingTop;

  const allValues = data.flatMap((d) => [d.income, d.expense]);
  const maxVal = Math.max(...allValues, 1);

  const xStep = chartW / (data.length - 1);

  const toX = (i: number) => paddingLeft + i * xStep;
  const toY = (v: number) => paddingTop + chartH - (v / maxVal) * chartH;

  const buildPath = (key: 'income' | 'expense') => {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d[key])}`).join(' ');
  };

  const buildArea = (key: 'income' | 'expense') => {
    const line = buildPath(key);
    const lastX = toX(data.length - 1);
    const firstX = toX(0);
    const baseY = toY(0);
    return `${line} L${lastX},${baseY} L${firstX},${baseY} Z`;
  };

  const gridLines = 4;
  const gridStep = maxVal / gridLines;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
          </LinearGradient>
          <LinearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.destructive} stopOpacity="0.15" />
            <Stop offset="1" stopColor={colors.destructive} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = toY(i * gridStep);
          const val = Math.round(i * gridStep);
          const label = val >= 1000 ? `${toNative((val / 1000).toFixed(0))}k` : toNative(val);
          return (
            <React.Fragment key={i}>
              <Line x1={paddingLeft} y1={y} x2={width - 10} y2={y} stroke={colors.border} strokeWidth={0.5} />
              <SvgText x={paddingLeft - 6} y={y + 4} textAnchor="end" fill={colors.mutedFg} fontSize={9}>
                {label}
              </SvgText>
            </React.Fragment>
          );
        })}

        <Path d={buildArea('income')} fill="url(#incomeGrad)" />
        <Path d={buildPath('income')} fill="none" stroke={colors.primary} strokeWidth={2} />

        <Path d={buildArea('expense')} fill="url(#expenseGrad)" />
        <Path d={buildPath('expense')} fill="none" stroke={colors.destructive} strokeWidth={2} strokeDasharray="4,3" />

        {data.map((d, i) => (
          <SvgText
            key={i}
            x={toX(i)}
            y={height - 4}
            textAnchor="middle"
            fill={colors.mutedFg}
            fontSize={9}
          >
            {toNative(d.label)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
