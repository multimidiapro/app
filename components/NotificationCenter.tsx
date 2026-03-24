'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Info, RefreshCw, Calendar, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getNotifications, markNotificationAsRead, checkAppUpdate, type AppNotification } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasUpdate, setHasUpdate] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
    
    // Check for app update on mount
    checkAppUpdate().then(result => {
      if (result.hasUpdate) {
        setHasUpdate(true);
      }
    });

    // Listen for Service Worker updates
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setHasUpdate(true);
      });
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data);
  };

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleUpdate = () => {
    // Clear all caches and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    if ('caches' in window) {
      caches.keys().then(names => {
        for (const name of names) caches.delete(name);
      });
    }

    // Clear local version to force reset
    localStorage.removeItem('biblia_ai_app_version');
    window.location.reload();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length + (hasUpdate ? 1 : 0);

  const getIcon = (type: string) => {
    switch (type) {
      case 'update': return <RefreshCw className="text-red-500" size={16} />;
      case 'event': return <Calendar className="text-purple-500" size={16} />;
      case 'admin': return <MessageSquare className="text-amber-500" size={16} />;
      default: return <Info className="text-sky-500" size={16} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-full transition-colors"
        title="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
              <h3 className="font-bold text-sm">Notificações</h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto no-scrollbar">
              {hasUpdate && (
                <div className="p-4 bg-red-500/10 border-b border-red-500/20 flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                    <RefreshCw size={16} className="animate-spin-slow" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">Nova Versão Disponível!</p>
                    <p className="text-xs text-muted-foreground mb-2">Uma nova atualização foi detectada. Atualize para ver as melhorias.</p>
                    <button
                      onClick={handleUpdate}
                      className="text-xs font-bold bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Atualizar Agora
                    </button>
                  </div>
                </div>
              )}

              {notifications.length === 0 && !hasUpdate ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma notificação por enquanto.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer relative ${!notification.is_read ? 'bg-primary/5' : ''}`}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      {!notification.is_read && (
                        <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full" />
                      )}
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 shrink-0">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${!notification.is_read ? 'font-bold' : 'font-medium'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {new Date(notification.date).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
