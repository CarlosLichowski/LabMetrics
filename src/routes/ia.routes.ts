// src/routes/ia.routes.ts

import { Router } from 'express';
import { IAController } from '../controllers/ia.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { analisisIASchema } from '../schemas/ia.schema';

const router = Router();

// POST /api/analisis-ia - Generación de dictamen y resumen asistido por LLM
router.post(
  '/',
  validateRequest({ body: analisisIASchema }),
  IAController.analizar
);

export default router;
