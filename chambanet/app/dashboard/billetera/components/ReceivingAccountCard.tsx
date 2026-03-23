'use client';

import { useEffect, useState } from 'react';

type Props = {
  isSupportAdmin: boolean;
};

type CuentaBancariaForm = {
  banco: string;
  tipoCuenta: '' | 'RUT' | 'CORRIENTE' | 'VISTA' | 'AHORRO';
  numeroCuenta: string;
  titularNombre: string;
  titularRut: string;
  emailPago: string;
};

const EMPTY_FORM: CuentaBancariaForm = {
  banco: '',
  tipoCuenta: '',
  numeroCuenta: '',
  titularNombre: '',
  titularRut: '',
  emailPago: '',
};

export default function ReceivingAccountCard({ isSupportAdmin }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState('');
  const [form, setForm] = useState<CuentaBancariaForm>(EMPTY_FORM);

  const loadCuenta = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/usuarios/cuenta-bancaria', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar la cuenta bancaria.');

      setForm({
        banco: data?.cuentaBancaria?.banco || '',
        tipoCuenta: data?.cuentaBancaria?.tipoCuenta || '',
        numeroCuenta: data?.cuentaBancaria?.numeroCuenta || '',
        titularNombre: data?.cuentaBancaria?.titularNombre || '',
        titularRut: data?.cuentaBancaria?.titularRut || '',
        emailPago: data?.cuentaBancaria?.emailPago || '',
      });

      const hasExisting = !!data?.cuentaBancaria?.numeroCuenta;
      setIsEditing(!hasExisting);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando cuenta bancaria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCuenta();
  }, []);

  const onChange = (field: keyof CuentaBancariaForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSave = async () => {
    setError(null);
    setSuccess(null);

    if (
      !form.banco.trim() ||
      !form.tipoCuenta ||
      !form.numeroCuenta.trim() ||
      !form.titularNombre.trim() ||
      !form.titularRut.trim()
    ) {
      setError('Completa todos los campos bancarios obligatorios.');
      return;
    }

    if (isSupportAdmin && !adminSecret.trim()) {
      setError('Debes ingresar la contraseña secreta para guardar esta cuenta.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/usuarios/cuenta-bancaria', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          clave_secreta_admin: isSupportAdmin ? adminSecret.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar la cuenta bancaria.');

      setSuccess('Cuenta bancaria de recepción actualizada.');
      setIsEditing(false);
      await loadCuenta();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error guardando cuenta bancaria.');
    } finally {
      setSaving(false);
    }
  };

  const maskAccountNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.length <= 4) return `****${trimmed}`;
    return `${'*'.repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
  };

  const onCancelEdit = async () => {
    setError(null);
    setSuccess(null);
    setAdminSecret('');
    await loadCuenta();
  };

  return (
    <section className="rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Cuenta para recibir pagos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Aquí se depositan tus pagos liberados y transferencias de la plataforma.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      {success ? (
        <p className="mt-3 rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-700">{success}</p>
      ) : null}

      {!isEditing ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Banco</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{form.banco || '-'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Tipo de cuenta</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{form.tipoCuenta || '-'}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Número de cuenta</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {maskAccountNumber(form.numeroCuenta) || '-'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Titular</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{form.titularNombre || '-'}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">RUT titular</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{form.titularRut || '-'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Correo de pagos</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{form.emailPago || '-'}</p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={loading || saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              Editar cuenta de recepción
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">
              Banco
              <input
                value={form.banco}
                onChange={(e) => onChange('banco', e.target.value)}
                disabled={loading || saving}
                placeholder="Ej: Mercado Pago"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700">
              Tipo de cuenta
              <select
                value={form.tipoCuenta}
                onChange={(e) => onChange('tipoCuenta', e.target.value)}
                disabled={loading || saving}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Selecciona tipo</option>
                <option value="RUT">Cuenta RUT</option>
                <option value="CORRIENTE">Cuenta Corriente</option>
                <option value="VISTA">Cuenta Vista</option>
                <option value="AHORRO">Cuenta Ahorro</option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">
              Número de cuenta
              <input
                value={form.numeroCuenta}
                onChange={(e) => onChange('numeroCuenta', e.target.value)}
                disabled={loading || saving}
                placeholder="Ej: 1070141677"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700">
              Titular
              <input
                value={form.titularNombre}
                onChange={(e) => onChange('titularNombre', e.target.value)}
                disabled={loading || saving}
                placeholder="Nombre completo titular"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">
              RUT titular
              <input
                value={form.titularRut}
                onChange={(e) => onChange('titularRut', e.target.value)}
                disabled={loading || saving}
                placeholder="Debe coincidir con tu RUT"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700">
              Correo de pagos
              <input
                value={form.emailPago}
                onChange={(e) => onChange('emailPago', e.target.value)}
                disabled={loading || saving}
                type="email"
                placeholder="correo@dominio.cl"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {isSupportAdmin ? (
            <div className="mt-3 grid gap-3">
              <label className="text-sm font-semibold text-gray-700">
                Contraseña secreta administrador
                <input
                  type="password"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  disabled={loading || saving}
                  placeholder="Requerida para guardar"
                  className="mt-1 w-full rounded-lg border border-red-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={loading || saving}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={loading || saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cuenta de recepción'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
