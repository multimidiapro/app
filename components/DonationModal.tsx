'use client';
import { useState } from 'react';
import { X, Heart } from 'lucide-react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

// Initialize Mercado Pago
if (process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY) {
  initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY);
}

export function DonationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [paymentReady, setPaymentReady] = useState(false);

  if (!isOpen) return null;

  const handleDonate = () => {
    if (!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY) {
      alert('Configuração de pagamento ausente. Por favor, contate o suporte.');
      return;
    }
    if (amount) {
      setPaymentReady(true);
    }
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
        
        {!paymentReady ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Sua contribuição ajuda a manter o aplicativo funcionando.
            </p>
            <div className="mb-6">
              <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="0,00"
              />
            </div>
            <button
              onClick={handleDonate}
              disabled={!amount}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              Continuar para pagamento
            </button>
          </>
        ) : (
          <Payment
            initialization={{ amount: Number(amount) }}
            customization={{ paymentMethods: { creditCard: 'all', ticket: 'all' } }}
            onSubmit={async (param) => {
              // Here you would call your backend to process the payment
              console.log('Payment data:', param);
              alert('Pagamento processado (simulado)');
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
