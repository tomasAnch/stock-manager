-- No mezcla CHECK de otros esquemas o de extensiones con los del proyecto.
SELECT c.relname AS tabla, co.conname AS restriccion,
       pg_get_constraintdef(co.oid) AS definicion,
       co.convalidated AS validada
FROM pg_constraint AS co
JOIN pg_class AS c ON c.oid = co.conrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE co.contype = 'c' AND n.nspname = 'public'
  AND c.relname IN ('productos', 'movimientos_stock')
ORDER BY c.relname, co.conname;

SELECT table_name, count(*) AS cantidad_columnas
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

DO $$
DECLARE total integer;
BEGIN
  SELECT count(*) INTO total
  FROM pg_constraint co
  JOIN pg_class c ON c.oid = co.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE co.contype = 'c' AND n.nspname = 'public'
    AND c.relname IN ('productos', 'movimientos_stock') AND co.convalidated;
  IF total <> 7 THEN RAISE EXCEPTION 'Se esperaban 7 CHECK validados, se encontraron %', total; END IF;
END $$;
