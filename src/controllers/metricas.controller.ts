  // src/controllers/metricas.controller.ts

  import { Request, Response, NextFunction } from 'express';
  import { MetricasService } from '../services/metricas.service';
  import { FiltroMetricasInput } from '../schemas/metricas.schema';

  export class MetricasController {
    /**
     * GET /api/metricas/resumen-semanal
     * Agregación por fecha de pruebas procesadas, reprocesos y calibraciones
     */
    static async resumenSemanal(req: Request, res: Response, next: NextFunction) {
      try {
        const dias = req.query.dias ? Number(req.query.dias) : 7;
        const metricas = await MetricasService.obtenerResumenSemanal(dias);

        return res.json({
          status: 'SUCCESS',
          periodo_dias: dias,
          total_puntos: metricas.length,
          data: metricas,
        });
      } catch (error) {
        next(error);
      }
    }

    /**
     * GET /api/metricas/incidencias-categoria
     * Distribución porcentual y conteo analítico de no conformidades por categoría
     */
    static async incidenciasCategoria(req: Request, res: Response, next: NextFunction) {
      try {
        const dias = req.query.dias ? Number(req.query.dias) : 30;
        const metricas = await MetricasService.obtenerIncidenciasPorCategoria(dias);

        return res.json({
          status: 'SUCCESS',
          periodo_dias: dias,
          data: metricas,
        });
      } catch (error) {
        next(error);
      }
    }

    /**
     * GET /api/metricas/kpis
     * Tarjetas ejecutivas resumen de productividad y calidad para el dashboard
     */
    static async kpisGenerales(req: Request, res: Response, next: NextFunction) {
      try {
        const dias = req.query.dias ? Number(req.query.dias) : 7;
        const kpis = await MetricasService.obtenerKpisGenerales(dias);

        return res.json({
          status: 'SUCCESS',
          data: kpis,
        });
      } catch (error) {
        next(error);
      }
    }

    /**
     * GET /api/metricas/consumos-mensuales
     * Analítica consolidada de reactivos Cobas c501 e ISE (Consumo Real, Reprocesos, Top Analitos)
     */
    static async consumosMensuales(req: Request, res: Response, next: NextFunction) {
      try {
        const meses = req.query.meses ? Number(req.query.meses) : 12;
        const metricas = await MetricasService.obtenerConsumosMensuales(meses);

        return res.json({
          status: 'SUCCESS',
          meses_consultados: meses,
          data: metricas,
        });
      } catch (error) {
        next(error);
      }
    }
  }
