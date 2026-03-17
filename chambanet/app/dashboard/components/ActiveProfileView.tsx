'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  activePosts: number;
  completedPosts: number;
}

export default function ActiveProfileView({
  fullName,
  ratingText,
  initialImageUrl,
  rut,
  activePosts,
  completedPosts,
}: ActiveProfileViewProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  return (
    <>
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
                  name={fullName}
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

      <section className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
        <div className="overflow-hidden rounded-[28px] border border-blue-200 bg-[#f2f2f2] shadow-[0_18px_44px_rgba(36,72,117,0.18)]">
          <div className="bg-[#559ff6] px-5 py-5 text-black sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-black/70">Mi perfil</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Perfil del usuario activo</h1>
            <p className="mt-2 text-sm font-semibold text-black/75">
              Aquí puedes revisar tu información pública y actualizar tu foto de perfil.
            </p>
          </div>

          <div className="p-5 sm:p-8">
            <div className="rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-sm">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
                <div className="relative">
                  <Avatar
                    imageUrl={currentImageUrl}
                    name={fullName}
                    alt="Foto del perfil activo"
                    className="h-24 w-24 rounded-full border-4 border-blue-200 object-cover"
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
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#f0e3aa] text-sm shadow-md transition hover:bg-[#ecdfa0]"
                    aria-label="Editar imagen de perfil"
                    title="Editar imagen"
                  >
                    ✏️
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-extrabold text-black">{fullName || 'Usuario'}</h2>
                  <p className="mt-1 text-sm font-bold text-gray-700">☆ {ratingText}</p>
                  {rut ? <p className="mt-2 text-sm font-semibold text-gray-600">RUT: {rut}</p> : null}
                  <p className="mt-3 text-xs font-semibold text-gray-500">
                    Usa el botón ✏️ sobre tu foto para abrir el editor flotante.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Chambas activas</p>
                  <p className="mt-2 text-3xl font-extrabold text-black">{activePosts}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Trabajos completados</p>
                  <p className="mt-2 text-3xl font-extrabold text-black">{completedPosts}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}