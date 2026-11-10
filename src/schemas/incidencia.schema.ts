// src/schemas/incidencia.schema.ts

import { z } from 'zod';

export const CategoriaErrorEnum = z.enum([
  'preanalitica',
  'extraccion',
  'carga_medica',
  'instrumental',
  'reactivo',
]);

export const crearIncidenciaSchema = z.object({
  seccion_id: z
    .number({ message: 'El campo seccion_id es obligatorio' })
    .int('seccion_id debe ser un entero')
    .positive('seccion_id debe ser positivo'),

  prueba_id: z.number().int().positive().optional().nullable(),

  categoria_error: CategoriaErrorEnum,

  cantidad_afectada: z
    .number({ message: 'La cantidad afectada debe ser un número' })
    .int('La cantidad afectada debe ser un número entero')
    .min(1, 'La cantidad afectada debe ser al menos 1')
    .default(1),

  es_evitable: z
    .boolean({ message: 'es_evitable debe ser un valor booleano' })
    .default(true),

  motivo_detalle: z
    .string({ message: 'El motivo detallado es obligatorio' })
    .trim()
    .min(5, 'El detalle del motivo debe contener al menos 5 caracteres')
    .max(2000, 'El motivo no puede exceder 2000 caracteres'),

  fecha_hora_incidencia: z
    .string({ message: 'La fecha y hora de la incidencia es obligatoria' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'fecha_hora_incidencia debe ser una fecha/hora válida (ISO 8601 o YYYY-MM-DD HH:mm:ss)',
    }),
});

export type CrearIncidenciaInput = z.infer<typeof crearIncidenciaSchema>;
