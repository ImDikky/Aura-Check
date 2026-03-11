---
description: Abrir el proyecto en el navegador Brave
---

// turbo-all
1. Inicia el servidor de desarrollo (si aplica):
   ```powershell
   uvicorn main:app --reload --port 8000
   ```
2. Abre el proyecto en Brave:
   ```powershell
   Start-Process "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" "http://127.0.0.1:8000"
   ```

> Nota: Si el servidor no usa el puerto 8000, ajusta la URL en el paso 2.
> Siempre usar Brave en lugar de cualquier otro navegador para previsualizar el proyecto.
