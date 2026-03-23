'use client';

import { useMemo, useState } from 'react';

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

const seedMethods: PaymentMethod[] = [
  {
    id: 'pm_card_001',
    type: 'CARD',
    alias: 'Visa Personal',
    masked: '**** **** **** 4242',
    holder: 'Titular principal',
    isDefault: true,
    status: 'ACTIVO',
  },
  {
    id: 'pm_bank_001',
    type: 'BANK',
    alias: 'Cuenta Banco Chile',
    masked: '****7890',
    holder: 'Titular principal',
    isDefault: false,
    status: 'PENDIENTE',
  },
];

export default function PaymentMethodsCard() {
  const [methods, setMethods] = useState<PaymentMethod[]>(seedMethods);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PaymentMethodType>('CARD');
  const [alias, setAlias] = useState('');
  const [masked, setMasked] = useState('');
  const [holder, setHolder] = useState('');

  const defaultMethod = useMemo(
    () => methods.find((m) => m.isDefault) || null,
    [methods]
  );

  const setDefault = (id: string) => {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
  };

  const removeMethod = (id: string) => {
    setMethods((prev) => {
      const next = prev.filter((m) => m.id !== id);
      if (!next.some((m) => m.isDefault) && next[0]) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const addMethod = () => {
    if (!alias.trim() || !masked.trim() || !holder.trim()) return;

    const newMethod: PaymentMethod = {
      id: `pm_${Date.now()}`,
      type,
      alias: alias.trim(),
      masked: masked.trim(),
      holder: holder.trim(),
      isDefault: methods.length === 0,
      status: 'ACTIVO',
    };

    setMethods((prev) => [...prev, newMethod]);
    setAlias('');
    setMasked('');
    setHolder('');
    setType('CARD');
    setOpen(false);
  };

  return (
    <section className="rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm">
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
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          Administrar metodos
        </button>
      </div>

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
                  className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                >
                  Marcar principal
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => removeMethod(m.id)}
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
                  <option value="BANK">Cuenta bancaria</option>
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
                Numero enmascarado
                <input
                  value={masked}
                  onChange={(e) => setMasked(e.target.value)}
                  placeholder="**** **** **** 1234"
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
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Guardar metodo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
