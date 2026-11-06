# Conectar las cotizaciones con Google Sheets

Mientras `URL_COTIZACIONES` esté vacío en `config.js`, la página funciona en **modo de prueba**:
las cotizaciones se guardan solo en tu navegador y el panel (`admin.html`) entra con la clave `demo`.

Sigue estos pasos para que las cotizaciones de **todos los clientes** lleguen a una hoja de Google
y el negocio las vea desde cualquier computadora o celular. Tarda unos 10 minutos.

---

## 1. Crear la hoja ✅ (ya hecho)

La hoja **Cotizaciones Don PEPE** ya está creada en tu Drive, con la pestaña **Cotizaciones**,
sus columnas y el formato listos:
<https://docs.google.com/spreadsheets/d/1WagRi7CsIhDiPNt5zE0GzUsABNWXZ2C2BDQcNCE-tHQ/edit>

(Si algún día necesitas otra desde cero: crea una en <https://sheets.new>; el código crea sola
la pestaña **Cotizaciones** la primera vez.)

## 2. Pegar el código

1. En la hoja, ve a **Extensiones → Apps Script**.
2. Se abre un archivo llamado `Código.gs` con algo escrito. **Bórralo todo.**
3. Abre el archivo `google-apps-script/Codigo.gs` de este proyecto, copia **todo** su contenido y pégalo.
4. Guarda con `Ctrl + S`.

## 3. Poner la clave del panel

La clave se guarda en Google, **no** en el código de la página (así nadie la puede ver).

1. En Apps Script, haz clic en el engranaje **⚙ Configuración del proyecto** (menú de la izquierda).
2. Baja hasta **Propiedades de la secuencia de comandos** → **Agregar propiedad de la secuencia de comandos**.
3. Propiedad: `CLAVE_ADMIN` · Valor: una clave difícil de adivinar (mínimo 12 caracteres, mezcla letras y números).
4. **Guardar propiedades de la secuencia de comandos.**

> Para cambiar la clave más adelante, edita ese mismo valor. No hace falta volver a publicar.

## 4. Publicar como aplicación web

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. En el engranaje junto a "Seleccionar tipo", elige **Aplicación web**.
3. Completa:
   - **Descripción:** Cotizaciones
   - **Ejecutar como:** Yo (tu correo)
   - **Quién tiene acceso:** Cualquier usuario
4. **Implementar.**
5. Google pide **Autorizar acceso**. Elige tu cuenta.
   - Si aparece *"Google no verificó esta app"*, es normal porque el código es tuyo:
     haz clic en **Configuración avanzada → Ir a … (no seguro)** → **Permitir**.
6. Copia la **URL de la aplicación web** (termina en `/exec`).

## 5. Pegar la URL en la página

En `config.js`:

```js
const URL_COTIZACIONES = "https://script.google.com/macros/s/XXXXXXXX/exec";
```

## 6. Probar

1. Abre la URL `/exec` en el navegador. Debe decir:
   `{"ok":true,"mensaje":"Servidor de cotizaciones funcionando."}`
2. En la tienda (`index.html`), agrega productos y genera una cotización.
   Debe aparecer **"✔ Cotización registrada"** y un número como **COT-000001**.
3. Abre `admin.html` (enlace **Acceso negocio** al pie de la tienda) y entra con tu `CLAVE_ADMIN`.
4. En la hoja de Google verás la fila nueva en la pestaña **Cotizaciones**.

---

## Estado actual ✅

Ya está todo conectado (hecho con **clasp**, la herramienta de Google para la terminal):

- Proyecto de Apps Script unido a la hoja:
  <https://script.google.com/d/1d1o9PRW-yyTf_r6uJlbUhODbOOyb7zQ3U4Dh4HG2gEv_dZXkjDSwmSMu/edit>
- Implementación "Cotizaciones v1": `AKfycbyWlp9rzlbBTBK3i8aepHDTECB6isvNqxd1eZYPB9WEcXF-AXuW6ujvm0NoLGxpWNtxFw`
- La URL ya está en `config.js`.
- La clave del panel se creó con `configurarInicial` (se ve en el Registro de ejecución).

### Actualizar el servidor desde la terminal

Después de editar `google-apps-script/Codigo.gs`, desde la carpeta `google-apps-script`:

```
clasp push --force
clasp update-deployment AKfycbyWlp9rzlbBTBK3i8aepHDTECB6isvNqxd1eZYPB9WEcXF-AXuW6ujvm0NoLGxpWNtxFw
```

El primero sube el código; el segundo publica una versión nueva **con la misma URL**.

## Si cambias el código de `Codigo.gs` (desde el navegador)

Cada cambio necesita publicar una **nueva versión** (si no, Google sigue usando la anterior):

**Implementar → Administrar implementaciones → ✏ (editar) → Versión: Nueva versión → Implementar.**

Así la URL **no cambia**. (Si usas "Nueva implementación" otra vez, se crea una URL distinta.)

## Cosas importantes

- **No cambies el nombre de la pestaña "Cotizaciones" ni el orden de las columnas**: el código las usa.
  Sí puedes leer la hoja, filtrarla o descargarla en Excel cuando quieras.
- **Los números de cotización** (COT-000001, COT-000002…) los lleva Google en la propiedad
  `ULTIMO_NUMERO`. No la borres o la numeración empezará de nuevo.
- **Quién puede hacer qué:**
  - Cualquiera con la URL puede **crear** cotizaciones (es lo que hace la tienda).
  - Solo quien tenga la clave puede **ver, editar o borrar** cotizaciones.
  - El servidor recalcula los totales y revisa los datos, así que nadie puede mandar un total falso.
    Aun así, **revisa los precios** antes de vender: los precios vienen de la lista de `config.js`.
- **Si alguien llena la hoja de cotizaciones falsas**, puedes borrarlas desde el panel o la hoja.
  Si se vuelve un problema, publica una nueva implementación (URL nueva) y actualiza `config.js`.
- **El ITBIS** de cada cotización queda guardado con el porcentaje que tenía al crearla.
  Si cambias `ITBIS_PORCENTAJE` en `config.js`, solo afecta a las cotizaciones nuevas.
- **Límites de Google:** Apps Script tiene límites diarios de uso que sobran para un negocio pequeño.
