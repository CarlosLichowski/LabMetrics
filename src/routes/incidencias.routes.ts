// src/routes/incidencias.routes.ts

import { Router } from 'express';
import { IncidenciasController } from '../controllers/incidencias.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { crearIncidenciaSchema } from '../schemas/incidencia.schema';

const router = Router();

// POST /api/incidencias - Registrar nueva incidencia con validación Zod
router.post('/', validateRequest({ body: crearIncidenciaSchema }), IncidenciasController.crear);

// GET /api/incidencias - Listar últimas incidencias
router.get('/', IncidenciasController.obtener);

export default router;