import { useState, useEffect } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { supabase } from '../lib/supabase'
import { Colors } from '../constants/colors'

type SaleOption = { customer_name: string; rut: string; chassis?: string }

type Props = {
  value: string
  rut: string
  selectedYear: number
  selectedMonth: number
  onChangeName: (name: string) => void
  onSelect: (opt: SaleOption) => void
  includesChassis?: boolean
}

export default function ClientSearch({ value, rut, selectedYear, selectedMonth, onChangeName, onSelect, includesChassis }: Props) {
  const [options, setOptions] = useState<SaleOption[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => { loadOptions() }, [selectedYear, selectedMonth])

  async function loadOptions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Últimos 4 meses desde el mes seleccionado
    const endDate = new Date(selectedYear, selectedMonth + 1, 0)
    const startDate = new Date(selectedYear, selectedMonth - 3, 1)
    const start = startDate.toISOString().split('T')[0]
    const end = endDate.toISOString().split('T')[0]

    const cols = includesChassis ? 'customer_name, rut, chassis' : 'customer_name, rut'
    const { data } = await supabase.from('sales').select(cols)
      .eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end)
      .order('created_at', { ascending: false })

    // Deduplicar por RUT
    const seen = new Set<string>()
    const unique = (data ?? []).filter((s: SaleOption) => {
      if (seen.has(s.rut)) return false
      seen.add(s.rut); return true
    })
    setOptions(unique)
  }

  const filtered = options.filter(s =>
    s.customer_name.toLowerCase().includes(value.toLowerCase())
  )

  return (
    <View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={v => { onChangeName(v); setShowDropdown(true) }}
        onFocus={() => setShowDropdown(true)}
        placeholder="Buscar cliente de ventas..."
        placeholderTextColor={Colors.textLight}
      />
      {showDropdown && filtered.length > 0 && (
        <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {filtered.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.item, i === filtered.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => { onSelect(s); setShowDropdown(false) }}
            >
              <Text style={styles.itemName}>{s.customer_name}</Text>
              <Text style={styles.itemRut}>{s.rut}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <Text style={styles.label}>RUT</Text>
      <TextInput
        style={[styles.input, styles.inputReadonly]}
        value={rut}
        onChangeText={() => {}}
        editable={false}
        placeholder="Se autocompleta al elegir cliente"
        placeholderTextColor={Colors.textLight}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: Colors.textLight, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: Colors.text, outlineStyle: 'none' } as any,
  inputReadonly: { backgroundColor: '#F8F9FA', color: Colors.textLight },
  dropdown: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, maxHeight: 200, marginTop: 4 },
  item: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  itemRut: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
})
