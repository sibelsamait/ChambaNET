'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { communes } from '@clregions/data/array/communes';
import { provinces } from '@clregions/data/array/provinces';
import { regions } from '@clregions/data/array/regions';
import Avatar from './Avatar';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('No se pudo previsualizar la imagen.'));
    };

    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo seleccionado.'));
    };

    reader.readAsDataURL(file);
  });
}

interface ActiveProfileViewProps {
  fullName: string;
  ratingText: string;
  initialImageUrl?: string | null;
  rut?: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  memberSince?: string | null;
  direccion: {
    calle: string;
    numero: string;
    comunaNombre: string;
    regionNombre: string;
    comunaId?: string;
    regionId?: string;
  };
  valoraciones: {
    estrellas: number;
    comentario: string | null;
    emisorNombre: string;
  }[];
  activePosts: number;
  completedPosts: number;
}

interface ProfileFormState {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  calle: string;
  numero: string;
  comunaNombre: string;
  regionNombre: string;
  comunaId: string;
  regionId: string;
}

function formatDateHuman(rawValue?: string | null) {
  if (!rawValue) return 'Aún no registrada';
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return 'Aún no registrada';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function toDateInputValue(rawValue?: string | null) {
  if (!rawValue) return '';
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function normalizeText(value?: string | null) {
  return (value || '').trim().toLocaleLowerCase('es-CL');
}

function resolveRegionId(rawRegionId?: string, rawRegionName?: string) {
  if (rawRegionId) return rawRegionId;
  const regionByName = regions.find((region) => normalizeText(region.name) === normalizeText(rawRegionName));
  return regionByName?.id ?? '';
}

function resolveRegionName(regionId?: string, fallback?: string) {
  if (!regionId) return fallback || '';
  const region = regions.find((item) => item.id === regionId);
  return region?.name ?? fallback ?? '';
}

function getCommuneOptionsByRegionId(regionId?: string) {
  if (!regionId) return [] as typeof communes;
  const normalizedRegionId = String(regionId);
  const provinceIds = new Set<string>(
    provinces
      .filter((province) => String(province.regionId) === normalizedRegionId)
      .map((province) => String(province.id))
  );
  return communes
    .filter((commune) => provinceIds.has(String(commune.provinceId)))
    .sort((a, b) => a.name.localeCompare(b.name, 'es-CL'));
}

function resolveCommuneId(rawCommuneId: string | undefined, rawCommuneName: string | undefined, regionId: string) {
  if (rawCommuneId) return rawCommuneId;
  const communeByName = getCommuneOptionsByRegionId(regionId).find(
    (commune) => normalizeText(commune.name) === normalizeText(rawCommuneName)
  );
  return communeByName?.id ?? '';
}

function resolveCommuneName(communeId?: string, fallback?: string) {
  if (!communeId) return fallback || '';
  const commune = communes.find((item) => item.id === communeId);
  return commune?.name ?? fallback ?? '';
}

export default function ActiveProfileView({
  fullName,
  ratingText,
  initialImageUrl,
  rut,
  nombres,
  apellidoPaterno,
  apellidoMaterno,
  email,
  telefono,
  fechaNacimiento,
  memberSince,
  direccion,
  valoraciones,
  activePosts,
  completedPosts,
}: ActiveProfileViewProps) {
  const router = useRouter();
  const initialRegionId = resolveRegionId(direccion.regionId, direccion.regionNombre);
  const initialCommuneId = resolveCommuneId(direccion.comunaId, direccion.comunaNombre, initialRegionId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileFormState>({
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    email,
    telefono: telefono ?? '',
    fechaNacimiento: toDateInputValue(fechaNacimiento),
    calle: direccion.calle,
    numero: direccion.numero,
    comunaNombre: resolveCommuneName(initialCommuneId, direccion.comunaNombre),
    regionNombre: resolveRegionName(initialRegionId, direccion.regionNombre),
    comunaId: initialCommuneId,
    regionId: initialRegionId,
  });
  const [editForm, setEditForm] = useState<ProfileFormState>(profileData);
  const currentFullName =
    `${profileData.nombres} ${profileData.apellidoPaterno} ${profileData.apellidoMaterno}`
      .replace(/\s+/g, ' ')
      .trim() || fullName;

  const profileFields = useMemo(
    () => [
      { label: 'Fecha de nacimiento', value: formatDateHuman(profileData.fechaNacimiento) },
      { label: 'Miembro desde', value: formatDateHuman(memberSince) },
      { label: 'Correo electrónico', value: profileData.email || 'Aún no registrado' },
      { label: 'Teléfono', value: profileData.telefono || 'Aún no registrado' },
      { label: 'Calle', value: profileData.calle || 'Aún no registrada' },
      { label: 'Número', value: profileData.numero || 'Aún no registrado' },
      { label: 'Comuna', value: profileData.comunaNombre || 'Aún no registrada' },
      { label: 'Región', value: profileData.regionNombre || 'Aún no registrada' },
    ],
    [memberSince, profileData]
  );

  const regionOptions = useMemo(
    () => [...regions].sort((a, b) => a.name.localeCompare(b.name, 'es-CL')),
    []
  );

  const communeOptions = useMemo(
    () => getCommuneOptionsByRegionId(editForm.regionId),
    [editForm.regionId]
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!file) {
      setSelectedFile(null);
      setCurrentImageUrl(savedImageUrl);
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      event.target.value = '';
      setSelectedFile(null);
      setCurrentImageUrl(savedImageUrl);
      setErrorMsg('Formato no permitido. Usa PNG, JPEG o WEBP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      event.target.value = '';
      setSelectedFile(null);
      setCurrentImageUrl(savedImageUrl);
      setErrorMsg('La imagen supera el tamaño máximo de 2MB.');
      return;
    }

    try {
      const previewUrl = await readFileAsDataUrl(file);
      setSelectedFile(file);
      setCurrentImageUrl(previewUrl);
    } catch (error: unknown) {
      event.target.value = '';
      setSelectedFile(null);
      setCurrentImageUrl(savedImageUrl);
      setErrorMsg(error instanceof Error ? error.message : 'No se pudo leer la imagen seleccionada.');
    }
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedFile(null);
    setCurrentImageUrl(savedImageUrl);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMsg('Selecciona una imagen antes de actualizar tu foto.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/usuarios/imagen', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo actualizar la foto de perfil.');
      }

      setSavedImageUrl(currentImageUrl);
      setSelectedFile(null);
      setSuccessMsg('Foto de perfil actualizada.');
      router.refresh();
    } catch (error: unknown) {
      setCurrentImageUrl(savedImageUrl);
      setErrorMsg(
        error instanceof Error ? error.message : 'No se pudo actualizar la foto de perfil.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!savedImageUrl) {
      setErrorMsg('No tienes una imagen cargada para eliminar.');
      return;
    }

    setIsDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/usuarios/imagen', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo eliminar la foto de perfil.');
      }

      setSavedImageUrl(null);
      setCurrentImageUrl(null);
      setSelectedFile(null);
      setSuccessMsg('Foto de perfil eliminada.');
      router.refresh();
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error ? error.message : 'No se pudo eliminar la foto de perfil.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditForm(profileData);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditForm(profileData);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleEditFieldChange = (
    field: keyof ProfileFormState,
    value: string
  ) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegionChange = (regionId: string) => {
    const selectedRegion = regionOptions.find((region) => region.id === regionId);
    setEditForm((prev) => ({
      ...prev,
      regionId,
      regionNombre: selectedRegion?.name ?? '',
      comunaId: '',
      comunaNombre: '',
    }));
  };

  const handleCommuneChange = (communeId: string) => {
    const selectedCommune = communeOptions.find((commune) => commune.id === communeId);
    setEditForm((prev) => ({
      ...prev,
      comunaId: communeId,
      comunaNombre: selectedCommune?.name ?? '',
    }));
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editForm.regionId || !editForm.comunaId) {
      setErrorMsg('Debes seleccionar una región y una comuna válidas.');
      return;
    }

    setIsSavingProfile(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/usuarios/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombres: editForm.nombres,
          apellidoPaterno: editForm.apellidoPaterno,
          apellidoMaterno: editForm.apellidoMaterno,
          email: editForm.email,
          telefono: editForm.telefono,
          fechaNacimiento: editForm.fechaNacimiento,
          direccion: {
            calle: editForm.calle,
            numero: editForm.numero,
            regionId: editForm.regionId,
            regionNombre: editForm.regionNombre,
            comunaId: editForm.comunaId,
            comunaNombre: editForm.comunaNombre,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo actualizar el perfil.');
      }

      setProfileData(editForm);
      setSuccessMsg('Información de perfil actualizada.');
      setIsEditModalOpen(false);
      router.refresh();
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <>
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={handleCloseEditModal}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(30,64,175,0.40)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-t-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-5 text-gray-900">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold text-black">Editar información</h3>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    Actualiza los datos de tu perfil registrados en la plataforma.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-black/10 hover:text-gray-700"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={editForm.nombres}
                    onChange={(event) => handleEditFieldChange('nombres', event.target.value)}
                    placeholder="Nombres"
                    required
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400"
                  />
                  <input
                    value={editForm.apellidoPaterno}
                    onChange={(event) => handleEditFieldChange('apellidoPaterno', event.target.value)}
                    placeholder="Apellido paterno"
                    required
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={editForm.apellidoMaterno}
                    onChange={(event) => handleEditFieldChange('apellidoMaterno', event.target.value)}
                    placeholder="Apellido materno"
                    required
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400"
                  />
                  <input
                    type="date"
                    value={editForm.fechaNacimiento}
                    onChange={(event) => handleEditFieldChange('fechaNacimiento', event.target.value)}
                    required
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(event) => handleEditFieldChange('email', event.target.value)}
                    placeholder="Correo electrónico"
                    required
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400"
                  />
                  <input
                    type="tel"
                    value={editForm.telefono}
                    onChange={(event) => handleEditFieldChange('telefono', event.target.value)}
                    placeholder="Teléfono"
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={editForm.calle}
                    onChange={(event) => handleEditFieldChange('calle', event.target.value)}
                    placeholder="Calle"
                    required
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400"
                  />
                  <input
                    value={editForm.numero}
                    onChange={(event) => handleEditFieldChange('numero', event.target.value)}
                    placeholder="Número"
                    required
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={editForm.regionId}
                    onChange={(event) => handleRegionChange(event.target.value)}
                    required
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400"
                  >
                    <option value="">Selecciona una región</option>
                    {regionOptions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={editForm.comunaId}
                    onChange={(event) => handleCommuneChange(event.target.value)}
                    disabled={!editForm.regionId}
                    required
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">
                      {editForm.regionId ? 'Selecciona una comuna' : 'Primero elige una región'}
                    </option>
                    {communeOptions.map((commune) => (
                      <option key={commune.id} value={commune.id}>
                        {commune.name}
                      </option>
                    ))}
                  </select>
                </div>

                {errorMsg ? <p className="text-xs font-semibold text-red-600">{errorMsg}</p> : null}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="liftable flex-1 rounded-xl border border-gray-300 bg-white p-3 text-center text-sm font-extrabold text-gray-700 transition hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="liftable flex-1 rounded-xl bg-blue-500 p-3 text-center text-sm font-extrabold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={handleCloseImageModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(30,64,175,0.40)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-t-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-5 text-gray-900">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold text-black">Editar imagen de perfil</h3>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    Sube una nueva foto o elimina la imagen actual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseImageModal}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-black/10 hover:text-gray-700"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col items-center gap-4">
                <Avatar
                  imageUrl={currentImageUrl}
                  name={currentFullName}
                  alt="Vista previa de la foto de perfil"
                  className="h-28 w-28 rounded-full border-4 border-blue-200 object-cover"
                  fallbackClassName="text-3xl"
                />

                <form onSubmit={handleSubmit} className="w-full space-y-3">
                  <input
                    type="file"
                    name="image"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-gray-600 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:font-semibold file:text-blue-800"
                  />
                  <p className="text-[11px] text-gray-600">
                    Formatos permitidos: PNG, JPEG o WEBP. Tamaño máximo: 2MB.
                  </p>
                  {errorMsg ? <p className="text-xs font-semibold text-red-600">{errorMsg}</p> : null}
                  {successMsg ? <p className="text-xs font-semibold text-green-700">{successMsg}</p> : null}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={!selectedFile || isUploading || isDeleting}
                      className="liftable flex-1 rounded-xl bg-blue-500 p-3 text-center text-sm font-extrabold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                    >
                      {isUploading ? 'Subiendo...' : 'Subir archivo'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteImage}
                      disabled={!savedImageUrl || isUploading || isDeleting}
                      className="liftable flex-1 rounded-xl bg-red-500 p-3 text-center text-sm font-extrabold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar imagen'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="overflow-hidden rounded-[24px] border border-blue-200 bg-[#559ff6] shadow-[0_18px_44px_rgba(36,72,117,0.18)]">
          <div className="px-5 pt-5 sm:px-8 sm:pt-7">
            <div className="mb-4 flex items-center gap-3 text-white">
              <span className="text-2xl leading-none" aria-hidden="true">
                ←
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-[2.15rem]">Mi perfil</h1>
            </div>

            <div className="rounded-2xl bg-[#5ca5f7] px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
                  <div className="relative shrink-0">
                    <Avatar
                      imageUrl={currentImageUrl}
                      name={currentFullName}
                      alt="Foto del perfil activo"
                      className="h-24 w-24 rounded-full border-4 border-blue-200 object-cover sm:h-28 sm:w-28"
                      fallbackClassName="text-2xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setSelectedFile(null);
                        setCurrentImageUrl(savedImageUrl);
                        setIsImageModalOpen(true);
                      }}
                      className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#f0e3aa] text-xs shadow-md transition hover:bg-[#ecdfa0]"
                      aria-label="Editar imagen de perfil"
                      title="Editar imagen"
                    >
                      ✎
                    </button>
                  </div>

                  <div className="min-w-0 text-white">
                    {rut ? <p className="text-2xl font-extrabold leading-tight sm:text-3xl">{rut}</p> : null}
                    <p className="mt-1 text-lg font-bold sm:text-2xl">{currentFullName || 'Usuario'}</p>
                    <p className="text-base font-semibold text-white/90">Perfil activo</p>
                    <p className="mt-3 text-xs font-semibold text-white/85 sm:text-sm">
                      Toca el icono en la foto para actualizar tu imagen de perfil.
                    </p>
                  </div>
                </div>

                <div className="w-fit rounded-2xl bg-[#f0e3aa] px-4 py-2 text-black shadow-sm">
                  <p className="text-3xl font-extrabold leading-none sm:text-4xl">☆ {ratingText}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-x-6 gap-y-3 text-sm text-white sm:grid-cols-2 sm:text-base">
                {profileFields.map((field) => (
                  <p key={field.label}>
                    <span className="font-semibold text-white/90">{field.label}:</span>{' '}
                    <span className="font-medium">{field.value}</span>
                  </p>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-3 text-xs font-bold sm:text-sm">
                  <span className="rounded-full bg-white/20 px-3 py-1.5">Activas: {activePosts}</span>
                  <span className="rounded-full bg-white/20 px-3 py-1.5">Completadas: {completedPosts}</span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="liftable rounded-full bg-[#f0e3aa] px-5 py-2 text-sm font-bold text-gray-900 transition hover:bg-[#ecdfa0]"
                >
                  Editar información
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
            <h2 className="text-3xl font-extrabold text-white sm:text-[2.05rem]">Valoraciones</h2>

            <div className="mt-5 inline-flex rounded-2xl bg-[#f0e3aa] px-5 py-3 text-black">
              <p className="text-4xl font-extrabold leading-none">☆ {ratingText}</p>
            </div>

            <div className="mt-6 flex gap-4 overflow-x-auto pb-4 [scrollbar-color:#76b0fb_transparent] [scrollbar-width:thin]">
              {valoraciones.length === 0 ? (
                <p className="text-sm font-semibold text-blue-100">Aún no tienes valoraciones.</p>
              ) : (
                valoraciones.map((review, index) => (
                  <article
                    key={`${review.emisorNombre}-${index}`}
                    className="shrink-0 rounded-3xl bg-[#76b0fb] px-4 py-5 text-center text-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.20)] w-[150px] sm:w-[168px]"
                  >
                    <p className="text-4xl leading-none">🏅</p>
                    <p className="mt-2 text-lg font-black">{review.estrellas}</p>
                    <p className="mt-1 text-xs font-bold text-yellow-700">
                      {'★'.repeat(Math.max(0, Math.min(5, review.estrellas)))}
                      {'☆'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, review.estrellas))))}
                    </p>
                    <p className="mt-2 text-sm font-semibold italic leading-snug">
                      {review.comentario ? `“${review.comentario}”` : 'Sin comentario'}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{review.emisorNombre}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}