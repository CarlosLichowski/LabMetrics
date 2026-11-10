// src/services/ia.service.ts

import { CierresService } from './cierres.service';
import { IncidenciasService } from './incidencias.service';
import { AnalisisIADTO, AnalisisIAResultado } from '../types';

/**
 * Contrato de proveedor de LLM para permitir desacople e intercambiabilidad
 * (OpenAI, Google Gemini, Groq, Anthropic, o Simulación de desarrollo)
 */
export interface ILLMProvider {
  generarRespuesta(prompt: string, sistema?: string): Promise<string>;
}

/**
 * Proveedor por defecto para Google Gemini o llamado HTTP compatible
 */
class GeminiProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generarRespuesta(prompt: string, sistema?: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: sistema ? { parts: [{ text: sistema }] } : undefined,
      generationConfig: {
        temperature: 0.2, // Baja temperatura para análisis clínico riguroso
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en API Gemini (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Respuesta vacía recibida del proveedor de IA');
    }
    return text;
  }
}

/**
 * Proveedor Clínico Mock para pruebas locales o entornos sin API Key configurada
 */
class MockClinicalProvider implements ILLMProvider {
  async generarRespuesta(prompt: string): Promise<string> {
    // Simula una respuesta estructurada generada por IA basada en la información médica
    const esCritico = prompt.includes('reproc') && prompt.includes('interfiere');

    const mockResponse: AnalisisIAResultado = {
      resumen_ejecutivo:
        'Cierre de jornada procesado correctamente con métricas operativas estables en módulo Roche Cobas. Se identifican desvíos preanalíticos leves que ameritan refuerzo en el circuito de extracción.',
      desvios_criticos: [
        'Interferencia por hemólisis detectada en sueros de urgencia.',
        'Tasa de repetición del 4.2% dentro del rango aceptable pero susceptible de optimización.',
      ],
      analisis_calidad_six_sigma:
        'El desempeño analítico del canal se ubica en 4.6 Sigma. Los controles de calidad (CQI) se mantuvieron dentro de ±1.5 DE según reglas de Westgard.',
      recomendaciones_inmediatas: [
        'Inspeccionar centrífuga de guardia para descartar hemólisis mecánica en tubos con gel separador.',
        'Verificar volumen muerto del casete c-pack previo al inicio del siguiente turno de alta demanda.',
        'Notificar al servicio de enfermería sobre el protocolo de inversión de tubos con anticoagulante.',
      ],
      nivel_alerta: esCritico ? 'CRITICO' : 'PRECAUCION',
      metadatos: {
        modelo: 'gemini-2.5-flash-simulation',
        incidencias_analizadas: 2,
        generado_en: new Date().toISOString(),
      },
    };

    return JSON.stringify(mockResponse);
  }
}

export class IAService {
  /**
   * Obtiene la instancia adecuada de LLM según variables de entorno
   */
  private static obtenerProveedor(): ILLMProvider {
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (apiKey) {
      return new GeminiProvider(apiKey);
    }
    return new MockClinicalProvider();
  }

  /**
   * Genera un informe y análisis de causas raíz asistido por IA para el laboratorio
   */
  static async generarAnalisis(datos: AnalisisIADTO): Promise<AnalisisIAResultado> {
    let contextoCierre: Record<string, unknown> | null = null;
    let incidenciasTurno: unknown[] = [];

    // 1. Recopilar contexto clínico del cierre si se proporcionó cierre_id
    if (datos.cierre_id) {
      contextoCierre = await CierresService.obtenerPorId(datos.cierre_id);

      if (datos.incluir_incidencias && contextoCierre?.fecha_cierre) {
        incidenciasTurno = await IncidenciasService.obtenerPorFecha(
          contextoCierre.fecha_cierre as string
        );
      }
    }

    // 2. Construir prompt especializado en aseguramiento de calidad LIS
    const promptSistema = `
Eres un Médico Bioquímico Senior y Especialista en Gestión de Calidad de Laboratorio Clínico (ISO 15189 y Six Sigma).
Tu función es analizar los datos de cierre de contadores de instrumentos Roche Cobas c501 / ISE1, cruzar la información con las incidencias operativas registradas durante la guardia y emitir un dictamen técnico de calidad con recomendaciones directas para el Jefe de Laboratorio.
Debes responder SIEMPRE en formato JSON válido con la siguiente estructura:
{
  "resumen_ejecutivo": "string",
  "desvios_criticos": ["string"],
  "analisis_calidad_six_sigma": "string",
  "recomendaciones_inmediatas": ["string"],
  "nivel_alerta": "NORMAL" | "PRECAUCION" | "CRITICO"
}
`.trim();

    const promptUsuario = `
DATOS DE ENTRADA PARA EL ANÁLISIS:

- Observaciones directas de la guardia / operador:
"${datos.observaciones_guardia || 'Sin observaciones textuales adicionales'}"

- Datos de Cierre y Contadores Cobas c501:
${contextoCierre ? JSON.stringify(contextoCierre, null, 2) : 'No se asoció un registro de cierre específico.'}

- Incidencias Operativas registradas en la misma fecha:
${incidenciasTurno.length > 0 ? JSON.stringify(incidenciasTurno, null, 2) : 'No se registraron incidencias adicionales en el periodo.'}

Por favor realiza la correlación técnica, evalúa el impacto en tiempos de respuesta (TAT) y consumo de reactivos, y genera el JSON estricto.
`.trim();

    // 3. Ejecutar proveedor de IA
    const provider = this.obtenerProveedor();
    const rawResult = await provider.generarRespuesta(promptUsuario, promptSistema);

    try {
      // Intentar limpiar posibles bloques markdown ```json ... ``` si el LLM los incluye
      const cleanedJson = rawResult
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanedJson) as Omit<AnalisisIAResultado, 'metadatos'>;

      return {
        resumen_ejecutivo: parsed.resumen_ejecutivo || 'Resumen generado con éxito.',
        desvios_criticos: Array.isArray(parsed.desvios_criticos) ? parsed.desvios_criticos : [],
        analisis_calidad_six_sigma:
          parsed.analisis_calidad_six_sigma || 'Control analítico dentro de especificaciones.',
        recomendaciones_inmediatas: Array.isArray(parsed.recomendaciones_inmediatas)
          ? parsed.recomendaciones_inmediatas
          : [],
        nivel_alerta: parsed.nivel_alerta || 'NORMAL',
        metadatos: {
          modelo: process.env.GEMINI_API_KEY ? 'gemini-2.5-flash' : 'clinical-rule-engine-mock',
          cierre_evaluado: datos.cierre_id,
          incidencias_analizadas: incidenciasTurno.length,
          generado_en: new Date().toISOString(),
        },
      };
    } catch {
      // Fallback seguro en caso de respuesta con texto libre
      return {
        resumen_ejecutivo: rawResult.slice(0, 300),
        desvios_criticos: ['Revisión manual requerida del texto generado'],
        analisis_calidad_six_sigma: 'No fue posible estructurar el índice Sigma automáticamente',
        recomendaciones_inmediatas: ['Auditar bitácora de guardia de forma directa'],
        nivel_alerta: 'PRECAUCION',
        metadatos: {
          modelo: 'fallback',
          cierre_evaluado: datos.cierre_id,
          incidencias_analizadas: incidenciasTurno.length,
          generado_en: new Date().toISOString(),
        },
      };
    }
  }
}
