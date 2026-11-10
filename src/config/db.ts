// db.ts (Exclusivo para tu Backend Node.js / Express)
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'LabMetrics',
  port: Number(process.env.DB_PORT) || 4000, // Puerto 4000 para TiDB Cloud
  
  // --- CONFIGURACIÓN OBLIGATORIA SSL PARA TiDB CLOUD ---
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  decimalNumbers: true,
  dateStrings: false,
});