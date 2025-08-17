# The No Real

The No Real es un proyecto de juego web construido con [Next.js](https://nextjs.org) y React. Este repositorio contiene la base del juego y una configuración inicial con Tailwind CSS.

## Desarrollo

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).
3. Ejecuta el lint para mantener un estilo de código consistente:
   ```bash
   npm run lint
   ```

## Empaquetado

1. Genera la compilación optimizada para producción:
   ```bash
   npm run build
   ```
2. Arranca la aplicación usando la compilación generada:
   ```bash
   npm start
   ```
   El resultado se guarda en la carpeta `.next/`, lista para ser desplegada o empaquetada en un contenedor.

## Variables de entorno

- `NODE_ENV`: define el entorno de ejecución (`development`, `production` o `test`).
- `PORT`: puerto en el que se ejecuta el servidor (por defecto 3000).
- Variables que comienzan con `NEXT_PUBLIC_` se exponen al cliente y deben declararse sólo con información que pueda ser pública.
- Puedes definir variables en archivos `.env.local`, `.env.development` o `.env.production` según la necesidad del entorno.

## Comandos disponibles

| Comando         | Descripción                                                       |
|-----------------|-------------------------------------------------------------------|
| `npm run dev`   | Inicia el servidor de desarrollo con Turbopack.                   |
| `npm run build` | Genera la versión optimizada de producción.                       |
| `npm start`     | Sirve la compilación generada por `npm run build`.                |
| `npm run lint`  | Ejecuta ESLint para validar el código.                            |

Actualmente no hay un comando `npm test`; añade pruebas conforme evolucione el proyecto.
