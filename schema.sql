-- ==============================================================================
-- LabAnalytics / LabMetrics - Base de Datos LIS & HealthTech
-- Motor: MySQL 8.0+
-- Arquitectura optimizada para control de reactivos Roche Cobas c501 e ISE
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `LabMetrics`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `LabMetrics`;

-- Desactivar temporalmente revisión de claves foráneas para recreación segura si aplica
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `inventario_mensual_reactivos`;
DROP TABLE IF EXISTS `cierres_diarios`;
DROP TABLE IF EXISTS `registro_incidencias`;
DROP TABLE IF EXISTS `pruebas`;
DROP TABLE IF EXISTS `secciones`;
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 1. TABLA: secciones
-- Representa las áreas técnicas y funcionales del laboratorio clínico.
-- ==============================================================================
CREATE TABLE `secciones` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre de la sección técnica (ej. Bioquímica Cobas, Urgencias)',
  `descripcion` VARCHAR(255) NULL COMMENT 'Descripción de los alcances operativos y equipos del área',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Flag de estado activo (1) o baja lógica (0)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_secciones_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de áreas funcionales y secciones del laboratorio LIS';

-- ==============================================================================
-- 2. TABLA: pruebas
-- Catálogo oficial de determinaciones y analitos Roche Cobas c501 (c5-1) y módulo ISE1
-- ==============================================================================
CREATE TABLE `pruebas` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `seccion_id` INT UNSIGNED NOT NULL COMMENT 'Relación obligatoria con el área técnica que procesa la prueba',
  `codigo` VARCHAR(30) NOT NULL COMMENT 'Código nemotécnico LIS / Roche (ej. ALBT2, GLUC3, CREJ2, ISE NA)',
  `nombre` VARCHAR(150) NOT NULL COMMENT 'Nombre formal del analito (ej. Albúmina, Glucosa HK, Creatinina Jaffe)',
  `acn` INT UNSIGNED NOT NULL COMMENT 'Application Code Number oficial de Roche Cobas',
  `unidad` ENUM('c5-1', 'ISE1') NOT NULL COMMENT 'Módulo analítico que procesa la prueba en la plataforma Cobas 6000',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Estado operativo del analito',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pruebas_codigo` (`codigo`),
  KEY `idx_pruebas_acn` (`acn`),
  KEY `idx_pruebas_seccion` (`seccion_id`),
  KEY `idx_pruebas_unidad` (`unidad`),
  CONSTRAINT `fk_pruebas_secciones`
    FOREIGN KEY (`seccion_id`)
    REFERENCES `secciones` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de analitos y canales ACN para Roche Cobas c501/ISE';

-- ==============================================================================
-- 3. TABLA: registro_incidencias
-- Registro granular de desvíos preanalíticos, analíticos y postanalíticos.
-- ==============================================================================
CREATE TABLE `registro_incidencias` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `seccion_id` INT UNSIGNED NOT NULL COMMENT 'Área donde ocurrió o se detectó la incidencia',
  `prueba_id` INT UNSIGNED NULL COMMENT 'Prueba específica afectada (opcional si es un desvío general del área)',
  `categoria_error` ENUM('preanalitica', 'extraccion', 'carga_medica', 'instrumental', 'reactivo') NOT NULL COMMENT 'Clasificación estandarizada del tipo de falla',
  `cantidad_afectada` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Cantidad de tubos/muestras/determinaciones perjudicadas',
  `es_evitable` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Evitable (oportunidad de mejora continua), 0 = No evitable (fortuito)',
  `motivo_detalle` TEXT NOT NULL COMMENT 'Relato clínico-operativo de la no conformidad o causa raíz detectada',
  `fecha_hora_incidencia` DATETIME NOT NULL COMMENT 'Momento cronológico en que ocurrió o fue detectada la incidencia',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_incidencias_fecha` (`fecha_hora_incidencia`),
  KEY `idx_incidencias_categoria` (`categoria_error`),
  KEY `idx_incidencias_seccion_fecha` (`seccion_id`, `fecha_hora_incidencia`),
  KEY `idx_incidencias_prueba` (`prueba_id`),
  CONSTRAINT `fk_incidencias_secciones`
    FOREIGN KEY (`seccion_id`)
    REFERENCES `secciones` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_pruebas`
    FOREIGN KEY (`prueba_id`)
    REFERENCES `pruebas` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bitácora de incidencias preanalíticas y operativas de laboratorio';

-- ==============================================================================
-- 4. TABLA: cierres_diarios
-- Cierre de producción diario por prueba/turno según desglose de contadores Roche Cobas c501
-- ==============================================================================
CREATE TABLE `cierres_diarios` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `prueba_id` INT UNSIGNED NOT NULL COMMENT 'Referencia al analito del catálogo',
  `rutina` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Recuento de determinaciones de pacientes ambulatorios / rutina',
  `reproc` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Recuento de repeticiones y reprocesos técnicos',
  `urg` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Recuento de determinaciones de pacientes de urgencias / internación',
  `calib` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Determinaciones consumidas por calibraciones del analito',
  `cc` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Determinaciones consumidas por controles de calidad (CQI)',
  `recuento_total_impreso` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total reportado en el ticket/pantalla del Cobas',
  `recuento_manual` VARCHAR(50) NULL COMMENT 'Recuento manual o cruzado con LIS / bitácora física',
  `observaciones` TEXT NULL COMMENT 'Observaciones de la guardia, alarmas de reactivo o estado del canal',
  `fecha_cierre` DATE NOT NULL COMMENT 'Fecha operativa/contable del cierre diario',
  `fecha_hora_cierre` DATETIME NOT NULL COMMENT 'Timestamp exacto en que se asienta el registro en el sistema',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cierres_fecha` (`fecha_cierre`),
  KEY `idx_cierres_fecha_hora` (`fecha_hora_cierre`),
  KEY `idx_cierres_prueba_fecha` (`prueba_id`, `fecha_cierre`),
  CONSTRAINT `fk_cierres_pruebas`
    FOREIGN KEY (`prueba_id`)
    REFERENCES `pruebas` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cierres diarios de producción y consumo analítico por prueba Cobas c501/ISE';

-- ==============================================================================
-- 5. TABLA: inventario_mensual_reactivos (PowerBy / Cierres de Inventario Cobas)
-- Módulo de Carga Mensual y Cálculo Diferencial Automático:
-- Fórmula: Recuento Total Mes Anterior - Recuento Total Mes Actual = Consumo Real del Mes
-- ==============================================================================
CREATE TABLE `inventario_mensual_reactivos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `prueba_id` INT UNSIGNED NOT NULL COMMENT 'Referencia obligatoria a la prueba/analito',
  `periodo` VARCHAR(7) NOT NULL COMMENT 'Período contable mensual en formato YYYY-MM (ej. 2026-08, 2026-09)',
  `fecha_cierre` DATE NOT NULL COMMENT 'Fecha operativa de corte o inventario',
  `recuento_anterior` INT NOT NULL DEFAULT 0 COMMENT 'Recuento acumulado reportado en el mes previo (mes N-1)',
  `recuento_actual` INT NOT NULL COMMENT 'Recuento actual reportado por el equipo Cobas (mes N)',
  `consumo_real` INT NOT NULL DEFAULT 0 COMMENT 'Cálculo diferencial automático: recuento_anterior - recuento_actual',
  `rutina` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Desglose determinaciones rutina ambulatoria',
  `reproc` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Desglose determinaciones reprocesos técnicos',
  `urg` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Desglose determinaciones urgencias / guardia',
  `calib` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Determinaciones usadas en calibraciones',
  `cc` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Determinaciones usadas en controles de calidad',
  `lote_reactivo` VARCHAR(50) NULL COMMENT 'Lote del casete o reactivo Cobas',
  `observaciones` TEXT NULL COMMENT 'Anotaciones de la guardia o estado de canal/recambio',
  `usuario` VARCHAR(100) NULL COMMENT 'Operador/Bioquímico que asienta el cierre',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_prueba_periodo` (`prueba_id`, `periodo`),
  KEY `idx_inventario_periodo` (`periodo`),
  KEY `idx_inventario_prueba_periodo` (`prueba_id`, `periodo`),
  KEY `idx_inventario_fecha` (`fecha_cierre`),
  CONSTRAINT `fk_inventario_pruebas`
    FOREIGN KEY (`prueba_id`)
    REFERENCES `pruebas` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cierres mensuales de inventario y consumo real de reactivos Roche Cobas';

-- ==============================================================================
-- 6. VISTAS ANALÍTICAS (MySQL 8.0 Window Functions para BI y PowerBy)
-- ==============================================================================
CREATE OR REPLACE VIEW `v_cierres_detallados` AS
SELECT 
  c.id AS cierre_id,
  c.fecha_cierre,
  c.fecha_hora_cierre,
  s.nombre AS seccion,
  p.id AS prueba_id,
  p.codigo AS prueba_codigo,
  p.nombre AS prueba_nombre,
  p.acn,
  p.unidad,
  c.rutina,
  c.reproc,
  c.urg,
  c.calib,
  c.cc,
  c.recuento_total_impreso,
  c.recuento_manual,
  (c.rutina + c.reproc + c.urg + c.calib + c.cc) AS recuento_calculado,
  c.observaciones
FROM `cierres_diarios` c
JOIN `pruebas` p ON c.prueba_id = p.id
JOIN `secciones` s ON p.seccion_id = s.id;

CREATE OR REPLACE VIEW `v_consumos_mensuales_diferencial` AS
SELECT 
  i.id,
  i.periodo,
  i.fecha_cierre,
  p.id AS prueba_id,
  p.codigo AS prueba_codigo,
  p.nombre AS prueba_nombre,
  p.acn,
  p.unidad,
  s.nombre AS seccion_nombre,
  COALESCE(
    LAG(i.recuento_actual) OVER (PARTITION BY i.prueba_id ORDER BY i.periodo ASC),
    i.recuento_anterior
  ) AS recuento_anterior_calculado,
  i.recuento_actual,
  (
    COALESCE(
      LAG(i.recuento_actual) OVER (PARTITION BY i.prueba_id ORDER BY i.periodo ASC),
      i.recuento_anterior
    ) - i.recuento_actual
  ) AS consumo_real_calculado,
  i.consumo_real AS consumo_real_registrado,
  i.rutina,
  i.reproc,
  i.urg,
  i.calib,
  i.cc,
  i.lote_reactivo,
  i.observaciones,
  i.usuario,
  i.created_at
FROM `inventario_mensual_reactivos` i
JOIN `pruebas` p ON i.prueba_id = p.id
JOIN `secciones` s ON p.seccion_id = s.id;

-- ==============================================================================
-- 7. DATOS SEMILLA (SEED DATA)
-- Catálogo oficial Roche Cobas c501 / ISE1
-- ==============================================================================

-- Secciones
INSERT INTO `secciones` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Bioquímica Clínica Cobas', 'Área automatizada de química clínica e inmunoturbidimetría Cobas 6000'),
(2, 'Hematología y Hemostasia', 'Citometría hemática, frotis y pruebas de coagulación'),
(3, 'Inmunología Especial', 'Serología, marcadores tumorales y hormonas'),
(4, 'Urgencias y Guardia', 'Sección de respuesta rápida para internación y shockroom')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- Catálogo Oficial Roche Cobas c501 (c5-1) y módulo ISE1
INSERT INTO `pruebas` (`id`, `seccion_id`, `codigo`, `nombre`, `acn`, `unidad`) VALUES
-- Analito destacado para control de inventario diferencial
(1,  1, 'ALBT2',   'Albúmina Sérica', 20060, 'c5-1'),
(2,  1, 'ALBT2U',  'Albúmina U', 20061, 'c5-1'),
(3,  1, 'ALB2-G',  'Albúmina G', 20090, 'c5-1'),
(4,  1, 'ALP2',    'Fosfatasa Alcalina', 20110, 'c5-1'),
(5,  1, 'AMYL2',   'Amilasa Total', 20170, 'c5-1'),
(6,  1, 'AMYL2U',  'Amilasa Urinaria', 20171, 'c5-1'),
(7,  1, 'APOAT',   'Apolipoproteína A1', 20190, 'c5-1'),
(8,  1, 'APOBT',   'Apolipoproteína B', 20200, 'c5-1'),
(9,  1, 'ASLOT',   'Estreptolisina O (ASO)', 20210, 'c5-1'),
(10, 1, 'ASTP2',   'GOT / AST', 20230, 'c5-1'),
(11, 1, 'B2MG',    'Beta-2 Microglobulina', 20250, 'c5-1'),
(12, 1, 'B2MGU',   'Beta-2 Microglobulina Urinaria', 20251, 'c5-1'),
(13, 1, 'BILD2-D', 'Bilirrubina Directa', 20300, 'c5-1'),
(14, 1, 'BILT3',   'Bilirrubina Total', 20310, 'c5-1'),
(15, 1, 'C3C-2',   'Complemento C3', 20320, 'c5-1'),
(16, 1, 'C4-2',    'Complemento C4', 20330, 'c5-1'),
(17, 1, 'CA2',     'Calcio Sérico', 20340, 'c5-1'),
(18, 1, 'CA2U',    'Calcio Urinario', 20341, 'c5-1'),
(19, 1, 'CARB-4',  'Carbamazepina', 20351, 'c5-1'),
(20, 1, 'CHOL2-A', 'Colesterol Total Enzimático', 20410, 'c5-1'),
(21, 1, 'CK2',     'Creatina Kinasa (CK)', 20420, 'c5-1'),
(22, 1, 'CREJ2',   'Creatinina Jaffe Compensada', 20470, 'c5-1'),
(23, 1, 'CREJ2U',  'Creatinina Jaffe Urinaria', 20471, 'c5-1'),
(24, 1, 'CRP-HS',  'PCR Alta Sensibilidad', 20480, 'c5-1'),
(25, 1, 'CRP4',    'Proteína C Reactiva', 20500, 'c5-1'),
(26, 1, 'FRA',     'Fructosamina', 20580, 'c5-1'),
(27, 1, 'GGT2-I',  'Gamma GT', 20600, 'c5-1'),
(28, 1, 'GLUC3',   'Glucosa HK (Hexoquinasa)', 20630, 'c5-1'),
(29, 1, 'GLUC3U',  'Glucosa Urinaria', 20631, 'c5-1'),
(30, 1, 'A1W3',    'Hemoglobina A1c', 20661, 'c5-1'),
(31, 1, 'HDLC4',   'HDL Colesterol Directo', 20710, 'c5-1'),
(32, 1, 'IGA2',    'Inmunoglobulina A', 20720, 'c5-1'),
(33, 1, 'IGG2',    'Inmunoglobulina G', 20740, 'c5-1'),
(34, 1, 'IGM2',    'Inmunoglobulina M', 20750, 'c5-1'),
(35, 1, 'LDHI2',   'Lactato Deshidrogenasa (LDH)', 20810, 'c5-1'),
(36, 1, 'LDLC3',   'LDL Colesterol Directo', 20820, 'c5-1'),
(37, 1, 'MG2',     'Magnesio Sérico', 20890, 'c5-1'),
(38, 1, 'MG2U',    'Magnesio Urinario', 20891, 'c5-1'),
(39, 1, 'PHNO2',   'Fenobarbital', 20970, 'c5-1'),
(40, 1, 'PHNY2',   'Fenitoína', 20980, 'c5-1'),
(41, 1, 'PHOS2',   'Fósforo Sérico', 20990, 'c5-1'),
(42, 1, 'PHOS2U',  'Fósforo Urinario', 20991, 'c5-1'),
(43, 1, 'RF-II',   'Factor Reumatoideo', 21040, 'c5-1'),
(44, 1, 'TP2',     'Proteínas Totales', 21110, 'c5-1'),
(45, 1, 'TPU3',    'Proteínas en Orina', 21122, 'c5-1'),
(46, 1, 'TPC3',    'Proteínas en LCR', 21123, 'c5-1'),
(47, 1, 'TRIGL',   'Triglicéridos Enzimático', 21130, 'c5-1'),
(48, 1, 'UA2',     'Ácido Úrico Enzimático', 21170, 'c5-1'),
(49, 1, 'UA2U',    'Ácido Úrico Urinario', 21171, 'c5-1'),
(50, 1, 'UREAL',   'Urea / BUN Cinética UV', 21190, 'c5-1'),
(51, 1, 'URELU',   'Urea Urinaria', 21191, 'c5-1'),
(52, 1, 'VALP2',   'Ácido Valproico', 21200, 'c5-1'),
(53, 1, 'VAN C3O', 'Vancomicina TDM', 21211, 'c5-1'),
-- Módulo ISE1 (Electrodos de Electrolitos)
(54, 1, 'ISE NA',   'Sodio Sérico (Na)', 29070, 'ISE1'),
(55, 1, 'ISE NA-U', 'Sodio Urinario (Na-U)', 29071, 'ISE1'),
(56, 1, 'ISE K',    'Potasio Sérico (K)', 29080, 'ISE1'),
(57, 1, 'ISE K-U',  'Potasio Urinario (K-U)', 29081, 'ISE1'),
(58, 1, 'ISE CL',   'Cloro Sérico (Cl)', 29090, 'ISE1'),
(59, 1, 'ISE CL-U', 'Cloro Urinario (Cl-U)', 29091, 'ISE1')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `acn` = VALUES(`acn`), `unidad` = VALUES(`unidad`);

-- ------------------------------------------------------------------------------
-- Datos Semilla de Inventario Mensual (PowerBy y Cálculo Diferencial)
-- Demostración de la lógica requerida:
-- Ejemplo: ALBT2 Recuento Agosto: 15774 - ALBT2 Recuento Septiembre: 15234 = Consumo Real de Septiembre: 540
-- ------------------------------------------------------------------------------
INSERT INTO `inventario_mensual_reactivos`
  (`prueba_id`, `periodo`, `fecha_cierre`, `recuento_anterior`, `recuento_actual`, `consumo_real`, `rutina`, `reproc`, `urg`, `calib`, `cc`, `lote_reactivo`, `observaciones`, `usuario`)
VALUES
-- Agosto 2026 (Línea base / mes previo)
(1,  '2026-08', '2026-08-31', 16250, 15774, 476,  390,  12, 60,  4,  10, 'LOT-7821A', 'Cierre conforme de Agosto', 'Bioq. Ramos'),
(28, '2026-08', '2026-08-31', 28500, 26820, 1680, 1380, 42, 210, 18, 30, 'LOT-6914B', 'Alta demanda ambulatoria', 'Bioq. Ramos'),
(50, '2026-08', '2026-08-31', 19800, 18650, 1150, 940,  28, 150, 12, 20, 'LOT-5532A', 'Control normal', 'Bioq. Ramos'),
(22, '2026-08', '2026-08-31', 22400, 21050, 1350, 1100, 35, 180, 15, 20, 'LOT-4419C', 'Rutina completa', 'Bioq. Ramos'),
(20, '2026-08', '2026-08-31', 14200, 13380, 820,  690,  18, 90,  8,  14, 'LOT-3321D', 'Perfil lipídico', 'Bioq. Ramos'),
(47, '2026-08', '2026-08-31', 13500, 12720, 780,  650,  15, 95,  6,  14, 'LOT-8812E', 'Perfil lipídico', 'Bioq. Ramos'),
(10, '2026-08', '2026-08-31', 11000, 10340, 660,  540,  22, 80,  6,  12, 'LOT-1194A', 'Enzimología', 'Bioq. Ramos'),
(54, '2026-08', '2026-08-31', 35000, 32900, 2100, 1650, 30, 380, 15, 25, 'LOT-ISE-01', 'ISE rutina y urgencias', 'Bioq. Ramos'),
(56, '2026-08', '2026-08-31', 35000, 32880, 2120, 1660, 32, 385, 18, 25, 'LOT-ISE-02', 'ISE rutina y urgencias', 'Bioq. Ramos'),
(58, '2026-08', '2026-08-31', 35000, 32950, 2050, 1610, 25, 375, 15, 25, 'LOT-ISE-03', 'ISE rutina y urgencias', 'Bioq. Ramos'),

-- Septiembre 2026 (Diferencial con respecto a Agosto: Recuento Agosto - Recuento Septiembre = Consumo Real)
-- ALBT2: 15774 - 15234 = 540 ! (EJEMPLO ESPECÍFICO REQUERIDO)
(1,  '2026-09', '2026-09-30', 15774, 15234, 540,  440,  15, 70,  5,  10, 'LOT-7821A', 'Diferencial exacto auditado', 'Bioq. Ramos'),
(28, '2026-09', '2026-09-30', 26820, 25070, 1750, 1420, 48, 235, 17, 30, 'LOT-6914B', 'Consumo sostenido de glucosa', 'Bioq. Ramos'),
(50, '2026-09', '2026-09-30', 18650, 17440, 1210, 990,  31, 160, 9,  20, 'LOT-5532A', 'Operación normal', 'Bioq. Ramos'),
(22, '2026-09', '2026-09-30', 21050, 19630, 1420, 1160, 38, 190, 12, 20, 'LOT-4419C', 'Filtro glomerular y urgencias', 'Bioq. Ramos'),
(20, '2026-09', '2026-09-30', 13380, 12510, 870,  730,  20, 100, 6,  14, 'LOT-3321D', 'Campañas preventivas', 'Bioq. Ramos'),
(47, '2026-09', '2026-09-30', 12720, 11890, 830,  690,  19, 105, 4,  12, 'LOT-8812E', 'Consumo normal', 'Bioq. Ramos'),
(10, '2026-09', '2026-09-30', 10340, 9630,  710,  590,  25, 80,  5,  10, 'LOT-1194A', 'Monitoreo hepático', 'Bioq. Ramos'),
(54, '2026-09', '2026-09-30', 32900, 30680, 2220, 1740, 35, 400, 20, 25, 'LOT-ISE-01', 'Electrolitos séricos', 'Bioq. Ramos'),
(56, '2026-09', '2026-09-30', 32880, 30640, 2240, 1750, 38, 405, 22, 25, 'LOT-ISE-02', 'Electrolitos séricos', 'Bioq. Ramos'),
(58, '2026-09', '2026-09-30', 32950, 30790, 2160, 1690, 28, 395, 20, 27, 'LOT-ISE-03', 'Electrolitos séricos', 'Bioq. Ramos'),

-- Octubre 2026 (Diferencial con respecto a Septiembre)
(1,  '2026-10', '2026-10-31', 15234, 14610, 624,  510,  18, 80,  6,  10, 'LOT-7821A', 'Consumo mensual conforme', 'Bioq. Ramos'),
(28, '2026-10', '2026-10-31', 25070, 23220, 1850, 1510, 45, 245, 20, 30, 'LOT-6914B', 'Cierre mensual Octubre', 'Bioq. Ramos'),
(50, '2026-10', '2026-10-31', 17440, 16180, 1260, 1030, 28, 170, 12, 20, 'LOT-5532A', 'Estable', 'Bioq. Ramos'),
(22, '2026-10', '2026-10-31', 19630, 18140, 1490, 1220, 34, 205, 11, 20, 'LOT-4419C', 'Estable', 'Bioq. Ramos'),
(20, '2026-10', '2026-10-31', 12510, 11620, 890,  750,  17, 105, 4,  14, 'LOT-3321D', 'Estable', 'Bioq. Ramos'),
(47, '2026-10', '2026-10-31', 11890, 11040, 850,  710,  16, 110, 2,  12, 'LOT-8812E', 'Estable', 'Bioq. Ramos'),
(10, '2026-10', '2026-10-31', 9630,  8890,  740,  610,  20, 95,  5,  10, 'LOT-1194A', 'Estable', 'Bioq. Ramos'),
(54, '2026-10', '2026-10-31', 30680, 28350, 2330, 1820, 40, 420, 25, 25, 'LOT-ISE-01', 'Estable', 'Bioq. Ramos'),
(56, '2026-10', '2026-10-31', 30640, 28290, 2350, 1835, 42, 425, 23, 25, 'LOT-ISE-02', 'Estable', 'Bioq. Ramos'),
(58, '2026-10', '2026-10-31', 30790, 28510, 2280, 1780, 30, 418, 25, 27, 'LOT-ISE-03', 'Estable', 'Bioq. Ramos')
ON DUPLICATE KEY UPDATE 
  `recuento_anterior` = VALUES(`recuento_anterior`),
  `recuento_actual`   = VALUES(`recuento_actual`),
  `consumo_real`      = VALUES(`consumo_real`),
  `rutina`            = VALUES(`rutina`),
  `reproc`            = VALUES(`reproc`),
  `urg`               = VALUES(`urg`),
  `calib`             = VALUES(`calib`),
  `cc`                = VALUES(`cc`),
  `observaciones`     = VALUES(`observaciones`);
