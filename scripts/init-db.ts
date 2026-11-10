// scripts/init-db.ts

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function initDatabase() {
  console.log('🔄 [LabMetrics DB Init] Conectando a MySQL...');

  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = Number(process.env.DB_PORT) || 3306;

  try {
    // Conectar sin especificar base de datos para poder crearla si no existe
    const conn = await mysql.createConnection({
      host,
      user,
      password,
      port,
      multipleStatements: true,
    });

    console.log('✅ Conexión establecida con el servidor MySQL.');

    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`No se encontró el archivo schema.sql en: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Ejecutando esquema SQL y semillas oficiales Roche Cobas...');

    await conn.query(schemaSql);
    console.log('🎉 [LabMetrics DB Init] ¡Base de datos, tablas, vistas y catálogo Cobas inicializados con éxito!');

    await conn.end();
  } catch (err: any) {
    console.error('❌ Error al inicializar la base de datos:', err.code || err.message || err);
    process.exit(1);
  }
}

initDatabase();
