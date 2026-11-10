// src/controllers/inventario.controller.ts

import { Request, Response, NextFunction } from 'express';
import { InventarioService } from '../services/inventario.service';
import { CrearInventarioDTO, CierreMensualLoteDTO, FiltroInventarioDTO } from '../types';
import fs from 'fs';
import csv from 'csv-parser';

export class InventarioController {
  /**
   * POST /api/cierres-mensuales
   * Registra o actualiza el cierre mensual para un analito individual
   */
  static async crear(req: Request<{}, {}, CrearInventarioDTO>, res: Response, next: NextFunction) {
    try {
      const nuevoRegistro = await InventarioService.crearOActualizar(req.body);
      return res.status(201).json({
        status: 'SUCCESS',
        mensaje: 'Cierre mensual de inventario guardado exitosamente',
        data: nuevoRegistro,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/cierres-mensuales/lote
   * Carga masiva mensual de reactivos consumidos reportados por el equipo Cobas
   */
  static async crearLote(
    req: Request<{}, {}, CierreMensualLoteDTO>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const resultado = await InventarioService.guardarLote(req.body);
      return res.status(201).json({
        status: 'SUCCESS',
        mensaje: `Cierre mensual de inventario para el período ${req.body.periodo} procesado exitosamente`,
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/cierres-mensuales/importar-csv
   * Recibe el archivo exportado del Cobas mediante pendrive, lo parsea y procesa en lote
   */
  static async importarCsvLote(req: Request, res: Response, next: NextFunction) {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'ERROR', 
        mensaje: 'No se ha proporcionado ningún archivo CSV o TXT del Cobas' 
      });
    }

    const filePath = req.file.path;
    const filasProcesadas: any[] = [];

    const limpiarArchivoTemporal = () => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error al eliminar archivo temporal:', err);
      }
    };

    try {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          filasProcesadas.push(row);
        })
        .on('error', (err) => {
          limpiarArchivoTemporal();
          return next(err);
        })
        .on('end', async () => {
          limpiarArchivoTemporal();

          // Mapeo flexible de las columnas del reporte de Roche Cobas
          const datosMapeados = filasProcesadas.map((row) => {
            const codigo = row['Test Code'] || row['codigo'] || row['Test'] || '';
            const nombre = row['Test Name'] || row['nombre'] || '';
            const recuentoActual = Number(row['Current Count'] || row['recuento_actual'] || row['Remaining'] || 0);

            return {
              codigo_roche: codigo.trim(),
              nombre_analito: nombre.trim(),
              recuento_actual: isNaN(recuentoActual) ? 0 : recuentoActual,
              raw: row, // Mantiene la fila original por si se requiere depuración adicional
            };
          });

          return res.json({
            status: 'SUCCESS',
            mensaje: 'Archivo del Cobas analizado y procesado exitosamente',
            total_filas: datosMapeados.length,
            data: datosMapeados,
          });
        });
    } catch (error) {
      limpiarArchivoTemporal();
      next(error);
    }
  }

  /**
   * GET /api/cierres-mensuales
   * Lista los cierres mensuales de reactivos con filtros
   */
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const filtros: FiltroInventarioDTO = {
        periodo: req.query.periodo as string,
        unidad: req.query.unidad as any,
        prueba_id: req.query.prueba_id ? Number(req.query.prueba_id) : undefined,
        limite: req.query.limite ? Number(req.query.limite) : 100,
      };

      const registros = await InventarioService.listar(filtros);
      return res.json({
        status: 'SUCCESS',
        total: registros.length,
        periodo_consultado: filtros.periodo || 'todos',
        data: registros,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cierres-mensuales/ultimo-recuento?periodo=YYYY-MM
   * Obtiene los recuentos del mes anterior para precargar la planilla de carga mensual
   */
  static async obtenerUltimoRecuento(req: Request, res: Response, next: NextFunction) {
    try {
      const periodo = (req.query.periodo as string) || new Date().toISOString().slice(0, 7);
      const recuentos = await InventarioService.obtenerUltimosRecuentosPorPeriodo(periodo);

      return res.json({
        status: 'SUCCESS',
        periodo_referencia: periodo,
        total: recuentos.length,
        data: recuentos,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cierres-mensuales/historico
   * Obtiene la serie histórica estructurada mes a mes
   */
  static async obtenerHistorico(req: Request, res: Response, next: NextFunction) {
    try {
      const pruebaId = req.query.prueba_id ? Number(req.query.prueba_id) : undefined;
      const limite = req.query.limite ? Number(req.query.limite) : 100;

      const historico = await InventarioService.obtenerHistorico(pruebaId, limite);
      return res.json({
        status: 'SUCCESS',
        total: historico.length,
        data: historico,
      });
    } catch (error) {
      next(error);
    }
  }
}