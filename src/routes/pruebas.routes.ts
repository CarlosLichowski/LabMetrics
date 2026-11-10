// src/routes/pruebas.routes.ts

import { Router } from 'express';
import { PruebasController } from '../controllers/pruebas.controller';

const router = Router();

// GET /api/pruebas - Listado oficial de analitos y canales ACN Cobas c501 e ISE1
router.get('/', PruebasController.listar);

export default router;
