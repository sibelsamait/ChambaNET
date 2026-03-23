# Mercado Pago Integration

Esta carpeta contiene la integración real con la API de Mercado Pago.

## Archivos

- `real.ts`: implementación real de preferencias, pagos, capturas, reembolsos, webhooks y tarjetas.

## Modo de uso

La app consume `lib/mercadopago.ts` como gateway unificado.

- `USE_REAL_MERCADOPAGO=false` (default): usa operaciones mock para desarrollo.
- `USE_REAL_MERCADOPAGO=true`: delega todas las operaciones a `lib/integrations/mercadopago/real.ts`.
