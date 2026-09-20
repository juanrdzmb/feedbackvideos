# Configuración de Google Sheets (Web App) para recibir votos

Puedes conectar esta página con una hoja de cálculo de Google Sheets en 2 minutos para ver todos los votos y comentarios en tiempo real desde tu móvil u ordenador.

---

## Paso 1: Crear la Hoja de Google Sheets
1. Entra en [Google Sheets](https://sheets.new) y crea una hoja nueva con el nombre que quieras (ej. `Model Arena Votes`).
2. En la primera fila (fila 1), escribe estos encabezados:
   - **A1**: `Fecha y Hora`
   - **B1**: `ID Sesión`
   - **C1**: `Ejercicio`
   - **D1**: `Ronda / Familia`
   - **E1**: `Modelo Votado`
   - **F1**: `Comentario`
   - **G1**: `Dispositivo`

---

## Paso 2: Crear el Google Apps Script
1. En el menú superior de la hoja, haz clic en **Extensiones** > **Apps Script**.
2. Borra todo el código que aparezca y pega exactamente lo siguiente:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Si viene un array de votos (envío final completo)
    if (Array.isArray(data.votes)) {
      data.votes.forEach(function(vote) {
        sheet.appendRow([
          new Date(),
          data.session_id || "anon",
          vote.exercise || "bench",
          vote.round_name || vote.round_id,
          vote.model_chosen,
          data.feedback || "",
          data.device || ""
        ]);
      });
    } else {
      // Voto individual por ronda
      sheet.appendRow([
        new Date(),
        data.session_id || "anon",
        data.exercise || "bench",
        data.round_name || data.round_id,
        data.model_chosen,
        data.feedback || "",
        data.device || ""
      ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## Paso 3: Desplegar como Web App
1. En la esquina superior derecha de Apps Script, haz clic en **Implementar** > **Nueva implementación**.
2. En el engranaje ⚙️ (Seleccionar tipo), elige **Aplicación web**.
3. Configuración:
   - **Descripción**: `Model Arena Webhook`
   - **Ejecutar como**: `Yo (tu correo de Google)`
   - **Quién tiene acceso**: **Cualquier usuario** (*Anyone*) — *Importante para que los visitantes anónimos de Instagram puedan enviar su voto sin necesidad de iniciar sesión*.
4. Haz clic en **Implementar** y copia la **URL de la aplicación web** generada (empieza por `https://script.google.com/macros/s/.../exec`).

---

## Paso 4: Pegar la URL en la Web
Abre el archivo `data/arena.json` y pega la URL en el campo `webhook_url`:

```json
"settings": {
  "title": "Model Arena v2",
  "webhook_url": "TU_URL_DE_APPS_SCRIPT_AQUI"
}
```

¡Listo! A partir de ese momento, cada vez que alguien vote desde Instagram, verás la fila aparecer al instante en tu Google Sheets.
