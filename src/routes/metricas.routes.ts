// src/routes/metricas.routes.ts

import { Router } from 'express';
import { MetricasController } from '../controllers/metricas.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { filtroMetricasSchema } from '../schemas/metricas.schema';

const router = Router();

// GET /api/metricas/resumen-semanal - Serie temporal de pruebas, reprocesos y calibraciones
router.get(
  '/resumen-semanal',
  validateRequest({ query: filtroMetricasSchema }),
  MetricasController.resumenSemanal
);

// GET /api/metricas/incidencias-categoria - Porcentaje de fallas por categoría (funciones ventana SQL)
router.get(
  '/incidencias-categoria',
  validateRequest({ query: filtroMetricasSchema }),
  MetricasController.incidenciasCategoria
);

// GET /api/metricas/kpis - Indicadores clave de rendimiento para el dashboard
router.get(
  '/kpis',
  validateRequest({ query: filtroMetricasSchema }),
  MetricasController.kpisGenerales
);

// GET /api/metricas/consumos-mensuales - Analítica de consumo real de reactivos Roche Cobas
router.get(
  '/consumos-mensuales',
  MetricasController.consumosMensuales
);

export default router;
