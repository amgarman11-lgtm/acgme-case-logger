import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CaseInsert } from '../types/models'

// Offline queue: case saves made while offline (or that fail with a network
// error) are stored here and flushed to Supabase when connectivity returns.
// Holds only de-identified case payloads — NO PHI.
export interface QueuedCase {
  localId: string
  payload: CaseInsert
  queuedAt: number
}

interface CaseLogDB extends DBSchema {
  queue: { key: string; value: QueuedCase }
}

let dbPromise: Promise<IDBPDatabase<CaseLogDB>> | null = null
function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<CaseLogDB>('acgme-case-logger', 1, {
      upgrade(db) {
        db.createObjectStore('queue', { keyPath: 'localId' })
      },
    })
  }
  return dbPromise
}

export async function queueCase(payload: CaseInsert): Promise<QueuedCase> {
  const item: QueuedCase = { localId: crypto.randomUUID(), payload, queuedAt: Date.now() }
  await (await getDb()).put('queue', item)
  return item
}

export async function listQueued(): Promise<QueuedCase[]> {
  const all = await (await getDb()).getAll('queue')
  return all.sort((a, b) => b.queuedAt - a.queuedAt)
}

export async function removeQueued(localId: string): Promise<void> {
  await (await getDb()).delete('queue', localId)
}

export async function countQueued(): Promise<number> {
  return (await getDb()).count('queue')
}
