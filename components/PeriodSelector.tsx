import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'
import { usePeriod } from '../contexts/PeriodContext'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

type Props = {
  selectedYear: number
  selectedMonth: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
}

export default function PeriodSelector({ selectedYear, selectedMonth, onYearChange, onMonthChange }: Props) {
  const { availableYears, addYear } = usePeriod()
  const [showYearPicker, setShowYearPicker] = useState(false)

  // Candidate years not yet added (up to 5 years ahead)
  const maxYear = Math.max(...availableYears)
  const nextYear = maxYear + 1

  function handleAddYear() {
    addYear(nextYear)
    onYearChange(nextYear)
    setShowYearPicker(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.yearRow}>
        {availableYears.map(year => (
          <TouchableOpacity
            key={year}
            style={[styles.yearBtn, selectedYear === year && styles.yearBtnActive]}
            onPress={() => onYearChange(year)}
          >
            <Text style={[styles.yearText, selectedYear === year && styles.yearTextActive]}>
              {year}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Botón + para agregar siguiente año */}
        <TouchableOpacity style={styles.addYearBtn} onPress={handleAddYear}>
          <Text style={styles.addYearText}>+ {nextYear}</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
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
  addYearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  } as any,
  addYearText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
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
