---
name: crear-noticias-md
description: Use ONLY when creating Spanish news Markdown files (src/content/posts/*.md) for the Astro + AstroPaper Ping Diario (Tech Daily Brief) site from the remote feed at https://techdailybrief.online/api/stories. Triggers on requests like "crea una noticia", "genera un artículo desde techdailybrief", "redacta un post en español sobre un tema", or when the user provides a story id, category, or sourceLink from that API and wants a translated Spanish editorial post.
---

# Crear noticias en español desde techdailybrief.online

Skill para generar archivos Markdown en `src/content/posts/` a partir del feed
remoto de noticias que consume el sitio `https://techdailybrief.online/`.

## 1. Fuente de datos

Endpoint único y autoritativo:

```
GET https://techdailybrief.online/api/stories
```

`/api/stories` devuelve un objeto con `stories` y `meta`:

```jsonc
{
  "stories": [
    {
      "id": "bd8629dc28c8f0ab",
      "title": "...",
      "source": "Google News",
      "category": "Artificial Intelligence",
      "importance": "Critical" | "High Priority" | "Medium Priority" | "Low Priority",
      "publishedAt": "2026-09-24T21:20:39.000Z",
      "summary": "...",
      "whyItMatters": "...",
      "sourceLink": "https://...",
      "read": false
    }
  ],
  "meta": { "count": ..., "unreadCount": ..., "lastRefreshedAt": "..." }
}
```

Categorías válidas del feed (no inventar otras):

- `Artificial Intelligence`
- `Business & Markets`
- `Cloud Computing`
- `Cybersecurity`
- `Emerging Technologies`
- `Hardware`
- `Mobile Technology`
- `Open Source`
- `Software Development`
- `Startups`

## 2. Cantidad predeterminada y ventana temporal

- **Cantidad predeterminada: 3 artículos por ejecución.** El usuario puede
  pedir otra cantidad explícitamente.
- **Ventana temporal predeterminada: últimas 24 horas** desde `publishedAt`
  hasta el momento UTC de la consulta. El usuario puede ampliar o reducir.
- Si la ventana seleccionada contiene menos de 3 historias elegibles,
  entregar las que pasen el filtro y reportar cuántos cupos quedaron vacíos.
  **Nunca rellenar con historias débiles para llegar al número objetivo.**
- El orden de salida es siempre `Critical` primero, luego `High Priority`,
  dentro del mismo nivel por `publishedAt` descendente. **Si dos o mas
  historias comparten `importance`, gana la de `publishedAt` mas reciente;
  reordenar siempre antes de reportar al usuario.** La convencion se aplica
  al **orden de seleccion y al reporte al usuario**, no al orden de los
  archivos en `src/content/posts/`: cada Markdown lleva su propio
  `pubDatetime` y la portada del sitio (Astro) los ordena segun ese campo.
  El orden cronologico debe quedar explicito en la respuesta al usuario.

## 3. Selección de historias relevantes

Una historia es elegible solo si cumple **todas** estas condiciones:

1. Está dentro de la ventana temporal configurada.
2. Su `importance` es `Critical` o `High Priority`.
3. Su contenido temático corresponde al blog (tecnología, programación,
   cloud, infraestructura, IA, ciberseguridad, startups, hardware, open
   source, regulación tecnológica). Descartar noticias mal categorizadas,
   por ejemplo un anuncio de automoción etiquetado como
   `Artificial Intelligence` solo por aparecer junto a otros resultados.
4. El `sourceLink` primario fue probado y arrojó un estado válido
   (ver sección 4).
5. No es duplicado temático de otra historia ya seleccionada en la misma
   ejecución.

El procedimiento concreto:

1. Ejecutar `curl -fsSL 'https://techdailybrief.online/api/stories'` y
   registrar `meta.lastRefreshedAt` y la hora UTC actual.
2. Filtrar por ventana temporal y por `importance`.
3. Recorrer las candidatas y revisar manualmente si el contenido realmente
   encaja con el blog. Eliminar las mal categorizadas.
4. Agrupar duplicados temáticos; conservar la versión más reciente o con
   mejor estado de fuente.
5. Probar el `sourceLink` de cada candidata restante con
   `curl --max-time 30 -A 'Mozilla/5.0' -L -o /dev/null -w '%{http_code} %{url_effective}\n'`
   y registrar el código HTTP y la URL final.
6. Clasificar la fuente (sección 4) y, si pasa, conservar hasta el límite
   pedido por el usuario.

## 4. Estados de la fuente (estricto)

| Estado                  | Significado                                                                                      | Accion                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `verificada_y_abierta`  | `sourceLink` devolvio `2xx` (o se abrio con `webfetch` como fallback) y el HTML confirma autoria y el articulo concreto. | Citar como `**Fuente:** [<medio>](<URL_canónica>)` con link al articulo concreto.       |
| `verificada_pero_pago`  | `sourceLink` devolvio `2xx` pero el contenido esta tras paywall o expone solo titular/fragmento.  | Citar como `**Fuente:** [<medio>](<URL>), acceso de pago.` y declarar el limite.        |
| `solo_agregador`        | `sourceLink` sigue siendo el agregador (Google News, etc.) y no expone la URL canonica.           | **Detenerse y pedir autorizacion al usuario** antes de redactar.                        |
| `no_accesible`          | `sourceLink` devolvio `4xx/5xx` o timeout incluso con `webfetch`.                                | **Detenerse e informar** que la historia no es publicable.                              |

Procedimiento de verificacion con fallback:

1. Ejecutar
   `curl -fsSL --max-time 30 -A 'Mozilla/5.0' -L -o /dev/null -w 'HTTP %{http_code}\nFINAL %{url_effective}\n' "$URL"`.
2. Si devuelve `2xx` y el HTML confirma autoria: estado
   `verificada_y_abierta`.
3. Si devuelve `2xx` pero el contenido esta tras paywall o expone solo
   titular: `verificada_pero_pago`.
4. Si devuelve `4xx/5xx` o timeout: reintentar una sola vez con
   `webfetch` y registrar el resultado.
5. Si `webfetch` logra abrir el articulo y confirmar autoria: estado
   `verificada_y_abierta`. Si no, `no_accesible`.
6. Solo despues de estos pasos se clasifica la fuente.

Reglas adicionales:

- Un `HTTP 200` del agregador **NO** equivale a verificar la fuente
  primaria.
- Nunca deducir la URL del articulo a partir del titular o del dominio.
  Si el titulo dice “Yahoo Finance”, no se debe enlazar
  `https://finance.yahoo.com/...`.
- `solo_agregador` y `no_accesible` son bloqueantes. La nota corta que
  existia antes queda eliminada: o se publica con fuente verificada o no
  se publica.

## 5. Tarea del agente

1. Confirmar la cantidad solicitada (predeterminado 3).
2. Consultar el feed con `curl`.
3. Aplicar ventana temporal e importancia.
4. Descartar candidatas mal categorizadas y duplicados tematicos.
5. Probar el `sourceLink` de cada candidata y clasificarla (seccion 4).
6. Si quedan menos candidatas validas que la cantidad pedida, reportar
   cuantos cupos quedaron libres.
7. Comprobar duplicados de slug contra `src/content/posts/` y, si choca,
   anadir sufijo numerico (`-2`, `-3`, ...).
8. Para cada historia valida generar UN archivo `.md` siguiendo el formato
   abajo.

## 6. Formato del archivo

Ruta absoluta: `src/content/posts/<slug>.md`.

Frontmatter estricto:

```yaml
---
title: "Título editorial en español, sin clickbait"
author: Carlos
pubDatetime: 2026-09-22T09:00:00Z
slug: titulo-en-kebab-case-sin-articulos
featured: false
draft: false
tags:
  - CategoriaPrincipal
  - CategoriaSecundaria
description: "Resumen de una línea en español, máximo ~160 caracteres, sin punto final."
---
```

Reglas:

- `author`: siempre `Carlos` salvo que el usuario indique otro.
- `pubDatetime`: ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`). Conservar la fecha
  del feed aunque sea futura o tenga mas de 30 dias.
- `slug`: kebab-case en espanol, sin articulos finales, derivado del titulo.
- `featured`: `false` por defecto.
- `draft`: `false` salvo que el usuario pida borrador.
- `tags`: 2 a 4 tags. Mapear `category` del feed a un tag cercano al
  vocabulario del sitio (`IA`, `Kubernetes`, `DevOps`, `Observabilidad`,
  `Cloud`, `Seguridad`, `Hardware`, `Open Source`, etc.).
- `description`: una linea, espanol neutro, sin comillas internas,
  **maximo 160 caracteres**. Contar antes de cerrar.

Cuerpo del articulo (cuando la fuente es `verificada_y_abierta` o
`verificada_pero_pago`):

```markdown
![Pie de foto descriptivo](../../assets/images/<slug>.jpg)

Parrafo de apertura con el gancho y el contexto de la noticia.

## Que implica

Explicar el impacto verificable para el lector tecnico.

## Hechos confirmados

- Dato concreto 1.
- Dato concreto 2.
- Dato concreto 3.

## Analisis

Parrafo de cierre con lectura editorial claramente marcada como analisis.

**Fuente:** [medio](URL canonica).
```

## 7. Separacion entre hechos y analisis

Cada parrafo debe encuadrar en una de tres categorias:

- **Hecho confirmado:** aparece literalmente en `title`, `summary`,
  `whyItMatters`, `sourceLink` abierto, o en un articulo primario
  verificado.
- **Hecho del feed sin verificar:** el feed lo dice pero no se abrio la
  fuente. Etiquetar con lenguaje condicional.
- **Analisis editorial:** opinion propia. Encabezado `## Analisis`
  separado.

Prohibido:

- Convertir `whyItMatters` generico en hechos especificos.
- Inventar nombres de empresas, productos, fechas, montos o cargos.
- Inferir consecuencias regulatorias, legales o de mercado sin fuente.
- Afirmar en `## Analisis` tendencias, antecedentes o relaciones
  (“nunca habia competido con X”, “siempre se mantuvo en Y”) si no
  estan respaldadas por el `sourceLink` abierto o por otra historia
  verificada en la misma corrida. Si no hay respaldo, formular como
  hipotesis explicita (“podria ser”, “es plausible que”) o eliminar
  la afirmacion.
- Renombrar productos o tecnologias: usar exactamente la terminologia
  del `title`, `summary` o del articulo abierto. No traducir nombres
  propios al espanol (“Bedrock Managed Agents” no se convierte en
  “sistema operativo de agentes”).

## 8. Longitud proporcional al material

- `verificada_y_abierta` o `verificada_pero_pago` con resumen util:
  **350 a 700 palabras** del cuerpo, tres secciones.
- `solo_agregador` o `no_accesible`: **detenerse** y no publicar
  (seccion 4).

## 9. Imagen destacada

- Convencion del repo: `src/assets/images/<slug>.jpg`.
- En el markdown la ruta relativa debe ser `../../assets/images/<slug>.jpg`.
- Antes de escribir el bloque `![]()`, comprobar que el archivo existe en
  `src/assets/images/`. Si no existe, omitir el bloque `![]()`.
- Nunca inventar nombres de imagen ni usar rutas absolutas.

## 10. Mapeo de categoria -> tags

| Categoria del feed      | Tags sugeridos                  |
| ----------------------- | ------------------------------- |
| Artificial Intelligence | IA, Machine Learning, Modelos   |
| Business & Markets      | Negocios, Mercados              |
| Cloud Computing         | Cloud, DevOps                   |
| Cybersecurity           | Seguridad, Ciberseguridad       |
| Emerging Technologies   | Tecnologia, Innovacion          |
| Hardware                | Hardware, Chips, GPUs           |
| Mobile Technology       | Movil, Apps                     |
| Open Source             | Open Source, Software Libre     |
| Software Development    | Programacion, Ingenieria        |
| Startups                | Startups, Venture Capital       |

Anadir tags concretos del tema (`Kubernetes`, `Docker`, `Python`, `AWS`,
etc.) cuando aplique.

## 11. Revision de espanol

Antes de cerrar el archivo, revisar:

- Tildes y diacriticos: comprobar palabras frecuentes (`reunion`,
  `lideres`, `tecnologia`, `regulacion`, `politica`, `publico`,
  `informacion`, `categoria`, `dia`, `ano`, `critica`, `numero`,
  `magico`, `asi`, `tambien`).
- Comillas tipograficas: usar `«»` en espanol, no `"..."`.
- Puntuacion: coma antes de `que` en clausulas adversativas.
- Longitud de frases: preferir frases < 30 palabras.
- Caracteres no latinos accidentales: ejecutar
  `python3 -c "import re,sys; t=open(sys.argv[1]).read(); print([(i,c) for i,c in enumerate(t) if 0x4E00<=ord(c)<=0x9FFF or 0x0400<=ord(c)<=0x04FF or 0x0370<=ord(c)<=0x03FF])" archivo.md`
  (compatible con BusyBox, no usa `grep -P`).

## 12. Validaciones tecnicas

Usar solo estos comandos y registrar el resultado:

- `pnpm run build:verify` si esta disponible: hace `astro check`,
  `astro build` y `verify-dist`.
- `node_modules/.bin/astro check` para validacion de contenido y tipos.
- `node_modules/.bin/astro build` para generar `dist/`.
- `node scripts/verify-dist.mjs` para asegurar que no quedan `.md`,
  `src/` o `.git` en el artefacto de build.

**No usar** `import('./src/content.config.ts')` ni
`require('astro:content')` desde Node pelado. Esos modulos solo se cargan
dentro del pipeline de Astro.

Una compilacion exitosa confirma compatibilidad tecnica; no confirma
veracidad factual ni calidad editorial.

## 13. Comprobaciones antes de cerrar

Antes de dar por terminado el archivo:

1. **Estado de fuente** registrado y reflejado en la atribucion.
2. **Hechos / analisis** separados en secciones distintas.
3. **Longitud** proporcional al material disponible.
4. **Espanol** revisado: tildes, comillas, puntuacion, sin glifos
   accidentales.
5. `astro check` + `astro build` + `verify-dist` pasaron sin errores
   nuevos.
6. Slug no existente en `src/content/posts/`.
7. Fecha ISO 8601 UTC.
8. Comillas balanceadas en `title` y `description`.
9. Sin emojis ni clickbait.
10. Imagen: ruta correcta si existe; bloque `![]()` omitido si no.

## 14. Comandos utiles

```bash
# Obtener todas las historias y su metadata
curl -fsSL 'https://techdailybrief.online/api/stories'

# Filtrar por categoria e importancia con python3
curl -fsSL 'https://techdailybrief.online/api/stories' \
  | python3 -c '
import json,sys
d=json.load(sys.stdin)
for s in d["stories"]:
    if s.get("importance") in ("Critical","High Priority"):
        print(s["id"], s["publishedAt"], s.get("source"), "->", s.get("title"))
'

# Verificar respuesta de un sourceLink
curl -fsSL --max-time 30 -A 'Mozilla/5.0' -L -o /dev/null \
  -w 'HTTP %{http_code}\nFINAL %{url_effective}\n' "$URL"

# Comprobar slugs existentes
ls src/content/posts | sed 's/\.md$//'

# Detectar glifos no latinos accidentales
python3 -c "import sys; t=open(sys.argv[1]).read(); print([(i,c) for i,c in enumerate(t) if 0x4E00<=ord(c)<=0x9FFF or 0x0400<=ord(c)<=0x04FF or 0x0370<=ord(c)<=0x03FF])" archivo.md

# Validacion tecnica recomendada
pnpm run build:verify
```

## 15. Entrega en Git

Cuando el usuario pida generar noticias, esta skill es la guía canónica del proyecto y debe leerse antes de seleccionar o redactar historias. Después de crear y validar los artículos:

1. Revisar `git status --short` y conservar cualquier cambio ajeno al trabajo; nunca sobrescribirlo ni hacer `reset`.
2. Crear o usar una rama descriptiva para la tanda de noticias; no trabajar directamente sobre `main` salvo que el usuario lo pida explícitamente.
3. Revisar el diff y agregar al commit solo los Markdown, imágenes y archivos de soporte generados para esta ejecución.
4. Crear un commit claro, por ejemplo `news: publish <tema-o-fecha>`.
5. Ejecutar `git push -u origin <rama>` y confirmar que terminó correctamente.
6. Reportar al usuario la rama, el commit, los archivos generados y el resultado del push. No hacer merge ni desplegar sin una solicitud explícita.

Si el push falla por autenticación, permisos, conflictos o cualquier otra causa, detenerse e informar el error exacto; no probar credenciales alternativas, force-push ni atajos silenciosos.

## 16. Lo que NO debe hacer esta skill

- No traducir literalmente el `title` del feed: reescribir en estilo
  editorial.
- No inventar cifras, fechas, nombres ni empresas.
- No deducir la URL canonica del articulo a partir del dominio o del
  titular.
- No publicar una historia si `sourceLink` queda en `solo_agregador` o
  `no_accesible` sin autorizacion explicita.
- No crear paginas en `src/pages/` ni modificar `astro.config`, schema o
  configuracion del proyecto.
- No generar feeds RSS, sitemaps ni archivos de i18n.
- No usar `EventSource` ni el endpoint `/api/stories/stream`.
- No agregar `featured: true` salvo que el usuario lo pida.
- No rellenar articulos cortos para llegar a 350 palabras cuando la
  fuente no aporta datos.
- No usar `import('./src/content.config.ts')` ni
  `require('astro:content')` fuera del pipeline de Astro.
- No superar la cantidad pedida por el usuario ni rellenarla con
  historias debiles.
