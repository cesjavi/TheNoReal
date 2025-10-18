# TheNoReal Monorepo

Este repositorio ahora está organizado como un monorepo con dos proyectos independientes:

```
frontend/   # Aplicación Next.js (UI)
backend/    # API Express + Prisma + Groq
packages/   # Módulos compartidos (@thenoreal/shared)
```

Los módulos compartidos viven en `packages/shared` y exponen utilidades reutilizadas por el backend y por el frontend mediante el paquete interno `@thenoreal/shared`.

## Requisitos

* Node.js >= 20
* npm >= 10 (las workspaces usan la sintaxis `workspace:*`)

Verifica la versión ejecutando `node -v` y `npm -v`. Si tu npm es anterior a 10 actualízalo con `npm install -g npm@latest`.

## Instalación

1. Clona el repositorio y entra al directorio raíz.
2. Instala las dependencias de todas las workspaces:

```bash
npm install
```

npm generará un único `node_modules/` en la raíz y enlazará los paquetes internos.

## Variables de entorno

### Backend (`backend/.env`)

Copia el archivo de ejemplo y ajusta los valores:

```bash
cp backend/.env.example backend/.env
```

Variables relevantes:

* `PORT` – Puerto HTTP del backend (por defecto `4000`).
* `CORS_ALLOW_ORIGINS` – Lista separada por comas de orígenes permitidos (por ejemplo `http://localhost:3000`).
* `ALLOW_ANON_STORY_API` – Activa o bloquea peticiones anónimas (`1` para permitirlas).
* `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_REQUEST_TIMEOUT_MS` – Configuración para Groq.
* `DATABASE_URL`, `DATABASE_URL_UNPOOLED` – Conexión de Prisma.

### Frontend (`frontend/.env.local`)

Copia el ejemplo existente y completa tus valores:

```bash
cp frontend/.env.example frontend/.env.local
```

Añade `NEXT_PUBLIC_API_BASE_URL` apuntando a la URL del backend (por ejemplo `http://localhost:4000/api`). Esta variable se usa para construir todas las peticiones `fetch` desde la UI.

## Scripts principales

Todos los comandos se ejecutan desde la raíz del repositorio:

| Script | Descripción |
| ------ | ----------- |
| `npm run dev:backend` | Levanta el servidor Express con recarga automática (puerto por defecto 4000). |
| `npm run dev:frontend` | Arranca Next.js en modo desarrollo (puerto por defecto 3000). |
| `npm run dev` | Alias para `npm run dev:frontend`. |
| `npm run build:backend` | Compila el backend a JavaScript en `backend/dist`. |
| `npm run build:frontend` | Genera el build de producción de Next.js. |
| `npm run build` | Compila backend y frontend en secuencia. |
| `npm run lint` | Ejecuta el linter de Next.js sobre el frontend. |
| `npm run test --workspace frontend` | Ejecuta los tests de Jest del frontend. |

## Desarrollo local

1. Arranca el backend:
   ```bash
   npm run dev:backend
   ```
2. En otra terminal, arranca el frontend:
   ```bash
   npm run dev:frontend
   ```
3. Abre [http://localhost:3000](http://localhost:3000) para ver la interfaz.

El frontend enviará peticiones al backend usando `NEXT_PUBLIC_API_BASE_URL`. Asegúrate de que ambos servicios estén ejecutándose.

## Estructura del backend

* `backend/src/server.ts` – Configuración de Express, CORS y registro de rutas.
* `backend/src/routes/story.ts` – Lógica principal para generar capítulos y finales.
* `backend/src/routes/options.ts` – Generación de opciones adicionales.
* `backend/src/routes/prompt.ts` – Endpoints para mejorar o generar prompts iniciales.
* `backend/src/routes/backgrounds.ts` – Lista SVG de fondos disponibles (`BACKGROUND_ASSETS_DIR` puede sobrescribir la ruta por defecto `frontend/public`).

## Pruebas

Actualmente las pruebas automatizadas viven en el frontend (Jest + Testing Library). Ejecútalas con:

```bash
npm run test --workspace frontend
```

Puedes añadir pruebas adicionales para el backend usando tu framework preferido (por ejemplo Vitest o Jest) dentro de `backend/`.

## Despliegue

* **Frontend**: despliega el contenido de `frontend/` en tu plataforma favorita (Vercel, Netlify, etc.). Configura `NEXT_PUBLIC_API_BASE_URL` apuntando a la URL pública del backend.
* **Backend**: despliega el servidor Express (por ejemplo, en Fly.io, Railway o un contenedor Docker). Recuerda definir las variables de entorno descritas arriba y ejecutar `npm run build:backend` antes de iniciar en producción.

## Próximos pasos sugeridos

* Crear pipelines de CI separados para backend y frontend.
* Añadir un cliente HTTP reutilizable en el frontend para centralizar el manejo de errores y encabezados (por ejemplo para tokens JWT).
* Implementar autenticación en el backend (los hooks para NextAuth siguen disponibles dentro de `@thenoreal/shared/lib/auth`).
