# Arena de modelos v2 — resultados

Fecha: 20-sep-2026 · GPU: RTX 3050 Ti 4 GB · 27 modelos únicos × 12 clips
Pesos comparados: ~/Descargas (todos) + ~/Documentos/PowerNZ/models + HuggingFace `dzmbo/PowerNZ-Models`.

## Qué mirar y en qué orden

1. **`pack/`** — 3 vídeos (banca, squat, muerto) con el *mejor* modelo de cada familia dibujado a la vez:
   barra (bar_hub), discos (plates), esqueleto (keypoints), contorno (segmentación) y panel
   de clasificación lift/view + discos. Es la vista "pack completo de producción".
2. **`familias/`** — 12 vídeos: una rejilla por familia y levantamiento con **una casilla por versión**
   (ordenadas de vieja a nueva). Aquí se ve la evolución y se compara quién falla en qué encuadre.
   - `cov` = % de frames con detección ≥0.25 (umbral de producción del worker).
   - `raw` = % de frames con cualquier detección ≥0.10 (para ver si el fallo es "umbral" o "no ve nada").
3. **`capturas/`** — QA sobre 9 clips aleatorios (incluye encuadres diagonales, nulas y halterofilia):
   `*_contact.jpg` (original vs pack de ganadores), `QA_metricas.csv`, `QA_RESUMEN.md`.
4. **`best_models/`** — la carpeta ordenada: los 6 ganadores con nombre canónico + `SELECCION.md`
   (origen exacto, md5, clases y nota de integración) + `clases.json`.

## Ganadores

(⚠ = empate técnico dentro de la familia; se mantiene el de producción si lo hay)

| familia | ganador | top-3 |
|---------|---------|-------|
| bar_hub | `hub_v2l` | hub_v2l (82.2) · hub_v2b (82.2) · hub_v1 (73.4) |
| plates | `plt_20l` | plt_20l (97.7) · plt_pw (89.5) · plt_only (50.7) |
| keypoints | `kp_20sep` | kp_20sep (81.9) · kp_skel17 (81.9) · kp_old (61.6) |
| segmentación | `seg_v2b` | seg_v2b (96.3) · seg_v2l (96.3) · seg_v1 (53.3) |
| lift | `lift_prod` | lift_prod (100.0) · lift_newv (100.0) |
| view | `view_v2` | view_v2 (100.0) |

## Reglas de decisión

- **Umbral**: cajas dibujadas y métricas a conf ≥0.25 (el mismo del worker en
  `services/vbt-worker/vendor/detect_objects.py`). El caché guarda ≥0.10 para poder auditar.
- **Score por familia** (métricas normalizadas min-max dentro de la familia):
  - **acuerdo (IoU) intra-familia** = % de detecciones del modelo que casan (IoU≥0.5) con las de
    otras versiones de su misma familia, sin contarse a sí mismo. Es la mejor proxy sin etiquetas
    de "¿estoy marcando el mismo objeto que los demás?".
  - bar_hub / plates: cobertura 30 % + acuerdo 25 % + estabilidad temporal 20 % + confianza 15 % + "1 sola detección" 10 %.
  - keypoints: cobertura 25 % + acuerdo 20 % + keypoints válidos 20 % + estabilidad 20 % + confianza 15 %.
  - segmentación: cobertura 40 % + acuerdo 25 % + confianza 20 % + estabilidad de área 15 %.
  - lift / view: accuracy contra la carpeta del vídeo (bench/high_bar/low_bar/sumo/convencional).
- Sin IA en la decisión: todo son métricas deterministas sobre el mismo caché de inferencia.

## Hallazgos del test

- **bar_hub**: `hub_v2l`/`hub_v2b` marcan el cubo del hierro (cajas ~16x16 px) con 93 % de cobertura
  y conf 0.82. El `bar_hub.pt` viejo (bartrack, el que está en producción) **da 0 % en banca lateral
  y en sumo** y ~59 % en sentadilla: es el cambio más rentable.
- **`powerai_bar_detector.pt` (HuggingFace) NO es un detector de hub**: marca los discos/extremos
  (cajas ~88x159 px) y su acuerdo con los modelos hub es ~0. Sirve como detector de discos, no como
  sustituto del rastreador de barra.
- **plates**: `plt_20l` (20sep last) y `plate.pt` (HF PowerNZ) lideran con cov 0.86-0.87 y conf 0.83;
  `Plates_bar_hub.pt` de producción queda en la mitad de tabla (cov 0.72).
- **keypoints**: `keypoints20Sep` (12 kpts) gana con 100 % de cobertura y la mejor estabilidad;
  `SkeletonPower` (COCO-17) queda muy cerca con más confianza (0.93 vs 0.85) y 88 % de keypoints válidos.
- **segmentación**: `athlete_seg_yolo26s` v2 (best/last) es muy superior al modelo de producción v1
  y al de HuggingFace (cov 0.96-0.98 vs 0.83-0.86).
- **lift**: a imgsz nativo (224) `lift.pt` acierta el 100 % de los clips etiquetados (banca, sentadilla
  high/low bar, sumo). Ojo: si se le fuerza imgsz 640 colapsa a "bench" — el worker ya lo usa a 224,
  no lo cambies.
- **view**: `View.pt` predice "diag"/"front" en clips claramente laterales (0/5 aciertos) → no valides
  métricas que dependan de la vista con el modelo; el fallback geométrico del worker es más fiable.
- **imgsz nativo vs 640**: los modelos entrenados a 768/960 (hub_pwai, kp_20sep, kp_v3) no mejoran
  al subir de 640 (misma cobertura, confianza igual o menor) → 640 es suficiente y más rápido.
- **weight_model.pt**: solo detecta discos en primerísimos planos (cov 0.03 global, 60 % en un clip
  de peso muerto). Informativo, no útil como detector general.

## Avisos

- La **segmentación v2 ya es sólida** (cov 0.96-0.98) frente a la de producción v1 (0.86) y la de
  HuggingFace (0.83): el salto real está en migrar. Sigue siendo sensible al encuadre cuando el
  atleta queda muy cerca del borde o de espaldas al fondo (ver `q04_squat_contact.jpg`).
- En las familias con modelos casi idénticos (v2 best/last, 20sep best/last) el score queda **empatado**
  a propósito: son el mismo entrenamiento en dos checkpoints; elige por coste/estabilidad.
- `weight_model.pt` (detector de discos por kg) es informativo; no entra en el ranking.
- Copia de seguridad del test previo intacta en `~/Documentos/PowerNZ/model_arena/` y
  `~/Vídeos/test_modelos/`; esta corrida es independiente (v2).
