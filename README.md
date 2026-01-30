# Mi Puntico - Sistema de Gestión de Ventas

Sistema completo de punto de venta (POS) con gestión de inventario, ventas, reportes y funcionalidad offline completa.

## 🚀 Características

### ✨ Gestión Completa
- 📦 **Inventario**: Control total de productos, stock y categorías
- 💰 **Ventas**: Punto de venta rápido e intuitivo
- 📊 **Reportes**: Analytics y estadísticas de ventas
- 👥 **Equipo**: Gestión de usuarios y permisos
- 🔔 **Alertas**: Notificaciones de stock bajo

### 📱 Funcionalidad Offline
- ✅ **Funciona sin internet** después de la primera carga
- ✅ **Ventas offline** se guardan localmente
- ✅ **Sincronización automática** al detectar conexión
- ✅ **Actualización en tiempo real** del inventario
- ✅ **Cola de operaciones** pendientes
- ✅ **PWA** - Se puede instalar como app

### 🛠️ Tecnologías

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth)
- **State**: React Query (TanStack Query)
- **Offline**: IndexedDB + Service Workers

## 📦 Instalación

```bash
# 1. Clonar repositorio
git clone <tu-repositorio>
cd mi-puntico

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de Supabase

# 4. Iniciar servidor de desarrollo
npm run dev
```

## 🔧 Variables de Entorno

Crea un archivo `.env` con:

```env
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## 🚀 Deploy

### Vercel (Recomendado)
```bash
npm run build
vercel --prod
```

### Netlify
```bash
npm run build
netlify deploy --prod
```

## 📱 Uso Offline

1. **Primera carga**: Abre la app con internet
2. **Automático**: Datos se cachean automáticamente
3. **Sin conexión**: Usa la app normalmente
4. **Sincronización**: Al volver online, se sincroniza todo

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests en modo watch
npm run test:watch
```

## 📂 Estructura del Proyecto

```
mi-puntico/
├── src/
│   ├── components/     # Componentes React
│   ├── contexts/       # Contextos (Auth, Business)
│   ├── hooks/          # Custom hooks
│   ├── integrations/   # Supabase client
│   ├── lib/            # Utilidades
│   ├── pages/          # Páginas/rutas
│   └── main.tsx        # Entry point
├── public/             # Assets estáticos
├── supabase/           # Migraciones SQL
└── package.json
```

## 🎨 Personalización

### Colores
Edita `src/index.css` para cambiar el tema de colores.

### Logo
Reemplaza los archivos en `public/`:
- `favicon.svg`
- `icon-192.png`
- `icon-512.png`

## 🐛 Troubleshooting

### Error: "No se puede conectar a Supabase"
- Verifica que `.env` tenga las credenciales correctas
- Verifica que tu proyecto de Supabase esté activo

### Ventas no se sincronizan
- Abre DevTools (F12) → Console para ver logs
- Verifica `localStorage` para ver ventas pendientes
- Chequea que tengas conexión a internet

### Stock no se actualiza offline
- Verifica que los productos estén cacheados (ver console)
- Limpia el cache: `localStorage.clear()` y recarga

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 👤 Autor

Mi Puntico - Sistema de Gestión de Ventas

---

**Versión**: 1.0.0
**Última actualización**: Enero 2026
