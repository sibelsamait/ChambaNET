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

interface ProfileSummaryProps {
  fullName: string;
  ratingText: string;
  initialImageUrl?: string | null;
}

export default function ProfileSummary({
  fullName,
  ratingText,
  initialImageUrl,
}: ProfileSummaryProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
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

  return (
    <>
      <div className="p-6 flex items-center gap-4 border-b border-gray-200">
        <Avatar
          imageUrl={currentImageUrl}
          name={fullName}
          alt="Foto de perfil"
          className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200"
          fallbackClassName="text-sm"
        />
        <div>
          <h2 className="font-bold text-sm text-gray-900">{fullName || 'Usuario'}</h2>
          <p className="text-blue-700 font-bold text-xs flex items-center gap-1">⭐ {ratingText}</p>
        </div>
      </div>
      <div className="px-6 py-4 border-b border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="block w-full text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-blue-700"
          />
          <p className="text-[11px] text-gray-500">
            Selecciona una imagen desde tu dispositivo. Formatos: PNG, JPEG o WEBP. Máximo 2MB.
          </p>
          {errorMsg ? <p className="text-xs text-red-600">{errorMsg}</p> : null}
          {successMsg ? <p className="text-xs text-green-600">{successMsg}</p> : null}
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="w-full text-center p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition text-xs font-semibold disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Actualizando...' : 'Actualizar foto'}
          </button>
        </form>
      </div>
    </>
  );
}