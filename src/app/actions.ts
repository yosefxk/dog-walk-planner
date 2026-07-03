"use server"

import { getState, saveState, AppState, WalkStatus } from "@/lib/state"
import { revalidatePath } from "next/cache"

export async function fetchState(): Promise<AppState> {
  return await getState()
}

export async function updateWalkSlot(dateKey: string, slotIndex: number): Promise<void> {
  const state = await getState()

  if (!state[dateKey]) {
    state[dateKey] = [[0, 0, 0]]
  }
  
  let currentArray = state[dateKey]
  if (currentArray.length === 3 && typeof currentArray[0] === 'number') {
    // Old format conversion just in case
    state[dateKey] = [currentArray]
  }

  const currentVal = state[dateKey][0][slotIndex]
  // Rotate 0 -> 1 -> 2 -> 3 -> 0
  const nextVal = ((currentVal + 1) % 4) as WalkStatus

  state[dateKey][0][slotIndex] = nextVal

  await saveState(state)
  revalidatePath("/")
}

export async function updateConfig(users: [string, string], firstDayOfWeek: string): Promise<void> {
  const state = await getState()
  state.config = {
    users,
    first_day_of_week: firstDayOfWeek,
  }
  await saveState(state)
  revalidatePath("/")
}
