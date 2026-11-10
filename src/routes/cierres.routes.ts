// src/routes/cierres.routes.ts

import { Router } from 'express';
import { CierresController } from '../controllers/cierres.controllers';
import { validateRequest } from '../middlewares/validate.middleware';
import { crearCierreSchema } from '../schemas/cierre.schema';

const router = Router();

// POST /api/cierres - Registrar cierre diario Cobas con validación Zod
router.post('/', validateRequest({ body: crearCierreSchema }), CierresController.crear);

// GET /api/cierres - Obtener historial de cierres
router.get('/', CierresController.obtener);

// GET /api/cierres/:id - Obtener detalle de un cierre específico
router.get('/:id', CierresController.obtenerPorId);

export default router;