// src/schemas/inventario.schema.ts

import { z } from 'zod';

export const itemLecturaInventarioSchema = z.object({
  prueba_id: z
    .number({ message: 'El campo prueba_id es obligatorio' })
    .int('prueba_id debe ser un entero')
    .positive('prueba_id debe ser positivo'),

  recuento_actual: z
    .number({ message: 'El recuento_actual es obligatorio' })
    .int('recuento_actual debe ser un entero')
    .min(0, 'recuento_actual no puede ser negativo'),

  recuento_anterior: z
    .number()
    .int('recuento_anterior debe ser un entero')
    .min(0, 'recuento_anterior no puede ser negativo')
    .optional(),

  rutina: z
    .number()
    .int('rutina debe ser un entero')
    .min(0, 'rutina no puede ser negativa')
    .default(0),

  reproc: z
    .number()
    .int('reproc debe ser un entero')
    .min(0, 'reproc no puede ser negativo')
    .default(0),

  urg: z
    .number()
    .int('urg debe ser un entero')
    .min(0, 'urg no puede ser negativo')
    .default(0),

  calib: z
    .number()
    .int('calib debe ser un entero')
    .min(0, 'calib no puede ser negativo')
    .default(0),

  cc: z
    .number()
    .int('cc debe ser un entero')
    .min(0, 'cc no puede ser negativo')
    .default(0),

  lote_reactivo: z
    .string()
    .trim()
    .max(50, 'lote_reactivo no puede superar 50 caracteres')
    .optional()
    .nullable(),

  observaciones: z
    .string()
    .trim()
    .max(2000, 'Las observaciones no pueden superar 2000 caracteres')
    .optional()
    .nullable(),
});

export const crearInventarioSchema = itemLecturaInventarioSchema.extend({
  periodo: z
    .string({ message: 'El campo periodo es obligatorio' })
    .regex(/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM (ej. 2026-09)'),

  fecha_cierre: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_cierre debe tener formato YYYY-MM-DD')
    .optional(),

  usuario: z
    .string()
    .trim()
    .max(100, 'usuario no puede superar 100 caracteres')
    .optional()
    .nullable(),
});

export const cierreMensualLoteSchema = z.object({
  periodo: z
    .string({ message: 'El campo periodo es obligatorio' })
    .regex(/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM (ej. 2026-09)'),

  fecha_cierre: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_cierre debe tener formato YYYY-MM-DD')
    .optional(),

  usuario: z
    .string()
    .trim()
    .max(100, 'usuario no puede superar 100 caracteres')
    .optional()
    .nullable(),

  observaciones_generales: z
    .string()
    .trim()
    .max(2000, 'Las observaciones no pueden superar 2000 caracteres')
    .optional()
    .nullable(),

  lecturas: z
    .array(itemLecturaInventarioSchema)
    .min(1, 'Debe incluir al menos un analito en la carga mensual'),
});

export const filtroInventarioSchema = z.object({
  periodo: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM')
    .optional(),

  unidad: z
    .enum(['c5-1', 'ISE1'], { message: 'La unidad debe ser c5-1 o ISE1' })
    .optional(),

  prueba_id: z
    .string()
    .regex(/^\d+$/, 'prueba_id debe ser numérico')
    .transform(Number)
    .optional(),

  limite: z
    .string()
    .regex(/^\d+$/, 'limite debe ser numérico')
    .transform(Number)
    .optional(),
});

export type CrearInventarioInput = z.infer<typeof crearInventarioSchema>;
export type CierreMensualLoteInput = z.infer<typeof cierreMensualLoteSchema>;
export type FiltroInventarioInput = z.infer<typeof filtroInventarioSchema>;
export type ItemLecturaInventarioInput = z.infer<typeof itemLecturaInventarioSchema>;
