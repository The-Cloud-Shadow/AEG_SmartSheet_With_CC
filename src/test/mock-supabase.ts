import { vi } from 'vitest'

// Mock Supabase client
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null
      }))
    })),
    insert: vi.fn(() => ({
      data: [],
      error: null
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null
      }))
    })),
    upsert: vi.fn(() => ({
      data: [],
      error: null
    }))
  })),
  channel: vi.fn(() => ({
    on: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({
          unsubscribe: vi.fn()
        }))
      }))
    }))
  }))
}

// Mock real-time subscription callbacks
export class MockRealtimeSubscription {
  private callbacks: { [event: string]: Function[] } = {}

  on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = []
    }
    this.callbacks[event].push(callback)
    return this
  }

  subscribe() {
    return {
      unsubscribe: vi.fn()
    }
  }

  // Helper to simulate real-time events in tests
  simulate(event: string, payload: any) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(payload))
    }
  }
}

// Mock the useRealTimeSync hook
export const mockUseRealTimeSync = vi.fn(() => ({
  isConnected: true,
  lastSyncTime: new Date(),
  syncCell: vi.fn(),
  syncArchive: vi.fn(),
  syncColumn: vi.fn()
}))

// Mock Supabase module
vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

vi.mock('../hooks/useRealTimeSync', () => ({
  useRealTimeSync: mockUseRealTimeSync
}))