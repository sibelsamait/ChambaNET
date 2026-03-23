/**
 * Sistema de Pagos - Tipos TypeScript
 * Define la estructura de datos para el módulo de Hold & Capture con MercadoPago
 */

// Estados posibles de un pago
export type EstadoPago = 'PENDIENTE' | 'RETENIDO' | 'LIBERADO' | 'DISPUTA' | 'REEMBOLSADO';

// Tipos de transacciones de billetera
export type TipoTransaccion = 
  | 'PAGO_LIBERADO' 
  | 'COMPENSACION' 
  | 'REEMBOLSO' 
  | 'PENALIZACION' 
  | 'AJUSTE_ADMINISTRATIVO'
  | 'TRANSFERENCIA';

// Casos de disputa para políticas de negocio
export type CasoDisputa = 'CASO_A' | 'CASO_B';

// ============================================================================
// TABLA: pagos
// ============================================================================

export interface Pago {
  id: string;
  chamba_id: string;
  empleador_id: string;
  trabajador_id: string;
  monto_base: number;
  tarifa_servicio: number;
  monto_total: number;
  mp_payment_intent_id: string | null;
  estado: EstadoPago;
  detalles_disputa: DetallesDisputa | null;
  porcentaje_reembolso: number | null;
  monto_reembolso: number | null;
  created_at: string;
  updated_at: string;
}

// Metadata de disputa
export interface DetallesDisputa {
  caso: CasoDisputa;
  razon: string;
  fecha_inicio: string;
  fecha_resolucion?: string;
  notas?: string;
  resuelto_por?: string; // user_id del admin que resolvió
}

// Respuesta al crear un pago
export interface CrearPagoRequest {
  chamba_id: string;
  trabajador_id: string;
  monto_base: number;
}

export interface CrearPagoResponse {
  pago: Pago;
  payment_intent: {
    id: string;
    client_secret: string;
    amount: number;
    currency: string;
    checkout_url?: string;
    sandbox_checkout_url?: string;
    public_key?: string;
  };
}

// Desglose de montos para UI
export interface DesgloseMontos {
  monto_base: number;
  tarifa_servicio: number;
  monto_total: number;
  porcentaje_tarifa: number; // 6% típicamente
}

// ============================================================================
// TABLA: transacciones_billetera
// ============================================================================

export interface TransaccionBilletera {
  id: string;
  usuario_id: string;
  tipo: TipoTransaccion;
  monto: number;
  descripcion: string | null;
  pago_id: string | null;
  concepto: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
}

// Respuesta para historial de billetera
export interface HistorialBilleteraResponse {
  saldo_actual: number;
  transacciones: TransaccionBilletera[];
  total_pagos_liberados: number;
  total_compensaciones: number;
  total_reembolsos: number;
}

// ============================================================================
// API: Resolución de Disputas
// ============================================================================

export interface ResolverDisputaRequest {
  pago_id: string;
  caso: CasoDisputa;
  porcentaje_reembolso: number; // 15% para CASO_A, 15-30% para CASO_B
  porcentaje_compensacion?: number; // Solo CASO_A (típicamente 15%)
  monto_compensacion?: number; // Calculado desde el monto_base
  descripcion: string;
  requiere_revision_legal: boolean;
}

export interface ResolverDisputaResponse {
  success: boolean;
  pago: Pago;
  transacciones_creadas: TransaccionBilletera[];
  detalles_resolucion: {
    monto_reembolso_empleador: number;
    monto_compensacion_trabajador: number;
    monto_penalizacion_plataforma: number;
  };
}

// ============================================================================
// MERCADOPAGO INTEGRATION
// ============================================================================

export interface MercadoPagoConfig {
  public_key: string;
  access_token: string;
  api_url: string;
}

export interface MercadoPagoPaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  payer: {
    email: string;
    id: string;
  };
  description: string;
  metadata: {
    pago_id: string;
    chamba_id: string;
  };
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

export interface CheckoutModalProps {
  isOpen: boolean;
  trabajador: {
    id: string;
    nombre: string;
    email: string;
    imagenUrl?: string;
  };
  chamba: {
    id: string;
    titulo: string;
    monto_base: number;
  };
  onClose: () => void;
  onPaymentSuccess: (pago: Pago) => void;
}

export interface DisputeResolverProps {
  pagoId: string;
  caso: CasoDisputa;
  monto_base: number;
  monto_total: number;
  onResolve: (response: ResolverDisputaResponse) => void;
  isLoading?: boolean;
}

export interface WalletPanelProps {
  usuario_id: string;
  rol: 'trabajador' | 'empleador';
}
