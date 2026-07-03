import fs from 'fs'
import path from 'path'

const STATE_FILE = path.join(process.cwd(), 'data', 'state.json')

export type WalkStatus = 0 | 1 | 2 | 3 // 0: unassigned, 1: user1, 2: user2, 3: both

export interface AppState {
  config: {
    users: [string, string]
    first_day_of_week: string
  }
  [dateKey: string]: WalkStatus[][] | any
}

const DEFAULT_STATE: AppState = {
  config: {
    users: ['User 1', 'User 2'],
    first_day_of_week: 'Sunday',
  },
}

export async function getState(): Promise<AppState> {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      await saveState(DEFAULT_STATE)
      return DEFAULT_STATE
    }
    const data = await fs.promises.readFile(STATE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load state:', error)
    return DEFAULT_STATE
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    const dir = path.dirname(STATE_FILE)
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true })
    }
    await fs.promises.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save state:', error)
    throw new Error('Failed to save state')
  }
}
