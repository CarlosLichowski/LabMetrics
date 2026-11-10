// src/services/incidencias.service.ts

import { pool } from '../config/db';
import { CrearIncidenciaDTO } from '../types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class IncidenciasService {
  /**
   * Registra una nueva incidencia operativa o preanalítica
   */
  static async crear(datos: CrearIncidenciaDTO) {
    const query = `
      INSERT INTO registro_incidencias 
        (seccion_id, prueba_id, categoria_error, cantidad_afectada, es_evitable, motivo_detalle, fecha_hora_incidencia)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      datos.seccion_id,
      datos.prueba_id || null,
      datos.categoria_error,
      datos.cantidad_afectada,
      datos.es_evitable ? 1 : 0,
      datos.motivo_detalle,
      datos.fecha_hora_incidencia,
    ];

    const [result] = await pool.execute<ResultSetHeader>(query, values);
    return {
      id: result.insertId,
      ...datos,
    };
  }

  /**
   * Obtiene las últimas incidencias registradas con datos enriquecidos de la sección y la prueba Roche
   */
  static async obtenerUltimas(limite = 20) {
    const query = `
      SELECT 
        i.id,
        i.seccion_id,
        s.nombre AS seccion_nombre,
        i.prueba_id,
        p.codigo AS prueba_codigo,
        p.nombre AS prueba_nombre,
        p.acn AS prueba_acn,
        p.unidad AS cobas_unidad,
        i.categoria_error,
        i.cantidad_afectada,
        CASE WHEN i.es_evitable = 1 THEN TRUE ELSE FALSE END AS es_evitable,
        i.motivo_detalle,
        DATE_FORMAT(i.fecha_hora_incidencia, '%Y-%m-%d %H:%i:%s') AS fecha_hora_incidencia,
        i.created_at
      FROM registro_incidencias i
      JOIN secciones s ON i.seccion_id = s.id
      LEFT JOIN pruebas p ON i.prueba_id = p.id
      ORDER BY i.fecha_hora_incidencia DESC
      LIMIT ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [limite]);
    return rows;
  }

  /**
   * Obtiene incidencias para una fecha específica (utilizado por el generador de reportes de IA)
   */
  static async obtenerPorFecha(fecha: string) {
    const query = `
      SELECT 
        i.id,
        s.nombre AS seccion_nombre,
        p.codigo AS prueba_codigo,
        p.nombre AS prueba_nombre,
        i.categoria_error,
        i.cantidad_afectada,
        i.es_evitable,
        i.motivo_detalle,
        DATE_FORMAT(i.fecha_hora_incidencia, '%H:%i:%s') AS hora_incidencia
      FROM registro_incidencias i
      JOIN secciones s ON i.seccion_id = s.id
      LEFT JOIN pruebas p ON i.prueba_id = p.id
      WHERE DATE(i.fecha_hora_incidencia) = ?
      ORDER BY i.fecha_hora_incidencia ASC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [fecha]);
    return rows;
  }
}