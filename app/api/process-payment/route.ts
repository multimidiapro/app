import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' });

export async function POST(req: Request) {
  try {
    const { paymentData, userId } = await req.json();
    console.log('Payment data received:', paymentData);
    
    const payment = new Payment(client);
    const result = await payment.create({
      body: {
        transaction_amount: Number(paymentData.amount),
        token: paymentData.token,
        description: 'Doação para IA Bíblia',
        payment_method_id: paymentData.paymentMethodId,
        payer: {
          email: paymentData.email,
        },
        metadata: {
          user_id: userId,
        }
      },
    });
    
    return NextResponse.json({ status: result.status });
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
