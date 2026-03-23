import { randomUUID, createHash } from 'node:crypto';
import * as real from '@/lib/integrations/mercadopago/real';

const USE_REAL_MERCADOPAGO = process.env.USE_REAL_MERCADOPAGO === 'true';

type MercadoPagoPaymentStatus =
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'pending'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

export type MercadoPagoPayment = {
  id: number;
  status: MercadoPagoPaymentStatus;
  status_detail?: string;
  external_reference?: string;
  captured?: boolean;
  transaction_amount?: number;
  transaction_amount_refunded?: number;
  currency_id?: string;
};

type CreatePreferenceInput = {
  pagoId: string;
  chambaId: string;
  empleadorId: string;
  trabajadorId: string;
  montoBase: number;
  tarifaServicio: number;
  montoTotal: number;
  title: string;
  payerEmail?: string;
};

type MercadoPagoCard = {
  id: string;
  customer_id?: string;
  payment_method?: {
    id?: string;
    name?: string;
  };
  last_four_digits?: string;
  first_six_digits?: string;
  cardholder?: {
    name?: string;
  };
};

type MercadoPagoCustomer = {
  id: string;
  email: string;
};

type MercadoPagoRefundResponse = {
  id: number;
  payment_id: number;
  amount: number;
  status: string;
};

function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, '');
  return 'http://localhost:3000';
}

function hashToPositiveInt(value: string): number {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 8);
  return Math.max(1, parseInt(hex, 16));
}

function createMockPreference(input: CreatePreferenceInput) {
  const id = `mock_pref_${randomUUID()}`;
  const baseUrl = getAppBaseUrl();

  return {
    id,
    checkoutUrl: `${baseUrl}/dashboard?panel=pagos&mock_checkout=1&pago_id=${input.pagoId}`,
    sandboxCheckoutUrl: `${baseUrl}/dashboard?panel=pagos&mock_checkout=1&mode=sandbox&pago_id=${input.pagoId}`,
  };
}

export function getMercadoPagoPublicKey(): string {
  if (USE_REAL_MERCADOPAGO) {
    return real.getMercadoPagoPublicKey();
  }
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || 'TEST-MOCK-PUBLIC-KEY';
}

export async function createMercadoPagoPreference(
  input: CreatePreferenceInput
): Promise<{ id: string; checkoutUrl: string; sandboxCheckoutUrl?: string }> {
  if (USE_REAL_MERCADOPAGO) {
    return real.createMercadoPagoPreference(input);
  }
  return createMockPreference(input);
}

export async function findMercadoPagoCustomerByEmail(email: string): Promise<MercadoPagoCustomer | null> {
  if (USE_REAL_MERCADOPAGO) {
    return real.findMercadoPagoCustomerByEmail(email);
  }
  return { id: `mock_cus_${hashToPositiveInt(email)}`, email };
}

export async function createMercadoPagoCustomer(email: string): Promise<MercadoPagoCustomer> {
  if (USE_REAL_MERCADOPAGO) {
    return real.createMercadoPagoCustomer(email);
  }
  return { id: `mock_cus_${hashToPositiveInt(email)}_${randomUUID().slice(0, 8)}`, email };
}

export async function getOrCreateMercadoPagoCustomer(email: string): Promise<MercadoPagoCustomer> {
  if (USE_REAL_MERCADOPAGO) {
    return real.getOrCreateMercadoPagoCustomer(email);
  }
  return { id: `mock_cus_${hashToPositiveInt(email)}`, email };
}

export async function createMercadoPagoCard(
  customerId: string,
  token: string
): Promise<MercadoPagoCard> {
  if (USE_REAL_MERCADOPAGO) {
    return real.createMercadoPagoCard(customerId, token);
  }

  const digits = token.replace(/\D/g, '');
  const last4 = digits.slice(-4) || '4242';

  return {
    id: `mock_card_${randomUUID().slice(0, 12)}`,
    customer_id: customerId,
    payment_method: {
      id: 'visa',
      name: 'Visa',
    },
    last_four_digits: last4,
    first_six_digits: '411111',
    cardholder: {
      name: 'Titular Mock',
    },
  };
}

export async function deleteMercadoPagoCard(customerId: string, cardId: string): Promise<void> {
  if (USE_REAL_MERCADOPAGO) {
    return real.deleteMercadoPagoCard(customerId, cardId);
  }
}

export async function getMercadoPagoPayment(paymentId: string | number): Promise<MercadoPagoPayment> {
  if (USE_REAL_MERCADOPAGO) {
    return real.getMercadoPagoPayment(paymentId);
  }

  const id = Number(String(paymentId).replace(/\D/g, '')) || hashToPositiveInt(String(paymentId));
  return {
    id,
    status: 'approved',
    status_detail: 'accredited',
    captured: true,
    currency_id: 'CLP',
  };
}

export async function findMercadoPagoPaymentByExternalReference(
  externalReference: string
): Promise<MercadoPagoPayment | null> {
  if (USE_REAL_MERCADOPAGO) {
    return real.findMercadoPagoPaymentByExternalReference(externalReference);
  }

  return {
    id: hashToPositiveInt(externalReference),
    status: 'approved',
    external_reference: externalReference,
    captured: true,
    currency_id: 'CLP',
  };
}

export async function captureMercadoPagoPayment(
  paymentId: string | number
): Promise<MercadoPagoPayment> {
  if (USE_REAL_MERCADOPAGO) {
    return real.captureMercadoPagoPayment(paymentId);
  }

  const id = Number(String(paymentId).replace(/\D/g, '')) || hashToPositiveInt(String(paymentId));
  return {
    id,
    status: 'approved',
    status_detail: 'accredited',
    captured: true,
    currency_id: 'CLP',
  };
}

export async function refundMercadoPagoPayment(
  paymentId: string | number,
  amount: number
): Promise<MercadoPagoRefundResponse> {
  if (USE_REAL_MERCADOPAGO) {
    return real.refundMercadoPagoPayment(paymentId, amount);
  }

  const id = Number(String(paymentId).replace(/\D/g, '')) || hashToPositiveInt(String(paymentId));
  return {
    id: hashToPositiveInt(`${id}:${amount}:${Date.now()}`),
    payment_id: id,
    amount: Number(amount.toFixed(2)),
    status: 'approved',
  };
}

export function verifyMercadoPagoWebhookSignature(params: {
  xSignatureHeader: string | null;
  xRequestIdHeader: string | null;
  dataId: string | null;
}): boolean {
  if (USE_REAL_MERCADOPAGO) {
    return real.verifyMercadoPagoWebhookSignature(params);
  }
  return true;
}
