"use client";

import { FormEvent, useMemo, useState } from "react";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

const headingFont = Space_Grotesk({ subsets: ["latin"], weight: ["400", "600", "700"] });
const monoFont = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

type EndpointMethod = "GET" | "POST" | "PATCH";

type EndpointConfig = {
  id: string;
  method: EndpointMethod;
  path: string;
  title: string;
  description: string;
  sampleBody: string;
  pathParamLabel?: string;
  pathParamPlaceholder?: string;
};

type TesterState = {
  body: string;
  pathParam: string;
  loading: boolean;
  status: number | null;
  statusText: string;
  responseText: string;
  error: string;
};

const ENDPOINTS: EndpointConfig[] = [
  {
    id: "registro",
    method: "POST",
    path: "/api/auth/registro",
    title: "Registro de Usuario",
    description: "Crea usuario en Auth y en tabla usuarios. Valida RUT, email y edad.",
    sampleBody: JSON.stringify(
      {
        rut: "11111111-1",
        email: "persona@demo.cl",
        password: "12345678",
        nombres: "Ana",
        apellidoPaterno: "Perez",
        apellidoMaterno: "Soto",
        telefono: "+56912345678",
        fechaNacimiento: "2000-05-10",
        direccion: "Santiago Centro",
      },
      null,
      2
    ),
  },
  {
    id: "login",
    method: "POST",
    path: "/api/auth/login",
    title: "Login",
    description: "Autentica con email y password en Supabase Auth.",
    sampleBody: JSON.stringify(
      {
        email: "persona@demo.cl",
        password: "12345678",
      },
      null,
      2
    ),
  },
  {
    id: "chambasPost",
    method: "POST",
    path: "/api/chambas",
    title: "Publicar Chamba",
    description: "Crea una chamba. Aplica limite de maximo 5 activas por empleador.",
    sampleBody: JSON.stringify(
      {
        empleador_id: "uuid-empleador",
        titulo: "Ayuda para mudanza",
        descripcion: "Necesito apoyo por 3 horas.",
        pago_clp: 25000,
        horario: "Sabado 09:00",
        ubicacion_lat: -33.4489,
        ubicacion_lng: -70.6693,
        direccion_texto: "Providencia, Santiago",
      },
      null,
      2
    ),
  },
  {
    id: "chambasGet",
    method: "GET",
    path: "/api/chambas",
    title: "Listar Chambas Publicadas",
    description: "Obtiene todas las chambas en estado PUBLICADA.",
    sampleBody: "",
  },
  {
    id: "postulacionesPost",
    method: "POST",
    path: "/api/postulaciones",
    title: "Crear Postulacion",
    description: "Postula a una chamba. El trabajador solo puede tener 1 postulacion activa/aceptada.",
    sampleBody: JSON.stringify(
      {
        chamba_id: "uuid-chamba",
        trabajador_id: "uuid-trabajador",
      },
      null,
      2
    ),
  },
  {
    id: "postulacionesPatch",
    method: "PATCH",
    path: "/api/postulaciones/{id}",
    title: "Aceptar Postulacion por ID",
    description: "Acepta la postulacion, rechaza las otras de la chamba y pasa la chamba a EN_OBRA.",
    sampleBody: JSON.stringify(
      {
        accion: "ACEPTAR",
      },
      null,
      2
    ),
    pathParamLabel: "ID de la postulacion",
    pathParamPlaceholder: "uuid-postulacion",
  },
  {
    id: "valoracionesPost",
    method: "POST",
    path: "/api/valoraciones",
    title: "Crear Valoracion",
    description: "Registra valoracion de 1 a 5 estrellas. Comentario es opcional.",
    sampleBody: JSON.stringify(
      {
        chamba_id: "uuid-chamba",
        emisor_id: "uuid-emisor",
        receptor_id: "uuid-receptor",
        estrellas: 5,
        comentario: "Excelente trabajo",
      },
      null,
      2
    ),
  },
];

function methodStyle(method: EndpointMethod) {
  if (method === "GET") return "bg-emerald-500";
  if (method === "POST") return "bg-sky-500";
  return "bg-amber-500";
}

export default function Home() {
  const initialState = useMemo(() => {
    return ENDPOINTS.reduce<Record<string, TesterState>>((acc, endpoint) => {
      acc[endpoint.id] = {
        body: endpoint.sampleBody,
        pathParam: "",
        loading: false,
        status: null,
        statusText: "",
        responseText: "Sin respuesta aun.",
        error: "",
      };
      return acc;
    }, {});
  }, []);

  const [states, setStates] = useState<Record<string, TesterState>>(initialState);

  const updateState = (id: string, patch: Partial<TesterState>) => {
    setStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const runEndpoint = async (event: FormEvent<HTMLFormElement>, endpoint: EndpointConfig) => {
    event.preventDefault();

    const current = states[endpoint.id];
    let url = endpoint.path;

    if (endpoint.path.includes("{id}")) {
      const idValue = current.pathParam.trim();
      if (!idValue) {
        updateState(endpoint.id, {
          error: "Debes indicar el ID de la URL para este endpoint.",
        });
        return;
      }
      url = endpoint.path.replace("{id}", encodeURIComponent(idValue));
    }

    updateState(endpoint.id, {
      loading: true,
      error: "",
      status: null,
      statusText: "",
    });

    const options: RequestInit = {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (endpoint.method !== "GET") {
      try {
        const parsed = JSON.parse(current.body || "{}");
        options.body = JSON.stringify(parsed);
      } catch {
        updateState(endpoint.id, {
          loading: false,
          error: "El body no es JSON valido.",
        });
        return;
      }
    }

    try {
      const response = await fetch(url, options);
      const raw = await response.text();

      let formatted = raw;
      if (raw) {
        try {
          formatted = JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          formatted = raw;
        }
      }

      updateState(endpoint.id, {
        loading: false,
        status: response.status,
        statusText: response.statusText,
        responseText: formatted || "Sin contenido en la respuesta.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      updateState(endpoint.id, {
        loading: false,
        error: `No se pudo conectar con la API: ${message}`,
      });
    }
  };

  return (
    <div
      className={`${headingFont.className} min-h-screen bg-[radial-gradient(circle_at_20%_10%,#ffe7bd_0%,#fff8ea_28%,#f8fbff_60%,#ecf4ff_100%)] px-5 py-8 text-zinc-900 md:px-10 md:py-10`}
    >
      <main className="mx-auto w-full max-w-7xl">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_12px_50px_rgba(20,30,60,0.12)] backdrop-blur md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">ChambaNET API Lab</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">
            Frontend unico para probar todas las funciones de la API
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-zinc-700 md:text-base">
            Cada tarjeta dispara un endpoint real de tu backend. Puedes editar el JSON, ejecutar la peticion y revisar
            el status + respuesta inmediatamente.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {ENDPOINTS.map((endpoint) => {
            const state = states[endpoint.id];

            return (
              <form
                key={endpoint.id}
                onSubmit={(event) => void runEndpoint(event, endpoint)}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.07)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{endpoint.title}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white ${methodStyle(endpoint.method)}`}
                  >
                    {endpoint.method}
                  </span>
                </div>

                <p className="mt-2 text-sm text-zinc-600">{endpoint.description}</p>
                <p className={`mt-2 text-xs text-zinc-500 ${monoFont.className}`}>{endpoint.path}</p>

                {endpoint.pathParamLabel ? (
                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      {endpoint.pathParamLabel}
                    </label>
                    <input
                      type="text"
                      value={state.pathParam}
                      placeholder={endpoint.pathParamPlaceholder}
                      onChange={(event) => updateState(endpoint.id, { pathParam: event.target.value })}
                      className={`w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${monoFont.className}`}
                    />
                  </div>
                ) : null}

                {endpoint.method !== "GET" ? (
                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">Body JSON</label>
                    <textarea
                      value={state.body}
                      onChange={(event) => updateState(endpoint.id, { body: event.target.value })}
                      rows={9}
                      className={`w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${monoFont.className}`}
                    />
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={state.loading}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    {state.loading ? "Probando..." : "Probar endpoint"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateState(endpoint.id, { body: endpoint.sampleBody, error: "" })}
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Cargar ejemplo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateState(endpoint.id, {
                        status: null,
                        statusText: "",
                        responseText: "Sin respuesta aun.",
                        error: "",
                      })
                    }
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Limpiar salida
                  </button>
                </div>

                {state.error ? (
                  <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
                ) : null}

                <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
                  <div className="flex items-center justify-between bg-zinc-100 px-3 py-2 text-xs">
                    <span className="font-semibold text-zinc-700">Respuesta</span>
                    <span className={`${monoFont.className} text-zinc-600`}>
                      {state.status !== null ? `${state.status} ${state.statusText}` : "Sin ejecutar"}
                    </span>
                  </div>
                  <pre
                    className={`${monoFont.className} max-h-64 overflow-auto bg-zinc-900 p-3 text-xs leading-relaxed text-emerald-200`}
                  >
                    {state.responseText}
                  </pre>
                </div>
              </form>
            );
          })}
        </section>
      </main>
    </div>
  );
}
