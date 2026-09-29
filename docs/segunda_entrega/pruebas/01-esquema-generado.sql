-- CreateEnum
CREATE TYPE "rol_usuario" AS ENUM ('DUENO', 'EMPLEADO');

-- CreateEnum
CREATE TYPE "unidad_medida" AS ENUM ('UNIDAD', 'KG');

-- CreateEnum
CREATE TYPE "tipo_movimiento" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "motivo_movimiento" AS ENUM ('STOCK_INICIAL', 'REPOSICION', 'SALIDA', 'AJUSTE');

-- CreateTable
CREATE TABLE "comercios" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comercios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "comercio_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "rol_usuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL,
    "comercio_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "nombre_normalizado" VARCHAR(120) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" UUID NOT NULL,
    "comercio_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "nombre_normalizado" VARCHAR(120) NOT NULL,
    "telefono" VARCHAR(40),
    "correo" VARCHAR(254),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL,
    "comercio_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "proveedor_id" UUID NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "unidad" "unidad_medida" NOT NULL,
    "stock_actual" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "stock_minimo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "stock_objetivo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo" "tipo_movimiento" NOT NULL,
    "motivo" "motivo_movimiento" NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "observacion" VARCHAR(500),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE INDEX "usuarios_comercio_id_idx" ON "usuarios"("comercio_id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_comercio_id_nombre_normalizado_key" ON "categorias"("comercio_id", "nombre_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_comercio_id_nombre_normalizado_key" ON "proveedores"("comercio_id", "nombre_normalizado");

-- CreateIndex
CREATE INDEX "productos_comercio_id_activo_idx" ON "productos"("comercio_id", "activo");

-- CreateIndex
CREATE INDEX "productos_categoria_id_idx" ON "productos"("categoria_id");

-- CreateIndex
CREATE INDEX "productos_proveedor_id_idx" ON "productos"("proveedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "productos_comercio_id_codigo_key" ON "productos"("comercio_id", "codigo");

-- CreateIndex
CREATE INDEX "movimientos_stock_producto_id_creado_en_idx" ON "movimientos_stock"("producto_id", "creado_en");

-- CreateIndex
CREATE INDEX "movimientos_stock_usuario_id_idx" ON "movimientos_stock"("usuario_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_comercio_id_fkey" FOREIGN KEY ("comercio_id") REFERENCES "comercios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_comercio_id_fkey" FOREIGN KEY ("comercio_id") REFERENCES "comercios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_comercio_id_fkey" FOREIGN KEY ("comercio_id") REFERENCES "comercios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_comercio_id_fkey" FOREIGN KEY ("comercio_id") REFERENCES "comercios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
