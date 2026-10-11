# Política 8D

Prototipo estático de un test político multidimensional.

## Uso
1. Abrí `index.html` con cualquier navegador moderno (funciona también desde el disco, `file://`).
2. Elegí **Test completo** (48 preguntas) o **Versión rápida** (10 preguntas, ~2 min) y respondé (podés usar las teclas 1–5).
3. Explorá Resumen, Mapa Nolan, Radar 8D, Referentes y Metodología.
4. En **Carnet y compartir** generá una imagen de tu resultado, copiá el enlace o el resumen.
5. Si alguien te pasa su enlace, podés hacer tu test y ver **Vos vs tu amigo**.

No requiere servidor, instalación ni build. Para publicarlo, subí la carpeta completa (`index.html`, `css/`, `js/`) a GitHub Pages, Cloudflare Pages, Netlify o Vercel. No hay pedidos de red externos (sin CDNs, fuentes web ni analytics).

## Estructura
- `index.html` — marcado, estilos base, datos (`AXES`, `QUESTIONS`, `ACTORS`, `SOURCES`) y lógica del test.
- `css/p8d-extra.css` — estilos de referentes, carnet, vista compartida y comparación.
- `js/similarity.js` — `computeSimilarity`, `rankActors`, `softLabel`.
- `js/share.js` — `encodeShare`, `decodeShare`, texto para compartir, portapapeles, toast, almacenamiento local, `noindex` dinámico.
- `js/carnet.js` — registro `CARNET_TEMPLATES` y `renderCarnet` (canvas).
- `js/compare.js` — vista compartida, pestaña "Vos vs tu amigo" e imagen de comparación.
- `js/app-ext.js` — integración con la app, eventos y hook de pruebas `window.P8D`.

Son scripts clásicos (no módulos ES) para que funcionen en `file://`.

### Agregar una plantilla de carnet
Sumá una entrada a `CARNET_TEMPLATES` en `js/carnet.js`:
```js
miPlantilla: { id:"miPlantilla", label:"Mi plantilla", draw(ctx, data, W, H){ /* ... */ } }
```
`data` trae `scores`, `ranked` (similitudes), `top`, `marked` (3 ejes más marcados), `alias` y `url`. El fondo, encabezado y pie los dibuja `renderCarnet`. El selector se genera solo.

### Hook de pruebas
`window.P8D = { computeSimilarity, rankActors, encodeShare, decodeShare, renderCarnet, setAnswersForTest, setQuickAnswersForTest, QUICK_QUESTION_IDS, compareProfiles, renderCompareCard }`.
`renderCarnet(templateId, format, opts)` devuelve un canvas (`"portrait"` 1080×1350, `"square"` 1080×1080).

## Versión rápida
- 10 preguntas fijas del mismo banco, definidas en `QUICK_QUESTION_IDS` (índices de `QUESTIONS`, en `index.html`, con el criterio comentado): al menos una por eje; las 2 extra van a Economía y Tecnología, los ejes con mayor dispersión entre los perfiles de referentes. Balance 5 ítems a favor / 5 en contra del polo alto. Sin azar, para que los resultados entre amigos sean comparables.
- `calculateResults` promedia por eje sólo las preguntas respondidas, así la escala 0–100 es la misma que en el test completo (en el completo el resultado no cambia).
- Resultados y carnet llevan la marca "Versión rápida · menor precisión" y se ofrece "Hacer el test completo para más precisión" (reutiliza las 10 respuestas y saltea esas preguntas).
- El enlace agrega `&m=q`: `#r=1.82.61.55.40.70.66.35.77.milei&m=q`. Sin ese parámetro (incluidos todos los enlaces viejos) se lee como test completo. Comparar rápido vs. completo está permitido, con una nota de precisión.
- Progreso guardado aparte (`politica8d-progress-quick`); el modo del último resultado va en `politica8d-last-mode`.
- Hook: `P8D.setQuickAnswersForTest(10 valores 1–5)` y `P8D.QUICK_QUESTION_IDS`.

## Nota metodológica
Los puntajes de figuras públicas son estimaciones editoriales, no mediciones científicas. Los ejes sin evidencia suficiente se dejan como `null` y nunca se comparan.

## Privacidad
- Sin base de datos, sin cuentas, sin perfiles públicos. Nada se publica automáticamente.
- El progreso, el último resultado (sólo los 8 puntajes) y el alias opcional quedan en `localStorage` de tu navegador. El resultado de un amigo para comparar queda en `sessionStorage`.
- El enlace compartido sólo lleva la versión, los 8 puntajes redondeados y, opcionalmente, el id del referente más parecido. Nunca las 48 respuestas ni el alias.
- El enlace va en el **fragmento** (`#r=...`). Los navegadores no envían el fragmento al servidor, así que el hosting no lo recibe ni lo registra. Ojo: cualquiera que tenga el enlace puede ver esos 8 puntajes.
- Los buscadores tratan la URL con fragmento como la misma página. Cuando se abre un enlace compartido se agrega dinámicamente `<meta name="robots" content="noindex, nofollow">`; es un esfuerzo razonable, no una garantía. La página principal sigue siendo indexable.

## CHANGELOG

### 2026-10-10 (versión rápida)
- Inicio con dos opciones: "Test completo (48 preguntas)" y "Versión rápida (10 preguntas, ~2 min)". Ver sección **Versión rápida**.

### 2026-10-10
- **Sec. 40–41 · Carnet político:** nueva pestaña "Carnet y compartir" y botón "Compartir mi resultado". Imagen en canvas con encabezado, radar 8D, 8 puntajes con etiquetas suaves ("Inclinación a…", "Mixto / contextual"), referente más parecido, URL del sitio (se omite en `file://`) y aviso "Estimación aproximada · no es una medición científica". Fuentes del sistema; el texto se achica o se trunca para no desbordar.
- **Sec. 42–45 · Similitud con referentes:** `computeSimilarity` reemplaza la distancia anterior en el ranking. Sección "Referente más parecido" en Resumen con el top 3 (porcentaje, ejes comparables, confianza, coincidencias, diferencias principales y explicación generada por plantillas). La pestaña Referentes muestra el % de similitud y Metodología explica la fórmula.
- **Sec. 46–47 · Plantillas y formatos:** registro `CARNET_TEMPLATES` con Minimal, Completo y Social; formatos 1080×1350 y 1080×1080; alias opcional (máx. 32 caracteres) dibujado sólo en la imagen.
- **Sec. 48–49 · Compartir:** botones Descargar imagen (PNG), Copiar enlace, Compartir (Web Share con archivo → con texto + URL → copia del resumen como respaldo) y Copiar resumen; texto visible antes de compartir; toast de confirmación; portapapeles con respaldo `execCommand`.
- **Sec. 50 y 53 · Enlace reproducible y privacidad:** formato `#r=1.E.L.A.G.T.M.G.T[.idReferente]` (versión `1` + 8 enteros 0–100 en el orden de `AXES` + id opcional), validado estrictamente; vista "Resultado compartido de Política 8D"; `noindex` dinámico; avisos de privacidad en la pestaña de compartir y en Metodología.
- **Sec. 51–52 y 54 · Vos vs tu amigo:** comparación eje por eje con dos marcadores, radar superpuesto, "Compatibilidad política 8D", mayor coincidencia y mayor diferencia, imagen de comparación 1080×1350, "Comparar con mi último resultado" y "Quitar comparación". Sobrevive a una recarga mediante `sessionStorage`.

- **Ajustes de revisión:** favicon inline (evita un 404), etiquetas más grandes en el radar SVG de la vista compartida/comparación en móvil, y la explicación automática ya no habla de "mayor distancia" cuando ninguna diferencia llega a 20 puntos.

**Fórmula de similitud, en palabras:** se usan sólo los ejes donde el referente tiene puntaje (n; si n < 3 queda excluido). Se calcula la raíz del promedio de las diferencias al cuadrado (rms). Base = 100 − rms (entre 0 y 100). Se multiplica por la cobertura `0,55 + 0,45 × n/8` y por la confianza del perfil (alta/media/media-alta 1; media-baja 0,94; baja 0,88; otra 0,94) y se redondea. Empates: gana el que tiene más ejes comparables.

**Compatibilidad entre amigos:** `100 − rms` de las 8 diferencias, acotado a 0–100.

**Limitaciones:** el `noindex` sólo aplica cuando el JavaScript corre; un enlace compartido es visible para quien lo reciba; en `file://` el enlace copiado apunta a una ruta local y sólo sirve en ese dispositivo.
