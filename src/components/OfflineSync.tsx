'use client'
import { useEffect, useState } from 'react'
import { startAutoSync, processQueue } from '@/lib/syncManager'
import { getQueueCount } from '@/lib/offlineCache'
import { Wifi, WifiOff, Upload } from 'lucide-react'

export default function OfflineSync() {
  const [online, setOnline] = useState(true)
  const [pendentes, setPendentes] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)
    startAutoSync()

    const checkQueue = async () => {
      const count = await getQueueCount()
      setPendentes(count)
    }
    checkQueue()

    const goOnline = async () => {
      setOnline(true)
      setSyncing(true)
      const count = await processQueue()
      setSyncing(false)
      await checkQueue()
      if (count > 0) {
        setShowBanner(true)
        setTimeout(() => setShowBanner(false), 3000)
      }
    }

    const goOffline = () => {
      setOnline(false)
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Checar fila periodicamente
    const interval = setInterval(checkQueue, 5000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(interval)
    }
  }, [])

  // Banner de offline
  if (!online) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#F59E0B', color: '#fff', padding: '6px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 13, fontWeight: 700,
        animation: 'slideDown 0.3s ease',
      }}>
        <WifiOff size={16} />
        Sem internet — alterações serão salvas localmente
        {pendentes > 0 && (
          <span style={{
            background: 'rgba(255,255,255,0.3)', borderRadius: 10,
            padding: '1px 8px', fontSize: 11,
          }}>
            {pendentes} pendente{pendentes > 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  // Banner de sync
  if (syncing) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#2563EB', color: '#fff', padding: '6px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 13, fontWeight: 700,
      }}>
        <Upload size={16} className="spinner" />
        Sincronizando dados...
      </div>
    )
  }

  // Banner de sucesso
  if (showBanner) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#059669', color: '#fff', padding: '6px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 13, fontWeight: 700,
      }}>
        <Wifi size={16} />
        Dados sincronizados com sucesso!
      </div>
    )
  }

  return null
}
