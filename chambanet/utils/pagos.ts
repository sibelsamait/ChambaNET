/**
 * Utilidades para el Sistema de Pagos
 * Funciones comunes para cálculos, formateo y validación
 */

import { DesgloseMontos, EstadoPago, TipoTransaccion } from '@/types/pagos';

// ============================================================================
// CONSTANTES
// ============================================================================

export const TARIFA_SERVICIO_PORCENTAJE = 0.06; // 6%
export const COMPENSACION_CASO_A = 0.15; // 15%
export const MIN_REEMBOLSO_CASO_B = 0.15; // 15%
export const MAX_REEMBOLSO_CASO_B = 0.40; // 40%

// Mapeo de estados a colores
export const COLOR_ESTADO: Record<EstadoPago, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  RETENIDO: 'bg-blue-100 text-blue-800',
  LIBERADO: 'bg-green-100 text-green-800',
  DISPUTA: 'bg-red-100 text-red-800',
  REEMBOLSADO: 'bg-purple-100 text-purple-800',
};

// Mapeo de tipos de transacción a colores
export const COLOR_TRANSACCION: Record<TipoTransaccion, string> = {
  PAGO_LIBERADO: 'bg-green-100 text-green-800',
  COMPENSACION: 'bg-blue-100 text-blue-800',
  REEMBOLSO: 'bg-amber-100 text-amber-800',
  PENALIZACION: 'bg-red-100 text-red-800',
  AJUSTE_ADMINISTRATIVO: 'bg-gray-100 text-gray-800',
  TRANSFERENCIA: 'bg-purple-100 text-purple-800',
};

// Iconos para estados
export const ICONO_ESTADO: Record<EstadoPago, string> = {
  PENDIENTE: '⏳',
  RETENIDO: '🔒',
  LIBERADO: '✓',
  DISPUTA: '⚖️',
  REEMBOLSADO: '↩️',
};

// Iconos para transacciones
export const ICONO_TRANSACCION: Record<TipoTransaccion, string> = {
  PAGO_LIBERADO: '✓',
  COMPENSACION: '🤝',
  REEMBOLSO: '↩️',
  PENALIZACION: '⚠️',
  AJUSTE_ADMINISTRATIVO: '⚙️',
  TRANSFERENCIA: '↔️',
};

// ============================================================================
// FORMATEO
// ============================================================================

/**
 * Formatea un número monetario en CLP
 */
export function formatCLP(monto: number, incluirSigno = false): string {
  const isPositive = monto >= 0;
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(Math.abs(monto));

  if (incluirSigno) {
    return isPositive ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}

/**
 * Formatea una fecha en formato legible español
 */
export function formatFecha(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formatea una fecha corta (solo DD/MM/YYYY)
 */
export function formatFechaCorta(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Obtiene label amigable para estado de pago
 */
export function getEstadoLabel(estado: EstadoPago): string {
  const labels: Record<EstadoPago, string> = {
    PENDIENTE: 'Pendiente de Confirmación',
    RETENIDO: 'Dinero Retenido',
    LIBERADO: 'Liberado al Trabajador',
    DISPUTA: 'En Disputa',
    REEMBOLSADO: 'Reembolsado/Resuelto',
  };
  return labels[estado];
}

/**
 * Obtiene label amigable para tipo de transacción
 */
export function getTransaccionLabel(tipo: TipoTransaccion): string {
  const labels: Record<TipoTransaccion, string> = {
    PAGO_LIBERADO: 'Pago Liberado',
    COMPENSACION: 'Compensación',
    REEMBOLSO: 'Reembolso',
    PENALIZACION: 'Penalización',
    AJUSTE_ADMINISTRATIVO: 'Ajuste Administrativo',
    TRANSFERENCIA: 'Transferencia',
  };
  return labels[tipo];
}

// ============================================================================
// CÁLCULOS
// ============================================================================

/**
 * Calcula el desglose de montos para un pago
 */
export function calcularDesglose(montoBase: number, tarifaPct = TARIFA_SERVICIO_PORCENTAJE): DesgloseMontos {
  const tarifaServicio = Math.round(montoBase * tarifaPct * 100) / 100;
  const montoTotal = montoBase + tarifaServicio;

  return {
    monto_base: montoBase,
    tarifa_servicio: tarifaServicio,
    monto_total: montoTotal,
    porcentaje_tarifa: tarifaPct * 100,
  };
}

/**
 * Calcula la resolución CASO A
 */
export function calcularResolucionCasoA(
  montoBase: number,
  tarifaServicio: number,
  porcentajeCompensacion = COMPENSACION_CASO_A
): {
  compensacionTrabajador: number;
  reembolsoEmpleador: number;
  retencionPlataforma: number;
} {
  const montoTotal = montoBase + tarifaServicio;
  const compensacionTrabajador = Math.round(montoBase * porcentajeCompensacion * 100) / 100;
  const reembolsoEmpleador = montoTotal - tarifaServicio - compensacionTrabajador;
  const retencionPlataforma = tarifaServicio;

  return {
    compensacionTrabajador,
    reembolsoEmpleador: Math.max(0, reembolsoEmpleador), // Nunca negativo
    retencionPlataforma,
  };
}

/**
 * Calcula la resolución CASO B
 */
export function calcularResolucionCasoB(
  montoTotal: number,
  porcentajeReembolso: number
): {
  reembolsoEmpleador: number;
  penalizacionPlataforma: number;
} {
  if (porcentajeReembolso < MIN_REEMBOLSO_CASO_B || porcentajeReembolso > MAX_REEMBOLSO_CASO_B) {
    throw new Error(
      `Porcentaje debe estar entre ${MIN_REEMBOLSO_CASO_B * 100}% y ${MAX_REEMBOLSO_CASO_B * 100}%`
    );
  }

  const reembolsoEmpleador = Math.round(montoTotal * porcentajeReembolso * 100) / 100;
  const penalizacionPlataforma = montoTotal - reembolsoEmpleador;

  return {
    reembolsoEmpleador,
    penalizacionPlataforma,
  };
}

// ============================================================================
// VALIDACIÓN
// ============================================================================

/**
 * Valida un monto monetario
 */
export function esMontoValido(monto: unknown): monto is number {
  return typeof monto === 'number' && monto > 0 && monto <= 10000000;
}

/**
 * Valida un porcentaje de reembolso para CASO B
 */
export function esPorcentajeCasoBValido(porcentaje: number): boolean {
  return porcentaje >= MIN_REEMBOLSO_CASO_B && porcentaje <= MAX_REEMBOLSO_CASO_B;
}

/**
 * Valida si un UUID es válido (formato básico)
 */
export function esUUIDValido(uuid: unknown): uuid is string {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================================================
// UTILIDADES DIVERSAS
// ============================================================================

/**
 * Genera un ID de transacción único
 */
export function generarIdTransaccion(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtiene el nombre corto de un caso de disputa
 */
export function getNombreCaso(caso: 'CASO_A' | 'CASO_B'): string {
  return caso === 'CASO_A'
    ? 'Trabajador Reclama'
    : 'Empleador Reclama';
}

/**
 * Obtiene descripción de un caso de disputa
 */
export function getDescripcionCaso(caso: 'CASO_A' | 'CASO_B'): string {
  return caso === 'CASO_A'
    ? 'El trabajador reclama durante EN_OBRA'
    : 'El empleador reclama por incumplimiento';
}

/**
 * Trunca un UUID para visualización
 */
export function truncarUUID(uuid: string, chars = 8): string {
  return uuid.slice(0, chars) + '...';
}

/**
 * Calcula días desde una fecha
 */
export function diasDesde(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene estado para mostrar si una transacción es ingreso o egreso
 */
export function getTransaccionDirection(monto: number): 'ingreso' | 'egreso' {
  return monto >= 0 ? 'ingreso' : 'egreso';
}

// ============================================================================
// UTILIDADES DE ANÁLISIS
// ============================================================================

/**
 * Calcula estadísticas de transacciones
 */
export function calcularEstadisticas(transacciones: Array<{ tipo: TipoTransaccion; monto: number }>) {
  return {
    totalIngresos: transacciones
      .filter((t) => t.monto > 0)
      .reduce((sum, t) => sum + t.monto, 0),
    totalEgresos: Math.abs(
      transacciones
        .filter((t) => t.monto < 0)
        .reduce((sum, t) => sum + t.monto, 0)
    ),
    conteoIngreso: transacciones.filter((t) => t.monto > 0).length,
    conteoEgreso: transacciones.filter((t) => t.monto < 0).length,
  };
}

/**
 * Agrupa transacciones por tipo
 */
export function agruparPorTipo(transacciones: Array<{ tipo: TipoTransaccion; monto: number }>) {
  const grouped: Record<TipoTransaccion, number> = {
    PAGO_LIBERADO: 0,
    COMPENSACION: 0,
    REEMBOLSO: 0,
    PENALIZACION: 0,
    AJUSTE_ADMINISTRATIVO: 0,
    TRANSFERENCIA: 0,
  };

  transacciones.forEach((t) => {
    grouped[t.tipo] += t.monto;
  });

  return grouped;
}
