// src/controllers/incidencias.controller.ts

import { Request, Response, NextFunction } from 'express';
import { IncidenciasService } from '../services/incidencias.service';
import { CrearIncidenciaDTO } from '../types';

export class IncidenciasController {
  /**
   * POST /api/incidencias
   * Registra una nueva incidencia preanalítica o instrumental
   */
  static async crear(req: Request<{}, {}, CrearIncidenciaDTO>, res: Response, next: NextFunction) {
    try {
      const nuevaIncidencia = await IncidenciasService.crear(req.body);
      return res.status(201).json({
        status: 'SUCCESS',
        mensaje: 'Incidencia registrada exitosamente',
        data: nuevaIncidencia,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/incidencias
   * Retorna las últimas incidencias registradas
   */
  static async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const limite = req.query.limite ? Number(req.query.limite) : 20;
      const incidencias = await IncidenciasService.obtenerUltimas(limite);
      return res.json({
        status: 'SUCCESS',
        total: incidencias.length,
        data: incidencias,
      });
    } catch (error) {
      next(error);
    }
  }
}