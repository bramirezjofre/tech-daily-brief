# Bitácora Tech (Tech Daily Brief)

**Bitácora Tech** es un resumen diario de noticias, herramientas y novedades del mundo de la tecnología, programación e innovación.

Este repositorio (`tech-daily-brief`) contiene el código fuente y el contenido del sitio web/blog de Bitácora Tech.

## Agradecimientos y atribución

Bitácora Tech es un **fork** de [tech-daily-brief](https://github.com/cjcr313/tech-daily-brief), el proyecto original creado y mantenido por **Carlos Jacob** ([@cjcr313](https://github.com/cjcr313)), publicado bajo el nombre _Ping Diario_ por Nauta Lab.

Agradecemos públicamente a Carlos Jacob y a todas las personas que han contribuido a aquel proyecto. Su trabajo aporta la base sobre la que se construye este sitio: la estructura del contenido, la línea editorial, la configuración de la plataforma y la gestión del despliegue. Este repositorio continúa y evoluciona ese trabajo.

Agradecemos además a **Sat Naing**, autor de la plantilla [AstroPaper](https://github.com/satnaing/astro-paper), que es la base técnica que el proyecto original eligió y de la que hereeda el diseño, el sistema de contenido, la optimización para SEO, la generación de imágenes Open Graph con Satori y la búsqueda con Pagefind.

El archivo [`LICENSE`](./LICENSE) conserva la licencia MIT del proyecto upstream, con su atribución original a Sat Naing. Las modificaciones realizadas en este repositorio —incluidas la identidad visual, el contenido editorial y la infraestructura de despliegue— se distribuyen bajo los mismos términos.

## ¿Por qué dice "Astro" en el código?

El sitio está construido utilizando **Astro**, un framework web muy moderno y rápido. Específicamente, este proyecto se inició usando una plantilla llamada _AstroPaper_, que es ideal para blogs porque carga a la velocidad de la luz, está muy bien optimizada para SEO y permite escribir los artículos en formato Markdown de manera muy sencilla.

Por eso vas a ver archivos y configuraciones relacionadas con Astro en el proyecto. Es el "motor" que hace funcionar a Bitácora Tech por detrás.

## Estructura del proyecto

- `src/content/posts/`: Aquí es donde viven los artículos del blog en formato Markdown.
- `src/pages/`: Las páginas estáticas del sitio.
- `src/components/`: Componentes de interfaz (UI).
- `public/`: Imágenes y recursos públicos.

## Desarrollo local

Si quieres correr el proyecto en tu máquina:

```bash
# Instalar dependencias
npm install  # o pnpm install

# Levantar el servidor de desarrollo local
npm run dev  # o pnpm dev
```

## Docker

El proyecto está dockerizado con un build multi-stage: la imagen final solo
contiene el artefacto estático servido por Nginx, sin `src/`, sin `node_modules/`
y sin los archivos Markdown fuente.

```bash
# Build y arranque en producción (Nginx en :8080)
docker compose --profile prod up --build

# Modo desarrollo (Astro dev server con HMR en :4321)
docker compose --profile dev up
```

Qué se incluye en cada etapa:

| Etapa     | Base                  | Contenido                                 |
| --------- | --------------------- | ----------------------------------------- |
| `builder` | `node:24.12.0-alpine` | Instala deps y compila el sitio (`dist/`) |
| `runtime` | `nginx:1.29.3-alpine` | Solo `dist/` + Nginx endurecido           |

Validaciones de seguridad incorporadas:

- `docker/Dockerfile` ejecuta una comprobación final: falla si `*.md`, `src/` o
  `.git` aparecen dentro de la imagen.
- `scripts/verify-dist.mjs` revisa `dist/` antes y después del build.
- `.github/workflows/ci.yml` añade un job `docker` que construye la imagen, la
  inspecciona y arranca un smoke test contra `http://127.0.0.1:8080/`.

Comandos útiles:

```bash
# Validar el artefacto sin Docker
pnpm run build:verify

# Construir la imagen manualmente
docker build -t bitacora-tech .

# Ejecutar y probar
docker run --rm -p 8080:8080 bitacora-tech
curl -I http://127.0.0.1:8080/
```

Política de cabeceras HTTP aplicadas en Nginx:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` restrictivo pero compatible con los scripts inline
  de Pagefind y Astro.
- `autoindex off` y bloqueo de rutas `/src`, `/content`, `/.git`, `/.env`,
  `package.json`, `tsconfig.json`.
