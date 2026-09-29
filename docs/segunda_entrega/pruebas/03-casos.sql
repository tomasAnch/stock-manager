-- Ejecutar después del DDL y restricciones.sql, con psql ON_ERROR_STOP=1.
-- Los datos ficticios y las funciones auxiliares se revierten al finalizar.
BEGIN;
CREATE TEMP TABLE resultados (
  numero integer GENERATED ALWAYS AS IDENTITY,
  caso text NOT NULL,
  esperado text NOT NULL,
  obtenido text NOT NULL
);

CREATE FUNCTION pg_temp.verificar(p_caso text, p_condicion boolean)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_condicion IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FALLO: %', p_caso;
  END IF;
  INSERT INTO resultados(caso, esperado, obtenido) VALUES (p_caso, 'verdadero', 'OK');
END $$;

CREATE FUNCTION pg_temp.rechazar(p_caso text, p_sql text, p_estado text, p_restriccion text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE estado text; restriccion text; fallo boolean := false;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS estado = RETURNED_SQLSTATE, restriccion = CONSTRAINT_NAME;
    IF estado <> p_estado OR restriccion <> p_restriccion THEN
      RAISE EXCEPTION 'FALLO %: se esperaba %/%, se obtuvo %/%',
        p_caso, p_estado, p_restriccion, estado, restriccion;
    END IF;
    fallo := true;
  END;
  IF NOT fallo THEN RAISE EXCEPTION 'FALLO %: la escritura invalida fue aceptada', p_caso; END IF;
  INSERT INTO resultados(caso, esperado, obtenido)
  VALUES (p_caso, p_estado || ' / ' || p_restriccion, 'OK: rechazo esperado');
END $$;

-- UUID asignados explícitamente: @default(uuid()) se genera en Prisma, no en SQL.
INSERT INTO comercios(id,nombre) VALUES
 ('10000000-0000-0000-0000-000000000001','Comercio ficticio A'),
 ('10000000-0000-0000-0000-000000000002','Comercio ficticio B');
INSERT INTO usuarios(id,comercio_id,nombre,correo,password_hash,rol) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Responsable A','a@example.invalid','DATO_FICTICIO_NO_UTILIZABLE_PARA_LOGIN','DUENO'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Responsable B','b@example.invalid','DATO_FICTICIO_NO_UTILIZABLE_PARA_LOGIN','DUENO');
INSERT INTO categorias(id,comercio_id,nombre,nombre_normalizado) VALUES
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Alimentos','alimentos'),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Alimentos','alimentos');
INSERT INTO proveedores(id,comercio_id,nombre,nombre_normalizado) VALUES
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Distribuidora de prueba','distribuidora de prueba'),
 ('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Distribuidora de prueba','distribuidora de prueba');
INSERT INTO productos(id,comercio_id,categoria_id,proveedor_id,codigo,nombre,unidad,stock_actual,stock_minimo,stock_objetivo) VALUES
 ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','P001','Producto por unidad','UNIDAD',3,5,12),
 ('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','P002','Harina de prueba','KG',2.500,1,5),
 ('50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','P003','Sin movimientos','UNIDAD',0,0,0),
 ('50000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','P001','Producto de otro comercio','UNIDAD',0,0,0);
INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad)
SELECT gen_random_uuid(),p.id,u.id,'INGRESO','STOCK_INICIAL',p.stock_actual
FROM productos p JOIN usuarios u ON u.comercio_id=p.comercio_id
WHERE p.stock_actual>0;

DO $$
DECLARE
  producto uuid := '50000000-0000-0000-0000-000000000001';
  por_peso uuid := '50000000-0000-0000-0000-000000000002';
  responsable uuid := '20000000-0000-0000-0000-000000000001';
  comercio uuid := '10000000-0000-0000-0000-000000000001';
  n integer;
  saldo numeric;
  movimientos_antes integer;
BEGIN
  PERFORM pg_temp.verificar('Acepta 2.500 KG', (SELECT stock_actual=2.500 FROM productos WHERE id=por_peso));
  PERFORM pg_temp.verificar('Permite mismo codigo en otro comercio', (SELECT count(*)=2 FROM productos WHERE codigo='P001'));
  PERFORM pg_temp.verificar('Permite mismo nombre normalizado en otro comercio', (SELECT count(*)=2 FROM categorias WHERE nombre_normalizado='alimentos'));

  PERFORM pg_temp.rechazar('Stock negativo',format('UPDATE productos SET stock_actual=-1 WHERE id=%L',producto),'23514','productos_stock_actual_no_negativo');
  PERFORM pg_temp.rechazar('Minimo negativo',format('UPDATE productos SET stock_minimo=-1 WHERE id=%L',producto),'23514','productos_stock_minimo_no_negativo');
  PERFORM pg_temp.rechazar('Objetivo menor al minimo',format('UPDATE productos SET stock_objetivo=4 WHERE id=%L',producto),'23514','productos_objetivo_alcanza_minimo');
  PERFORM pg_temp.rechazar('Stock fraccionario en UNIDAD',format('UPDATE productos SET stock_actual=3.5 WHERE id=%L',producto),'23514','productos_cantidades_enteras_por_unidad');
  PERFORM pg_temp.rechazar('Minimo fraccionario en UNIDAD',format('UPDATE productos SET stock_minimo=1.5 WHERE id=%L',producto),'23514','productos_cantidades_enteras_por_unidad');
  PERFORM pg_temp.rechazar('Objetivo fraccionario en UNIDAD',format('UPDATE productos SET stock_objetivo=12.5 WHERE id=%L',producto),'23514','productos_cantidades_enteras_por_unidad');
  PERFORM pg_temp.rechazar('Codigo duplicado en el mismo comercio',format('UPDATE productos SET codigo=''P001'' WHERE id=%L',por_peso),'23505','productos_comercio_id_codigo_key');
  PERFORM pg_temp.rechazar('Categoria con nombre normalizado duplicado',format('INSERT INTO categorias(id,comercio_id,nombre,nombre_normalizado) VALUES(gen_random_uuid(),%L,''ALIMENTOS'',''alimentos'')',comercio),'23505','categorias_comercio_id_nombre_normalizado_key');
  PERFORM pg_temp.rechazar('Proveedor con nombre normalizado duplicado',format('INSERT INTO proveedores(id,comercio_id,nombre,nombre_normalizado) VALUES(gen_random_uuid(),%L,''DISTRIBUIDORA DE PRUEBA'',''distribuidora de prueba'')',comercio),'23505','proveedores_comercio_id_nombre_normalizado_key');
  PERFORM pg_temp.rechazar('Correo de acceso duplicado','UPDATE usuarios SET correo=''a@example.invalid'' WHERE correo=''b@example.invalid''','23505','usuarios_correo_key');

  PERFORM pg_temp.rechazar('Movimiento con cantidad cero',format('INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad) VALUES(gen_random_uuid(),%L,%L,''EGRESO'',''SALIDA'',0)',producto,responsable),'23514','movimientos_cantidad_positiva');
  PERFORM pg_temp.rechazar('Movimiento con cantidad negativa',format('INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad) VALUES(gen_random_uuid(),%L,%L,''EGRESO'',''SALIDA'',-1)',producto,responsable),'23514','movimientos_cantidad_positiva');
  PERFORM pg_temp.rechazar('Reposicion de tipo egreso',format('INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad) VALUES(gen_random_uuid(),%L,%L,''EGRESO'',''REPOSICION'',1)',producto,responsable),'23514','movimientos_tipo_motivo_valido');
  PERFORM pg_temp.rechazar('Salida de tipo ingreso',format('INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad) VALUES(gen_random_uuid(),%L,%L,''INGRESO'',''SALIDA'',1)',producto,responsable),'23514','movimientos_tipo_motivo_valido');
  PERFORM pg_temp.rechazar('Stock inicial de tipo egreso',format('INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad) VALUES(gen_random_uuid(),%L,%L,''EGRESO'',''STOCK_INICIAL'',1)',producto,responsable),'23514','movimientos_tipo_motivo_valido');
  PERFORM pg_temp.rechazar('Ajuste sin observacion',format('INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad) VALUES(gen_random_uuid(),%L,%L,''INGRESO'',''AJUSTE'',1)',producto,responsable),'23514','movimientos_ajuste_con_observacion');
  PERFORM pg_temp.rechazar('Ajuste con espacios',format('INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad,observacion) VALUES(gen_random_uuid(),%L,%L,''INGRESO'',''AJUSTE'',1,''   '')',producto,responsable),'23514','movimientos_ajuste_con_observacion');
  PERFORM pg_temp.rechazar('Producto inexistente en movimiento',format('INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad) VALUES(gen_random_uuid(),''99999999-0000-0000-0000-000000000000'',%L,''INGRESO'',''REPOSICION'',1)',responsable),'23503','movimientos_stock_producto_id_fkey');
  PERFORM pg_temp.rechazar('No elimina producto con movimientos',format('DELETE FROM productos WHERE id=%L',producto),'23001','movimientos_stock_producto_id_fkey');

  PERFORM pg_temp.verificar('Sugerencia de reposicion 12-3=9', (SELECT stock_objetivo-stock_actual=9 AND stock_actual<stock_minimo FROM productos WHERE id=producto));
  PERFORM pg_temp.verificar('Minimo cero no genera alerta', NOT EXISTS(SELECT 1 FROM productos WHERE codigo='P003' AND stock_actual<stock_minimo));
  UPDATE productos SET stock_minimo=3 WHERE id=producto;
  PERFORM pg_temp.verificar('Stock igual al minimo no genera alerta', NOT EXISTS(SELECT 1 FROM productos WHERE id=producto AND stock_actual<stock_minimo));
  UPDATE productos SET stock_minimo=5 WHERE id=producto;

  -- Registro válido: lectura bloqueada, modificación condicional y movimiento.
  PERFORM 1 FROM productos WHERE id=producto AND comercio_id=comercio FOR UPDATE;
  UPDATE productos SET stock_actual=stock_actual-2
    WHERE id=producto AND comercio_id=comercio AND activo AND stock_actual>=2;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'No se pudo registrar la salida valida'; END IF;
  INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad)
    VALUES(gen_random_uuid(),producto,responsable,'EGRESO','SALIDA',2);
  PERFORM pg_temp.verificar('Egreso valido deja saldo 1', (SELECT stock_actual=1 FROM productos WHERE id=producto));

  UPDATE productos SET stock_actual=stock_actual-2
    WHERE id=producto AND comercio_id=comercio AND activo AND stock_actual>=2;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.verificar('Egreso excesivo no actualiza filas',n=0);

  UPDATE productos SET activo=false WHERE id=producto;
  UPDATE productos SET stock_actual=stock_actual+1 WHERE id=producto AND comercio_id=comercio AND activo;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.verificar('Ingreso sobre inactivo no actualiza filas',n=0);
  UPDATE productos SET activo=true WHERE id=producto;

  SELECT stock_actual INTO saldo FROM productos WHERE id=producto;
  SELECT count(*) INTO movimientos_antes FROM movimientos_stock WHERE producto_id=producto;
  BEGIN
    UPDATE productos SET stock_actual=stock_actual-1 WHERE id=producto AND activo AND stock_actual>=1;
    INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad)
      VALUES(gen_random_uuid(),producto,responsable,'EGRESO','SALIDA',0);
    RAISE EXCEPTION 'Debia fallar el movimiento cero';
  EXCEPTION WHEN check_violation THEN
    -- El bloque revierte su UPDATE y el INSERT fallido juntos.
    NULL;
  END;
  PERFORM pg_temp.verificar('Fallo al insertar restaura saldo', (SELECT stock_actual=saldo FROM productos WHERE id=producto));
  PERFORM pg_temp.verificar('Fallo al insertar conserva historial', (SELECT count(*)=movimientos_antes FROM movimientos_stock WHERE producto_id=producto));

  -- Ajuste válido y compensación de saldo, dentro de esta transacción.
  UPDATE productos SET stock_actual=stock_actual+1 WHERE id=producto AND activo;
  INSERT INTO movimientos_stock(id,producto_id,usuario_id,tipo,motivo,cantidad,observacion)
    VALUES(gen_random_uuid(),producto,responsable,'INGRESO','AJUSTE',1,'Diferencia de conteo ficticia');
  PERFORM pg_temp.verificar('Acepta ajuste con motivo y observacion', (SELECT stock_actual=2 FROM productos WHERE id=producto));
END $$;

\echo === RECONCILIACION: SALDO GUARDADO CONTRA HISTORIAL ===
CREATE TEMP VIEW conciliacion AS
SELECT p.id, p.codigo, p.stock_actual,
       COALESCE(SUM(CASE m.tipo WHEN 'INGRESO' THEN m.cantidad WHEN 'EGRESO' THEN -m.cantidad END),0) AS stock_calculado
FROM productos p LEFT JOIN movimientos_stock m ON m.producto_id=p.id
GROUP BY p.id,p.codigo,p.stock_actual;
SELECT codigo, stock_actual, stock_calculado,
       stock_actual=stock_calculado AS coincide FROM conciliacion ORDER BY id;
SELECT pg_temp.verificar('Todos los saldos coinciden con el historial',
  NOT EXISTS(SELECT 1 FROM conciliacion WHERE stock_actual<>stock_calculado));

\echo === RESULTADOS DE LOS CASOS ===
SELECT numero,caso,esperado,obtenido FROM resultados ORDER BY numero;
SELECT count(*) AS casos_correctos FROM resultados;
ROLLBACK;
\echo Datos ficticios revertidos. Las tablas y los CHECK permanecen instalados.
SELECT count(*) AS productos_ficticios_restantes FROM productos;
