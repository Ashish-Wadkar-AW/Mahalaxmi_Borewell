import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { colors, spacing, borderRadius } from '../../theme';
import { ChartDataPoint } from '../../redux/slices/dashboardSlice';
import { useAppSelector } from '../../redux/hooks';

interface RevenueBarChartProps {
  data: ChartDataPoint[];
  isMarathi?: boolean;
}

export const RevenueBarChart: React.FC<RevenueBarChartProps> = ({
  data,
  isMarathi: propIsMarathi,
}) => {
  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = propIsMarathi ?? (currentLanguage === 'mr');

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {isMarathi
            ? 'निवडलेल्या कालावधीत कोणताही महसूल डेटा उपलब्ध नाही'
            : 'No revenue data in selected timeframe'}
        </Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map(d => d.revenue), 1000);
  const chartHeight = 120;
  const chartWidth = 280;
  const barWidth = 22;
  const gap = (chartWidth - barWidth * data.length) / (data.length + 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isMarathi ? 'महसूल कल (₹)' : 'Revenue Trend (₹)'}
      </Text>
      <Svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}>
        {/* Baseline horizontal grid line */}
        <Line
          x1="0"
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke={colors.borderLight}
          strokeWidth="1"
        />

        {data.map((point, index) => {
          const barHeight = Math.max(4, (point.revenue / maxVal) * (chartHeight - 20));
          const x = gap + index * (barWidth + gap);
          const y = chartHeight - barHeight;

          return (
            <React.Fragment key={index}>
              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={colors.primary}
              />
              {/* Date Label */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + 16}
                fontSize="10"
                fill={colors.textMuted}
                textAnchor="middle">
                {point.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
