// Secciones que ve cada rol (matriz de permisos de la segunda entrega).
// Ocultar una sección es solo comodidad: el backend vuelve a controlar cada operación.
const INICIO = { id: 'inicio', titulo: 'Inicio' };

const SECCIONES_POR_ROL = {
  DUENO: [
    INICIO,
    { id: 'catalogo', titulo: 'Catálogo', etapa: 3, descripcion: 'Administrá productos, categorías y proveedores.' },
    { id: 'inventario', titulo: 'Inventario', etapa: 4, descripcion: 'Registrá ingresos, salidas y ajustes, y revisá el historial.' },
    { id: 'reposicion', titulo: 'Alertas y reposición', etapa: 5, descripcion: 'Revisá faltantes y prepará listas por proveedor.' },
  ],
  EMPLEADO: [
    INICIO,
    { id: 'catalogo', titulo: 'Catálogo', etapa: 3, descripcion: 'Consultá productos, existencias y unidades.' },
    { id: 'inventario', titulo: 'Inventario', etapa: 4, descripcion: 'Registrá ingresos y salidas, y revisá el historial.' },
    { id: 'alertas', titulo: 'Alertas', etapa: 5, descripcion: 'Consultá los productos por debajo del mínimo.' },
  ],
};

export const NOMBRE_ROL = { DUENO: 'Dueño', EMPLEADO: 'Empleado' };

export function seccionesDelRol(rol) {
  return SECCIONES_POR_ROL[rol] ?? [INICIO];
}
