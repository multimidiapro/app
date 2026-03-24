'use client';
import { X, Heart, MessageCircle } from 'lucide-react';

export function DonationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {

  if (!isOpen) return null;

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("Olá! Tenho interesse em ofertar ou contribuir com o aplicativo iABiblia.");
    window.open(`https://wa.me/5562994581066?text=${message}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <header className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Heart size={20} className="text-red-500" />
            Contribuir
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
            <X size={20} />
          </button>
        </header>
        
        <p className="text-sm text-muted-foreground mb-6">
          Sua contribuição ajuda a manter o aplicativo funcionando. Clique abaixo para falar comigo pelo WhatsApp e realizar sua oferta. Ficarei feliz em orar por você!
        </p>
        
        <button
          onClick={handleWhatsAppClick}
          className="w-full py-3 bg-[#25D366] text-white rounded-lg font-medium hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle size={20} />
          Falar no WhatsApp
        </button>
      </div>
    </div>
  );
}
