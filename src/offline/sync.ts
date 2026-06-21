import { supabase } from '../lib/supabaseClient'
import { listQueued, removeQueued } from './db'

export interface FlushResult {
  synced: number
  failed: number
}

// Flush queued offline cases to Supabase. Each successful insert is removed from
// the queue; failures are left in place to retry on the next flush.
export async function flushQueue(): Promise<FlushResult> {
  if (!navigator.onLine) return { synced: 0, failed: 0 }
  const items = await listQueued()
  let synced = 0
  let failed = 0
  for (const item of items) {
    const { error } = await supabase.from('cases').insert(item.payload)
    if (error) {
      failed++
    } else {
      await removeQueued(item.localId)
      synced++
    }
  }
  return { synced, failed }
}
