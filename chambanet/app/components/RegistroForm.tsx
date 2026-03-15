"use client";

import { FormEvent, useMemo, useState } from 'react';
import { communes } from '@clregions/data/array/communes';
import { provinces } from '@clregions/data/array/provinces';
import { regions } from '@clregions/data/array/regions';

export default function RegistroForm() {
  const [rut, setRut] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [regionId, setRegionId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const regionOptions = useMemo(
    () => [...regions].sort((a, b) => a.name.localeCompare(b.name, 'es-CL')),
    []
  );

  const provinceIdsByRegion = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const province of provinces) {
      if (!map.has(province.regionId)) {
        map.set(province.regionId, new Set<string>());
      }

      map.get(province.regionId)?.add(province.id);
    }

    return map;
  }, []);

  const communeOptions = useMemo(() => {
    if (!regionId) {
      return [] as typeof communes;
    }

    const validProvinceIds = provinceIdsByRegion.get(regionId);
    if (!validProvinceIds) {
      return [] as typeof communes;
    }

    return communes
      .filter((commune) => validProvinceIds.has(commune.provinceId))
      .sort((a, b) => a.name.localeCompare(b.name, 'es-CL'));
  }, [provinceIdsByRegion, regionId]);

  const handleRegionChange = (nextRegionId: string) => {
    setRegionId(nextRegionId);
    setCommuneId('');
  };

  const selectedRegion = useMemo(
    () => regionOptions.find((region) => region.id === regionId) || null,
    [regionId, regionOptions]
  );

  const selectedCommune = useMemo(
    () => communeOptions.find((commune) => commune.id === communeId) || null,
    [communeId, communeOptions]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 8) {
      setErrorMsg('La contraseña debe contener al menos 8 caracteres.');
      return;
    }

    if (password !== repeatPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (!selectedRegion || !selectedCommune) {
      setErrorMsg('Debes seleccionar región y comuna.');
      return;
    }

    if (!acceptTerms) {
      setErrorMsg('Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut,
          email,
          password,
          nombres,
          apellidoPaterno,
          apellidoMaterno,
          telefono,
          fechaNacimiento,
          direccion: {
            calle,
            numero,
            regionId: selectedRegion.id,
            regionNombre: selectedRegion.name,
            comunaId: selectedCommune.id,
            comunaNombre: selectedCommune.name,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo completar el registro.');
      }

      setSuccessMsg('Cuenta creada con éxito. Ahora puedes iniciar sesión.');
      setRut('');
      setNombres('');
      setApellidoPaterno('');
      setApellidoMaterno('');
      setFechaNacimiento('');
      setCalle('');
      setNumero('');
      setRegionId('');
      setCommuneId('');
      setEmail('');
      setTelefono('');
      setPassword('');
      setRepeatPassword('');
      setAcceptTerms(false);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Error inesperado al registrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4 text-sm" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input value={rut} onChange={(event) => setRut(event.target.value)} type="text" placeholder="R.U.N" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input value={nombres} onChange={(event) => setNombres(event.target.value)} type="text" placeholder="Nombres" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input value={apellidoPaterno} onChange={(event) => setApellidoPaterno(event.target.value)} type="text" placeholder="Apellido Paterno" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input value={apellidoMaterno} onChange={(event) => setApellidoMaterno(event.target.value)} type="text" placeholder="Apellido Materno" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      <input value={fechaNacimiento} onChange={(event) => setFechaNacimiento(event.target.value)} type="date" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input value={calle} onChange={(event) => setCalle(event.target.value)} type="text" placeholder="Calle" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input value={numero} onChange={(event) => setNumero(event.target.value)} type="text" placeholder="Número" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <select
          value={regionId}
          onChange={(event) => handleRegionChange(event.target.value)}
          className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Región</option>
          {regionOptions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>

        <select
          value={communeId}
          onChange={(event) => setCommuneId(event.target.value)}
          disabled={!regionId}
          className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <option value="">{regionId ? 'Comuna' : 'Selecciona una región'}</option>
          {communeOptions.map((commune) => (
            <option key={commune.id} value={commune.id}>
              {commune.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="e-Mail" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input value={telefono} onChange={(event) => setTelefono(event.target.value)} type="tel" placeholder="Teléfono" className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Contraseña" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} type="password" placeholder="Repetir contraseña" required className="liftable w-full rounded-lg border border-transparent bg-blue-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      <p className="text-xs text-blue-100">La contraseña debe contener mínimo 8 caracteres</p>

      <div className="mt-2 flex items-center gap-2">
        <input type="checkbox" id="terminos" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="accent-blue-600" />
        <label htmlFor="terminos" className="text-xs text-white">
          Confirmo haber leído los Términos y Condiciones
        </label>
      </div>

      {errorMsg ? <p className="text-xs font-semibold text-red-100">{errorMsg}</p> : null}
      {successMsg ? <p className="text-xs font-semibold text-white">{successMsg}</p> : null}

      <button type="submit" disabled={isSubmitting} className="liftable mx-auto mt-4 block rounded-full bg-white px-8 py-2.5 text-base font-extrabold text-gray-900 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-65">
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  );
}
