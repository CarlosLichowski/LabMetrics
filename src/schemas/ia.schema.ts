// src/schemas/ia.schema.ts

import { z } from 'zod';

export const analisisIASchema = z
  .object({
    cierre_id: z.number().int().positive().optional(),
    observaciones_guardia: z.string().trim().max(3000).optional(),
    incluir_incidencias: z.boolean().default(true),
    modelo: z.enum(['gemini-2.5-flash', 'gpt-4o-mini', 'groq-llama3', 'mock']).default('gemini-2.5-flash'),
  })
  .refine(
    (data) => data.cierre_id !== undefined || (data.observaciones_guardia && data.observaciones_guardia.length > 0),
    {
      message: 'Debe proporcionar al menos un cierre_id o texto en observaciones_guardia para realizar el análisis.',
      path: ['cierre_id'],
    }
  );

export type AnalisisIAInput = z.infer<typeof analisisIASchema>;
