import { useOnlineStatus } from '../hooks/useOnlineStatus'

interface Props {
  pendingCount?: number
}

// Connectivity + offline-queue status. Shows the count of cases saved locally
// and awaiting sync (the synced/unsynced indicator).
export function SyncIndicator({ pendingCount = 0 }: Props) {
  const online = useOnlineStatus()
  const unsynced = pendingCount > 0
  const cls = !online ? 'sync--offline' : unsynced ? 'sync--pending' : 'sync--online'
  const label = !online
    ? pendingCount > 0
      ? `Offline · ${pendingCount} queued`
      : 'Offline'
    : unsynced
      ? `Syncing · ${pendingCount}`
      : 'Synced'

  return (
    <span className={`sync ${cls}`}>
      <span className="sync__dot" />
      {label}
    </span>
  )
}
