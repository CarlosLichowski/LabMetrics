// src/schemas/metricas.schema.ts

import { z } from 'zod';

export const filtroMetricasSchema = z.object({
  dias: z
    .coerce
    .number()
    .int('dias debe ser un número entero')
    .min(1, 'El rango mínimo es de 1 día')
    .max(365, 'El rango máximo es de 365 días')
    .default(7),
  seccion_id: z.coerce.number().int().positive().optional(),
});

export type FiltroMetricasInput = z.infer<typeof filtroMetricasSchema>;
