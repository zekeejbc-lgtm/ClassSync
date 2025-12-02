import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show "back online" message briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending syncs in IndexedDB
    const checkPendingSyncs = async () => {
      try {
        const { db } = await import('../../services/db');
        const pending = await db.syncQueue.where('synced').equals(0).count();
        setPendingSyncs(pending);
      } catch (e) {
        // Dexie not available yet
      }
    };

    const interval = setInterval(checkPendingSyncs, 5000);
    checkPendingSyncs();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!showBanner && isOnline && pendingSyncs === 0) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
        isOnline 
          ? pendingSyncs > 0 
            ? 'bg-amber-500 text-white'
            : 'bg-green-500 text-white' 
          : 'bg-red-500 text-white'
      }`}
    >
      {isOnline ? (
        pendingSyncs > 0 ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Syncing {pendingSyncs} changes...</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Back online!</span>
          </>
        )
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">You're offline</span>
          <CloudOff className="w-3 h-3 ml-1" />
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
