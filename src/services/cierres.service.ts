// src/services/cierres.service.ts

import { pool } from '../config/db';
import { CrearCierreDTO } from '../types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { NotFoundError } from '../errors/app-error';

export class CierresService {
  /**
   * Guarda un nuevo cierre diario con desglose operativo Cobas c501 / ISE
   */
  static async crear(datos: CrearCierreDTO) {
    const query = `
      INSERT INTO cierres_diarios 
        (prueba_id, rutina, reproc, urg, calib, cc, recuento_total_impreso, recuento_manual, observaciones, fecha_cierre, fecha_hora_cierre)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      datos.prueba_id,
      datos.rutina,
      datos.reproc,
      datos.urg,
      datos.calib,
      datos.cc,
      datos.recuento_total_impreso,
      datos.recuento_manual || null,
      datos.observaciones || null,
      datos.fecha_cierre,
      datos.fecha_hora_cierre,
    ];

    const [result] = await pool.execute<ResultSetHeader>(query, values);

    return {
      id: result.insertId,
      ...datos,
    };
  }

  /**
   * Obtiene los últimos cierres registrados ordenados cronológicamente
   */
  static async obtenerUltimos(limite = 20) {
    const query = `
      SELECT 
        c.id,
        c.fecha_cierre,
        DATE_FORMAT(c.fecha_hora_cierre, '%Y-%m-%d %H:%i:%s') AS fecha_hora_cierre,
        p.id AS prueba_id,
        p.codigo AS prueba_codigo,
        p.nombre AS prueba_nombre,
        p.acn AS prueba_acn,
        p.unidad AS cobas_unidad,
        s.id AS seccion_id,
        s.nombre AS seccion_nombre,
        c.rutina,
        c.reproc,
        c.urg,
        c.calib,
        c.cc,
        c.recuento_total_impreso,
        (c.rutina + c.reproc + c.urg + c.calib + c.cc) AS recuento_calculado,
        c.recuento_manual,
        c.observaciones,
        c.created_at
      FROM cierres_diarios c
      JOIN pruebas p ON c.prueba_id = p.id
      JOIN secciones s ON p.seccion_id = s.id
      ORDER BY c.fecha_hora_cierre DESC
      LIMIT ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [limite]);
    return rows;
  }

  /**
   * Obtiene el detalle completo de un cierre diario por su ID
   */
  static async obtenerPorId(id: number) {
    const query = `
      SELECT 
        c.id,
        c.fecha_cierre,
        DATE_FORMAT(c.fecha_hora_cierre, '%Y-%m-%d %H:%i:%s') AS fecha_hora_cierre,
        p.id AS prueba_id,
        p.codigo AS prueba_codigo,
        p.nombre AS prueba_nombre,
        p.acn AS prueba_acn,
        p.unidad AS cobas_unidad,
        s.id AS seccion_id,
        s.nombre AS seccion_nombre,
        c.rutina,
        c.reproc,
        c.urg,
        c.calib,
        c.cc,
        c.recuento_total_impreso,
        (c.rutina + c.reproc + c.urg + c.calib + c.cc) AS recuento_calculado,
        c.recuento_manual,
        c.observaciones,
        c.created_at
      FROM cierres_diarios c
      JOIN pruebas p ON c.prueba_id = p.id
      JOIN secciones s ON p.seccion_id = s.id
      WHERE c.id = ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
    if (!rows || rows.length === 0) {
      throw new NotFoundError(`No se encontró el registro de cierre con ID ${id}`);
    }

    return rows[0];
  }
}