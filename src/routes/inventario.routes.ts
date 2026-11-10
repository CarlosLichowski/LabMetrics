// src/routes/inventario.routes.ts

import { Router } from 'express';
import { InventarioController } from '../controllers/inventario.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { upload } from '../middlewares/upload.middleware';
import {
  crearInventarioSchema,
  cierreMensualLoteSchema,
  filtroInventarioSchema,
} from '../schemas/inventario.schema';

const router = Router();

// GET /api/cierres-mensuales/ultimo-recuento - Precarga de recuentos del mes anterior
router.get('/ultimo-recuento', InventarioController.obtenerUltimoRecuento);

// GET /api/cierres-mensuales/historico - Histórico estructurado mes a mes
router.get('/historico', InventarioController.obtenerHistorico);

// GET /api/cierres-mensuales - Listado con filtros
router.get(
  '/',
  validateRequest({ query: filtroInventarioSchema }),
  InventarioController.listar
);

// POST /api/cierres-mensuales - Registro individual
router.post(
  ',',
  validateRequest({ body: crearInventarioSchema }),
  InventarioController.crear
);

// POST /api/cierres-mensuales/lote - Carga masiva mensual de reactivos consumidos
router.post(
  '/lote',
  validateRequest({ body: cierreMensualLoteSchema }),
  InventarioController.crearLote
);

// POST /api/cierres-mensuales/importar-csv - Carga masiva mediante archivo CSV/TXT del pendrive del Cobas
router.post(
  '/importar-csv',
  upload.single('archivo'),
  InventarioController.importarCsvLote
);

export default router;