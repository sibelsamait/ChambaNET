"use client";

import { FormEvent, useMemo, useState } from "react";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

const headingFont = Space_Grotesk({ subsets: ["latin"], weight: ["400", "600", "700"] });
const monoFont = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

type EndpointMethod = "GET" | "POST" | "PATCH";

type FieldType = "text" | "email" | "password" | "number" | "textarea" | "date";

type FieldConfig = {
  key: string;
  label: string;
  placeholder: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: string;
};

type EndpointConfig = {
  id: string;
  method: EndpointMethod;
  path: string;
  title: string;
  subtitle: string;
  actionText: string;
  successHint: string;
  fields: FieldConfig[];
  pathParamLabel?: string;
  pathParamPlaceholder?: string;
  pathParamDefault?: string;
};

type FlowStep = {
  id: string;
  endpointId: EndpointConfig["id"];
  label: string;
  hint: string;
};

type TesterState = {
  formValues: Record<string, string>;
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
    subtitle: "Crea cuenta completa con validaciones de RUT, correo y edad.",
    actionText: "Crear cuenta",
    successHint: "Si todo sale bien, retorna 201 y mensaje de registro exitoso.",
    fields: [
      { key: "rut", label: "RUT", placeholder: "11111111-1", type: "text", required: true, defaultValue: "11111111-1" },
      {
        key: "email",
        label: "Correo",
        placeholder: "persona@demo.cl",
        type: "email",
        required: true,
        defaultValue: "persona@demo.cl",
      },
      {
        key: "password",
        label: "Contrasena",
        placeholder: "12345678",
        type: "password",
        required: true,
        defaultValue: "12345678",
      },
      { key: "nombres", label: "Nombres", placeholder: "Ana", type: "text", required: true, defaultValue: "Ana" },
      {
        key: "apellidoPaterno",
        label: "Apellido paterno",
        placeholder: "Perez",
        type: "text",
        required: true,
        defaultValue: "Perez",
      },
      {
        key: "apellidoMaterno",
        label: "Apellido materno",
        placeholder: "Soto",
        type: "text",
        required: true,
        defaultValue: "Soto",
      },
      {
        key: "telefono",
        label: "Telefono",
        placeholder: "+56912345678",
        type: "text",
        required: true,
        defaultValue: "+56912345678",
      },
      {
        key: "fechaNacimiento",
        label: "Fecha nacimiento",
        placeholder: "2000-05-10",
        type: "date",
        required: true,
        defaultValue: "2000-05-10",
      },
      {
        key: "direccion",
        label: "Direccion",
        placeholder: "Santiago Centro",
        type: "text",
        required: true,
        defaultValue: "Santiago Centro",
      },
    ],
  },
  {
    id: "login",
    method: "POST",
    path: "/api/auth/login",
    title: "Login",
    subtitle: "Inicia sesion para validar credenciales de acceso.",
    actionText: "Iniciar sesion",
    successHint: "Si es correcto, retorna 200 con sesion y usuario.",
    fields: [
      {
        key: "email",
        label: "Correo",
        placeholder: "persona@demo.cl",
        type: "email",
        required: true,
        defaultValue: "persona@demo.cl",
      },
      {
        key: "password",
        label: "Contrasena",
        placeholder: "12345678",
        type: "password",
        required: true,
        defaultValue: "12345678",
      },
    ],
  },
  {
    id: "chambasPost",
    method: "POST",
    path: "/api/chambas",
    title: "Publicar Chamba",
    subtitle: "Publica una oferta. El sistema limita a maximo 5 activas por empleador.",
    actionText: "Publicar chamba",
    successHint: "Si sale bien, retorna 201 con la chamba creada.",
    fields: [
      {
        key: "empleador_id",
        label: "ID empleador",
        placeholder: "uuid-empleador",
        type: "text",
        required: true,
        defaultValue: "uuid-empleador",
      },
      {
        key: "titulo",
        label: "Titulo",
        placeholder: "Ayuda para mudanza",
        type: "text",
        required: true,
        defaultValue: "Ayuda para mudanza",
      },
      {
        key: "descripcion",
        label: "Descripcion",
        placeholder: "Necesito apoyo por 3 horas.",
        type: "textarea",
        defaultValue: "Necesito apoyo por 3 horas.",
      },
      {
        key: "pago_clp",
        label: "Pago CLP",
        placeholder: "25000",
        type: "number",
        required: true,
        defaultValue: "25000",
      },
      {
        key: "horario",
        label: "Horario",
        placeholder: "Sabado 09:00",
        type: "text",
        defaultValue: "Sabado 09:00",
      },
      {
        key: "ubicacion_lat",
        label: "Latitud",
        placeholder: "-33.4489",
        type: "number",
        defaultValue: "-33.4489",
      },
      {
        key: "ubicacion_lng",
        label: "Longitud",
        placeholder: "-70.6693",
        type: "number",
        defaultValue: "-70.6693",
      },
      {
        key: "direccion_texto",
        label: "Direccion texto",
        placeholder: "Providencia, Santiago",
        type: "text",
        defaultValue: "Providencia, Santiago",
      },
    ],
  },
  {
    id: "chambasGet",
    method: "GET",
    path: "/api/chambas",
    title: "Listar Chambas Publicadas",
    subtitle: "Consulta todas las chambas que estan en estado PUBLICADA.",
    actionText: "Consultar chambas",
    successHint: "Debe retornar 200 con total y lista de chambas.",
    fields: [],
  },
  {
    id: "postulacionesPost",
    method: "POST",
    path: "/api/postulaciones",
    title: "Crear Postulacion",
    subtitle: "Envia una postulacion. Solo una activa por trabajador.",
    actionText: "Enviar postulacion",
    successHint: "Si se crea, retorna 201 con la postulacion.",
    fields: [
      {
        key: "chamba_id",
        label: "ID chamba",
        placeholder: "uuid-chamba",
        type: "text",
        required: true,
        defaultValue: "uuid-chamba",
      },
      {
        key: "trabajador_id",
        label: "ID trabajador",
        placeholder: "uuid-trabajador",
        type: "text",
        required: true,
        defaultValue: "uuid-trabajador",
      },
    ],
  },
  {
    id: "postulacionesPatch",
    method: "PATCH",
    path: "/api/postulaciones/{id}",
    title: "Aceptar Postulacion por ID",
    subtitle: "Aprueba una postulacion, rechaza las otras y activa EN_OBRA.",
    actionText: "Aceptar postulacion",
    successHint: "Retorna 200 si el flujo de aceptacion termina bien.",
    fields: [
      {
        key: "accion",
        label: "Accion",
        placeholder: "ACEPTAR",
        type: "text",
        required: true,
        defaultValue: "ACEPTAR",
      },
    ],
    pathParamLabel: "ID de la postulacion",
    pathParamPlaceholder: "uuid-postulacion",
    pathParamDefault: "uuid-postulacion",
  },
  {
    id: "valoracionesPost",
    method: "POST",
    path: "/api/valoraciones",
    title: "Crear Valoracion",
    subtitle: "Califica el trabajo con estrellas entre 1 y 5.",
    actionText: "Registrar valoracion",
    successHint: "Si valida el rango, retorna 201 con la valoracion creada.",
    fields: [
      {
        key: "chamba_id",
        label: "ID chamba",
        placeholder: "uuid-chamba",
        type: "text",
        required: true,
        defaultValue: "uuid-chamba",
      },
      {
        key: "emisor_id",
        label: "ID emisor",
        placeholder: "uuid-emisor",
        type: "text",
        required: true,
        defaultValue: "uuid-emisor",
      },
      {
        key: "receptor_id",
        label: "ID receptor",
        placeholder: "uuid-receptor",
        type: "text",
        required: true,
        defaultValue: "uuid-receptor",
      },
      {
        key: "estrellas",
        label: "Estrellas",
        placeholder: "5",
        type: "number",
        required: true,
        defaultValue: "5",
      },
      {
        key: "comentario",
        label: "Comentario",
        placeholder: "Excelente trabajo",
        type: "textarea",
        defaultValue: "Excelente trabajo",
      },
    ],
  },
];

const FLOW_STEPS: FlowStep[] = [
  {
    id: "paso-1",
    endpointId: "registro",
    label: "Paso 1: Registro",
    hint: "Crea una cuenta base para iniciar el recorrido.",
  },
  {
    id: "paso-2",
    endpointId: "login",
    label: "Paso 2: Login",
    hint: "Obtiene sesion y usuario para reutilizar el ID.",
  },
  {
    id: "paso-3",
    endpointId: "chambasPost",
    label: "Paso 3: Publicar chamba",
    hint: "Publica una oferta y guarda automaticamente el ID de la chamba.",
  },
  {
    id: "paso-4",
    endpointId: "chambasGet",
    label: "Paso 4: Listar chambas",
    hint: "Verifica que la chamba publicada aparezca en listados.",
  },
  {
    id: "paso-5",
    endpointId: "postulacionesPost",
    label: "Paso 5: Postular",
    hint: "Crea la postulacion usando el ID de chamba capturado.",
  },
  {
    id: "paso-6",
    endpointId: "postulacionesPatch",
    label: "Paso 6: Aceptar postulacion",
    hint: "Acepta la postulacion usando el ID capturado automaticamente.",
  },
  {
    id: "paso-7",
    endpointId: "valoracionesPost",
    label: "Paso 7: Valorar",
    hint: "Cierra el flujo calificando el trabajo.",
  },
];

function methodStyle(method: EndpointMethod) {
  if (method === "GET") return "bg-emerald-500";
  if (method === "POST") return "bg-sky-500";
  return "bg-amber-500";
}

function toPayload(fields: FieldConfig[], values: Record<string, string>) {
  return fields.reduce<Record<string, string | number>>((acc, field) => {
    const raw = values[field.key] ?? "";

    if (raw === "") {
      return acc;
    }

    if (field.type === "number") {
      acc[field.key] = Number(raw);
      return acc;
    }

    acc[field.key] = raw;
    return acc;
  }, {});
}

function getEndpointById(id: string) {
  return ENDPOINTS.find((endpoint) => endpoint.id === id);
}

export default function Home() {
  const initialState = useMemo(() => {
    return ENDPOINTS.reduce<Record<string, TesterState>>((acc, endpoint) => {
      const initialValues = endpoint.fields.reduce<Record<string, string>>((fieldAcc, field) => {
        fieldAcc[field.key] = field.defaultValue ?? "";
        return fieldAcc;
      }, {});

      acc[endpoint.id] = {
        formValues: initialValues,
        pathParam: endpoint.pathParamDefault ?? "",
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
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const updateState = (id: string, patch: Partial<TesterState>) => {
    setStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const updateField = (endpointId: string, fieldKey: string, value: string) => {
    setStates((prev) => ({
      ...prev,
      [endpointId]: {
        ...prev[endpointId],
        formValues: {
          ...prev[endpointId].formValues,
          [fieldKey]: value,
        },
      },
    }));
  };

  const hydrateFlowData = (endpointId: string, payload: unknown) => {
    if (!payload || typeof payload !== "object") {
      return;
    }

    const data = payload as Record<string, unknown>;

    if (endpointId === "login") {
      const userCandidate = data.user;
      if (userCandidate && typeof userCandidate === "object") {
        const user = userCandidate as Record<string, unknown>;
        const userId = typeof user.id === "string" ? user.id : "";

        if (userId) {
          updateField("chambasPost", "empleador_id", userId);
          updateField("postulacionesPost", "trabajador_id", userId);
          updateField("valoracionesPost", "emisor_id", userId);
          updateField("valoracionesPost", "receptor_id", userId);
        }
      }
    }

    if (endpointId === "chambasPost") {
      const chambaCandidate = data.chamba;
      if (chambaCandidate && typeof chambaCandidate === "object") {
        const chamba = chambaCandidate as Record<string, unknown>;
        const chambaId = typeof chamba.id === "string" ? chamba.id : "";

        if (chambaId) {
          updateField("postulacionesPost", "chamba_id", chambaId);
          updateField("valoracionesPost", "chamba_id", chambaId);
        }
      }
    }

    if (endpointId === "postulacionesPost") {
      const postulacionCandidate = data.postulacion;
      if (postulacionCandidate && typeof postulacionCandidate === "object") {
        const postulacion = postulacionCandidate as Record<string, unknown>;
        const postulacionId = typeof postulacion.id === "string" ? postulacion.id : "";

        if (postulacionId) {
          updateState("postulacionesPatch", { pathParam: postulacionId });
        }
      }
    }
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
      const missingRequired = endpoint.fields.find((field) => field.required && !(current.formValues[field.key] || "").trim());

      if (missingRequired) {
        updateState(endpoint.id, {
          loading: false,
          error: `Falta completar el campo obligatorio: ${missingRequired.label}`,
        });
        return;
      }

      options.body = JSON.stringify(toPayload(endpoint.fields, current.formValues));
    }

    try {
      const response = await fetch(url, options);
      const raw = await response.text();
      let parsedJson: unknown = null;

      let formatted = raw;
      if (raw) {
        try {
          parsedJson = JSON.parse(raw);
          formatted = JSON.stringify(parsedJson, null, 2);
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

      if (response.ok) {
        hydrateFlowData(endpoint.id, parsedJson);

        const stepIndex = FLOW_STEPS.findIndex((step) => step.endpointId === endpoint.id);
        if (stepIndex !== -1 && stepIndex < FLOW_STEPS.length - 1) {
          setActiveStepIndex(stepIndex + 1);
        }
      }
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
            Cuadros interactivos para enviar senales a tu backend
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-zinc-700 md:text-base">
            Cada cuadro representa una accion del sistema. Completas los datos, envias la senal y ves la respuesta en
            tiempo real.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.07)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">Modo flujo guiado</p>
              <h2 className="mt-1 text-xl font-bold">Recorrido sugerido en 7 pasos</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Al completar un paso exitosamente, el siguiente se selecciona solo y varios IDs se autocompletan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Paso anterior
              </button>
              <button
                type="button"
                onClick={() => setActiveStepIndex((prev) => Math.min(FLOW_STEPS.length - 1, prev + 1))}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
              >
                Siguiente paso
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {FLOW_STEPS.map((step, index) => {
              const isActive = index === activeStepIndex;
              const target = getEndpointById(step.endpointId);
              const targetTitle = target?.title ?? "Accion";

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepIndex(index)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-sky-400 bg-sky-50 shadow-[0_4px_14px_rgba(2,132,199,0.18)]"
                      : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{step.label}</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-800">{targetTitle}</p>
                  <p className="mt-1 text-xs text-zinc-600">{step.hint}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Paso activo: <span className="font-semibold">{FLOW_STEPS[activeStepIndex].label}</span>
            <a
              href={`#panel-${FLOW_STEPS[activeStepIndex].endpointId}`}
              className="ml-2 font-semibold underline underline-offset-2"
            >
              Ir al cuadro de este paso
            </a>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {ENDPOINTS.map((endpoint) => {
            const state = states[endpoint.id];
            const flowPosition = FLOW_STEPS.findIndex((step) => step.endpointId === endpoint.id);
            const isFlowActive = flowPosition === activeStepIndex;

            return (
              <form
                id={`panel-${endpoint.id}`}
                key={endpoint.id}
                onSubmit={(event) => void runEndpoint(event, endpoint)}
                className={`rounded-2xl border bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.07)] ${
                  isFlowActive ? "border-sky-300 ring-2 ring-sky-100" : "border-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{endpoint.title}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white ${methodStyle(endpoint.method)}`}
                  >
                    {endpoint.method} SIGNAL
                  </span>
                </div>

                {flowPosition !== -1 ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-sky-700">
                    {FLOW_STEPS[flowPosition].label}
                  </p>
                ) : null}

                <p className="mt-2 text-sm text-zinc-600">{endpoint.subtitle}</p>
                <p className="mt-2 text-xs text-zinc-500">{endpoint.successHint}</p>

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

                {endpoint.fields.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {endpoint.fields.map((field) => {
                      const baseClass = `w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${monoFont.className}`;

                      return (
                        <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                            {field.label}
                          </label>

                          {field.type === "textarea" ? (
                            <textarea
                              value={state.formValues[field.key] ?? ""}
                              placeholder={field.placeholder}
                              rows={4}
                              onChange={(event) =>
                                updateField(endpoint.id, field.key, event.target.value)
                              }
                              className={`${baseClass} resize-y`}
                            />
                          ) : (
                            <input
                              type={field.type}
                              value={state.formValues[field.key] ?? ""}
                              placeholder={field.placeholder}
                              onChange={(event) =>
                                updateField(endpoint.id, field.key, event.target.value)
                              }
                              className={baseClass}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={state.loading}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    {state.loading ? "Enviando senal..." : endpoint.actionText}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateState(endpoint.id, {
                        formValues: endpoint.fields.reduce<Record<string, string>>((acc, field) => {
                          acc[field.key] = field.defaultValue ?? "";
                          return acc;
                        }, {}),
                        pathParam: endpoint.pathParamDefault ?? "",
                        error: "",
                      })
                    }
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Restaurar valores
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

                <details className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Ver detalle tecnico
                  </summary>
                  <p className={`mt-2 text-xs text-zinc-500 ${monoFont.className}`}>
                    {endpoint.method} {endpoint.path}
                  </p>
                  {endpoint.method !== "GET" ? (
                    <pre className={`${monoFont.className} mt-2 overflow-auto rounded-lg bg-zinc-900 p-2 text-xs text-emerald-200`}>
                      {JSON.stringify(toPayload(endpoint.fields, state.formValues), null, 2)}
                    </pre>
                  ) : null}
                </details>

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
