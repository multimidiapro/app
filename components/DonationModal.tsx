'use client';
import { useState } from 'react';
import { X, Heart } from 'lucide-react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { useAuth } from '@/hooks/useAuth';

// Initialize Mercado Pago
if (process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY) {
  initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY);
}

export function DonationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'once' | 'monthly'>('once');
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
              Sua contribuição ajuda a manter o aplicativo funcionando. Escolha o valor e a frequência.
            </p>
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="0,00"
              />
            </div>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFrequency('once')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg ${frequency === 'once' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
              >
                Uma vez
              </button>
              <button
                onClick={() => setFrequency('monthly')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg ${frequency === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
              >
                Mensal
              </button>
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
            customization={{ 
              paymentMethods: { creditCard: 'all', bankTransfer: 'all' },
              visual: {
                style: {
                  theme: 'dark'
                }
              }
            }}
            onSubmit={async (param) => {
              try {
                const response = await fetch('/api/process-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    paymentData: param, 
                    userId: user?.id 
                  }),
                });
                const data = await response.json();
                if (data.status === 'approved') {
                  alert('Pagamento aprovado! Obrigado por contribuir.');
                } else {
                  alert('Pagamento processado. Status: ' + data.status);
                }
              } catch (error) {
                console.error('Payment error:', error);
                alert('Erro ao processar pagamento.');
              }
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
