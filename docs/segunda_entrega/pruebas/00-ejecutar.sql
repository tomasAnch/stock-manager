\set ON_ERROR_STOP on
\encoding UTF8
\pset pager off
\pset format aligned
\pset border 1
SET TIME ZONE 'America/Argentina/Buenos_Aires';

\echo === ENTORNO REAL DE LA PRUEBA ===
SELECT version() AS version_postgresql,
       current_database() AS base_pruebas,
       current_timestamp AS fecha_ejecucion;

-- Se ejecuta únicamente en una base NUEVA dedicada a esta prueba.
DO $$
BEGIN
  IF current_database() <> 'tfi_entrega2_pruebas' THEN
    RAISE EXCEPTION 'Usar una base exclusiva llamada tfi_entrega2_pruebas';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public')
     OR EXISTS (
       SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public' AND t.typtype = 'e'
     ) THEN
    RAISE EXCEPTION 'La base de prueba debe estar vacia; no se borran objetos existentes';
  END IF;
END $$;

\echo === APLICAR DDL GENERADO Y RESTRICCIONES ===
BEGIN;
\ir 01-esquema-generado.sql
\ir ../restricciones.sql
COMMIT;

\echo === VERIFICAR INSTALACION ===
\ir 02-inspeccionar.sql

\echo === EJECUTAR CASOS CON DATOS FICTICIOS ===
\ir 03-casos.sql
\echo === FIN: TODOS LOS CASOS TERMINARON SIN FALLOS ===
