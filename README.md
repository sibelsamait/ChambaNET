# ChambaNET

**ChambaNET** es una plataforma de economía colaborativa geo-referenciada diseñada para la gestión de trabajos esporádicos en Chile. El sistema actúa como un intermediario digital que conecta a Empleadores con Trabajadores, priorizando la seguridad, la inmediatez y la reputación local mediante un ecosistema de microservicios Serverless.

---

## Créditos y Derechos de Uso

**Aviso de Propiedad Intelectual:**
La idea original, el concepto fundacional y la lógica de negocio central de ChambaNET pertenecen a **Diego Arias**. Todo uso, reproducción, distribución o modificación de este concepto para fines comerciales o de terceros debe contar con el respeto a sus derechos de autor y autorización correspondiente. Este repositorio refleja la implementación técnica y arquitectónica del sistema.

---

## Stack Tecnológico

El proyecto está construido sobre una arquitectura moderna orientada a la escalabilidad y el rendimiento:

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Backend as a Service (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **Despliegue:** [Vercel](https://vercel.com/) (Edge Functions)

## Reglas de Negocio Críticas (Core Features)

La plataforma cuenta con un motor de Matchmaking que impone estrictas reglas de integridad:

1. **Límite de Publicación:** Un empleador no puede exceder el límite de 5 chambas simultáneas en estado `PUBLICADA` o `EN_OBRA`.
2. **Exclusividad del Trabajador:** Un trabajador solo puede mantener una postulación activa (`PENDIENTE` o `ACEPTADA`) a la vez para asegurar el compromiso de ejecución.
3. **Efecto Dominó en Aceptación:** Al momento de aceptar a un candidato, el sistema transacciona el estado de la obra y rechaza automáticamente a los postulantes competidores.
4. **Motor de Reputación:** Actualización automatizada mediante Triggers SQL en la base de datos que recalcula promedios sin sobrecargar la API.

## Instalación y Ejecución Local

Para correr este proyecto en tu entorno local, sigue estos pasos:

### 1. Clonar el repositorio
```bash
git clone [https://github.com/sibelsamait/ChambaNET.git](https://github.com/sibelsamait/ChambaNET.git)
cd ChambaNET
