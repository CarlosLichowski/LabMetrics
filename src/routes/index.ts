// src/routes/index.ts

import { Router } from 'express';
import incidenciasRouter from './incidencias.routes';
import cierresRouter from './cierres.routes';
import metricasRouter from './metricas.routes';
import iaRouter from './ia.routes';
import inventarioRouter from './inventario.routes';
import pruebasRouter from './pruebas.routes';

const apiRouter = Router();

apiRouter.use('/incidencias', incidenciasRouter);
apiRouter.use('/cierres', cierresRouter);
apiRouter.use('/cierres-mensuales', inventarioRouter);
apiRouter.use('/pruebas', pruebasRouter);
apiRouter.use('/metricas', metricasRouter);
apiRouter.use('/analisis-ia', iaRouter);

export default apiRouter;
