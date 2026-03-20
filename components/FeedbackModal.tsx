'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

export function FeedbackModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    const whatsappUrl = `https://wa.me/5562994581066?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <header className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Sugestões ou Bugs</h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
            <X size={20} />
          </button>
        </header>
        <p className="text-sm text-muted-foreground mb-4">
          Viu algum bug ou deseja sugerir alguma melhoria? Envie sua mensagem, por exemplo, pode ser algo melhor que isso.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary mb-4"
          rows={4}
          placeholder="Escreva sua mensagem aqui..."
        />
        <button
          onClick={handleSend}
          className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          Enviar via WhatsApp
        </button>
      </div>
    </div>
  );
}
