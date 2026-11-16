---
name: publicar-noticias
description: "Ejecuta el flujo completo de Tech Daily Brief: selecciona noticias del feed, verifica fuentes primarias, redacta Markdown en español, valida caracteres y Astro, genera portadas, y prepara una rama y Pull Request sin hacer merge ni desplegar."
---

# Publicar noticias de Tech Daily Brief

Usa esta skill para una ejecución completa de noticias. La redacción y el formato de cada artículo están definidos por `.opencode/skills/crear-noticias-md/SKILL.md`; léela antes de crear cualquier archivo y no la modifiques durante la ejecución.

## 1. Preflight y aislamiento

1. Trabaja desde la raíz del repositorio.
2. Ejecuta `git status --short --branch` y conserva cualquier cambio ajeno.
3. Ejecuta `git fetch origin main`.
4. Crea una rama limpia `news/YYYY-MM-DD-tech-daily` desde `origin/main`. Si ya existe una rama local o remota de la fecha, inspecciona sus commits y PR antes de reutilizarla; nunca hagas `force-push`.
5. Comprueba si existe `scripts/publicar-noticias.sh`. Si no existe, continúa con el flujo equivalente descrito aquí e informa que no hay launcher.

**Criterio:** la rama parte de `origin/main`, el árbol no contiene cambios ajenos y la ausencia del launcher no bloquea el flujo.

## 2. Selección y verificación editorial

1. Consulta `https://techdailybrief.online/api/stories` y registra la hora UTC y `meta.lastRefreshedAt`.
2. Aplica la ventana de las últimas 24 horas y selecciona por defecto 5 historias `Critical` o `High Priority`.
3. Descarta historias mal categorizadas, duplicados temáticos y noticias sin relación con tecnología.
4. Verifica cada `sourceLink` con `curl -fsSL --max-time 30 -A 'Mozilla/5.0' -L -o /dev/null -w 'HTTP %{http_code}\nFINAL %{url_effective}\n'`.
5. Usa `web_fetch` una sola vez como fallback para una fuente que no responda correctamente.
6. Publica solo fuentes `verificada_y_abierta` o `verificada_pero_pago`; las fuentes `solo_agregador` y `no_accesible` son bloqueantes.
7. Mantén las alertas urgentes verificadas en el reporte de ejecución, sin convertirlas en artículos ni consumir el cupo de 5.

**Criterio:** cada artículo elegido tiene una fuente primaria verificable, no duplica otro artículo y queda separado entre hechos confirmados y análisis editorial.

## 3. Generación segura

1. Crea un Markdown por historia en `src/content/posts/` siguiendo exactamente `crear-noticias-md`.
2. Usa UTF-8 y conserva tildes y comillas españolas.
3. No inventes datos, URLs, imágenes ni nombres de productos.
4. No agregues `featured: true` salvo petición explícita.
5. Usa portadas automáticas del proyecto. No agregues imágenes raster nuevas salvo petición explícita.
6. Si existe una portada editorial previa, comprueba que corresponde al artículo antes de reutilizarla.

**Criterio:** cada archivo tiene frontmatter válido, slug único, descripción de máximo 160 caracteres, entre 350 y 700 palabras cuando la fuente lo permite y atribución a la fuente canónica.

## 4. Validación de contenido

Para cada archivo nuevo ejecuta:

```bash
python3 - <<'PY' archivo.md
import pathlib, sys, unicodedata
p = pathlib.Path(sys.argv[1])
b = p.read_bytes()
text = b.decode('utf-8')
control = [(i, hex(ord(c))) for i, c in enumerate(text) if unicodedata.category(c) == 'Cc' and c not in '\n\r\t']
non_latin = [(i, c) for i, c in enumerate(text) if 0x4E00 <= ord(c) <= 0x9FFF or 0x0400 <= ord(c) <= 0x04FF or 0x0370 <= ord(c) <= 0x03FF]
print(f'{p}: utf8=OK control={control} non_latin={non_latin}')
if control or non_latin:
    raise SystemExit(1)
PY
```

Además comprueba que:

- Las comillas de `title` y `description` están balanceadas.
- No existen cadenas corruptas como `$y`, `feed$`, `operators` incrustadas por una respuesta truncada.
- No hay caracteres de control, reemplazo `�` ni bloques de instrucciones dentro del artículo.
- El slug no existe previamente, salvo que se haya aplicado el sufijo permitido.

**Criterio:** ningún archivo nuevo contiene corrupción textual ni caracteres no esperados y todos se pueden decodificar como UTF-8.

## 5. Build y portadas

Si existe `pnpm`, ejecuta:

```bash
pnpm run build
node scripts/export-covers.mjs
pnpm run build:verify
```

Si `pnpm` no está disponible, ejecuta:

```bash
node_modules/.bin/astro check
node_modules/.bin/astro build
node scripts/export-covers.mjs
node scripts/verify-dist.mjs
```

No uses imports de `astro:content` desde Node fuera del pipeline de Astro.

**Criterio:** `astro check`, build, exportación de portadas y `verify-dist` terminan sin errores nuevos.

## 6. Revisión de cambios y PR

1. Ejecuta `git diff --check`.
2. Revisa `git status --short` y `git diff --stat`.
3. Agrega únicamente los Markdown, portadas y archivos de ejecución producidos por esta tanda.
4. Crea un commit `news: publish YYYY-MM-DD tech daily`.
5. Verifica que el commit contiene solo los archivos esperados.
6. Haz `git push -u origin <rama>`.
7. Crea un Pull Request contra `main` con las noticias, fuentes y validaciones.
8. No hagas merge, no despliegues, no uses `sudo`, no reinicies Docker y no hagas `force-push`.

**Criterio:** la rama remota y el PR existen, el commit es reproducible y no contienen cambios ajenos.

## 7. Reporte final

Entrega:

- rama, commit y URLs de rama, commit y PR;
- historias publicadas y sus fuentes verificadas;
- alertas urgentes verificadas, o `No hay alertas urgentes verificadas en esta ejecución`;
- resultado de UTF-8/corrupción, Astro, build, portadas y `verify-dist`;
- advertencia explícita si el launcher no existe;
- confirmación de que no hubo merge ni despliegue.

Después de un merge, la verificación del Action y del despliegue corresponde al flujo posterior; no la declares durante esta skill.
