import { createHmac, randomUUID } from 'node:crypto';

const MERCADOPAGO_API_URL = 'https://api.mercadopago.com';

type MercadoPagoPaymentStatus =
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'pending'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

type PreferenceItem = {
  title: string;
  quantity: number;
  currency_id: 'CLP';
  unit_price: number;
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

type MercadoPagoPreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

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

type MercadoPagoSearchResponse = {
  results?: MercadoPagoPayment[];
};

type MercadoPagoCustomer = {
  id: string;
  email: string;
};

type MercadoPagoCustomerSearchResponse = {
  results?: MercadoPagoCustomer[];
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

type MercadoPagoRefundResponse = {
  id: number;
  payment_id: number;
  amount: number;
  status: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export function getMercadoPagoPublicKey(): string {
  return requiredEnv('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY');
}

function getMercadoPagoAccessToken(): string {
  return requiredEnv('MERCADOPAGO_ACCESS_TOKEN');
}

function getMercadoPagoWebhookSecret(): string | null {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  return secret && secret.trim() ? secret.trim() : null;
}

function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, '');
  return 'http://localhost:3000';
}

/**
 * Crea una preferencia de Checkout Pro en Mercado Pago.
 * Se excluyen medios en efectivo para cumplir con "solo medios digitales".
 */
export async function createMercadoPagoPreference(
  input: CreatePreferenceInput
): Promise<{ id: string; checkoutUrl: string; sandboxCheckoutUrl?: string }> {
  const accessToken = getMercadoPagoAccessToken();
  const baseUrl = getAppBaseUrl();

  const item: PreferenceItem = {
    title: input.title,
    quantity: 1,
    currency_id: 'CLP',
    unit_price: Number(input.montoTotal.toFixed(2)),
  };

  const payload = {
    items: [item],
    marketplace_fee: Number(input.tarifaServicio.toFixed(2)),
    external_reference: input.pagoId,
    payer: input.payerEmail ? { email: input.payerEmail } : undefined,
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }],
      installments: 1,
    },
    back_urls: {
      success: `${baseUrl}/dashboard?panel=pagos&mp_status=success&pago_id=${input.pagoId}`,
      failure: `${baseUrl}/dashboard?panel=pagos&mp_status=failure&pago_id=${input.pagoId}`,
      pending: `${baseUrl}/dashboard?panel=pagos&mp_status=pending&pago_id=${input.pagoId}`,
    },
    auto_return: 'approved',
    metadata: {
      pago_id: input.pagoId,
      chamba_id: input.chambaId,
      empleador_id: input.empleadorId,
      trabajador_id: input.trabajadorId,
      monto_base: input.montoBase,
      tarifa_servicio: input.tarifaServicio,
      monto_total: input.montoTotal,
      integration: 'chambanet-nextjs',
    },
    statement_descriptor: 'CHAMBANET',
    binary_mode: true,
  };

  const response = await fetch(`${MERCADOPAGO_API_URL}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mercado Pago preferences error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as MercadoPagoPreferenceResponse;

  if (!data.id || !data.init_point) {
    throw new Error('Mercado Pago no devolvió una preferencia válida.');
  }

  return {
    id: data.id,
    checkoutUrl: data.init_point,
    sandboxCheckoutUrl: data.sandbox_init_point,
  };
}

async function mercadopagoRequest<T>(
  path: string,
  init?: RequestInit,
  idempotencyKey?: string
): Promise<T> {
  const accessToken = getMercadoPagoAccessToken();
  const headers = new Headers(init?.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Content-Type', 'application/json');
  if (idempotencyKey) {
    headers.set('X-Idempotency-Key', idempotencyKey);
  }

  const response = await fetch(`${MERCADOPAGO_API_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mercado Pago API error (${response.status}) at ${path}: ${text}`);
  }

  return (await response.json()) as T;
}

export async function findMercadoPagoCustomerByEmail(email: string): Promise<MercadoPagoCustomer | null> {
  const query = new URLSearchParams({ email, limit: '1' }).toString();
  const data = await mercadopagoRequest<MercadoPagoCustomerSearchResponse>(
    `/v1/customers/search?${query}`,
    { method: 'GET' }
  );
  return data.results?.[0] || null;
}

export async function createMercadoPagoCustomer(email: string): Promise<MercadoPagoCustomer> {
  return mercadopagoRequest<MercadoPagoCustomer>(
    '/v1/customers',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
    randomUUID()
  );
}

export async function getOrCreateMercadoPagoCustomer(email: string): Promise<MercadoPagoCustomer> {
  const existing = await findMercadoPagoCustomerByEmail(email);
  if (existing?.id) return existing;
  return createMercadoPagoCustomer(email);
}

export async function createMercadoPagoCard(
  customerId: string,
  token: string
): Promise<MercadoPagoCard> {
  return mercadopagoRequest<MercadoPagoCard>(
    `/v1/customers/${customerId}/cards`,
    {
      method: 'POST',
      body: JSON.stringify({ token }),
    },
    randomUUID()
  );
}

export async function deleteMercadoPagoCard(customerId: string, cardId: string): Promise<void> {
  await mercadopagoRequest<unknown>(
    `/v1/customers/${customerId}/cards/${cardId}`,
    {
      method: 'DELETE',
    },
    randomUUID()
  );
}

export async function getMercadoPagoPayment(paymentId: string | number): Promise<MercadoPagoPayment> {
  return mercadopagoRequest<MercadoPagoPayment>(`/v1/payments/${paymentId}`, {
    method: 'GET',
  });
}

export async function findMercadoPagoPaymentByExternalReference(
  externalReference: string
): Promise<MercadoPagoPayment | null> {
  const query = new URLSearchParams({
    external_reference: externalReference,
    sort: 'date_created',
    criteria: 'desc',
    limit: '1',
  }).toString();

  const data = await mercadopagoRequest<MercadoPagoSearchResponse>(
    `/v1/payments/search?${query}`,
    {
      method: 'GET',
    }
  );

  return data.results?.[0] || null;
}

export async function captureMercadoPagoPayment(
  paymentId: string | number
): Promise<MercadoPagoPayment> {
  return mercadopagoRequest<MercadoPagoPayment>(
    `/v1/payments/${paymentId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        capture: true,
      }),
    },
    randomUUID()
  );
}

export async function refundMercadoPagoPayment(
  paymentId: string | number,
  amount: number
): Promise<MercadoPagoRefundResponse> {
  return mercadopagoRequest<MercadoPagoRefundResponse>(
    `/v1/payments/${paymentId}/refunds`,
    {
      method: 'POST',
      body: JSON.stringify({
        amount: Number(amount.toFixed(2)),
      }),
    },
    randomUUID()
  );
}

/**
 * Validación opcional de firma para webhooks de Mercado Pago.
 * Si no hay secreto configurado, devuelve true para no bloquear ambientes locales.
 */
export function verifyMercadoPagoWebhookSignature(params: {
  xSignatureHeader: string | null;
  xRequestIdHeader: string | null;
  dataId: string | null;
}): boolean {
  const secret = getMercadoPagoWebhookSecret();
  if (!secret) return true;

  const signature = params.xSignatureHeader;
  const requestId = params.xRequestIdHeader;
  const dataId = params.dataId;

  if (!signature || !requestId || !dataId) return false;

  const parts = signature.split(',').map((p) => p.trim());
  const tsPart = parts.find((p) => p.startsWith('ts='));
  const v1Part = parts.find((p) => p.startsWith('v1='));

  if (!tsPart || !v1Part) return false;

  const ts = tsPart.slice(3);
  const hash = v1Part.slice(3);

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const expected = createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  return expected === hash;
}
