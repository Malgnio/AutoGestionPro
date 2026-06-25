import { createContext, useContext, useState, ReactNode } from 'react'

type PeriodContextType = {
  selectedYear: number
  selectedMonth: number
  setSelectedYear: (y: number) => void
  setSelectedMonth: (m: number) => void
}

const now = new Date()
const PeriodContext = createContext<PeriodContextType>({
  selectedYear: now.getFullYear(),
  selectedMonth: now.getMonth(),
  setSelectedYear: () => {},
  setSelectedMonth: () => {},
})

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  return (
    <PeriodContext.Provider value={{ selectedYear, selectedMonth, setSelectedYear, setSelectedMonth }}>
      {children}
    </PeriodContext.Provider>
  )
}

export function usePeriod() {
  return useContext(PeriodContext)
}
