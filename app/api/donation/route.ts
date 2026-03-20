import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' });

export async function POST(req: Request) {
  try {
    const { amount, description } = await req.json();

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'donation',
            title: description || 'Doação para IA Bíblia',
            quantity: 1,
            unit_price: Number(amount),
          },
        ],
        // For monthly, we would need to use Mercado Pago Subscriptions API, 
        // which is more complex and requires a different approach.
        // For now, we'll simulate a one-time payment.
      },
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error('Mercado Pago error:', error);
    return NextResponse.json({ error: 'Failed to create preference' }, { status: 500 });
  }
}
