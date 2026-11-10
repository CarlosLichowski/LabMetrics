// src/controllers/pruebas.controller.ts

import { Request, Response, NextFunction } from 'express';
import { PruebasService } from '../services/pruebas.service';
import { UnidadCobas } from '../types';

export class PruebasController {
  /**
   * GET /api/pruebas
   * Catálogo oficial de determinaciones Cobas c501 (c5-1) e ISE1
   */
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const unidad = req.query.unidad as UnidadCobas | undefined;
      const pruebas = await PruebasService.listar(unidad);

      return res.json({
        status: 'SUCCESS',
        total: pruebas.length,
        unidad_filtro: unidad || 'todas',
        data: pruebas,
      });
    } catch (error) {
      next(error);
    }
  }
}
