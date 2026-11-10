// src/controllers/ia.controller.ts

import { Request, Response, NextFunction } from 'express';
import { IAService } from '../services/ia.service';
import { AnalisisIADTO } from '../types';

export class IAController {
  /**
   * POST /api/analisis-ia
   * Genera un dictamen clínico-analítico mediante LLM
   */
  static async analizar(req: Request<{}, {}, AnalisisIADTO>, res: Response, next: NextFunction) {
    try {
      const resultado = await IAService.generarAnalisis(req.body);
      return res.json({
        status: 'SUCCESS',
        mensaje: 'Análisis clínico generado exitosamente',
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }
}
