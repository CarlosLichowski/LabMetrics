// src/types/index.ts

import { CrearIncidenciaInput } from '../schemas/incidencia.schema';
import { CrearCierreInput } from '../schemas/cierre.schema';
import { AnalisisIAInput } from '../schemas/ia.schema';
import {
  CrearInventarioInput,
  CierreMensualLoteInput,
  ItemLecturaInventarioInput,
  FiltroInventarioInput,
} from '../schemas/inventario.schema';

// Categorías posibles de error (coincide con el ENUM de MySQL)
export type CategoriaError =
  | 'preanalitica'
  | 'extraccion'
  | 'carga_medica'
  | 'instrumental'
  | 'reactivo';

// Módulo o unidad de procesamiento Cobas 6000
export type UnidadCobas = 'c5-1' | 'ISE1';

// Entidades de Dominio
export interface Seccion {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Prueba {
  id: number;
  seccion_id: number;
  codigo: string;
  nombre: string;
  acn: number;
  unidad: UnidadCobas;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegistroIncidencia {
  id: number;
  seccion_id: number;
  prueba_id?: number | null;
  categoria_error: CategoriaError;
  cantidad_afectada: number;
  es_evitable: boolean;
  motivo_detalle: string;
  fecha_hora_incidencia: string;
  created_at: string;
  updated_at: string;
}

export interface CierreDiario {
  id: number;
  prueba_id: number;
  rutina: number;
  reproc: number;
  urg: number;
  calib: number;
  cc: number;
  recuento_total_impreso: number;
  recuento_manual?: string | null;
  observaciones?: string | null;
  fecha_cierre: string;
  fecha_hora_cierre: string;
  created_at: string;
  updated_at: string;
}

// Entidad de Inventario Mensual y Diferencial de Consumo Real
export interface InventarioMensual {
  id: number;
  prueba_id: number;
  prueba_codigo?: string;
  prueba_nombre?: string;
  acn?: number;
  unidad?: UnidadCobas;
  seccion_nombre?: string;
  periodo: string; // 'YYYY-MM'
  fecha_cierre: string; // 'YYYY-MM-DD'
  recuento_anterior: number;
  recuento_actual: number;
  consumo_real: number; // formula: recuento_anterior - recuento_actual
  rutina: number;
  reproc: number;
  urg: number;
  calib: number;
  cc: number;
  lote_reactivo?: string | null;
  observaciones?: string | null;
  usuario?: string | null;
  created_at: string;
  updated_at: string;
}

// DTOs compatibles con Zod
export type CrearIncidenciaDTO = CrearIncidenciaInput;
export type CrearCierreDTO = CrearCierreInput;
export type AnalisisIADTO = AnalisisIAInput;
export type CrearInventarioDTO = CrearInventarioInput;
export type CierreMensualLoteDTO = CierreMensualLoteInput;
export type ItemLecturaInventarioDTO = ItemLecturaInventarioInput;
export type FiltroInventarioDTO = FiltroInventarioInput;

// Modelos para respuestas analíticas de Métricas y BI
export interface ResumenDiarioMetrica {
  fecha: string;
  total_pruebas_procesadas: number;
  total_rutina: number;
  total_urgencias: number;
  total_reprocesos: number;
  total_calibraciones: number;
  total_controles_calidad: number;
  tasa_reproceso_porcentaje: number;
}

export interface IncidenciaCategoriaMetrica {
  categoria_error: CategoriaError;
  total_incidencias: number;
  total_muestras_afectadas: number;
  porcentaje_incidencias: number;
  porcentaje_muestras_afectadas: number;
  total_evitables: number;
  tasa_evitabilidad_porcentaje: number;
}

export interface KpisLaboratorio {
  total_muestras_afectadas_semana: number;
  total_incidencias_semana: number;
  pruebas_procesadas_semana: number;
  tasa_global_reproceso: number;
  categoria_mas_frecuente: string;
}

export interface ConsumoMensualKpi {
  total_consumo_real_periodo: number;
  total_pruebas_procesadas_periodo: number;
  tasa_reproceso_promedio: number;
  total_analitos_activos: number;
  consumo_por_unidad: {
    unidad: UnidadCobas;
    total_consumo: number;
    porcentaje: number;
  }[];
  top_analitos_consumo: {
    prueba_id: number;
    codigo: string;
    nombre: string;
    acn: number;
    unidad: UnidadCobas;
    consumo_real: number;
    reprocesos: number;
    tasa_reproceso: number;
  }[];
  tendencia_mensual: {
    periodo: string;
    total_consumo_real: number;
    total_rutina: number;
    total_urgencias: number;
    total_reprocesos: number;
    tasa_reproceso_pct: number;
  }[];
}

export interface AnalisisIAResultado {
  resumen_ejecutivo: string;
  desvios_criticos: string[];
  analisis_calidad_six_sigma: string;
  recomendaciones_inmediatas: string[];
  nivel_alerta: 'NORMAL' | 'PRECAUCION' | 'CRITICO';
  metadatos: {
    modelo: string;
    cierre_evaluado?: number;
    incidencias_analizadas: number;
    generado_en: string;
  };
}
