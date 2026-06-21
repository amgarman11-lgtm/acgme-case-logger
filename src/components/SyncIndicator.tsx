import { useOnlineStatus } from '../hooks/useOnlineStatus'

// Phase 1: reflects connectivity. Phase 5 extends this to show the count of
// cases queued offline and awaiting sync (the synced/unsynced indicator).
export function SyncIndicator() {
  const online = useOnlineStatus()
  return (
    <span className={`sync ${online ? 'sync--online' : 'sync--offline'}`}>
      <span className="sync__dot" />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}
