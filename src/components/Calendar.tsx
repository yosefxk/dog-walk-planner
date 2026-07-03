"use client"

import { useState, useTransition } from "react"
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from "date-fns"
import { AppState, WalkStatus } from "@/lib/state"
import { updateWalkSlot, updateConfig } from "@/app/actions"
import { ChevronLeft, ChevronRight, Settings, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import clsx from "clsx"
import { motion, AnimatePresence } from "framer-motion"

const WALK_SLOTS = ["Morning", "Afternoon", "Evening"]
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function Calendar({ initialState, userEmail }: { initialState: AppState; userEmail: string }) {
  const [state, setState] = useState<AppState>(initialState)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isPending, startTransition] = useTransition()
  const [showSettings, setShowSettings] = useState(false)

  // Settings state
  const [user1Name, setUser1Name] = useState(state.config.users[0])
  const [user2Name, setUser2Name] = useState(state.config.users[1])
  const [firstDay, setFirstDay] = useState(state.config.first_day_of_week)

  // Map first_day_of_week to date-fns weekStartsOn (0 = Sunday, 1 = Monday)
  const weekStartsOn = WEEKDAY_NAMES.indexOf(state.config.first_day_of_week) as 0 | 1 | 2 | 3 | 4 | 5 | 6

  const startDate = startOfWeek(currentDate, { weekStartsOn })
  const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i))

  const handleSlotClick = (dateKey: string, slotIndex: number) => {
    // Optimistic update
    const nextState = { ...state }
    if (!nextState[dateKey]) nextState[dateKey] = [[0, 0, 0]]
    
    let currentArray = nextState[dateKey]
    if (currentArray.length === 3 && typeof currentArray[0] === 'number') {
      nextState[dateKey] = [currentArray]
    }
    
    const currentVal = nextState[dateKey][0][slotIndex]
    nextState[dateKey][0][slotIndex] = ((currentVal + 1) % 4) as WalkStatus
    setState(nextState)

    // Server update
    startTransition(() => {
      updateWalkSlot(dateKey, slotIndex)
    })
  }

  const handleSaveSettings = () => {
    const nextState = { ...state }
    nextState.config = { users: [user1Name, user2Name], first_day_of_week: firstDay }
    setState(nextState)
    setShowSettings(false)
    startTransition(() => {
      updateConfig([user1Name, user2Name], firstDay)
    })
  }

  const renderSlotButton = (dateKey: string, slotIndex: number) => {
    const dayData = state[dateKey] || [[0, 0, 0]]
    const currentArray = (dayData.length === 3 && typeof dayData[0] === 'number') ? dayData : dayData[0]
    const val = currentArray[slotIndex] as WalkStatus

    let label = "—"
    let colorClass = "bg-white/5 text-neutral-500 hover:bg-white/10"

    if (val === 1) {
      label = state.config.users[0]
      colorClass = "bg-blue-600 text-white hover:bg-blue-500"
    } else if (val === 2) {
      label = state.config.users[1]
      colorClass = "bg-rose-500 text-white hover:bg-rose-400"
    } else if (val === 3) {
      label = "Both"
      colorClass = "bg-purple-600 text-white hover:bg-purple-500"
    }

    return (
      <motion.button
        key={`${dateKey}-${slotIndex}`}
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.02 }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => handleSlotClick(dateKey, slotIndex)}
        className={clsx(
          "h-12 w-full rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm border border-white/10",
          colorClass
        )}
      >
        <motion.span
          key={label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-block"
        >
          {label}
        </motion.span>
      </motion.button>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-200 font-sans pb-20">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-[#080808]/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">🐕</div>
          <span className="font-bold text-white tracking-tight">Dog Walk Planner</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400 hidden sm:inline-block">{userEmail}</span>
          <button onClick={() => setShowSettings(true)} className="p-2 text-neutral-400 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
          <button onClick={() => signOut()} className="p-2 text-neutral-400 hover:text-rose-400 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentDate(prev => subWeeks(prev, 1))}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Week of {format(startDate, 'MMM d')}
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              {format(startDate, 'yyyy')}
            </p>
          </div>

          <button
            onClick={() => setCurrentDate(prev => addWeeks(prev, 1))}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Calendar Grid (Desktop) */}
        <div className="hidden sm:block overflow-x-auto pb-4">
          <div className="min-w-[800px] grid grid-cols-[100px_repeat(7,1fr)] gap-4">
            {/* Headers */}
            <div className="flex items-end pb-4 justify-end pr-4 text-neutral-500 font-medium text-sm">Time</div>
            {weekDates.map(date => {
              const isToday = isSameDay(date, new Date())
              return (
                <div key={date.toISOString()} className={clsx(
                  "text-center pb-4 border-b-2",
                  isToday ? "border-rose-500" : "border-white/10"
                )}>
                  <div className={clsx("font-semibold text-lg", isToday ? "text-rose-400" : "text-white")}>
                    {format(date, 'EEEE')}
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">{format(date, 'MMM d')}</div>
                </div>
              )
            })}

            {/* Rows */}
            {WALK_SLOTS.map((slot, slotIndex) => (
              <div key={slot} className="contents">
                <div className="flex items-center justify-end pr-4 text-neutral-400 font-medium h-12 my-2">{slot}</div>
                {weekDates.map(date => (
                  <div key={`${date.toISOString()}-${slotIndex}`} className="my-2">
                    {renderSlotButton(format(date, 'yyyy-MM-dd'), slotIndex)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile List View */}
        <div className="sm:hidden flex flex-col gap-6">
          {weekDates.map(date => {
            const dateKey = format(date, 'yyyy-MM-dd')
            const isToday = isSameDay(date, new Date())
            return (
              <div key={dateKey} className={clsx(
                "bg-[#111111] rounded-2xl p-4 border",
                isToday ? "border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]" : "border-white/5"
              )}>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                  <span className={clsx("font-bold text-lg", isToday ? "text-rose-400" : "text-white")}>
                    {format(date, 'EEEE')}
                  </span>
                  <span className="text-sm text-neutral-400">{format(date, 'MMM d')}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {WALK_SLOTS.map((slot, slotIndex) => (
                    <div key={slot} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-medium text-neutral-400 text-right">{slot}</div>
                      <div className="flex-1">
                        {renderSlotButton(dateKey, slotIndex)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Settings</h3>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">User 1 Name</label>
                <input
                  type="text"
                  value={user1Name}
                  onChange={e => setUser1Name(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">User 2 Name</label>
                <input
                  type="text"
                  value={user2Name}
                  onChange={e => setUser2Name(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">First Day of Week</label>
                <select
                  value={firstDay}
                  onChange={e => setFirstDay(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rose-500 transition-colors appearance-none"
                >
                  {WEEKDAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg font-medium text-neutral-400 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-lg font-medium bg-rose-500 text-white hover:bg-rose-400 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
