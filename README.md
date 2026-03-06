# Ultimate Fitness Backend

Backend del proyecto **Ultimate Fitness**, construido con **Node.js 18** y **AdonisJS 5**.

### Requisitos

- **Node.js** 18.x
- **npm** o **yarn**
- Base de datos **PostgreSQL** (configurada en los archivos de entorno de Adonis)

### Instalación

```bash
npm install
```

### Variables de entorno

- Copia el archivo de ejemplo (si existe) o crea `.env` basado en `.env.example`.
- Ajusta la configuración de base de datos, Redis, correo y cualquier API externa usada por el proyecto.

### Desarrollo

```bash
npm run dev
```

La API quedará disponible en el puerto configurado (por defecto 3333).

### Tests

```bash
npm test
```

### Build y producción

```bash
npm run build
npm start
```

El comando `build` genera la versión compilada de TypeScript y `start` inicia el servidor en modo producción.
