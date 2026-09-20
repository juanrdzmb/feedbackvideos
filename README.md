# Model Arena v2 — Feedback de Modelos VBT

Aplicación web interactiva en modo oscuro para votar y recopilar opiniones sobre los modelos de visión artificial para Powerlifting (detección de barra, discos, esqueleto del atleta y segmentación).

Optimizada para ser compartida en historias y publicaciones de **Instagram**, con una interfaz móvil ágil de 4 rondas rápidas (~45 segundos), controles táctiles y registro anónimo en tiempo real.

---

## Estructura del Proyecto

```
feedbackvideos/
├── index.html               # Aplicación web SPA
├── css/
│   └── style.css            # Estilos modo oscuro (True Dark + Neón)
├── js/
│   ├── app.js               # Controlador de vídeo, rondas y modales
│   └── tracker.js           # Almacenamiento local, exportación CSV y Webhook
├── data/
│   └── arena.json           # Configuración de vídeos, modelos y preguntas
├── familias/                # Vídeos comparativos en rejilla (18 vídeos, 24 MB)
├── pack/                    # Vídeos con pack de ganadores (3 vídeos, 3.3 MB)
├── capturas/                # Capturas de contacto y resumen de QA (6.8 MB)
├── SETUP_WEBAPP.md          # Guía para conectar Google Sheets en 2 minutos
└── LEEME.md                 # Documentación técnica de los modelos evaluados
```

---

## Cómo Añadir o Actualizar Nuevos Vídeos

Todo el contenido de la web está centralizado en [`data/arena.json`](data/arena.json). Para actualizar con nuevos modelos o vídeos:

1. Coloca los nuevos archivos `.mp4` en `familias/` o `pack/`.
2. Abre `data/arena.json` y añade o edita la ronda correspondiente:
   ```json
   {
     "id": "nueva_familia",
     "name": "Nombre de la Prueba",
     "badge": "Nueva",
     "question": "¿Cuál modelo es más preciso?",
     "videos": {
       "bench": "familias/nuevo_video.mp4"
     },
     "candidates": [
       { "id": "m1", "name": "modelo_a", "tag": "v3", "color": "#00f2fe" },
       { "id": "m2", "name": "modelo_b", "tag": "v4", "color": "#00f59b" }
     ]
   }
   ```
3. Guarda y haz `git commit` + `git push`. GitHub Pages se actualizará automáticamente.

---

## Ver los Resultados

1. **En la propia web**: Pulsa el icono de gráfico 📊 en la barra superior o tras finalizar tu voto para ver las estadísticas porcentuales acumuladas.
2. **Descarga CSV**: En el modal de resultados puedes pulsar **Descargar CSV** para guardar todos los votos de la sesión en una hoja de cálculo.
3. **Google Sheets en tiempo real**: Sigue los pasos en [`SETUP_WEBAPP.md`](SETUP_WEBAPP.md) para recibir cada voto y comentario directamente en tu Google Drive.
