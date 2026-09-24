import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { colors, spacing, borderRadius } from '../../theme';
import { ChartDataPoint } from '../../redux/slices/dashboardSlice';
import { useAppSelector } from '../../redux/hooks';

interface IncomeExpenseChartProps {
  data: ChartDataPoint[];
  isMarathi?: boolean;
}

export const IncomeExpenseComparisonChart: React.FC<IncomeExpenseChartProps> = ({
  data,
  isMarathi: propIsMarathi,
}) => {
  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = propIsMarathi ?? (currentLanguage === 'mr');

  if (!data || data.length === 0) {
    return null;
  }

  const maxVal = Math.max(
    ...data.flatMap(d => [d.income, d.expense]),
    1000,
  );
  const chartHeight = 110;
  const chartWidth = 280;
  const groupBarWidth = 12;
  const groupWidth = groupBarWidth * 2 + 3;
  const gap = (chartWidth - groupWidth * data.length) / (data.length + 1);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {isMarathi ? 'जमा विरुद्ध खर्च / आउटकम' : 'Income vs Expense / Outcome'}
        </Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>{isMarathi ? 'जमा' : 'Income'}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendText}>{isMarathi ? 'खर्च' : 'Expense'}</Text>
          </View>
        </View>
      </View>

      <Svg width="100%" height={chartHeight + 25} viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`}>
        <Line
          x1="0"
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke={colors.borderLight}
          strokeWidth="1"
        />

        {data.map((point, index) => {
          const groupX = gap + index * (groupWidth + gap);
          const incHeight = Math.max(3, (point.income / maxVal) * (chartHeight - 15));
          const expHeight = Math.max(3, (point.expense / maxVal) * (chartHeight - 15));

          const incY = chartHeight - incHeight;
          const expY = chartHeight - expHeight;

          return (
            <React.Fragment key={index}>
              {/* Income bar */}
              <Rect
                x={groupX}
                y={incY}
                width={groupBarWidth}
                height={incHeight}
                rx={3}
                fill={colors.success}
              />
              {/* Expense bar */}
              <Rect
                x={groupX + groupBarWidth + 2}
                y={expY}
                width={groupBarWidth}
                height={expHeight}
                rx={3}
                fill={colors.danger}
              />
              {/* Date label */}
              <SvgText
                x={groupX + groupWidth / 2}
                y={chartHeight + 16}
                fontSize="9"
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
