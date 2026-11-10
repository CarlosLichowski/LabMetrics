// src/app.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/db';
import apiRouter from './routes';
import incidenciasRouter from './routes/incidencias.routes';
import cierresRouter from './routes/cierres.routes';
import inventarioRouter from './routes/inventario.routes';
import pruebasRouter from './routes/pruebas.routes';
import { errorHandler } from './middlewares/error.middleware';
import { NotFoundError } from './errors/app-error';

dotenv.config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Healthcheck y diagnóstico de base de datos
app.get('/health', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({
      status: 'OK',
      servicio: 'LabAnalytics API LIS',
      timestamp: new Date().toISOString(),
      db: 'Conectada con éxito a MySQL',
      resultado: rows,
    });
  } catch (error) {
    next(error);
  }
});

// Enrutador Principal (/api/...)
app.use('/api', apiRouter);

// Compatibilidad hacia atrás con endpoints raíz del prototipo
app.use('/incidencias', incidenciasRouter);
app.use('/cierres', cierresRouter);
app.use('/cierres-mensuales', inventarioRouter);
app.use('/pruebas', pruebasRouter);

// Manejo de Rutas No Encontradas (404)
app.use((req, _res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
});

// Middleware Global de Manejo de Errores (Debe ser el último middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 [LabAnalytics LIS] Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Métricas en http://localhost:${PORT}/api/metricas`);
  console.log(`🧪 Cierres Mensuales Cobas en http://localhost:${PORT}/api/cierres-mensuales`);
  console.log(`📋 Catálogo de Pruebas en http://localhost:${PORT}/api/pruebas`);
  console.log(`🤖 Servicio de IA listo en http://localhost:${PORT}/api/analisis-ia`);
});

// Cierre graceful de conexiones ante señales de terminación
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor y pool de conexiones MySQL...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log('✅ Pool de conexiones MySQL cerrado exitosamente.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error cerrando pool de MySQL:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;