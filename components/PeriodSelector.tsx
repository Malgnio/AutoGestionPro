import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]

type Props = {
  selectedYear: number
  selectedMonth: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
}

export default function PeriodSelector({ selectedYear, selectedMonth, onYearChange, onMonthChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.yearRow}>
        {YEARS.map(year => (
          <TouchableOpacity
            key={year}
            style={[styles.yearBtn, selectedYear === year && styles.yearBtnActive]}
            onPress={() => onYearChange(year)}
          >
            <Text style={[styles.yearText, selectedYear === year && styles.yearTextActive]}>
              FY{year}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>
        {MONTHS.map((m, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.monthBtn, selectedMonth === i && styles.monthBtnActive]}
            onPress={() => onMonthChange(i)}
          >
            <Text style={[styles.monthText, selectedMonth === i && styles.monthTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  yearRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  yearBtnActive: {
    backgroundColor: Colors.primary,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  yearTextActive: {
    color: Colors.white,
  },
  monthRow: {
    gap: 8,
    paddingBottom: 2,
  },
  monthBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  monthBtnActive: {
    backgroundColor: Colors.primary,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textLight,
  },
  monthTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
})
