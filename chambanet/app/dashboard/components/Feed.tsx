"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Avatar from './Avatar';
import NotificationsBell from './NotificationsBell';

const MapPanel = dynamic(() => import('./MapPanel'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[360px] place-items-center rounded-xl border border-blue-200 bg-white/60 text-blue-900">
      Cargando mapa...
    </div>
  ),
});

interface Chamba {
  id: string;
  titulo: string;
  descripcion: string;
  pago_clp: number;
  estado: string;
  horario?: string;
  ubicacion_lat: number;
  ubicacion_lng: number;
  direccion_texto: string;
  empleador_id: string;
  empleador_imagen_url?: string | null;
  empleador?: {
    nombres?: string | null;
    apellido_paterno?: string | null;
    promedio_valoracion?: number | null;
  } | null;
}

interface FormChamba {
  titulo: string;
  descripcion: string;
  pago_clp: string;
  horario: string;
  direccion_texto: string;
  ubicacion_lat: string;
  ubicacion_lng: string;
}

const FORM_INICIAL: FormChamba = {
  titulo: '',
  descripcion: '',
  pago_clp: '',
  horario: '',
  direccion_texto: '',
  ubicacion_lat: '',
  ubicacion_lng: '',
};

interface MiChambaItem {
  id: string;
  titulo: string;
  pago_clp: number;
  estado: string;
  rol: 'empleador' | 'postulante';
  estado_postulacion?: string;
  valoracion_empleador_completa?: boolean;
  valoracion_trabajador_completa?: boolean;
  cierre_habilitado_por_valoraciones?: boolean;
  badge_alerta?: string | null;
}

interface PostulanteItem {
  postulacion_id: string;
  estado: string;
  trabajador: {
    id: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno?: string | null;
    rut?: string | null;
    email?: string | null;
    telefono?: string | null;
    fecha_nacimiento?: string | null;
    direccion_completa?: {
      calle?: string;
      numero?: string;
      comuna_nombre?: string;
      region_nombre?: string;
    } | null;
    promedio_valoracion?: number | null;
    imagen_url?: string | null;
  };
}

interface PerfilTrabajador {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  rut?: string | null;
  email?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  direccion_completa?: {
    calle?: string;
    numero?: string;
    comuna_nombre?: string;
    region_nombre?: string;
  } | null;
  promedio_valoracion?: number | null;
  imagen_url?: string | null;
  trabajos_completados: number;
  valoraciones: { estrellas: number; comentario: string | null; emisor_nombre: string }[];
}

interface ChambaDetalleFull {
  chamba: {
    id: string;
    titulo: string;
    descripcion: string;
    pago_clp: number;
    horario: string;
    estado: string;
    direccion_texto: string;
    empleador_id: string;
  };
  postulantes_count: number;
  ya_postule: boolean;
  postulacion_id: string | null;
  empleador: {
    id: string;
    nombres: string;
    apellido_paterno: string;
    rut?: string;
    email?: string | null;
    telefono?: string | null;
    fecha_nacimiento?: string | null;
    direccion_completa?: {
      calle?: string;
      numero?: string;
      comuna_nombre?: string;
      region_nombre?: string;
    } | null;
    promedio_valoracion?: number;
    imagen_url?: string | null;
    publicaciones_realizadas: number;
    trabajos_completados: number;
  };
  valoraciones: { estrellas: number; comentario: string | null; emisor_nombre: string }[];
  postulantes?: PostulanteItem[];
  mi_postulacion_estado?: string | null;
  trabajador_activo?: {
    id: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno?: string | null;
    rut?: string | null;
    email?: string | null;
    telefono?: string | null;
    fecha_nacimiento?: string | null;
    direccion_completa?: {
      calle?: string;
      numero?: string;
      comuna_nombre?: string;
      region_nombre?: string;
    } | null;
  } | null;
  puede_solicitar_cierre?: boolean;
  puede_aprobar_cierre?: boolean;
  puede_valorar?: boolean;
  ya_valore?: boolean;
  valoracion_empleador_completa?: boolean;
  valoracion_trabajador_completa?: boolean;
  cierre_habilitado_por_valoraciones?: boolean;
  receptor_valoracion_id?: string | null;
  receptor_valoracion_nombre?: string | null;
}

interface EvidenciaMeta {
  nombre: string;
  tamano: number;
  tipo: string;
  fecha: string;
}

function formatFechaSolo(raw?: string | null) {
  if (!raw) return 'No registrada';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'No registrada';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

function direccionComoTexto(
  raw?: { calle?: string; numero?: string; comuna_nombre?: string; region_nombre?: string } | null
) {
  if (!raw) return 'No registrada';
  const partes = [raw.calle, raw.numero, raw.comuna_nombre, raw.region_nombre]
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return partes.length ? partes.join(', ') : 'No registrada';
}

export default function Feed({ chambas, userId }: { chambas: Chamba[]; userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vista, setVista] = useState<'listado' | 'mapa'>('listado');
  const [postulandoId, setPostulandoId] = useState<string | null>(null);
  const [chambasList, setChambasList] = useState<Chamba[]>(chambas);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [chambaEditandoId, setChambaEditandoId] = useState<string | null>(null);
  const [menuOpcionesId, setMenuOpcionesId] = useState<string | null>(null);
  const [form, setForm] = useState<FormChamba>(FORM_INICIAL);
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);
  const [cargandoGPS, setCargandoGPS] = useState(false);
  const [localidades, setLocalidades] = useState<Map<string, string>>(new Map());
  const [misChambas, setMisChambas] = useState<MiChambaItem[]>([]);
  const [filtroMisChambas, setFiltroMisChambas] = useState<'todas' | 'postulaciones' | 'publicaciones'>('todas');
  const [mostrarMisChambas, setMostrarMisChambas] = useState(false);
  const [cargandoMisChambas, setCargandoMisChambas] = useState(false);
  const [destacadoId, setDestacadoId] = useState<string | null>(null);
  const [chambaDetalle, setChambaDetalle] = useState<MiChambaItem | null>(null);
  const [modalChambaId, setModalChambaId] = useState<string | null>(null);
  const [modalChambaData, setModalChambaData] = useState<ChambaDetalleFull | null>(null);
  const [cargandoModal, setCargandoModal] = useState(false);
  const [perfilTrabajador, setPerfilTrabajador] = useState<PerfilTrabajador | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [gestionandoPostulacion, setGestionandoPostulacion] = useState<string | null>(null);
  const [fotosAdjuntas, setFotosAdjuntas] = useState<File[]>([]);
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);
  const [chambaActivaTrabajador, setChambaActivaTrabajador] = useState<ChambaDetalleFull | null>(null);
  const [cargandoChambaActivaTrabajador, setCargandoChambaActivaTrabajador] = useState(true);
  const [evidenciasAdjuntas, setEvidenciasAdjuntas] = useState<File[]>([]);
  const [evidenciasPreview, setEvidenciasPreview] = useState<string[]>([]);
  const [subiendoEvidencias, setSubiendoEvidencias] = useState(false);
  const [mensajeEvidencias, setMensajeEvidencias] = useState<string | null>(null);
  const [chambaActivaEmpleador, setChambaActivaEmpleador] = useState<ChambaDetalleFull | null>(null);
  const [modalSoporteAbierto, setModalSoporteAbierto] = useState(false);
  const [soporteMensaje, setSoporteMensaje] = useState('');
  const [enviandoSoporte, setEnviandoSoporte] = useState(false);
  const [errorSoporte, setErrorSoporte] = useState<string | null>(null);
  const [mensajeContacto, setMensajeContacto] = useState<string | null>(null);
  const [gestionandoCierre, setGestionandoCierre] = useState(false);
  const [mensajeCierre, setMensajeCierre] = useState<string | null>(null);
  const [modalValoracionAbierto, setModalValoracionAbierto] = useState(false);
  const [valoracionEstrellas, setValoracionEstrellas] = useState(5);
  const [valoracionComentario, setValoracionComentario] = useState('');
  const [valorando, setValorando] = useState(false);
  const [errorValoracion, setErrorValoracion] = useState<string | null>(null);
  const [geocodeEstado, setGeocodeEstado] = useState<'idle' | 'ok'>('idle');
  const [geocodandoDireccion, setGeocodandoDireccion] = useState(false);
  const [direccionModificada, setDireccionModificada] = useState(false);

  const articulosRef = useRef<Map<string, HTMLElement>>(new Map());
  const misChembasDropdownRef = useRef<HTMLDivElement>(null);
  const opcionesDropdownRef = useRef<HTMLDivElement>(null);
  const coordsFuenteRef = useRef<string | null>(null);

  const limpiarFotos = useCallback(() => {
    fotosPreview.forEach((url) => URL.revokeObjectURL(url));
    setFotosAdjuntas([]);
    setFotosPreview([]);
  }, [fotosPreview]);

  const erroresPublicacion = useMemo(() => {
    const errores: string[] = [];
    const titulo = form.titulo.trim();
    const descripcion = form.descripcion.trim();
    const pago = Number(form.pago_clp);

    if (titulo.length < 8) {
      errores.push('El título debe tener al menos 8 caracteres.');
    }

    if (descripcion.length < 15) {
      errores.push('La descripción debe tener al menos 15 caracteres.');
    }

    if (!Number.isFinite(pago) || pago < 1000) {
      errores.push('El pago debe ser de al menos CLP$ 1.000.');
    }

    if (!form.horario) {
      errores.push('La fecha y hora son obligatorias.');
    } else {
      const fecha = new Date(form.horario);
      if (Number.isNaN(fecha.getTime()) || fecha <= new Date()) {
        errores.push('La fecha y hora deben ser posteriores al momento actual.');
      }
    }

    return errores;
  }, [form.titulo, form.descripcion, form.pago_clp, form.horario]);

  const empleadorChambasActivas = useMemo(
    () =>
      misChambas.filter(
        (item) =>
          item.rol === 'empleador' &&
          ['PUBLICADA', 'CON_POSTULANTES', 'EN_OBRA', 'ESPERANDO_APROBACION'].includes(item.estado)
      ),
    [misChambas]
  );

  const indiceChambaActivaModal = useMemo(
    () => (modalChambaId ? empleadorChambasActivas.findIndex((item) => item.id === modalChambaId) : -1),
    [modalChambaId, empleadorChambasActivas]
  );

  useEffect(() => {
    setChambasList(chambas);
  }, [chambas]);

  useEffect(() => {
    return () => {
      fotosPreview.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fotosPreview]);

  useEffect(() => {
    return () => {
      evidenciasPreview.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [evidenciasPreview]);

  useEffect(() => {
    let cancelado = false;

    const cargarChambaActivaTrabajador = async () => {
      setCargandoChambaActivaTrabajador(true);
      try {
        const resMisChambas = await fetch(`/api/chambas/mis-chambas?userId=${userId}`);
        const dataMisChambas = await resMisChambas.json();

        if (!resMisChambas.ok) {
          throw new Error(dataMisChambas?.error || 'No se pudo cargar el estado del trabajador.');
        }

        const misChambasUsuario: MiChambaItem[] = dataMisChambas.chambas ?? [];
        setMisChambas(misChambasUsuario);

        const activaEnObra = misChambasUsuario.find(
          (item: MiChambaItem) => item.rol === 'postulante' && (item.estado === 'EN_OBRA' || item.estado === 'ESPERANDO_APROBACION')
        );

        const activaEmpleador = misChambasUsuario.find(
          (item: MiChambaItem) =>
            item.rol === 'empleador' && (item.estado === 'EN_OBRA' || item.estado === 'ESPERANDO_APROBACION')
        );

        if (!activaEnObra && !activaEmpleador) {
          if (!cancelado) {
            setChambaActivaTrabajador(null);
            setChambaActivaEmpleador(null);
          }
          return;
        }

        const [detalleTrabajador, detalleEmpleador] = await Promise.all([
          activaEnObra
            ? fetch(`/api/chambas/${activaEnObra.id}?userId=${userId}`).then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'No se pudo cargar tu chamba activa de trabajador.');
                return data as ChambaDetalleFull;
              })
            : Promise.resolve(null),
          activaEmpleador
            ? fetch(`/api/chambas/${activaEmpleador.id}?userId=${userId}`).then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'No se pudo cargar tu chamba activa de empleador.');
                return data as ChambaDetalleFull;
              })
            : Promise.resolve(null),
        ]);

        if (!cancelado) {
          setChambaActivaTrabajador(detalleTrabajador);
          setChambaActivaEmpleador(detalleEmpleador);
        }
      } catch {
        if (!cancelado) {
          setChambaActivaTrabajador(null);
          setChambaActivaEmpleador(null);
        }
      } finally {
        if (!cancelado) {
          setCargandoChambaActivaTrabajador(false);
        }
      }
    };

    cargarChambaActivaTrabajador();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!mostrarMisChambas) return;
    const handleOutside = (e: MouseEvent) => {
      if (misChembasDropdownRef.current && !misChembasDropdownRef.current.contains(e.target as Node)) {
        setMostrarMisChambas(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [mostrarMisChambas]);

  useEffect(() => {
    if (!menuOpcionesId) return;
    const handleOutside = (e: MouseEvent) => {
      if (opcionesDropdownRef.current && !opcionesDropdownRef.current.contains(e.target as Node)) {
        setMenuOpcionesId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpcionesId]);

  // Reverse geocoding para chambas con coords pero sin dirección texto
  useEffect(() => {
    const sinDireccion = chambasList.filter(
      (c) => !c.direccion_texto && c.ubicacion_lat && c.ubicacion_lng
    );
    if (sinDireccion.length === 0) return;

    let cancelado = false;

    const resolverSecuencial = async () => {
      for (const chamba of sinDireccion) {
        if (cancelado) break;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${chamba.ubicacion_lat}&lon=${chamba.ubicacion_lng}&format=json&accept-language=es`
          );
          const data = await res.json();
          const addr = data.address || {};
          const localidad =
            addr.suburb ??
            addr.city_district ??
            addr.neighbourhood ??
            addr.city ??
            addr.town ??
            addr.village ??
            data.display_name?.split(',')[0] ??
            'Ubicación GPS';
          setLocalidades((prev) => new Map(prev).set(chamba.id, localidad));
        } catch {
          // falla silenciosa
        }
        // Respetar límite de Nominatim: 1 req/s
        await new Promise((r) => setTimeout(r, 1100));
      }
    };

    resolverSecuencial();
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chambasList]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (erroresPublicacion.length > 0) {
      setErrorPublicar('Corrige los datos del formulario antes de publicar.');
      return;
    }

    setPublicando(true);
    setErrorPublicar(null);

    try {
      const payload = {
        chamba_id: chambaEditandoId,
        empleador_id: userId,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        pago_clp: parseInt(form.pago_clp, 10),
        horario: form.horario,
        direccion_texto: form.direccion_texto.trim() || null,
        ubicacion_lat: form.ubicacion_lat ? parseFloat(form.ubicacion_lat) : null,
        ubicacion_lng: form.ubicacion_lng ? parseFloat(form.ubicacion_lng) : null,
      };

      const res = await fetch('/api/chambas', {
        method: chambaEditandoId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al publicar la chamba.');
      }

      setMostrarFormulario(false);
      setChambaEditandoId(null);
      setForm(FORM_INICIAL);
      limpiarFotos();
      if (chambaEditandoId && data.chamba) {
        setChambasList((prev) => prev.map((item) => (item.id === data.chamba.id ? { ...item, ...data.chamba } : item)));
      }
      alert(chambaEditandoId ? '¡Chamba editada exitosamente! Las postulaciones anteriores fueron eliminadas.' : '¡Chamba publicada exitosamente! Aparecerá en el feed en instantes.');
      router.refresh();
    } catch (err: unknown) {
      setErrorPublicar(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setPublicando(false);
    }
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setChambaEditandoId(null);
    setForm(FORM_INICIAL);
    setErrorPublicar(null);
    setGeocodeEstado('idle');
    setGeocodandoDireccion(false);
    setDireccionModificada(false);
    coordsFuenteRef.current = null;
    limpiarFotos();
  };

  const handleSeleccionFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    fotosPreview.forEach((url) => URL.revokeObjectURL(url));
    setFotosAdjuntas(files);
    setFotosPreview(files.map((file) => URL.createObjectURL(file)));
  };

  const formatDateTimeLocalValue = (rawValue?: string) => {
    if (!rawValue) return '';
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const handleEditarChamba = (chamba: Chamba) => {
    setMenuOpcionesId(null);
    setErrorPublicar(null);
    setChambaEditandoId(chamba.id);
    setForm({
      titulo: chamba.titulo ?? '',
      descripcion: chamba.descripcion ?? '',
      pago_clp: String(chamba.pago_clp ?? ''),
      horario: formatDateTimeLocalValue(chamba.horario),
      direccion_texto: chamba.direccion_texto ?? '',
      ubicacion_lat: chamba.ubicacion_lat != null ? String(chamba.ubicacion_lat) : '',
      ubicacion_lng: chamba.ubicacion_lng != null ? String(chamba.ubicacion_lng) : '',
    });
    if (chamba.ubicacion_lat != null && chamba.ubicacion_lng != null) {
      coordsFuenteRef.current = 'gps';
      setGeocodeEstado('ok');
    } else {
      coordsFuenteRef.current = null;
      setGeocodeEstado('idle');
    }
    setDireccionModificada(false);
    setMostrarFormulario(true);
  };

  const cargarMisChambas = useCallback(async () => {
    setCargandoMisChambas(true);
    try {
      const res = await fetch(`/api/chambas/mis-chambas?userId=${userId}`);
      const data = await res.json();
      setMisChambas(data.chambas || []);
    } catch {
      setMisChambas([]);
    } finally {
      setCargandoMisChambas(false);
    }
  }, [userId]);

  const handleVerMisChambas = useCallback(async () => {
    if (mostrarMisChambas) {
      setMostrarMisChambas(false);
      return;
    }
    setFiltroMisChambas('todas');
    setMostrarMisChambas(true);
    await cargarMisChambas();
  }, [mostrarMisChambas, cargarMisChambas]);

  useEffect(() => {
    const panel = searchParams.get('panel');
    if (panel !== 'postulaciones' && panel !== 'publicaciones') return;

    setVista('listado');
    setMostrarMisChambas(true);
    setFiltroMisChambas(panel === 'postulaciones' ? 'postulaciones' : 'publicaciones');
    void cargarMisChambas();
  }, [searchParams, cargarMisChambas]);

  const misChambasFiltradas = useMemo(() => {
    if (filtroMisChambas === 'postulaciones') {
      return misChambas.filter((item) => item.rol === 'postulante');
    }

    if (filtroMisChambas === 'publicaciones') {
      return misChambas.filter((item) => item.rol === 'empleador');
    }

    return misChambas;
  }, [misChambas, filtroMisChambas]);

  const handleClickMiChamba = useCallback((item: MiChambaItem) => {
    setMostrarMisChambas(false);
    const el = articulosRef.current.get(item.id);
    if (el) {
      setVista('listado');
      setDestacadoId(item.id);
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
      setTimeout(() => setDestacadoId(null), 2500);
    } else {
      setChambaDetalle(item);
    }
  }, []);

  const handleUsarGPS = () => {
    if (!navigator.geolocation) {
      setErrorPublicar('Tu dispositivo no soporta geolocalización.');
      return;
    }
    setCargandoGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          ubicacion_lat: pos.coords.latitude.toFixed(6),
          ubicacion_lng: pos.coords.longitude.toFixed(6),
        }));
        setCargandoGPS(false);
      },
      () => {
        setErrorPublicar('No se pudo obtener el GPS. Verifica los permisos del navegador.');
        setCargandoGPS(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const formatDateAndTime = (rawValue?: string) => {
    if (!rawValue) {
      return { date: 'Fecha por definir', time: '--:--' };
    }

    const parsedDate = new Date(rawValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return { date: 'Fecha por definir', time: '--:--' };
    }

    return {
      date: new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(parsedDate),
      time: new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(parsedDate),
    };
  };

  const handlePostular = async (chambaId: string) => {
    setPostulandoId(chambaId);

    try {
      const response = await fetch('/api/postulaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chamba_id: chambaId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al postular');
      }

      alert('¡Postulación enviada con éxito! Revisa la pestaña de Postulaciones.');

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error("Error en la postulación:", error);
      alert(`No se pudo postular: ${message}`);
    } finally {
      setPostulandoId(null);
    }
  };

  const handleEliminarChamba = async (chambaId: string) => {
    const confirmar = window.confirm('¿Seguro que quieres eliminar esta chamba? Esta acción no se puede deshacer.');
    if (!confirmar) return;

    setMenuOpcionesId(null);
    setEliminandoId(chambaId);

    try {
      const response = await fetch('/api/chambas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chamba_id: chambaId, empleador_id: userId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo eliminar la chamba.');
      }

      setChambasList((prev) => prev.filter((item) => item.id !== chambaId));
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido al eliminar.';
      alert(message);
    } finally {
      setEliminandoId(null);
    }
  };

  const handleAbrirDetalle = useCallback(async (chambaId: string) => {
    setModalChambaId(chambaId);
    setCargandoModal(true);
    setModalChambaData(null);
    try {
      const res = await fetch(`/api/chambas/${chambaId}?userId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        // Si el usuario es el dueño, también cargar los postulantes
        if (data.chamba?.empleador_id === userId) {
          const posRes = await fetch(`/api/chambas/${chambaId}/postulantes?empleadorId=${userId}`);
          if (posRes.ok) {
            const posData = await posRes.json();
            data.postulantes = posData.postulantes ?? [];
          }
        }
        setModalChambaData(data);
      }
    } catch {
      // falla silenciosa
    } finally {
      setCargandoModal(false);
    }
  }, [userId]);

  const handleVerPerfilTrabajador = async (trabajadorId: string) => {
    setCargandoPerfil(true);
    setPerfilTrabajador(null);
    try {
      const res = await fetch(`/api/usuarios/${trabajadorId}/perfil`);
      const data = await res.json();
      if (res.ok) setPerfilTrabajador(data);
    } catch {
      // falla silenciosa
    } finally {
      setCargandoPerfil(false);
    }
  };

  const handleAprobarPostulante = async (postulacionId: string) => {
    if (!window.confirm('¿Confirmar la aprobación de este postulante? Se rechazará a los demás y la chamba pasará a EN OBRA.')) return;
    setGestionandoPostulacion(postulacionId);
    try {
      const res = await fetch(`/api/postulaciones/${postulacionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'ACEPTAR' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al aprobar.');
      // Actualizar estado local de postulantes
      setModalChambaData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          postulantes: prev.postulantes?.map((p) =>
            p.postulacion_id === postulacionId
              ? { ...p, estado: 'ACEPTADA' }
              : { ...p, estado: 'RECHAZADA' }
          ),
        };
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al aprobar.');
    } finally {
      setGestionandoPostulacion(null);
    }
  };

  const handleRechazarPostulante = async (postulacionId: string) => {
    if (!window.confirm('¿Rechazar a este postulante?')) return;
    setGestionandoPostulacion(postulacionId);
    try {
      const res = await fetch(`/api/postulaciones/${postulacionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'RECHAZAR' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al rechazar.');
      setModalChambaData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          postulantes: prev.postulantes?.map((p) =>
            p.postulacion_id === postulacionId ? { ...p, estado: 'RECHAZADA' } : p
          ),
        };
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al rechazar.');
    } finally {
      setGestionandoPostulacion(null);
    }
  };

  const handleCancelarPostulacion = async (postulacionId: string) => {
    if (!window.confirm('¿Cancelar tu postulación para esta chamba?')) return;
    try {
      const res = await fetch(`/api/postulaciones/${postulacionId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'No se pudo cancelar la postulación.');
        return;
      }
      setModalChambaData((prev) =>
        prev ? { ...prev, ya_postule: false, postulacion_id: null, postulantes_count: Math.max(0, prev.postulantes_count - 1) } : null
      );
    } catch {
      alert('Error al cancelar la postulación.');
    }
  };

  const handlePostularEnModal = async (chambaId: string) => {
    setPostulandoId(chambaId);
    try {
      const res = await fetch('/api/postulaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chamba_id: chambaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al postular');
      setModalChambaData((prev) =>
        prev ? {
          ...prev,
          ya_postule: true,
          postulacion_id: data.postulacion?.id ?? null,
          postulantes_count: prev.postulantes_count + 1,
        } : null
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al postular.');
    } finally {
      setPostulandoId(null);
    }
  };

  const handleSeleccionEvidencias = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(event.target.files || []).slice(0, 4);
    evidenciasPreview.forEach((url) => URL.revokeObjectURL(url));
    setEvidenciasAdjuntas(archivos);
    setEvidenciasPreview(archivos.map((file) => URL.createObjectURL(file)));
    setMensajeEvidencias(null);
  };

  const handleSubirEvidencias = async () => {
    if (!chambaActivaTrabajador?.chamba.id) return;
    if (evidenciasAdjuntas.length === 0) {
      setMensajeEvidencias('Selecciona al menos una evidencia para subir.');
      return;
    }

    setSubiendoEvidencias(true);
    setMensajeEvidencias(null);

    try {
      const registros: EvidenciaMeta[] = evidenciasAdjuntas.map((file) => ({
        nombre: file.name,
        tamano: file.size,
        tipo: file.type,
        fecha: new Date().toISOString(),
      }));

      const storageKey = `chamba_evidencias_${chambaActivaTrabajador.chamba.id}`;
      const prevRaw = localStorage.getItem(storageKey);
      const prevParsed: EvidenciaMeta[] = prevRaw ? JSON.parse(prevRaw) : [];
      localStorage.setItem(storageKey, JSON.stringify([...prevParsed, ...registros]));

      evidenciasPreview.forEach((url) => URL.revokeObjectURL(url));
      setEvidenciasAdjuntas([]);
      setEvidenciasPreview([]);
      setMensajeEvidencias('Evidencias registradas correctamente.');
    } catch {
      setMensajeEvidencias('No se pudieron registrar las evidencias. Intenta nuevamente.');
    } finally {
      setSubiendoEvidencias(false);
    }
  };

  const handleContactarEmpleador = () => {
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel) {
      chatPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setMensajeContacto('Panel de chat enfocado. Puedes contactar al empleador desde ahí.');
      return;
    }

    setMensajeContacto('Abre el panel de chat para contactar al empleador.');
  };

  const handleSolicitarCierreTrabajador = async () => {
    if (!chambaActivaTrabajador?.chamba.id) return;
    if (!window.confirm('¿Solicitar finalización de la chamba al empleador?')) return;

    setGestionandoCierre(true);
    setMensajeCierre(null);

    try {
      const res = await fetch(`/api/chambas/${chambaActivaTrabajador.chamba.id}/finalizar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'SOLICITAR_CIERRE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo solicitar el cierre.');

      setChambaActivaTrabajador((prev) =>
        prev
          ? {
              ...prev,
              chamba: { ...prev.chamba, estado: 'ESPERANDO_APROBACION' },
              puede_solicitar_cierre: false,
            }
          : prev
      );
      setMensajeCierre('Solicitud enviada. Ahora el empleador debe aprobar la finalización.');
      router.refresh();
    } catch (error: unknown) {
      setMensajeCierre(error instanceof Error ? error.message : 'No se pudo solicitar el cierre.');
    } finally {
      setGestionandoCierre(false);
    }
  };

  const handleAprobarCierreEmpleador = async () => {
    if (!modalChambaData?.chamba.id) return;
    if (!window.confirm('¿Confirmar finalización de esta chamba?')) return;

    setGestionandoCierre(true);
    setMensajeCierre(null);

    try {
      const res = await fetch(`/api/chambas/${modalChambaData.chamba.id}/finalizar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'APROBAR_CIERRE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo finalizar la chamba.');

      await handleAbrirDetalle(modalChambaData.chamba.id);
      setMensajeCierre('Chamba finalizada. Ya puedes registrar tu valoración.');
      router.refresh();
    } catch (error: unknown) {
      setMensajeCierre(error instanceof Error ? error.message : 'No se pudo finalizar la chamba.');
    } finally {
      setGestionandoCierre(false);
    }
  };

  const handleCompletarChambaEmpleador = async () => {
    if (!chambaActivaEmpleador?.chamba.id) return;
    if (!window.confirm('¿Completar la chamba y efectuar el pago al trabajador?')) return;

    setGestionandoCierre(true);
    setMensajeCierre(null);

    try {
      const res = await fetch(`/api/chambas/${chambaActivaEmpleador.chamba.id}/finalizar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'APROBAR_CIERRE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo completar la chamba.');

      const refetch = await fetch(`/api/chambas/${chambaActivaEmpleador.chamba.id}?userId=${userId}`);
      if (refetch.ok) {
        const updated = await refetch.json();
        setChambaActivaEmpleador(updated);
      }

      setMensajeCierre('Chamba completada y pago efectuado correctamente.');
      router.refresh();
    } catch (error: unknown) {
      setMensajeCierre(error instanceof Error ? error.message : 'No se pudo completar la chamba.');
    } finally {
      setGestionandoCierre(false);
    }
  };

  const handleContactarSoporte = () => {
    setSoporteMensaje('');
    setErrorSoporte(null);
    setModalSoporteAbierto(true);
  };

  const handleEnviarSoporte = async () => {
    const texto = soporteMensaje.trim();
    if (texto.length < 10) {
      setErrorSoporte('Describe el problema con al menos 10 caracteres.');
      return;
    }

    const chambaId =
      chambaActivaEmpleador?.chamba.id ?? chambaActivaTrabajador?.chamba.id ?? modalChambaData?.chamba.id ?? null;

    setEnviandoSoporte(true);
    setErrorSoporte(null);

    try {
      const response = await fetch('/api/soporte/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: 'Incidencia en chamba en obra',
          descripcion: texto,
          tipo: 'CHAMBA',
          prioridad: 'ALTA',
          chambaId,
          consentimientoUsuario: true,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo enviar la solicitud de soporte.');
      }

      setModalSoporteAbierto(false);
      setSoporteMensaje('');
      setMensajeCierre('Ticket de soporte creado correctamente. El equipo revisará tu caso.');
    } catch (error: unknown) {
      setErrorSoporte(error instanceof Error ? error.message : 'No se pudo enviar la solicitud de soporte.');
    } finally {
      setEnviandoSoporte(false);
    }
  };

  const abrirModalValoracion = () => {
    setValoracionEstrellas(5);
    setValoracionComentario('');
    setErrorValoracion(null);
    setModalValoracionAbierto(true);
  };

  const cerrarModalValoracion = () => {
    if (valorando) return;
    setModalValoracionAbierto(false);
    setErrorValoracion(null);
  };

  const handleEnviarValoracion = async () => {
    const detalleObjetivo = modalChambaData ?? chambaActivaTrabajador ?? chambaActivaEmpleador;
    if (!detalleObjetivo?.receptor_valoracion_id) {
      setErrorValoracion('No se pudo identificar a quién valorar.');
      return;
    }

    setValorando(true);
    setErrorValoracion(null);

    try {
      const res = await fetch('/api/valoraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chamba_id: detalleObjetivo.chamba.id,
          receptor_id: detalleObjetivo.receptor_valoracion_id,
          estrellas: valoracionEstrellas,
          comentario: valoracionComentario.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo enviar la valoración.');

      if (modalChambaData?.chamba.id) {
        await handleAbrirDetalle(modalChambaData.chamba.id);
      }

      if (chambaActivaTrabajador?.chamba.id === detalleObjetivo.chamba.id) {
        const refetch = await fetch(`/api/chambas/${detalleObjetivo.chamba.id}?userId=${userId}`);
        if (refetch.ok) {
          const updated = await refetch.json();
          setChambaActivaTrabajador(updated);
        }
      }

      if (chambaActivaEmpleador?.chamba.id === detalleObjetivo.chamba.id) {
        const refetch = await fetch(`/api/chambas/${detalleObjetivo.chamba.id}?userId=${userId}`);
        if (refetch.ok) {
          const updated = await refetch.json();
          setChambaActivaEmpleador(updated);
        }
      }

      setModalValoracionAbierto(false);
      setMensajeCierre('Valoración registrada con éxito.');
      router.refresh();
    } catch (error: unknown) {
      setErrorValoracion(error instanceof Error ? error.message : 'No se pudo enviar la valoración.');
    } finally {
      setValorando(false);
    }
  };

  const handleNavegarChambaActivaEmpleador = useCallback(
    (direccion: 'anterior' | 'siguiente') => {
      if (indiceChambaActivaModal < 0 || empleadorChambasActivas.length < 2) return;
      const offset = direccion === 'siguiente' ? 1 : -1;
      const total = empleadorChambasActivas.length;
      const siguienteIndice = (indiceChambaActivaModal + offset + total) % total;
      const siguiente = empleadorChambasActivas[siguienteIndice];
      if (siguiente) {
        handleAbrirDetalle(siguiente.id);
      }
    },
    [indiceChambaActivaModal, empleadorChambasActivas, handleAbrirDetalle]
  );

  const mostrarVistaTrabajadorEnObra = Boolean(
    chambaActivaTrabajador && chambaActivaTrabajador.chamba.empleador_id !== userId
  );

  const mostrarVistaEmpleadorEnObra = Boolean(
    !mostrarVistaTrabajadorEnObra &&
      chambaActivaEmpleador &&
      chambaActivaEmpleador.chamba.empleador_id === userId &&
      ['EN_OBRA', 'ESPERANDO_APROBACION'].includes(chambaActivaEmpleador.chamba.estado)
  );

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-blue-500/95 text-white">
      <div className="fixed right-4 top-4 z-40">
        <NotificationsBell />
      </div>

      {/* Panel perfil completo del trabajador (z-[60], sobre el modal de chamba) */}
      {(perfilTrabajador || cargandoPerfil) && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={() => setPerfilTrabajador(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-[0_16px_48px_rgba(30,64,175,0.50)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera amarilla */}
            <div className="rounded-t-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-5 text-gray-900">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-lg font-extrabold text-black">Perfil del Trabajador</h2>
                <button
                  onClick={() => setPerfilTrabajador(null)}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-black/10 hover:text-gray-700"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
              {cargandoPerfil && !perfilTrabajador ? (
                <p className="py-8 text-center text-sm text-gray-500">Cargando perfil…</p>
              ) : perfilTrabajador ? (
                <div className="flex items-center gap-4">
                  <Avatar
                    imageUrl={perfilTrabajador.imagen_url}
                    name={`${perfilTrabajador.nombres} ${perfilTrabajador.apellido_paterno}`}
                    alt="Foto del trabajador"
                    className="h-20 w-20 shrink-0 rounded-full border-2 border-blue-200 object-cover"
                    fallbackClassName="text-xl"
                  />
                  <div className="space-y-0.5">
                    <p className="text-base font-extrabold leading-tight text-black">
                      {perfilTrabajador.nombres} {perfilTrabajador.apellido_paterno}
                      {perfilTrabajador.apellido_materno ? ` ${perfilTrabajador.apellido_materno}` : ''}
                    </p>
                    {perfilTrabajador.rut && (
                      <p className="text-sm font-semibold text-gray-600">{perfilTrabajador.rut}</p>
                    )}
                    {perfilTrabajador.email && (
                      <p className="text-xs font-semibold text-gray-600">{perfilTrabajador.email}</p>
                    )}
                    {perfilTrabajador.telefono && (
                      <p className="text-xs font-semibold text-gray-600">{perfilTrabajador.telefono}</p>
                    )}
                    <p className="text-base font-black text-gray-900">
                      ★{' '}
                      {typeof perfilTrabajador.promedio_valoracion === 'number'
                        ? perfilTrabajador.promedio_valoracion.toFixed(1).replace('.', ',')
                        : '-'}
                    </p>
                    <p className="text-xs text-gray-600">
                      Nacimiento: <span className="font-semibold">{formatFechaSolo(perfilTrabajador.fecha_nacimiento)}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Dirección: <span className="font-semibold">{direccionComoTexto(perfilTrabajador.direccion_completa)}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Trabajos completados:{' '}
                      <span className="font-extrabold text-blue-700">{perfilTrabajador.trabajos_completados}</span>
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Sección azul: valoraciones */}
            {perfilTrabajador && (
              <div className="rounded-b-2xl bg-blue-500 p-5 text-white">
                <h3 className="mb-3 text-center text-base font-extrabold">Valoraciones recibidas</h3>
                {perfilTrabajador.valoraciones.length === 0 ? (
                  <p className="text-center text-sm text-blue-100">Aún no tiene valoraciones.</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {perfilTrabajador.valoraciones.map((val, i) => (
                      <div
                        key={i}
                        className="shrink-0 w-36 rounded-xl border border-white/25 bg-white/15 p-3 text-center"
                      >
                        <p className="text-lg font-extrabold">{val.estrellas}</p>
                        <p className="text-xs font-bold text-yellow-300">
                          {'★'.repeat(val.estrellas)}{'☆'.repeat(5 - val.estrellas)}
                        </p>
                        {val.comentario && (
                          <p className="mt-1 text-xs italic text-white/90 leading-tight line-clamp-2">&ldquo;{val.comentario}&rdquo;</p>
                        )}
                        <p className="mt-1.5 text-xs font-bold">{val.emisor_nombre}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {modalValoracionAbierto && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={cerrarModalValoracion}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-5 text-gray-900 shadow-[0_16px_48px_rgba(30,64,175,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-black">Valorar chamba finalizada</h3>
                <p className="mt-1 text-xs font-semibold text-gray-700">
                  Comparte tu experiencia sobre {modalChambaData?.receptor_valoracion_nombre || chambaActivaTrabajador?.receptor_valoracion_nombre || chambaActivaEmpleador?.receptor_valoracion_nombre || 'la contraparte'}.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModalValoracion}
                className="rounded-full p-1 text-gray-500 hover:bg-black/10 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mb-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-700">Estrellas</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((estrella) => (
                  <button
                    key={estrella}
                    type="button"
                    onClick={() => setValoracionEstrellas(estrella)}
                    className={`text-2xl leading-none ${
                      valoracionEstrellas >= estrella ? 'text-yellow-500' : 'text-gray-300'
                    }`}
                    aria-label={`${estrella} estrella${estrella > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-700">Comentario (opcional)</p>
              <textarea
                value={valoracionComentario}
                onChange={(e) => setValoracionComentario(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Cuéntanos cómo fue la experiencia..."
                className="w-full resize-none rounded-lg border border-[#c9ba6a] bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
              />
            </div>

            {errorValoracion ? <p className="mt-2 text-xs font-semibold text-red-600">{errorValoracion}</p> : null}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={cerrarModalValoracion}
                disabled={valorando}
                className="liftable flex-1 rounded-full border border-gray-300 bg-white/70 px-4 py-2 text-xs font-extrabold text-gray-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarValoracion}
                disabled={valorando}
                className={`liftable flex-1 rounded-full px-4 py-2 text-xs font-extrabold text-white ${
                  valorando ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {valorando ? 'Enviando...' : 'Enviar valoración'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSoporteAbierto && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={() => {
            if (enviandoSoporte) return;
            setModalSoporteAbierto(false);
            setErrorSoporte(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-5 text-gray-900 shadow-[0_16px_48px_rgba(30,64,175,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-black">Contactar soporte</h3>
                <p className="mt-1 text-xs font-semibold text-gray-700">
                  Describe brevemente el problema para que soporte pueda ayudarte con esta chamba en obra.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (enviandoSoporte) return;
                  setModalSoporteAbierto(false);
                  setErrorSoporte(null);
                }}
                className="rounded-full p-1 text-gray-500 hover:bg-black/10 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <textarea
              value={soporteMensaje}
              onChange={(e) => {
                setSoporteMensaje(e.target.value);
                if (errorSoporte) setErrorSoporte(null);
              }}
              rows={4}
              maxLength={500}
              placeholder="Ejemplo: El trabajador subió evidencia incompleta y necesito revisión antes de completar el pago..."
              className="w-full resize-none rounded-lg border border-[#c9ba6a] bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
            />

            {errorSoporte ? <p className="mt-2 text-xs font-semibold text-red-600">{errorSoporte}</p> : null}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (enviandoSoporte) return;
                  setModalSoporteAbierto(false);
                  setErrorSoporte(null);
                }}
                disabled={enviandoSoporte}
                className="liftable flex-1 rounded-full border border-gray-300 bg-white/70 px-4 py-2 text-xs font-extrabold text-gray-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarSoporte}
                disabled={enviandoSoporte}
                className="liftable flex-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-700"
              >
                {enviandoSoporte ? 'Enviando...' : 'Enviar a soporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle completo de chamba */}
      {modalChambaId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={() => { setModalChambaId(null); setModalChambaData(null); }}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-[0_16px_48px_rgba(30,64,175,0.40)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sección amarilla: datos de la chamba */}
            <div className="rounded-t-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-5 text-gray-900">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-xl font-extrabold leading-tight text-black">
                  {modalChambaData?.chamba.titulo ?? chambasList.find((c) => c.id === modalChambaId)?.titulo ?? '…'}
                </h2>
                <button
                  onClick={() => { setModalChambaId(null); setModalChambaData(null); }}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-black/10 hover:text-gray-700"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              {cargandoModal ? (
                <p className="py-8 text-center text-sm text-gray-500">Cargando detalle…</p>
              ) : modalChambaData ? (
                <>
                  {modalChambaData.chamba.empleador_id === userId && empleadorChambasActivas.length > 1 && indiceChambaActivaModal >= 0 && (
                    <div className="mb-3 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleNavegarChambaActivaEmpleador('anterior')}
                        className="liftable rounded-full bg-white px-3 py-1 text-xs font-extrabold text-blue-700 shadow-sm hover:bg-blue-100"
                      >
                        ← Anterior
                      </button>
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-blue-700">
                        Activa {indiceChambaActivaModal + 1} de {empleadorChambasActivas.length}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleNavegarChambaActivaEmpleador('siguiente')}
                        className="liftable rounded-full bg-white px-3 py-1 text-xs font-extrabold text-blue-700 shadow-sm hover:bg-blue-100"
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}

                  {/* Mini empleador */}
                  <div className="mb-3 flex items-center gap-2.5 border-b border-dashed border-[#d6c989] pb-3">
                    <Avatar
                      imageUrl={modalChambaData.empleador.imagen_url}
                      name={`${modalChambaData.empleador.nombres} ${modalChambaData.empleador.apellido_paterno}`}
                      alt="Foto del empleador"
                      className="h-10 w-10 rounded-full border-2 border-blue-200 object-cover"
                      fallbackClassName="text-xs"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-gray-800">
                        {modalChambaData.empleador.nombres?.split(' ')[0]} {modalChambaData.empleador.apellido_paterno}
                      </p>
                      <p className="text-sm font-black text-gray-900">
                        ★{' '}
                        {typeof modalChambaData.empleador.promedio_valoracion === 'number'
                          ? modalChambaData.empleador.promedio_valoracion.toFixed(1).replace('.', ',')
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <p className="mb-3 text-sm leading-snug text-gray-800">
                    {modalChambaData.chamba.descripcion || 'Sin descripción disponible.'}
                  </p>

                  <div className="mb-4 space-y-1.5 text-sm font-bold text-gray-900">
                    <p>💰 CLP$ {modalChambaData.chamba.pago_clp.toLocaleString('es-CL')}</p>
                    {(() => {
                      const { date, time } = formatDateAndTime(modalChambaData.chamba.horario);
                      return <p>🕒 {date}&nbsp;&nbsp;{time}</p>;
                    })()}
                    <p>📍 {modalChambaData.chamba.direccion_texto || localidades.get(modalChambaId) || 'Ubicación por confirmar'}</p>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    {modalChambaData.ya_postule ? (
                      <>
                        <button
                          disabled
                          className="w-full cursor-not-allowed rounded-full bg-gray-300 px-5 py-2.5 text-sm font-bold text-gray-600"
                        >
                          Postulado
                        </button>
                        {modalChambaData.postulacion_id && (
                          <button
                            onClick={() => handleCancelarPostulacion(modalChambaData.postulacion_id!)}
                            className="text-xs text-red-600 underline hover:text-red-800"
                          >
                            Cancelar postulación
                          </button>
                        )}
                      </>
                    ) : modalChambaData.chamba.empleador_id !== userId ? (
                      <button
                        onClick={() => handlePostularEnModal(modalChambaData.chamba.id)}
                        disabled={postulandoId === modalChambaData.chamba.id}
                        className={`liftable w-full rounded-full px-5 py-2.5 text-sm font-bold text-white ${
                          postulandoId === modalChambaData.chamba.id
                            ? 'cursor-not-allowed bg-gray-400'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {postulandoId === modalChambaData.chamba.id ? 'Enviando…' : 'Postular'}
                      </button>
                    ) : null}
                  </div>

                  <p className="mt-3 text-center text-sm font-semibold text-gray-700">
                    Postulantes actuales:{' '}
                    <span className="font-extrabold text-blue-700">{modalChambaData.postulantes_count}</span>
                  </p>

                  {modalChambaData.chamba.empleador_id === userId && modalChambaData.puede_aprobar_cierre && (
                    <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold text-emerald-900">
                        El trabajador solicitó finalizar esta chamba. Para cerrar efectivamente, ambas valoraciones son obligatorias.
                      </p>
                      <p className="mt-2 text-xs font-semibold text-emerald-900">
                        Estado de valoraciones: empleador {modalChambaData.valoracion_empleador_completa ? '✓' : 'pendiente'} · trabajador {modalChambaData.valoracion_trabajador_completa ? '✓' : 'pendiente'}.
                      </p>

                      {!modalChambaData.ya_valore && modalChambaData.puede_valorar && (
                        <button
                          type="button"
                          onClick={abrirModalValoracion}
                          className="liftable mt-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700"
                        >
                          Calificar trabajador
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleAprobarCierreEmpleador}
                        disabled={gestionandoCierre || !modalChambaData.cierre_habilitado_por_valoraciones}
                        className={`liftable mt-2 rounded-full px-4 py-1.5 text-xs font-extrabold text-white ${
                          gestionandoCierre || !modalChambaData.cierre_habilitado_por_valoraciones
                            ? 'cursor-not-allowed bg-gray-400'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {gestionandoCierre ? 'Finalizando...' : 'Aprobar y finalizar'}
                      </button>

                      {!modalChambaData.cierre_habilitado_por_valoraciones ? (
                        <p className="mt-2 text-xs font-semibold text-amber-700">
                          No se puede finalizar hasta que empleador y trabajador registren su valoración.
                        </p>
                      ) : null}
                    </div>
                  )}

                  {modalChambaData.chamba.estado === 'FINALIZADA' && (
                    <div className="mt-4 rounded-xl border border-blue-300 bg-blue-50 p-3">
                      <p className="text-xs font-semibold text-blue-900">
                        {modalChambaData.ya_valore
                          ? 'Ya registraste tu valoración para esta chamba.'
                          : `Puedes valorar a ${modalChambaData.receptor_valoracion_nombre ?? 'la contraparte'}.`}
                      </p>
                      {!modalChambaData.ya_valore && modalChambaData.puede_valorar && (
                        <button
                          type="button"
                          onClick={abrirModalValoracion}
                          className="liftable mt-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700"
                        >
                          Dejar valoración
                        </button>
                      )}
                    </div>
                  )}

                  {mensajeCierre ? <p className="mt-2 text-xs font-semibold text-blue-700">{mensajeCierre}</p> : null}
                </>
              ) : null}
            </div>

            {/* Sección azul: postulantes (si eres el dueño) o perfil del empleador */}
            {modalChambaData && (
              <div className="rounded-b-2xl bg-blue-500 p-5 text-white">
                {modalChambaData.chamba.empleador_id === userId ? (
                  /* ── Vista del DUEÑO: tarjetas de postulantes ── */
                  <>
                    <h3 className="mb-4 text-center text-lg font-extrabold tracking-tight">
                      Postulantes ({modalChambaData.postulantes?.length ?? 0})
                    </h3>
                    {!modalChambaData.postulantes || modalChambaData.postulantes.length === 0 ? (
                      <p className="text-center text-sm text-blue-100">Aún no hay postulantes para esta chamba.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {modalChambaData.postulantes.map((p) => {
                          const nombre = `${p.trabajador.nombres?.split(' ')[0] ?? ''} ${p.trabajador.apellido_paterno ?? ''}`.trim();
                          const isPendiente = p.estado === 'PENDIENTE';
                          const isAceptado = p.estado === 'ACEPTADA';
                          const isRechazado = p.estado === 'RECHAZADA';
                          const ocupado = gestionandoPostulacion === p.postulacion_id;
                          return (
                            <div
                              key={p.postulacion_id}
                              className={`rounded-xl border p-3 transition ${
                                isRechazado
                                  ? 'border-white/10 bg-white/5 opacity-50'
                                  : isAceptado
                                  ? 'border-green-300/50 bg-green-500/20'
                                  : 'border-white/25 bg-white/15'
                              }`}
                            >
                              {/* Tarjeta clickable → ver perfil completo */}
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 text-left"
                                onClick={() => handleVerPerfilTrabajador(p.trabajador.id)}
                              >
                                <Avatar
                                  imageUrl={p.trabajador.imagen_url}
                                  name={nombre}
                                  alt={`Foto de ${nombre}`}
                                  className="h-12 w-12 shrink-0 rounded-full border-2 border-white/50 object-cover"
                                  fallbackClassName="text-sm"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-extrabold leading-tight">{nombre}</p>
                                  {p.trabajador.rut && (
                                    <p className="text-xs text-blue-100">{p.trabajador.rut}</p>
                                  )}
                                  {p.trabajador.email && (
                                    <p className="truncate text-[11px] text-blue-100">{p.trabajador.email}</p>
                                  )}
                                  {p.trabajador.telefono && (
                                    <p className="text-[11px] text-blue-100">{p.trabajador.telefono}</p>
                                  )}
                                  <p className="truncate text-[11px] text-blue-100">
                                    Dirección: {direccionComoTexto(p.trabajador.direccion_completa)}
                                  </p>
                                  <p className="text-sm font-black">
                                    ★{' '}
                                    {typeof p.trabajador.promedio_valoracion === 'number'
                                      ? p.trabajador.promedio_valoracion.toFixed(1).replace('.', ',')
                                      : '-'}
                                  </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                                  isAceptado
                                    ? 'bg-green-300 text-green-900'
                                    : isRechazado
                                    ? 'bg-red-200 text-red-800'
                                    : 'bg-yellow-200 text-yellow-900'
                                }`}>
                                  {isAceptado ? 'Aceptado' : isRechazado ? 'Rechazado' : 'Pendiente'}
                                </span>
                              </button>

                              {/* Botones Aprobar / Rechazar (solo si PENDIENTE) */}
                              {isPendiente && (
                                <div className="mt-2.5 flex gap-2">
                                  <button
                                    type="button"
                                    disabled={!!gestionandoPostulacion}
                                    onClick={() => handleAprobarPostulante(p.postulacion_id)}
                                    className={`liftable flex-1 rounded-full py-1.5 text-xs font-extrabold text-white transition ${
                                      ocupado ? 'cursor-not-allowed bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                                    }`}
                                  >
                                    {ocupado ? '…' : '✅ Aceptar'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!!gestionandoPostulacion}
                                    onClick={() => handleRechazarPostulante(p.postulacion_id)}
                                    className={`liftable flex-1 rounded-full py-1.5 text-xs font-extrabold text-white transition ${
                                      ocupado ? 'cursor-not-allowed bg-gray-400' : 'bg-red-500 hover:bg-red-600'
                                    }`}
                                  >
                                    {ocupado ? '…' : '❌ Rechazar'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  /* ── Vista del TRABAJADOR/VISITANTE: perfil del empleador ── */
                  <>
                    <h3 className="mb-4 text-center text-lg font-extrabold tracking-tight">Perfil del Empleador</h3>
                    <div className="mb-4 flex items-center gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <Avatar
                          imageUrl={modalChambaData.empleador.imagen_url}
                          name={`${modalChambaData.empleador.nombres} ${modalChambaData.empleador.apellido_paterno}`}
                          alt="Foto del empleador"
                          className="h-20 w-20 rounded-full border-4 border-white/50 object-cover"
                          fallbackClassName="text-xl"
                        />
                        <p className="text-xl font-black">
                          ☆{' '}
                          {typeof modalChambaData.empleador.promedio_valoracion === 'number'
                            ? modalChambaData.empleador.promedio_valoracion.toFixed(1).replace('.', ',')
                            : '-'}
                        </p>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-base font-extrabold leading-tight">
                          {modalChambaData.empleador.nombres} {modalChambaData.empleador.apellido_paterno}
                        </p>
                        {modalChambaData.empleador.rut && (
                          <p className="text-sm font-semibold text-blue-100">{modalChambaData.empleador.rut}</p>
                        )}
                        {modalChambaData.empleador.email && (
                          <p className="text-sm font-semibold text-blue-100">{modalChambaData.empleador.email}</p>
                        )}
                        {modalChambaData.empleador.telefono && (
                          <p className="text-sm font-semibold text-blue-100">{modalChambaData.empleador.telefono}</p>
                        )}
                        <p className="text-xs text-blue-100">
                          Nacimiento: <span className="font-bold text-white">{formatFechaSolo(modalChambaData.empleador.fecha_nacimiento)}</span>
                        </p>
                        <p className="text-xs text-blue-100">
                          Dirección:{' '}
                          <span className="font-bold text-white">{direccionComoTexto(modalChambaData.empleador.direccion_completa)}</span>
                        </p>
                        <p className="text-sm text-blue-100">
                          Publicaciones realizadas:{' '}
                          <span className="font-extrabold text-white">{modalChambaData.empleador.publicaciones_realizadas}</span>
                        </p>
                        <p className="text-sm text-blue-100">
                          Trabajos completados:{' '}
                          <span className="font-extrabold text-white">{modalChambaData.empleador.trabajos_completados}</span>
                        </p>
                      </div>
                    </div>

                    {modalChambaData.valoraciones.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {modalChambaData.valoraciones.map((val, i) => (
                          <div
                            key={i}
                            className="shrink-0 w-36 rounded-xl border border-white/25 bg-white/15 p-3 text-center"
                          >
                            <p className="text-lg font-extrabold">{val.estrellas}</p>
                            <p className="text-xs font-bold text-yellow-300">
                              {'★'.repeat(val.estrellas)}{'☆'.repeat(5 - val.estrellas)}
                            </p>
                            {val.comentario && (
                              <p className="mt-1 text-xs italic text-white/90 leading-tight line-clamp-2">&ldquo;{val.comentario}&rdquo;</p>
                            )}
                            <p className="mt-1.5 text-xs font-bold">{val.emisor_nombre}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal detalle chamba (chambas no visibles en el feed) */}
      {chambaDetalle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setChambaDetalle(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-6 shadow-[0_12px_40px_rgba(58,82,123,0.30)] text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b-2 border-dashed border-[#d6c989] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{chambaDetalle.rol === 'empleador' ? '📌' : '🤝'}</span>
                <h2 className="text-lg font-extrabold text-black leading-tight">{chambaDetalle.titulo}</h2>
              </div>
              <button
                onClick={() => setChambaDetalle(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-white/60 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm font-semibold text-gray-800">
              <p>💸 CLP$ {chambaDetalle.pago_clp.toLocaleString('es-CL')}</p>
              <p>Estado: <span className="rounded-full bg-white/65 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-blue-800">{chambaDetalle.estado.replace(/_/g, ' ')}</span></p>
              <p>Rol: <span className="font-bold text-blue-700">{chambaDetalle.rol === 'empleador' ? 'Mi publicación' : 'Postulado como trabajador'}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Modal publicar chamba */}
      {mostrarFormulario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancelar(); }}
        >
          <div className="w-full max-w-lg rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] shadow-[0_12px_40px_rgba(58,82,123,0.30)] p-6 text-gray-900">
            {/* Cabecera post-it */}
            <div className="mb-5 flex items-center gap-2.5 border-b-2 border-dashed border-[#d6c989] pb-3">
              <span className="text-2xl">📋</span>
              <h2 className="text-xl font-extrabold tracking-tight text-black">{chambaEditandoId ? 'Editar Chamba' : 'Publicar Chamba'}</h2>
            </div>

            {chambaEditandoId && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-100/90 px-4 py-3 text-sm text-amber-900">
                <p className="font-extrabold">Aviso importante</p>
                <p className="mt-1 font-semibold leading-snug">
                  Al guardar cambios, se eliminarán todas las postulaciones actuales de esta chamba antes de actualizarla.
                </p>
              </div>
            )}

            <form onSubmit={handlePublicar} className="flex flex-col gap-3.5">
              {/* Título */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Título *</label>
                <input
                  type="text"
                  name="titulo"
                  value={form.titulo}
                  onChange={handleFormChange}
                  required
                  minLength={8}
                  maxLength={255}
                  placeholder="Ej: Pintor de departamento, Gasfíter urgente…"
                  className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                />
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Descripción *</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleFormChange}
                  required
                  minLength={15}
                  rows={3}
                  placeholder="Detalla el trabajo a realizar…"
                  className="resize-none rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                />
              </div>

              {/* Pago y horario */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Pago CLP$ *</label>
                  <input
                    type="number"
                    name="pago_clp"
                    value={form.pago_clp}
                    onChange={handleFormChange}
                    required
                    min={1000}
                    placeholder="15000"
                    className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Fecha y hora *</label>
                  <input
                    type="datetime-local"
                    name="horario"
                    value={form.horario}
                    onChange={handleFormChange}
                    required
                    className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Dirección (opcional)</label>
                <input
                  type="text"
                  name="direccion_texto"
                  value={form.direccion_texto}
                  onChange={handleFormChange}
                  maxLength={255}
                  placeholder="Ej: Av. Providencia 1234, Santiago"
                  className="w-full rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-300/50"
                />
              </div>

              {/* GPS */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Ubicación GPS (opcional)</label>
                <button
                  type="button"
                  onClick={handleUsarGPS}
                  disabled={cargandoGPS}
                  className={`flex items-center gap-1 rounded-full border border-blue-400 px-2.5 py-0.5 text-xs font-bold transition ${
                    cargandoGPS
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  <span>{cargandoGPS ? '⏳' : '🛰️'}</span>
                  {cargandoGPS ? 'Obteniendo…' : 'Usar GPS'}
                </button>
              </div>

              {/* Fotos opcionales */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Fotos del lugar o chamba (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSeleccionFotos}
                  className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-xs text-gray-800 file:mr-3 file:rounded-full file:border-0 file:bg-blue-100 file:px-3 file:py-1.5 file:font-bold file:text-blue-700 hover:file:bg-blue-200"
                />
                {fotosAdjuntas.length > 0 && (
                  <p className="text-[11px] font-semibold text-blue-700">{fotosAdjuntas.length} foto(s) seleccionada(s). Máximo 4.</p>
                )}
                {fotosPreview.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {fotosPreview.map((src, index) => (
                      <img
                        key={`${src}-${index}`}
                        src={src}
                        alt={`Vista previa foto ${index + 1}`}
                        className="h-16 w-full rounded-lg border border-[#c9ba6a] object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {errorPublicar && (
                <p className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700">
                  ⚠️ {errorPublicar}
                </p>
              )}

              {erroresPublicacion.length > 0 && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {erroresPublicacion.map((detalle) => (
                    <p key={detalle}>• {detalle}</p>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div className="mt-1 flex gap-3 border-t-2 border-dashed border-[#d6c989] pt-4">
                <button
                  type="button"
                  onClick={handleCancelar}
                  className="liftable flex-1 rounded-full border-2 border-gray-400 bg-white/60 px-5 py-2 text-sm font-bold text-gray-700 hover:bg-white/90"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={publicando || erroresPublicacion.length > 0}
                  className={`liftable flex-1 rounded-full px-5 py-2 text-sm font-bold text-white ${
                    publicando || erroresPublicacion.length > 0
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {publicando ? (chambaEditandoId ? 'Guardando…' : 'Publicando…') : (chambaEditandoId ? '💾 Guardar cambios' : '📌 Publicar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!mostrarVistaTrabajadorEnObra && !mostrarVistaEmpleadorEnObra && (
      <div className="h-14 border-b border-blue-300/40 px-3 sm:px-6">
        <div className="mx-auto flex h-full max-w-4xl items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-6">
          <button
            onClick={() => setVista('listado')}
            className={`liftable rounded-lg px-3 py-1.5 text-sm font-semibold tracking-wide transition sm:px-5 sm:text-base ${
              vista === 'listado'
                ? 'bg-white/25 text-white underline underline-offset-8'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            Listado
          </button>
          <button
            onClick={() => setVista('mapa')}
            className={`liftable rounded-lg px-3 py-1.5 text-sm font-semibold tracking-wide transition sm:px-5 sm:text-base ${
              vista === 'mapa'
                ? 'bg-white/25 text-white underline underline-offset-8'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            Mapa
          </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Ver mis chambas */}
            <div ref={misChembasDropdownRef} className="relative">
              <button
                onClick={handleVerMisChambas}
                className="liftable flex items-center gap-1.5 rounded-full border border-white/40 bg-white/20 px-3 py-1.5 text-sm font-extrabold text-white hover:bg-white/30 sm:px-4"
              >
                <span className="text-base">📋</span>
                <span className="hidden sm:inline">Mis chambas</span>
                <span className="sm:hidden">Mías</span>
              </button>

              {mostrarMisChambas && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[270px] overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_8px_32px_rgba(30,64,175,0.22)]">
                  <div className="border-b border-gray-100 px-4 py-2.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-blue-700">
                      {filtroMisChambas === 'publicaciones'
                        ? 'Historial de publicaciones'
                        : filtroMisChambas === 'postulaciones'
                          ? 'Historial de trabajos'
                          : 'Mi historial de chambas'}
                    </p>
                  </div>

                  {cargandoMisChambas ? (
                    <p className="px-4 py-4 text-xs text-gray-400">Cargando…</p>
                  ) : misChambasFiltradas.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-gray-500">
                      {filtroMisChambas === 'publicaciones'
                        ? 'No tienes publicaciones históricas.'
                        : filtroMisChambas === 'postulaciones'
                          ? 'No tienes trabajos históricos.'
                          : 'No tienes chambas en tu historial.'}
                    </p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto">
                      {misChambasFiltradas.map((item) => (
                        <li key={item.id} className="border-b border-gray-50 last:border-0">
                          <button
                            type="button"
                            onClick={() => handleClickMiChamba(item)}
                            className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50 active:bg-blue-100"
                          >
                            <span className="mt-0.5 text-sm shrink-0">{item.rol === 'empleador' ? '📌' : '🤝'}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-gray-800">{item.titulo}</p>
                              <p className="text-[11px] text-gray-500">
                                CLP$ {item.pago_clp.toLocaleString('es-CL')}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                                  Chamba: {item.estado.replace(/_/g, ' ')}
                                </span>
                                {item.rol === 'postulante' && item.estado_postulacion ? (
                                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-blue-800">
                                    Postulación: {item.estado_postulacion.replace(/_/g, ' ')}
                                  </span>
                                ) : null}
                              </div>
                              {item.rol === 'postulante' && item.estado_postulacion ? (
                                <p className="mt-1 text-[10px] font-semibold text-gray-500">Se muestran ambos estados para evitar confusiones.</p>
                              ) : null}
                              {item.badge_alerta ? (
                                <p className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                                  {item.badge_alerta}
                                </p>
                              ) : null}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Publicar chamba */}
            <button
              onClick={() => {
                setChambaEditandoId(null);
                setForm(FORM_INICIAL);
                setErrorPublicar(null);
                setMostrarFormulario(true);
              }}
              className="liftable flex items-center gap-1.5 rounded-full bg-[#f0e3aa] px-4 py-1.5 text-sm font-extrabold text-gray-900 shadow-md hover:bg-[#ecdfa0] sm:px-5"
            >
              <span className="text-base">📌</span>
              <span className="hidden sm:inline">Publicar chamba</span>
              <span className="sm:hidden">Publicar</span>
            </button>
          </div>
        </div>
      </div>
      )}

      <div className="feed-scroll flex-1 overflow-y-auto px-3 py-3 sm:px-4 lg:px-6 lg:py-5">
        {cargandoChambaActivaTrabajador ? (
          <p className="mx-auto mt-10 text-center text-lg font-semibold text-blue-100">
            Cargando tu chamba activa...
          </p>
        ) : mostrarVistaTrabajadorEnObra && chambaActivaTrabajador ? (
          <section className="mx-auto w-full max-w-4xl rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-5 text-gray-900 shadow-[0_12px_40px_rgba(58,82,123,0.30)] sm:p-6">
            <div className="mb-4 border-b-2 border-dashed border-[#d6c989] pb-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-blue-700">Chamba en obra</p>
              <h2 className="mt-1 text-2xl font-extrabold leading-tight text-black">{chambaActivaTrabajador.chamba.titulo}</h2>
              <p className="mt-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700 inline-block">
                {chambaActivaTrabajador.chamba.estado.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#d6c989] bg-white/70 p-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Detalles de la chamba</h3>
                <p className="mt-2 text-sm font-semibold leading-snug text-gray-800">
                  {chambaActivaTrabajador.chamba.descripcion || 'Sin descripción disponible.'}
                </p>
                <div className="mt-3 space-y-1.5 text-sm font-bold text-gray-900">
                  <p>💰 CLP$ {chambaActivaTrabajador.chamba.pago_clp.toLocaleString('es-CL')}</p>
                  {(() => {
                    const { date, time } = formatDateAndTime(chambaActivaTrabajador.chamba.horario);
                    return <p>🕒 {date} | {time}</p>;
                  })()}
                  <p>📍 {chambaActivaTrabajador.chamba.direccion_texto || 'Ubicación por confirmar'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#d6c989] bg-white/70 p-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Empleador</h3>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar
                    imageUrl={chambaActivaTrabajador.empleador.imagen_url}
                    name={`${chambaActivaTrabajador.empleador.nombres} ${chambaActivaTrabajador.empleador.apellido_paterno}`}
                    alt="Foto del empleador"
                    className="h-12 w-12 rounded-full border-2 border-blue-200 object-cover"
                    fallbackClassName="text-sm"
                  />
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">
                      {chambaActivaTrabajador.empleador.nombres} {chambaActivaTrabajador.empleador.apellido_paterno}
                    </p>
                    {chambaActivaTrabajador.empleador.rut ? (
                      <p className="text-xs font-semibold text-gray-700">{chambaActivaTrabajador.empleador.rut}</p>
                    ) : null}
                    {chambaActivaTrabajador.empleador.email ? (
                      <p className="text-xs font-semibold text-gray-700">{chambaActivaTrabajador.empleador.email}</p>
                    ) : null}
                    {chambaActivaTrabajador.empleador.telefono ? (
                      <p className="text-xs font-semibold text-gray-700">{chambaActivaTrabajador.empleador.telefono}</p>
                    ) : null}
                    <p className="text-[11px] text-gray-700">
                      Nacimiento: {formatFechaSolo(chambaActivaTrabajador.empleador.fecha_nacimiento)}
                    </p>
                    <p className="text-[11px] text-gray-700">
                      Dirección: {direccionComoTexto(chambaActivaTrabajador.empleador.direccion_completa)}
                    </p>
                    <p className="text-sm font-black text-gray-900">
                      ☆{' '}
                      {typeof chambaActivaTrabajador.empleador.promedio_valoracion === 'number'
                        ? chambaActivaTrabajador.empleador.promedio_valoracion.toFixed(1).replace('.', ',')
                        : '-'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleContactarEmpleador}
                  className="liftable mt-4 w-full rounded-full bg-blue-500 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-600"
                >
                  Contactar al empleador
                </button>
                {mensajeContacto ? (
                  <p className="mt-2 text-xs font-semibold text-blue-700">{mensajeContacto}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-[#d6c989] bg-white/70 p-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Subir evidencias</h3>
              <p className="mt-1 text-xs font-semibold text-gray-600">
                Adjunta fotos o archivos de avance de la chamba para dejar respaldo.
              </p>

              <div className="mt-3 space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSeleccionEvidencias}
                  className="w-full rounded-lg border border-[#c9ba6a] bg-white/80 px-3 py-2 text-xs text-gray-800 file:mr-3 file:rounded-full file:border-0 file:bg-blue-100 file:px-3 file:py-1.5 file:font-bold file:text-blue-700 hover:file:bg-blue-200"
                />

                {evidenciasPreview.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {evidenciasPreview.map((src, index) => (
                      <img
                        key={`${src}-${index}`}
                        src={src}
                        alt={`Evidencia ${index + 1}`}
                        className="h-20 w-full rounded-lg border border-[#c9ba6a] object-cover"
                      />
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSubirEvidencias}
                  disabled={subiendoEvidencias || evidenciasAdjuntas.length === 0}
                  className={`liftable rounded-full px-5 py-2 text-sm font-bold text-white ${
                    subiendoEvidencias || evidenciasAdjuntas.length === 0
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {subiendoEvidencias ? 'Subiendo...' : 'Guardar evidencias'}
                </button>

                {mensajeEvidencias ? (
                  <p className="text-xs font-semibold text-blue-700">{mensajeEvidencias}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#d6c989] bg-white/70 p-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Cierre de chamba</h3>
              {chambaActivaTrabajador.puede_solicitar_cierre ? (
                <button
                  type="button"
                  onClick={handleSolicitarCierreTrabajador}
                  disabled={gestionandoCierre}
                  className={`liftable mt-3 rounded-full px-5 py-2 text-sm font-bold text-white ${
                    gestionandoCierre ? 'cursor-not-allowed bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {gestionandoCierre ? 'Enviando...' : 'Solicitar finalización'}
                </button>
              ) : (
                <p className="mt-2 text-xs font-semibold text-gray-700">
                  {chambaActivaTrabajador.chamba.estado === 'ESPERANDO_APROBACION'
                    ? 'Ya solicitaste la finalización. Espera la aprobación del empleador.'
                    : chambaActivaTrabajador.chamba.estado === 'FINALIZADA'
                    ? 'Esta chamba ya fue finalizada.'
                    : 'Cuando termines el trabajo, podrás solicitar la finalización.'}
                </p>
              )}

              {(chambaActivaTrabajador.chamba.estado === 'ESPERANDO_APROBACION' || chambaActivaTrabajador.chamba.estado === 'FINALIZADA') && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-bold text-blue-800">
                    {chambaActivaTrabajador.ya_valore
                      ? 'Ya registraste tu valoración para esta chamba.'
                      : `Debes valorar a ${chambaActivaTrabajador.receptor_valoracion_nombre ?? 'la contraparte'} para completar el cierre.`}
                  </p>
                  {!chambaActivaTrabajador.ya_valore && chambaActivaTrabajador.puede_valorar && (
                    <button
                      type="button"
                      onClick={abrirModalValoracion}
                      className="liftable mt-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700"
                    >
                      Valorar ahora
                    </button>
                  )}
                </div>
              )}

              {mensajeCierre ? <p className="mt-2 text-xs font-semibold text-blue-700">{mensajeCierre}</p> : null}
            </div>
          </section>
        ) : mostrarVistaEmpleadorEnObra && chambaActivaEmpleador ? (
          <section className="mx-auto w-full max-w-4xl rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-5 text-gray-900 shadow-[0_12px_40px_rgba(58,82,123,0.30)] sm:p-6">
            <div className="mb-4 border-b-2 border-dashed border-[#d6c989] pb-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-blue-700">Chamba en obra</p>
              <h2 className="mt-1 text-2xl font-extrabold leading-tight text-black">{chambaActivaEmpleador.chamba.titulo}</h2>
              <p className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                {chambaActivaEmpleador.chamba.estado.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#d6c989] bg-white/70 p-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Detalles de la chamba</h3>
                <p className="mt-2 text-sm font-semibold leading-snug text-gray-800">
                  {chambaActivaEmpleador.chamba.descripcion || 'Sin descripción disponible.'}
                </p>
                <div className="mt-3 space-y-1.5 text-sm font-bold text-gray-900">
                  <p>💰 CLP$ {chambaActivaEmpleador.chamba.pago_clp.toLocaleString('es-CL')}</p>
                  {(() => {
                    const { date, time } = formatDateAndTime(chambaActivaEmpleador.chamba.horario);
                    return <p>🕒 {date} | {time}</p>;
                  })()}
                  <p>📍 {chambaActivaEmpleador.chamba.direccion_texto || 'Ubicación por confirmar'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#d6c989] bg-white/70 p-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Trabajador activo</h3>
                {chambaActivaEmpleador.trabajador_activo ? (
                  <div className="mt-2 space-y-3">
                    <p className="text-sm font-bold text-gray-900">
                      {chambaActivaEmpleador.trabajador_activo.nombres} {chambaActivaEmpleador.trabajador_activo.apellido_paterno}
                    </p>
                    {chambaActivaEmpleador.trabajador_activo.rut ? (
                      <p className="text-xs font-semibold text-gray-700">{chambaActivaEmpleador.trabajador_activo.rut}</p>
                    ) : null}
                    {chambaActivaEmpleador.trabajador_activo.email ? (
                      <p className="text-xs font-semibold text-gray-700">{chambaActivaEmpleador.trabajador_activo.email}</p>
                    ) : null}
                    {chambaActivaEmpleador.trabajador_activo.telefono ? (
                      <p className="text-xs font-semibold text-gray-700">{chambaActivaEmpleador.trabajador_activo.telefono}</p>
                    ) : null}
                    <p className="text-[11px] text-gray-700">
                      Nacimiento: {formatFechaSolo(chambaActivaEmpleador.trabajador_activo.fecha_nacimiento)}
                    </p>
                    <p className="text-[11px] text-gray-700">
                      Dirección: {direccionComoTexto(chambaActivaEmpleador.trabajador_activo.direccion_completa)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleVerPerfilTrabajador(chambaActivaEmpleador.trabajador_activo!.id)}
                      className="liftable w-full rounded-full bg-blue-500 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-600"
                    >
                      Ver perfil del trabajador
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-gray-600">Aún no hay trabajador activo para esta chamba.</p>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#d6c989] bg-white/70 p-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Completar chamba</h3>

              {chambaActivaEmpleador.chamba.estado === 'ESPERANDO_APROBACION' ? (
                <>
                  <p className="mt-2 text-xs font-semibold text-gray-700">
                    El trabajador ya envió su evidencia y solicitó cierre. Para cerrar efectivamente, empleador y trabajador deben calificarse mutuamente.
                  </p>
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-800">
                    <p>
                      Estado de valoraciones: empleador {chambaActivaEmpleador.valoracion_empleador_completa ? '✓' : 'pendiente'} · trabajador {chambaActivaEmpleador.valoracion_trabajador_completa ? '✓' : 'pendiente'}.
                    </p>
                  </div>

                  {!chambaActivaEmpleador.ya_valore && chambaActivaEmpleador.puede_valorar ? (
                    <button
                      type="button"
                      onClick={abrirModalValoracion}
                      className="liftable mt-3 rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      Calificar trabajador
                    </button>
                  ) : null}

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleContactarSoporte}
                      className="liftable rounded-full border border-blue-300 bg-white px-5 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                    >
                      Contactar a soporte
                    </button>
                    <button
                      type="button"
                      onClick={handleCompletarChambaEmpleador}
                      disabled={gestionandoCierre || !chambaActivaEmpleador.cierre_habilitado_por_valoraciones}
                      className={`liftable rounded-full px-5 py-2 text-sm font-bold text-white ${
                        gestionandoCierre || !chambaActivaEmpleador.cierre_habilitado_por_valoraciones
                          ? 'cursor-not-allowed bg-gray-400'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {gestionandoCierre ? 'Completando...' : 'Completar chamba (efectuar pago)'}
                    </button>
                  </div>

                  {!chambaActivaEmpleador.cierre_habilitado_por_valoraciones ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      No se puede completar la chamba hasta que ambas valoraciones estén registradas.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-xs font-semibold text-gray-700">
                  Esperando que el trabajador envíe evidencia para habilitar la finalización y pago de esta chamba.
                </p>
              )}

              {mensajeCierre ? <p className="mt-2 text-xs font-semibold text-blue-700">{mensajeCierre}</p> : null}
            </div>
          </section>
        ) : vista === 'listado' ? (
          chambasList.length > 0 ? (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3.5">
              {chambasList.map((chamba) => {
                const horario = formatDateAndTime(chamba.horario);

                return (
                  <article
                    key={chamba.id}
                    ref={(el) => {
                      if (el) articulosRef.current.set(chamba.id, el);
                      else articulosRef.current.delete(chamba.id);
                    }}
                    onClick={() => handleAbrirDetalle(chamba.id)}
                    className={`liftable relative cursor-pointer rounded-xl border px-3.5 py-3.5 text-gray-900 shadow-[0_8px_18px_rgba(58,82,123,0.18)] sm:px-4 transition-all duration-300 ${
                      destacadoId === chamba.id
                        ? 'border-blue-500 bg-[#f0e3aa] ring-2 ring-blue-400 ring-offset-2'
                        : 'border-[#d7cc83] bg-[#f0e3aa]'
                    }`}
                  >
                    {chamba.empleador_id === userId && (
                      <div ref={menuOpcionesId === chamba.id ? opcionesDropdownRef : undefined} className="absolute right-2 top-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpcionesId((prev) => (prev === chamba.id ? null : chamba.id));
                          }}
                          disabled={eliminandoId === chamba.id}
                          aria-label="Opciones de la publicación"
                          title="Opciones"
                          className={`rounded-full border bg-white/85 px-2.5 py-1 text-sm font-black transition ${
                            eliminandoId === chamba.id
                              ? 'cursor-not-allowed border-gray-200 text-gray-400'
                              : 'border-blue-100 text-gray-700 hover:bg-white'
                          }`}
                        >
                          {eliminandoId === chamba.id ? '…' : '⋯'}
                        </button>

                        {menuOpcionesId === chamba.id && (
                          <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[170px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditarChamba(chamba);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-gray-700 transition hover:bg-blue-50"
                            >
                              <span>✏️</span>
                              <span>Editar chamba</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminarChamba(chamba.id);
                              }}
                              className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
                            >
                              <span>🗑</span>
                              <span>Eliminarla</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex min-w-[100px] items-center gap-2 border-b border-dashed border-[#d6c989] pb-2.5 sm:mr-3 sm:min-h-[100px] sm:w-[118px] sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                        <Avatar
                          imageUrl={chamba.empleador_imagen_url}
                          name={`${chamba.empleador?.nombres || ''} ${chamba.empleador?.apellido_paterno || ''}`.trim()}
                          alt="Foto del empleador"
                          className="h-10 w-10 rounded-full border-2 border-blue-200 object-cover"
                          fallbackClassName="text-xs"
                        />
                        <div>
                          <p className="text-xs font-extrabold text-gray-900 sm:text-sm">
                            {chamba.empleador?.nombres
                              ? `${chamba.empleador.nombres.split(/\s+/)[0]} ${chamba.empleador.apellido_paterno || ''}`.trim()
                              : 'Empleador'}
                          </p>
                          <p className="text-base font-black text-gray-900 sm:text-lg">
                            ☆{' '}
                            {typeof chamba.empleador?.promedio_valoracion === 'number'
                              ? chamba.empleador.promedio_valoracion.toFixed(1).replace('.', ',')
                              : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <h3 className="text-base font-extrabold leading-tight text-black sm:text-xl">{chamba.titulo}</h3>
                          <span className="rounded-full bg-white/65 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-800">
                            {chamba.estado}
                          </span>
                        </div>

                        <p className="text-xs leading-snug text-gray-800 sm:text-sm">{chamba.descripcion || 'Sin descripción disponible.'}</p>

                        <div className="space-y-1 text-xs font-bold text-gray-900 sm:text-sm">
                          <p>💰 CLP$ {chamba.pago_clp.toLocaleString('es-CL')}</p>
                          <p>🕒 {horario.date} | {horario.time}</p>
                          <p>📍 {
                            chamba.direccion_texto ||
                            localidades.get(chamba.id) ||
                            (chamba.ubicacion_lat ? '📡 Cargando localidad…' : 'Ubicación por confirmar')
                          }</p>
                        </div>

                        <div className="pt-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePostular(chamba.id); }}
                            disabled={postulandoId === chamba.id}
                            className={`liftable w-full rounded-full px-5 py-2 text-sm font-semibold text-white sm:w-auto ${
                              postulandoId === chamba.id
                                ? 'cursor-not-allowed bg-gray-400'
                                : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                          >
                            {postulandoId === chamba.id ? 'Enviando...' : 'Postular'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mx-auto mt-10 text-center text-lg font-semibold text-blue-100">
              No hay chambas disponibles en este momento.
            </p>
          )
        ) : (
          <div className="mx-auto w-full max-w-5xl">
            <MapPanel
              onSelectChamba={(id) => {
                setVista('listado');
                handleAbrirDetalle(id);
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}