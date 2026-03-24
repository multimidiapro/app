'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { sendNotification } from '@/lib/db';

export function AdminNotificationPanel() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'update' | 'event' | 'admin' | 'info'>('info');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!title || !message) return;
    setSending(true);
    try {
      await sendNotification({ title, message, type });
      setTitle('');
      setMessage('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 bg-secondary/20 rounded-2xl border border-border flex flex-col gap-4">
      <h3 className="font-bold text-sm flex items-center gap-2">
        <Send size={16} className="text-primary" />
        Enviar Notificação Global
      </h3>
      
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        
        <textarea
          placeholder="Mensagem"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full p-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        
        <div className="flex gap-2">
          {(['info', 'update', 'event', 'admin'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                type === t 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-secondary text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        
        <button
          onClick={handleSend}
          disabled={sending || !title || !message}
          className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {success ? 'Enviado!' : 'Enviar Notificação'}
        </button>
      </div>
    </div>
  );
}
