// src/controllers/cierres.controllers.ts

import { Request, Response, NextFunction } from 'express';
import { CierresService } from '../services/cierres.service';
import { CrearCierreDTO } from '../types';

export class CierresController {
  /**
   * POST /api/cierres
   * Registra un nuevo cierre diario de contadores Cobas c501 / ISE
   */
  static async crear(req: Request<{}, {}, CrearCierreDTO>, res: Response, next: NextFunction) {
    try {
      const nuevoCierre = await CierresService.crear(req.body);
      return res.status(201).json({
        status: 'SUCCESS',
        mensaje: 'Cierre diario de producción registrado exitosamente',
        data: nuevoCierre,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cierres
   * Obtiene los últimos cierres registrados
   */
  static async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const limite = req.query.limite ? Number(req.query.limite) : 20;
      const cierres = await CierresService.obtenerUltimos(limite);
      return res.json({
        status: 'SUCCESS',
        total: cierres.length,
        data: cierres,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cierres/:id
   * Obtiene el detalle de un cierre específico
   */
  static async obtenerPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const cierre = await CierresService.obtenerPorId(id);
      return res.json({
        status: 'SUCCESS',
        data: cierre,
      });
    } catch (error) {
      next(error);
    }
  }
}