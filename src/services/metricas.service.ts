// src/services/metricas.service.ts

import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';
import { ResumenDiarioMetrica, IncidenciaCategoriaMetrica } from '../types';

export class MetricasService {
  /**
   * Obtiene el resumen agrupado por fecha de pruebas procesadas, reprocesos, urgencias,
   * calibraciones y controles de calidad para dashboards (React / Power BI).
   */
  static async obtenerResumenSemanal(dias = 7): Promise<ResumenDiarioMetrica[]> {
    const query = `
      SELECT 
        DATE_FORMAT(c.fecha_cierre, '%Y-%m-%d') AS fecha,
        CAST(COALESCE(SUM(c.recuento_total_impreso), 0) AS UNSIGNED) AS total_pruebas_procesadas,
        CAST(COALESCE(SUM(c.rutina), 0) AS UNSIGNED) AS total_rutina,
        CAST(COALESCE(SUM(c.urg), 0) AS UNSIGNED) AS total_urgencias,
        CAST(COALESCE(SUM(c.reproc), 0) AS UNSIGNED) AS total_reprocesos,
        CAST(COALESCE(SUM(c.calib), 0) AS UNSIGNED) AS total_calibraciones,
        CAST(COALESCE(SUM(c.cc), 0) AS UNSIGNED) AS total_controles_calidad,
        ROUND(
          CASE 
            WHEN (SUM(c.rutina) + SUM(c.urg) + SUM(c.reproc)) > 0 
            THEN (SUM(c.reproc) * 100.0) / (SUM(c.rutina) + SUM(c.urg) + SUM(c.reproc))
            ELSE 0 
          END, 
          2
        ) AS tasa_reproceso_porcentaje
      FROM cierres_diarios c
      WHERE c.fecha_cierre >= CURDATE() - INTERVAL ? DAY
      GROUP BY c.fecha_cierre
      ORDER BY c.fecha_cierre ASC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [dias]);

    return rows.map((row) => ({
      fecha: row.fecha,
      total_pruebas_procesadas: Number(row.total_pruebas_procesadas),
      total_rutina: Number(row.total_rutina),
      total_urgencias: Number(row.total_urgencias),
      total_reprocesos: Number(row.total_reprocesos),
      total_calibraciones: Number(row.total_calibraciones),
      total_controles_calidad: Number(row.total_controles_calidad),
      tasa_reproceso_porcentaje: Number(row.tasa_reproceso_porcentaje),
    }));
  }

  /**
   * Calcula el porcentaje y distribución de incidencias por categoría utilizando
   * funciones de ventana analíticas de MySQL 8.0 (COUNT() OVER(), SUM() OVER())
   */
  static async obtenerIncidenciasPorCategoria(dias = 30): Promise<IncidenciaCategoriaMetrica[]> {
    const query = `
      SELECT 
        i.categoria_error,
        CAST(COUNT(i.id) AS UNSIGNED) AS total_incidencias,
        CAST(COALESCE(SUM(i.cantidad_afectada), 0) AS UNSIGNED) AS total_muestras_afectadas,
        ROUND(
          COUNT(i.id) * 100.0 / NULLIF(SUM(COUNT(i.id)) OVER(), 0), 
          2
        ) AS porcentaje_incidencias,
        ROUND(
          COALESCE(SUM(i.cantidad_afectada), 0) * 100.0 / 
          NULLIF(SUM(SUM(i.cantidad_afectada)) OVER(), 0), 
          2
        ) AS porcentaje_muestras_afectadas,
        CAST(COALESCE(SUM(CASE WHEN i.es_evitable = 1 THEN 1 ELSE 0 END), 0) AS UNSIGNED) AS total_evitables,
        ROUND(
          (SUM(CASE WHEN i.es_evitable = 1 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(i.id), 0),
          2
        ) AS tasa_evitabilidad_porcentaje
      FROM registro_incidencias i
      WHERE i.fecha_hora_incidencia >= NOW() - INTERVAL ? DAY
      GROUP BY i.categoria_error
      ORDER BY total_incidencias DESC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [dias]);

    return rows.map((row) => ({
      categoria_error: row.categoria_error,
      total_incidencias: Number(row.total_incidencias),
      total_muestras_afectadas: Number(row.total_muestras_afectadas),
      porcentaje_incidencias: Number(row.porcentaje_incidencias),
      porcentaje_muestras_afectadas: Number(row.porcentaje_muestras_afectadas),
      total_evitables: Number(row.total_evitables),
      tasa_evitabilidad_porcentaje: Number(row.tasa_evitabilidad_porcentaje),
    }));
  }

  /**
   * KPIs generales de calidad y productividad para el encabezado del dashboard
   */
  static async obtenerKpisGenerales(dias = 7) {
    const queryPruebas = `
      SELECT 
        COALESCE(SUM(recuento_total_impreso), 0) AS total_pruebas,
        COALESCE(SUM(reproc), 0) AS total_reproc,
        ROUND(
          CASE 
            WHEN (SUM(rutina) + SUM(urg) + SUM(reproc)) > 0 
            THEN (SUM(reproc) * 100.0) / (SUM(rutina) + SUM(urg) + SUM(reproc))
            ELSE 0 
          END, 
          2
        ) AS tasa_reproceso
      FROM cierres_diarios
      WHERE fecha_cierre >= CURDATE() - INTERVAL ? DAY
    `;

    const queryIncidencias = `
      SELECT 
        COUNT(*) AS total_incidencias,
        COALESCE(SUM(cantidad_afectada), 0) AS total_muestras_afectadas,
        ROUND(
          (SUM(CASE WHEN es_evitable = 1 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0),
          2
        ) AS pct_evitables
      FROM registro_incidencias
      WHERE fecha_hora_incidencia >= NOW() - INTERVAL ? DAY
    `;

    const [[resPruebas], [resIncidencias]] = await Promise.all([
      pool.query<RowDataPacket[]>(queryPruebas, [dias]),
      pool.query<RowDataPacket[]>(queryIncidencias, [dias]),
    ]);

    return {
      periodo_dias: dias,
      pruebas: {
        total_procesadas: Number(resPruebas[0]?.total_pruebas || 0),
        total_reprocesos: Number(resPruebas[0]?.total_reproc || 0),
        tasa_reproceso_pct: Number(resPruebas[0]?.tasa_reproceso || 0),
      },
      incidencias: {
        total_registros: Number(resIncidencias[0]?.total_incidencias || 0),
        total_muestras_afectadas: Number(resIncidencias[0]?.total_muestras_afectadas || 0),
        porcentaje_evitables: Number(resIncidencias[0]?.pct_evitables || 0),
      },
    };
  }

  /**
   * Métricas analíticas de consumo mensual de reactivos Cobas c501 e ISE
   * Diferencial mes a mes, desglose por módulo, y top analitos consumidos.
   */
  static async obtenerConsumosMensuales(meses = 12) {
    const queryTendencia = `
      SELECT 
        periodo,
        CAST(COALESCE(SUM(consumo_real), 0) AS SIGNED) AS total_consumo_real,
        CAST(COALESCE(SUM(rutina), 0) AS UNSIGNED) AS total_rutina,
        CAST(COALESCE(SUM(urg), 0) AS UNSIGNED) AS total_urgencias,
        CAST(COALESCE(SUM(reproc), 0) AS UNSIGNED) AS total_reprocesos,
        CAST(COALESCE(SUM(calib), 0) AS UNSIGNED) AS total_calibraciones,
        CAST(COALESCE(SUM(cc), 0) AS UNSIGNED) AS total_controles_calidad,
        ROUND(
          CASE 
            WHEN (SUM(rutina) + SUM(urg) + SUM(reproc)) > 0 
            THEN (SUM(reproc) * 100.0) / (SUM(rutina) + SUM(urg) + SUM(reproc))
            ELSE 0 
          END, 
          2
        ) AS tasa_reproceso_pct
      FROM inventario_mensual_reactivos
      GROUP BY periodo
      ORDER BY periodo ASC
      LIMIT ?
    `;

    const queryUnidad = `
      SELECT 
        p.unidad,
        CAST(COALESCE(SUM(i.consumo_real), 0) AS SIGNED) AS total_consumo,
        ROUND(
          SUM(i.consumo_real) * 100.0 / NULLIF(SUM(SUM(i.consumo_real)) OVER(), 0),
          2
        ) AS porcentaje
      FROM inventario_mensual_reactivos i
      JOIN pruebas p ON i.prueba_id = p.id
      GROUP BY p.unidad
    `;

    const queryTop = `
      SELECT 
        p.id AS prueba_id,
        p.codigo,
        p.nombre,
        p.acn,
        p.unidad,
        CAST(COALESCE(SUM(i.consumo_real), 0) AS SIGNED) AS consumo_real,
        CAST(COALESCE(SUM(i.reproc), 0) AS UNSIGNED) AS reprocesos,
        ROUND(
          CASE 
            WHEN (SUM(i.rutina) + SUM(i.urg) + SUM(i.reproc)) > 0 
            THEN (SUM(i.reproc) * 100.0) / (SUM(i.rutina) + SUM(i.urg) + SUM(i.reproc))
            ELSE 0 
          END, 
          2
        ) AS tasa_reproceso
      FROM inventario_mensual_reactivos i
      JOIN pruebas p ON i.prueba_id = p.id
      GROUP BY p.id, p.codigo, p.nombre, p.acn, p.unidad
      ORDER BY consumo_real DESC
      LIMIT 10
    `;

    const [rowsTendencia] = await pool.query<RowDataPacket[]>(queryTendencia, [meses]);
    const [rowsUnidad] = await pool.query<RowDataPacket[]>(queryUnidad);
    const [rowsTop] = await pool.query<RowDataPacket[]>(queryTop);

    const totalConsumo = rowsTendencia.reduce((acc, row) => acc + Number(row.total_consumo_real), 0);
    const totalRutina = rowsTendencia.reduce((acc, row) => acc + Number(row.total_rutina), 0);
    const totalUrg = rowsTendencia.reduce((acc, row) => acc + Number(row.total_urgencias), 0);
    const totalReproc = rowsTendencia.reduce((acc, row) => acc + Number(row.total_reprocesos), 0);
    const sumaTotal = totalRutina + totalUrg + totalReproc;
    const tasaReprocPromedio = sumaTotal > 0 ? Number(((totalReproc * 100) / sumaTotal).toFixed(2)) : 0;

    return {
      total_consumo_real_periodo: totalConsumo,
      total_pruebas_procesadas_periodo: sumaTotal,
      tasa_reproceso_promedio: tasaReprocPromedio,
      total_analitos_activos: rowsTop.length,
      consumo_por_unidad: rowsUnidad.map((u) => ({
        unidad: u.unidad,
        total_consumo: Number(u.total_consumo),
        porcentaje: Number(u.porcentaje || 0),
      })),
      top_analitos_consumo: rowsTop.map((t) => ({
        prueba_id: Number(t.prueba_id),
        codigo: t.codigo,
        nombre: t.nombre,
        acn: Number(t.acn),
        unidad: t.unidad,
        consumo_real: Number(t.consumo_real),
        reprocesos: Number(t.reprocesos),
        tasa_reproceso: Number(t.tasa_reproceso || 0),
      })),
      tendencia_mensual: rowsTendencia.map((m) => ({
        periodo: m.periodo,
        total_consumo_real: Number(m.total_consumo_real),
        total_rutina: Number(m.total_rutina),
        total_urgencias: Number(m.total_urgencias),
        total_reprocesos: Number(m.total_reprocesos),
        tasa_reproceso_pct: Number(m.tasa_reproceso_pct),
      })),
    };
  }
}
