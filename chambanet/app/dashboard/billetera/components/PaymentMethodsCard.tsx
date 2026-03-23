'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';

type PaymentMethodType = 'CARD' | 'BANK';

type PaymentMethod = {
  id: string;
  type: PaymentMethodType;
  alias: string;
  masked: string;
  holder: string;
  isDefault: boolean;
  status: 'ACTIVO' | 'PENDIENTE';
};

type MercadoPagoCardTokenResponse = {
  id?: string;
};

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string }
    ) => {
      createCardToken: (payload: {
        cardNumber: string;
        cardholderName: string;
        cardExpirationMonth: string;
        cardExpirationYear: string;
        securityCode: string;
        identificationType: string;
        identificationNumber: string;
      }) => Promise<MercadoPagoCardTokenResponse>;
    };
  }
}

export default function PaymentMethodsCard() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [type, setType] = useState<PaymentMethodType>('CARD');
  const [alias, setAlias] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [docType, setDocType] = useState('RUT');
  const [docNumber, setDocNumber] = useState('');

  const loadMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pagos/metodos', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar metodos.');

      const mapped = (data.methods || []).map((m: {
        id: string;
        tipo: PaymentMethodType;
        alias: string;
        masked: string;
        holder: string;
        es_principal: boolean;
        estado: 'ACTIVO' | 'PENDIENTE';
      }) => ({
        id: m.id,
        type: m.tipo,
        alias: m.alias,
        masked: m.masked,
        holder: m.holder,
        isDefault: m.es_principal,
        status: m.estado,
      })) as PaymentMethod[];

      setMethods(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando metodos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const defaultMethod = useMemo(
    () => methods.find((m) => m.isDefault) || null,
    [methods]
  );

  const setDefault = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pagos/metodos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-default' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar metodo.');
      await loadMethods();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error actualizando metodo.');
    } finally {
      setSaving(false);
    }
  };

  const removeMethod = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pagos/metodos/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar metodo.');
      await loadMethods();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error eliminando metodo.');
    } finally {
      setSaving(false);
    }
  };

  const addMethod = async () => {
    if (!alias.trim()) return;

    if (type !== 'CARD') {
      setError('Por ahora solo se admite tarjeta via tokenizacion de Mercado Pago.');
      return;
    }

    if (
      !cardNumber.trim() ||
      !holder.trim() ||
      !expMonth.trim() ||
      !expYear.trim() ||
      !cvc.trim() ||
      !docType.trim() ||
      !docNumber.trim()
    ) {
      setError('Completa todos los datos de tarjeta para tokenizar con Mercado Pago.');
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
    if (!publicKey) {
      setError('Falta NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY en el entorno.');
      return;
    }

    if (!window.MercadoPago) {
      setError('El SDK de Mercado Pago aun no esta listo.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const mp = new window.MercadoPago(publicKey, { locale: 'es-CL' });
      const tokenResponse = await mp.createCardToken({
        cardNumber: cardNumber.replace(/\s+/g, ''),
        cardholderName: holder.trim(),
        cardExpirationMonth: expMonth.trim(),
        cardExpirationYear: expYear.trim(),
        securityCode: cvc.trim(),
        identificationType: docType.trim(),
        identificationNumber: docNumber.trim(),
      });

      if (!tokenResponse?.id) {
        throw new Error('No se pudo tokenizar la tarjeta con Mercado Pago.');
      }

      const res = await fetch('/api/pagos/metodos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: type,
          alias: alias.trim(),
          token: tokenResponse.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear metodo.');

      setAlias('');
      setCardNumber('');
      setHolder('');
      setExpMonth('');
      setExpYear('');
      setCvc('');
      setDocType('RUT');
      setDocNumber('');
      setType('CARD');
      setOpen(false);
      await loadMethods();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error guardando metodo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Metodos de pago</h2>
          <p className="mt-1 text-sm text-gray-600">
            Administra tus medios para pagar chambas y recibir transferencias.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={loading || saving || !sdkReady}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          {sdkReady ? 'Administrar metodos' : 'Cargando Mercado Pago...'}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Principal</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">
            {defaultMethod ? defaultMethod.alias : 'Sin metodo principal'}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {defaultMethod ? defaultMethod.masked : 'Agrega un metodo para operar.'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Estado</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">
            {methods.some((m) => m.status === 'ACTIVO') ? 'Activo' : 'Pendiente'}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Tus pagos y reembolsos se reflejan automaticamente en el historial.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? <p className="text-sm text-gray-600">Cargando metodos...</p> : null}
        {methods.map((m) => (
          <div
            key={m.id}
            className="flex flex-col gap-2 rounded-lg border border-gray-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {m.alias} {m.isDefault ? '(Principal)' : ''}
              </p>
              <p className="text-xs text-gray-600">{m.masked} • {m.holder}</p>
            </div>
            <div className="flex items-center gap-2">
              {!m.isDefault ? (
                <button
                  type="button"
                  onClick={() => setDefault(m.id)}
                  disabled={saving}
                  className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                >
                  Marcar principal
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => removeMethod(m.id)}
                disabled={saving}
                className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-blue-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">Agregar metodo de pago</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-gray-100 px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700">
                Tipo
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PaymentMethodType)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="CARD">Tarjeta</option>
                  <option value="BANK" disabled>
                    Cuenta bancaria (proximamente)
                  </option>
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Alias
                <input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Ej: Visa Empresa"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700">
                Numero de tarjeta
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="5031 4332 1540 6351"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Titular
                <input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Nombre titular"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-semibold text-gray-700">
                Mes
                <input
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                  placeholder="11"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Año
                <input
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  placeholder="30"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                CVV
                <input
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700">
                Tipo documento
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="RUT">RUT</option>
                  <option value="DNI">DNI</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Numero documento
                <input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="12345678-9"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addMethod}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                {saving ? 'Guardando...' : 'Guardar metodo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
