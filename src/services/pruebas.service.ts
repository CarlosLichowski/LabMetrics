// src/services/pruebas.service.ts

import { pool } from '../config/db';
import { Prueba, UnidadCobas } from '../types';
import { RowDataPacket } from 'mysql2';

export class PruebasService {
  /**
   * Obtiene la lista completa de analitos y canales ACN de Roche Cobas c501 e ISE
   */
  static async listar(unidad?: UnidadCobas): Promise<Prueba[]> {
    let query = `
      SELECT 
        p.id,
        p.seccion_id,
        p.codigo,
        p.nombre,
        p.acn,
        p.unidad,
        p.activo,
        DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
      FROM pruebas p
      WHERE p.activo = 1
    `;

    const params: any[] = [];
    if (unidad) {
      query += ` AND p.unidad = ?`;
      params.push(unidad);
    }

    query += ` ORDER BY p.unidad ASC, p.acn ASC`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map((r) => ({
      id: Number(r.id),
      seccion_id: Number(r.seccion_id),
      codigo: r.codigo,
      nombre: r.nombre,
      acn: Number(r.acn),
      unidad: r.unidad,
      activo: Boolean(r.activo),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }
}
