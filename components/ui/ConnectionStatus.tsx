import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Wifi, WifiOff, Activity, Server, Database, Globe, 
    ChevronDown, ChevronUp, X, Bug, RefreshCw, Clock,
    CheckCircle2, XCircle, AlertCircle, Loader2, Terminal,
    Trash2, Copy, Download, Maximize2, Minimize2, GripVertical
} from 'lucide-react';
import { database, dbRefs, dbHelpers } from '../../services/firebase';
import { ref, onValue, off } from 'firebase/database';

interface ConnectionLog {
    id: string;
    timestamp: number;
    type: 'info' | 'success' | 'error' | 'warning';
    message: string;
    details?: string;
}

interface ConnectionMetrics {
    lastPing: number | null;
    latency: number | null;
    firebaseConnected: boolean;
    browserOnline: boolean;
    lastSyncTime: number | null;
    syncErrors: number;
    successfulSyncs: number;
}

// Storage key for position
const POSITION_KEY = 'cs_connection_status_position';

const getStoredPosition = () => {
    try {
        const stored = localStorage.getItem(POSITION_KEY);
        if (stored) {
            const pos = JSON.parse(stored);
            // Validate position is within viewport
            return {
                x: Math.max(0, Math.min(window.innerWidth - 80, pos.x)),
                y: Math.max(0, Math.min(window.innerHeight - 40, pos.y))
            };
        }
    } catch (e) {}
    return { x: 16, y: window.innerHeight - 80 };
};

export const ConnectionStatus: React.FC = () => {
    // Position state for dragging - load from localStorage
    const [position, setPosition] = useState(getStoredPosition);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    
    // UI State
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'debug'>('status');
    
    // Connection State
    const [metrics, setMetrics] = useState<ConnectionMetrics>({
        lastPing: null,
        latency: null,
        firebaseConnected: false,
        browserOnline: navigator.onLine,
        lastSyncTime: null,
        syncErrors: 0,
        successfulSyncs: 0
    });
    
    // Logs
    const [logs, setLogs] = useState<ConnectionLog[]>([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);
    
    // Add log helper
    const addLog = useCallback((type: ConnectionLog['type'], message: string, details?: string) => {
        const newLog: ConnectionLog = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type,
            message,
            details
        };
        setLogs(prev => [...prev.slice(-99), newLog]); // Keep last 100 logs
    }, []);
    
    // Ping Firebase
    const pingFirebase = useCallback(async () => {
        const startTime = performance.now();
        try {
            const testRef = ref(database, '.info/connected');
            await new Promise<boolean>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                onValue(testRef, (snapshot) => {
                    clearTimeout(timeout);
                    resolve(snapshot.val() === true);
                }, { onlyOnce: true });
            });
            
            const latency = Math.round(performance.now() - startTime);
            setMetrics(prev => ({
                ...prev,
                lastPing: Date.now(),
                latency,
                firebaseConnected: true,
                successfulSyncs: prev.successfulSyncs + 1
            }));
            addLog('success', `Firebase ping successful`, `Latency: ${latency}ms`);
            return true;
        } catch (error) {
            const latency = Math.round(performance.now() - startTime);
            setMetrics(prev => ({
                ...prev,
                lastPing: Date.now(),
                latency,
                firebaseConnected: false,
                syncErrors: prev.syncErrors + 1
            }));
            addLog('error', 'Firebase ping failed', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }, [addLog]);
    
    // Check connection periodically
    useEffect(() => {
        addLog('info', 'Connection monitor initialized');
        
        // Initial ping
        pingFirebase();
        
        // Set up periodic ping (every 30 seconds)
        const pingInterval = setInterval(pingFirebase, 30000);
        
        // Listen to Firebase connection state
        const connectedRef = ref(database, '.info/connected');
        const unsubscribe = onValue(connectedRef, (snapshot) => {
            const connected = snapshot.val() === true;
            setMetrics(prev => ({ ...prev, firebaseConnected: connected }));
            if (connected) {
                addLog('success', 'Firebase realtime connection established');
            } else {
                addLog('warning', 'Firebase realtime connection lost');
            }
        });
        
        // Browser online/offline events
        const handleOnline = () => {
            setMetrics(prev => ({ ...prev, browserOnline: true }));
            addLog('success', 'Browser went online');
            pingFirebase();
        };
        
        const handleOffline = () => {
            setMetrics(prev => ({ ...prev, browserOnline: false }));
            addLog('error', 'Browser went offline');
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            clearInterval(pingInterval);
            off(connectedRef);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [pingFirebase, addLog]);
    
    // Auto-scroll logs
    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);
    
    // Dragging handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) {
            e.preventDefault();
            setIsDragging(true);
            dragOffset.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            };
        }
    };
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                e.preventDefault();
                // Get container dimensions for proper bounds
                const containerWidth = containerRef.current?.offsetWidth || 80;
                const containerHeight = containerRef.current?.offsetHeight || 40;
                
                const newX = Math.max(0, Math.min(window.innerWidth - containerWidth, e.clientX - dragOffset.current.x));
                const newY = Math.max(0, Math.min(window.innerHeight - containerHeight, e.clientY - dragOffset.current.y));
                setPosition({ x: newX, y: newY });
            }
        };
        
        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                // Save position to localStorage
                localStorage.setItem(POSITION_KEY, JSON.stringify(position));
            }
        };
        
        if (isDragging) {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
        
        return () => {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, position]);
    
    // Overall status
    const isConnected = metrics.browserOnline && metrics.firebaseConnected;
    
    // Export logs
    const exportLogs = () => {
        const content = logs.map(log => 
            `[${new Date(log.timestamp).toISOString()}] [${log.type.toUpperCase()}] ${log.message}${log.details ? ` - ${log.details}` : ''}`
        ).join('\n');
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `classsync-logs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        addLog('info', 'Logs exported');
    };
    
    // Copy logs
    const copyLogs = () => {
        const content = logs.map(log => 
            `[${new Date(log.timestamp).toISOString()}] [${log.type.toUpperCase()}] ${log.message}${log.details ? ` - ${log.details}` : ''}`
        ).join('\n');
        navigator.clipboard.writeText(content);
        addLog('info', 'Logs copied to clipboard');
    };
    
    // Clear local storage (debug)
    const clearLocalStorage = () => {
        if (confirm('This will clear all cached data. Are you sure?')) {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('cs_'));
            keys.forEach(k => localStorage.removeItem(k));
            addLog('warning', `Cleared ${keys.length} cached items`);
        }
    };
    
    // Force sync
    const forceSync = async () => {
        addLog('info', 'Forcing sync...');
        const success = await pingFirebase();
        if (success) {
            setMetrics(prev => ({ ...prev, lastSyncTime: Date.now() }));
            window.dispatchEvent(new Event('forceSync'));
            addLog('success', 'Force sync completed');
        }
    };

    // Pill component (collapsed state)
    if (!isExpanded) {
        return (
            <div
                ref={containerRef}
                style={{ left: position.x, top: position.y }}
                className={`fixed z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg cursor-pointer select-none ${isDragging ? '' : 'hover:scale-105 transition-transform duration-200'} ${
                    isConnected 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white animate-pulse'
                }`}
                onMouseDown={handleMouseDown}
                onClick={() => !isDragging && setIsExpanded(true)}
            >
                <div className="drag-handle cursor-grab active:cursor-grabbing select-none">
                    <GripVertical size={12} className="opacity-60" />
                </div>
                {isConnected ? (
                    <>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span className="text-xs font-medium">Live</span>
                    </>
                ) : (
                    <>
                        <WifiOff size={12} />
                        <span className="text-xs font-medium">Offline</span>
                    </>
                )}
                {metrics.latency && isConnected && (
                    <span className="text-[10px] opacity-75">{metrics.latency}ms</span>
                )}
            </div>
        );
    }

    // Expanded panel
    return (
        <div
            ref={containerRef}
            style={isFullscreen ? {} : { left: position.x, top: position.y }}
            className={`fixed z-[9999] bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden select-none ${
                isFullscreen 
                    ? 'inset-4' 
                    : 'w-80 sm:w-96 max-h-[80vh]'
            } ${isDragging ? '' : 'transition-[width,height]'}`}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-stone-100 to-stone-50 dark:from-stone-800 dark:to-stone-900 border-b border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-2">
                    <div className="drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded select-none">
                        <GripVertical size={14} className="text-stone-400" />
                    </div>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                        Connection Status
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-stone-200 dark:border-stone-700">
                {(['status', 'logs', 'debug'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                            activeTab === tab 
                                ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                                : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                        }`}
                    >
                        {tab === 'status' && <Activity size={12} className="inline mr-1" />}
                        {tab === 'logs' && <Terminal size={12} className="inline mr-1" />}
                        {tab === 'debug' && <Bug size={12} className="inline mr-1" />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
            
            {/* Content */}
            <div className={`overflow-y-auto ${isFullscreen ? 'h-[calc(100%-88px)]' : 'max-h-72'}`}>
                {/* Status Tab */}
                {activeTab === 'status' && (
                    <div className="p-3 space-y-3">
                        {/* Connection Status Cards */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className={`p-2 rounded-lg border ${
                                metrics.browserOnline 
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className={metrics.browserOnline ? 'text-green-600' : 'text-red-600'} />
                                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Browser</span>
                                </div>
                                <p className={`text-sm font-bold mt-1 ${metrics.browserOnline ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {metrics.browserOnline ? 'Online' : 'Offline'}
                                </p>
                            </div>
                            
                            <div className={`p-2 rounded-lg border ${
                                metrics.firebaseConnected 
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <Database size={14} className={metrics.firebaseConnected ? 'text-green-600' : 'text-red-600'} />
                                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Firebase</span>
                                </div>
                                <p className={`text-sm font-bold mt-1 ${metrics.firebaseConnected ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {metrics.firebaseConnected ? 'Connected' : 'Disconnected'}
                                </p>
                            </div>
                        </div>
                        
                        {/* Metrics */}
                        <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-500">Latency</span>
                                <span className={`font-mono font-bold ${
                                    (metrics.latency || 0) < 100 ? 'text-green-600' : 
                                    (metrics.latency || 0) < 300 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                    {metrics.latency ? `${metrics.latency}ms` : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-500">Last Ping</span>
                                <span className="font-mono text-stone-700 dark:text-stone-300">
                                    {metrics.lastPing ? new Date(metrics.lastPing).toLocaleTimeString() : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-500">Successful Syncs</span>
                                <span className="font-mono text-green-600">{metrics.successfulSyncs}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-500">Sync Errors</span>
                                <span className="font-mono text-red-600">{metrics.syncErrors}</span>
                            </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                            <button 
                                onClick={pingFirebase}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                <RefreshCw size={12} /> Ping Now
                            </button>
                            <button 
                                onClick={forceSync}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                <Activity size={12} /> Force Sync
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Logs Tab */}
                {activeTab === 'logs' && (
                    <div className="flex flex-col h-full">
                        {/* Log Controls */}
                        <div className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 text-xs text-stone-500">
                                    <input 
                                        type="checkbox" 
                                        checked={autoScroll} 
                                        onChange={e => setAutoScroll(e.target.checked)}
                                        className="w-3 h-3"
                                    />
                                    Auto-scroll
                                </label>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={copyLogs} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded" title="Copy logs">
                                    <Copy size={12} />
                                </button>
                                <button onClick={exportLogs} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded" title="Export logs">
                                    <Download size={12} />
                                </button>
                                <button onClick={() => setLogs([])} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-red-500" title="Clear logs">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Log List */}
                        <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] bg-stone-900 text-stone-300 space-y-0.5">
                            {logs.length === 0 ? (
                                <p className="text-stone-500 text-center py-4">No logs yet...</p>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className="flex gap-2 hover:bg-stone-800 px-1 rounded">
                                        <span className="text-stone-500 flex-shrink-0">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                        <span className={`flex-shrink-0 ${
                                            log.type === 'error' ? 'text-red-400' :
                                            log.type === 'warning' ? 'text-amber-400' :
                                            log.type === 'success' ? 'text-green-400' : 'text-blue-400'
                                        }`}>
                                            [{log.type.toUpperCase()}]
                                        </span>
                                        <span className="flex-1">{log.message}</span>
                                        {log.details && <span className="text-stone-500">{log.details}</span>}
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                )}
                
                {/* Debug Tab */}
                {activeTab === 'debug' && (
                    <div className="p-3 space-y-3">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle size={12} /> Debug tools may affect app data
                            </p>
                        </div>
                        
                        {/* Environment Info */}
                        <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 space-y-2">
                            <h4 className="text-xs font-bold text-stone-600 dark:text-stone-400">Environment</h4>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-stone-500">User Agent</span>
                                    <span className="font-mono text-stone-700 dark:text-stone-300 truncate max-w-[180px]" title={navigator.userAgent}>
                                        {navigator.userAgent.split(' ').slice(-2).join(' ')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Language</span>
                                    <span className="font-mono text-stone-700 dark:text-stone-300">{navigator.language}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Online</span>
                                    <span className="font-mono text-stone-700 dark:text-stone-300">{String(navigator.onLine)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-500">LocalStorage Items</span>
                                    <span className="font-mono text-stone-700 dark:text-stone-300">
                                        {Object.keys(localStorage).filter(k => k.startsWith('cs_')).length}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Debug Actions */}
                        <div className="space-y-2">
                            <button 
                                onClick={clearLocalStorage}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                <Trash2 size={12} /> Clear Local Cache
                            </button>
                            
                            <button 
                                onClick={() => {
                                    console.log('=== ClassSync Debug Info ===');
                                    console.log('Metrics:', metrics);
                                    console.log('Logs:', logs);
                                    console.log('LocalStorage:', Object.fromEntries(
                                        Object.entries(localStorage).filter(([k]) => k.startsWith('cs_'))
                                    ));
                                    addLog('info', 'Debug info logged to console');
                                }}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-500 hover:bg-stone-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                <Terminal size={12} /> Log to Console
                            </button>
                            
                            <button 
                                onClick={() => window.location.reload()}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                <RefreshCw size={12} /> Reload App
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConnectionStatus;
