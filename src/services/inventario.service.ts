// src/services/inventario.service.ts

import { pool } from '../config/db';
import {
  CrearInventarioDTO,
  CierreMensualLoteDTO,
  FiltroInventarioDTO,
  InventarioMensual,
} from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { BadRequestError, NotFoundError } from '../errors/app-error';

export class InventarioService {
  /**
   * Obtiene el último recuento registrado para un analito anterior a un período dado.
   * Permite precargar automáticamente el recuento del mes anterior.
   */
  static async obtenerUltimoRecuento(
    pruebaId: number,
    periodoActual: string
  ): Promise<number | null> {
    const query = `
      SELECT recuento_actual 
      FROM inventario_mensual_reactivos 
      WHERE prueba_id = ? AND periodo < ? 
      ORDER BY periodo DESC 
      LIMIT 1
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [pruebaId, periodoActual]);
    if (rows.length > 0) {
      return Number(rows[0].recuento_actual);
    }
    return null;
  }

  /**
   * Obtiene un mapa de los recuentos del mes inmediatamente anterior para todos los analitos.
   * Si para 2026-09 se pide precarga, busca el recuento de 2026-08 (o el más reciente anterior).
   */
  static async obtenerUltimosRecuentosPorPeriodo(periodoActual: string) {
    const query = `
      SELECT 
        i.prueba_id,
        p.codigo AS prueba_codigo,
        p.nombre AS prueba_nombre,
        p.acn,
        p.unidad,
        i.periodo AS periodo_anterior,
        i.recuento_actual AS recuento_anterior
      FROM inventario_mensual_reactivos i
      JOIN pruebas p ON i.prueba_id = p.id
      INNER JOIN (
        SELECT prueba_id, MAX(periodo) AS max_periodo
        FROM inventario_mensual_reactivos
        WHERE periodo < ?
        GROUP BY prueba_id
      ) ultimos ON i.prueba_id = ultimos.prueba_id AND i.periodo = ultimos.max_periodo
      ORDER BY p.acn ASC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [periodoActual]);
    return rows.map((r) => ({
      prueba_id: Number(r.prueba_id),
      prueba_codigo: r.prueba_codigo,
      prueba_nombre: r.prueba_nombre,
      acn: Number(r.acn),
      unidad: r.unidad,
      periodo_anterior: r.periodo_anterior,
      recuento_anterior: Number(r.recuento_anterior),
    }));
  }

  /**
   * Registra o actualiza el cierre mensual de un analito aplicando la fórmula:
   * Consumo Real del Mes = Recuento Total Mes Anterior - Recuento Total Mes Actual
   */
  static async crearOActualizar(datos: CrearInventarioDTO): Promise<InventarioMensual> {
    let recuentoAnterior = datos.recuento_anterior;

    // Si no se proporcionó recuento anterior explícito, buscar el del mes previo
    if (recuentoAnterior === undefined || recuentoAnterior === null) {
      const anteriorEncontrado = await this.obtenerUltimoRecuento(datos.prueba_id, datos.periodo);
      recuentoAnterior = anteriorEncontrado !== null ? anteriorEncontrado : datos.recuento_actual;
    }

    // Fórmula requerida: Recuento Mes Anterior - Recuento Mes Actual = Consumo Real
    const consumoReal = recuentoAnterior - datos.recuento_actual;

    // Determinar fecha_cierre por defecto si no viene
    const fechaCierre = datos.fecha_cierre || `${datos.periodo}-28`;

    const query = `
      INSERT INTO inventario_mensual_reactivos (
        prueba_id,
        periodo,
        fecha_cierre,
        recuento_anterior,
        recuento_actual,
        consumo_real,
        rutina,
        reproc,
        urg,
        calib,
        cc,
        lote_reactivo,
        observaciones,
        usuario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        recuento_anterior = VALUES(recuento_anterior),
        recuento_actual   = VALUES(recuento_actual),
        consumo_real      = VALUES(consumo_real),
        rutina            = VALUES(rutina),
        reproc            = VALUES(reproc),
        urg               = VALUES(urg),
        calib             = VALUES(calib),
        cc                = VALUES(cc),
        lote_reactivo     = VALUES(lote_reactivo),
        observaciones     = VALUES(observaciones),
        usuario           = VALUES(usuario),
        fecha_cierre      = VALUES(fecha_cierre)
    `;

    const values = [
      datos.prueba_id,
      datos.periodo,
      fechaCierre,
      recuentoAnterior,
      datos.recuento_actual,
      consumoReal,
      datos.rutina ?? 0,
      datos.reproc ?? 0,
      datos.urg ?? 0,
      datos.calib ?? 0,
      datos.cc ?? 0,
      datos.lote_reactivo || null,
      datos.observaciones || null,
      datos.usuario || 'Sistema Cobas LIS',
    ];

    const [res] = await pool.execute<ResultSetHeader>(query, values);

    return {
      id: res.insertId,
      prueba_id: datos.prueba_id,
      periodo: datos.periodo,
      fecha_cierre: fechaCierre,
      recuento_anterior: recuentoAnterior,
      recuento_actual: datos.recuento_actual,
      consumo_real: consumoReal,
      rutina: datos.rutina ?? 0,
      reproc: datos.reproc ?? 0,
      urg: datos.urg ?? 0,
      calib: datos.calib ?? 0,
      cc: datos.cc ?? 0,
      lote_reactivo: datos.lote_reactivo || null,
      observaciones: datos.observaciones || null,
      usuario: datos.usuario || 'Sistema Cobas LIS',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Guarda en bloque un lote mensual completo de reactivos dentro de una transacción.
   */
  static async guardarLote(datosLote: CierreMensualLoteDTO) {
    if (!datosLote.lecturas || datosLote.lecturas.length === 0) {
      throw new BadRequestError('El lote de lecturas mensuales no puede estar vacío');
    }

    const fechaCierre = datosLote.fecha_cierre || `${datosLote.periodo}-28`;
    const usuario = datosLote.usuario || 'Sistema Cobas LIS';

    // Precargar recuentos anteriores conocidos para optimizar queries
    const ultimosRecuentos = await this.obtenerUltimosRecuentosPorPeriodo(datosLote.periodo);
    const mapaRecuentosAnteriores = new Map<number, number>();
    ultimosRecuentos.forEach((item) => {
      mapaRecuentosAnteriores.set(item.prueba_id, item.recuento_anterior);
    });

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      let procesados = 0;
      const resultados = [];

      for (const item of datosLote.lecturas) {
        let recuentoAnterior = item.recuento_anterior;

        // Si no se proveyó en el item, buscar en el mapa precargado
        if (recuentoAnterior === undefined || recuentoAnterior === null) {
          recuentoAnterior = mapaRecuentosAnteriores.get(item.prueba_id) ?? item.recuento_actual;
        }

        // Fórmula: Recuento Anterior - Recuento Actual = Consumo Real
        const consumoReal = recuentoAnterior - item.recuento_actual;

        const query = `
          INSERT INTO inventario_mensual_reactivos (
            prueba_id,
            periodo,
            fecha_cierre,
            recuento_anterior,
            recuento_actual,
            consumo_real,
            rutina,
            reproc,
            urg,
            calib,
            cc,
            lote_reactivo,
            observaciones,
            usuario
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            recuento_anterior = VALUES(recuento_anterior),
            recuento_actual   = VALUES(recuento_actual),
            consumo_real      = VALUES(consumo_real),
            rutina            = VALUES(rutina),
            reproc            = VALUES(reproc),
            urg               = VALUES(urg),
            calib             = VALUES(calib),
            cc                = VALUES(cc),
            lote_reactivo     = VALUES(lote_reactivo),
            observaciones     = VALUES(observaciones),
            usuario           = VALUES(usuario),
            fecha_cierre      = VALUES(fecha_cierre)
        `;

        const values = [
          item.prueba_id,
          datosLote.periodo,
          fechaCierre,
          recuentoAnterior,
          item.recuento_actual,
          consumoReal,
          item.rutina ?? 0,
          item.reproc ?? 0,
          item.urg ?? 0,
          item.calib ?? 0,
          item.cc ?? 0,
          item.lote_reactivo || null,
          item.observaciones || datosLote.observaciones_generales || null,
          usuario,
        ];

        await conn.execute(query, values);
        procesados++;
        resultados.push({
          prueba_id: item.prueba_id,
          recuento_anterior: recuentoAnterior,
          recuento_actual: item.recuento_actual,
          consumo_real: consumoReal,
        });
      }

      await conn.commit();

      return {
        periodo: datosLote.periodo,
        fecha_cierre: fechaCierre,
        total_procesados: procesados,
        detalle: resultados,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Consulta el inventario mensual filtrado con datos detallados de prueba.
   */
  static async listar(filtros: FiltroInventarioDTO): Promise<InventarioMensual[]> {
    let query = `
      SELECT 
        i.id,
        i.prueba_id,
        p.codigo AS prueba_codigo,
        p.nombre AS prueba_nombre,
        p.acn,
        p.unidad,
        s.nombre AS seccion_nombre,
        i.periodo,
        DATE_FORMAT(i.fecha_cierre, '%Y-%m-%d') AS fecha_cierre,
        i.recuento_anterior,
        i.recuento_actual,
        i.consumo_real,
        i.rutina,
        i.reproc,
        i.urg,
        i.calib,
        i.cc,
        i.lote_reactivo,
        i.observaciones,
        i.usuario,
        DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(i.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
      FROM inventario_mensual_reactivos i
      JOIN pruebas p ON i.prueba_id = p.id
      JOIN secciones s ON p.seccion_id = s.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filtros.periodo) {
      query += ` AND i.periodo = ?`;
      params.push(filtros.periodo);
    }

    if (filtros.unidad) {
      query += ` AND p.unidad = ?`;
      params.push(filtros.unidad);
    }

    if (filtros.prueba_id) {
      query += ` AND i.prueba_id = ?`;
      params.push(filtros.prueba_id);
    }

    query += ` ORDER BY i.periodo DESC, p.acn ASC`;

    if (filtros.limite) {
      query += ` LIMIT ?`;
      params.push(filtros.limite);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map((r) => ({
      id: Number(r.id),
      prueba_id: Number(r.prueba_id),
      prueba_codigo: r.prueba_codigo,
      prueba_nombre: r.prueba_nombre,
      acn: Number(r.acn),
      unidad: r.unidad,
      seccion_nombre: r.seccion_nombre,
      periodo: r.periodo,
      fecha_cierre: r.fecha_cierre,
      recuento_anterior: Number(r.recuento_anterior),
      recuento_actual: Number(r.recuento_actual),
      consumo_real: Number(r.consumo_real),
      rutina: Number(r.rutina),
      reproc: Number(r.reproc),
      urg: Number(r.urg),
      calib: Number(r.calib),
      cc: Number(r.cc),
      lote_reactivo: r.lote_reactivo,
      observaciones: r.observaciones,
      usuario: r.usuario,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  /**
   * Obtiene el historial estructurado mes a mes para visualización en tabla y PowerBy.
   */
  static async obtenerHistorico(pruebaId?: number, limite = 100) {
    let query = `
      SELECT 
        i.periodo,
        DATE_FORMAT(i.fecha_cierre, '%Y-%m-%d') AS fecha_cierre,
        p.id AS prueba_id,
        p.codigo AS prueba_codigo,
        p.nombre AS prueba_nombre,
        p.acn,
        p.unidad,
        i.recuento_anterior,
        i.recuento_actual,
        i.consumo_real,
        i.rutina,
        i.reproc,
        i.urg,
        i.calib,
        i.cc,
        ROUND(
          CASE 
            WHEN (i.rutina + i.urg + i.reproc) > 0 
            THEN (i.reproc * 100.0) / (i.rutina + i.urg + i.reproc)
            ELSE 0 
          END, 
          2
        ) AS tasa_reproceso_pct,
        i.lote_reactivo,
        i.observaciones,
        i.usuario
      FROM inventario_mensual_reactivos i
      JOIN pruebas p ON i.prueba_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (pruebaId) {
      query += ` AND p.id = ?`;
      params.push(pruebaId);
    }

    query += ` ORDER BY i.periodo DESC, p.acn ASC LIMIT ?`;
    params.push(limite);

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }
}
