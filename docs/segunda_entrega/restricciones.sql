-- Entrega 2: complemento del diseño, todavía no aplicado a una base del proyecto.
-- Incorporar DESPUÉS del CREATE TABLE en la primera migración de PostgreSQL.
-- No es un script de instalación completo ni debe ejecutarse repetidamente.

ALTER TABLE "productos"
  ADD CONSTRAINT "productos_stock_actual_no_negativo"
    CHECK ("stock_actual" >= 0),
  ADD CONSTRAINT "productos_stock_minimo_no_negativo"
    CHECK ("stock_minimo" >= 0),
  ADD CONSTRAINT "productos_objetivo_alcanza_minimo"
    CHECK ("stock_objetivo" >= "stock_minimo"),
  ADD CONSTRAINT "productos_cantidades_enteras_por_unidad"
    CHECK (
      "unidad" <> 'UNIDAD'
      OR (
        "stock_actual" = trunc("stock_actual")
        AND "stock_minimo" = trunc("stock_minimo")
        AND "stock_objetivo" = trunc("stock_objetivo")
      )
    );

ALTER TABLE "movimientos_stock"
  ADD CONSTRAINT "movimientos_cantidad_positiva"
    CHECK ("cantidad" > 0),
  ADD CONSTRAINT "movimientos_tipo_motivo_valido"
    CHECK (
      ("motivo" IN ('STOCK_INICIAL', 'REPOSICION') AND "tipo" = 'INGRESO')
      OR ("motivo" = 'SALIDA' AND "tipo" = 'EGRESO')
      OR "motivo" = 'AJUSTE'
    ),
  ADD CONSTRAINT "movimientos_ajuste_con_observacion"
    CHECK (
      "motivo" <> 'AJUSTE'
      OR (
        "observacion" IS NOT NULL
        AND "observacion" ~ '[^[:space:]]'
      )
    );

-- La integridad de cantidades de UNIDAD en movimientos depende del producto.
-- Esa validación, los permisos y el aislamiento por comercio se resuelven en
-- el backend. Este archivo no incorpora triggers ni CHECK entre tablas.
