// src/middlewares/error.middleware.ts

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';

interface MySQLError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError | ZodError | MySQLError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // 1. Errores de Validación Zod
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensaje: issue.message,
    }));

    return res.status(400).json({
      status: 'FAIL',
      tipo: 'VALIDATION_ERROR',
      mensaje: 'Falló la validación de los datos enviados',
      errores: formattedErrors,
    });
  }

  // 2. Errores controlados de la aplicación (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.statusCode >= 500 ? 'ERROR' : 'FAIL',
      tipo: err.name,
      mensaje: err.message,
      ...(err.details ? { detalles: err.details } : {}),
    });
  }

  // 3. Errores de Motor Relacional MySQL (mysql2)
  const mysqlErr = err as MySQLError;
  if (mysqlErr.code) {
    switch (mysqlErr.code) {
      case 'ER_NO_REFERENCED_ROW_2':
        return res.status(400).json({
          status: 'FAIL',
          tipo: 'FOREIGN_KEY_VIOLATION',
          mensaje: 'El identificador foráneo especificado (seccion_id o prueba_id) no existe en la base de datos.',
        });

      case 'ER_ROW_IS_REFERENCED_2':
        return res.status(409).json({
          status: 'FAIL',
          tipo: 'RESTRICT_VIOLATION',
          mensaje: 'No se puede eliminar o modificar el registro porque está referenciado por otras tablas.',
        });

      case 'ER_DUP_ENTRY':
        return res.status(409).json({
          status: 'FAIL',
          tipo: 'DUPLICATE_ENTRY',
          mensaje: 'Ya existe un registro con la clave única especificada (código, nombre o ACN).',
        });

      case 'ECONNREFUSED':
      case 'PROTOCOL_CONNECTION_LOST':
        return res.status(503).json({
          status: 'ERROR',
          tipo: 'DATABASE_CONNECTION_ERROR',
          mensaje: 'No se pudo establecer conexión con el servidor MySQL del LIS.',
        });
    }
  }

  // 4. Error no controlado (500 Internal Server Error)
  console.error('[UNHANDLED_ERROR]', {
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  return res.status(500).json({
    status: 'ERROR',
    tipo: 'INTERNAL_SERVER_ERROR',
    mensaje: 'Ocurrió un error inesperado en el servidor del laboratorio.',
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack, detalle: err.message } : {}),
  });
};
