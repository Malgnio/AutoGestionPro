import { createContext, useContext, useState, ReactNode } from 'react'

const now = new Date()
const CURRENT_YEAR = now.getFullYear()

type PeriodContextType = {
  selectedYear: number
  selectedMonth: number
  availableYears: number[]
  setSelectedYear: (y: number) => void
  setSelectedMonth: (m: number) => void
  addYear: (y: number) => void
}

const PeriodContext = createContext<PeriodContextType>({
  selectedYear: CURRENT_YEAR,
  selectedMonth: now.getMonth(),
  availableYears: [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR],
  setSelectedYear: () => {},
  setSelectedMonth: () => {},
  addYear: () => {},
})

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [availableYears, setAvailableYears] = useState([CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR])

  function addYear(y: number) {
    setAvailableYears(prev => [...prev, y].sort((a, b) => a - b))
  }

  return (
    <PeriodContext.Provider value={{ selectedYear, selectedMonth, availableYears, setSelectedYear, setSelectedMonth, addYear }}>
      {children}
    </PeriodContext.Provider>
  )
}

export function usePeriod() {
  return useContext(PeriodContext)
}
