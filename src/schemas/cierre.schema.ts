// src/schemas/cierre.schema.ts

import { z } from 'zod';

export const crearCierreSchema = z
  .object({
    prueba_id: z
      .number({ message: 'El campo prueba_id es obligatorio' })
      .int('prueba_id debe ser un entero')
      .positive('prueba_id debe ser positivo'),

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

    recuento_total_impreso: z
      .number()
      .int('recuento_total_impreso debe ser un entero')
      .min(0, 'recuento_total_impreso no puede ser negativo')
      .optional(),

    recuento_manual: z
      .string()
      .trim()
      .max(50, 'recuento_manual no puede superar 50 caracteres')
      .optional()
      .nullable(),

    fecha_cierre: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_cierre debe tener formato YYYY-MM-DD')
      .optional(),

    fecha_hora_cierre: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'fecha_hora_cierre debe ser una fecha/hora válida (ISO 8601 o YYYY-MM-DD HH:mm:ss)',
      })
      .optional(),

    observaciones: z
      .string()
      .trim()
      .max(2000, 'Las observaciones no pueden superar 2000 caracteres')
      .optional()
      .nullable(),
  })
  .transform((data) => {
    const sumaComponentes = data.rutina + data.reproc + data.urg + data.calib + data.cc;
    const recuentoImpreso =
      data.recuento_total_impreso !== undefined ? data.recuento_total_impreso : sumaComponentes;

    const fechaHoraCierre =
      data.fecha_hora_cierre || new Date().toISOString().slice(0, 19).replace('T', ' ');

    const fechaCierre = data.fecha_cierre || fechaHoraCierre.slice(0, 10);

    return {
      ...data,
      recuento_total_impreso: recuentoImpreso,
      fecha_hora_cierre: fechaHoraCierre,
      fecha_cierre: fechaCierre,
    };
  });

export type CrearCierreInput = z.infer<typeof crearCierreSchema>;
