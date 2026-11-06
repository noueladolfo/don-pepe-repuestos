# Don PEPE Repuestos

Tienda web de repuestos de autos con carrito de cotización, envío por WhatsApp
y un panel para que el negocio administre las cotizaciones guardadas en Google Sheets.

## Qué incluye

- **Tienda** (`index.html`): categorías, productos con precios, selector de vehículo
  (año, marca, modelo o VIN con la API gratuita de NHTSA), carrito y formulario de contacto.
- **Cotización formal**: datos del cliente, opción de factura con valor fiscal (RNC o cédula),
  ITBIS, número correlativo, impresión y envío por WhatsApp.
- **Panel del negocio** (`admin.html`): consultar, buscar, cambiar estado, editar, crear,
  borrar, descargar en PDF y contestar por WhatsApp. Protegido con clave.
- **Servidor** (`google-apps-script/Codigo.gs`): Google Apps Script que guarda las
  cotizaciones en Google Sheets.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `config.js` | Configuración: WhatsApp, datos de la tienda, ITBIS, productos y enlace del servidor |
| `comun.js` | Funciones compartidas por la tienda y el panel |
| `script.js` | Lógica de la tienda |
| `admin.html`, `admin.js`, `admin.css` | Panel del negocio |
| `style.css` | Estilos de la tienda (y del documento de cotización) |
| `google-apps-script/` | Código del servidor y su configuración para `clasp` |
| `js/html2pdf.bundle.min.js` | Librería para generar PDF (licencia MIT) |
| `CONFIGURAR-GOOGLE-SHEETS.md` | Cómo conectar o actualizar el servidor de Google |
| `index-mio.html`, `style-mio.css` | Primera versión hecha a mano (práctica) |
| `index-v2.html`, `style-v2.css` | Versión intermedia, antes del carrito |

## Probar en local

Abre `index.html` en el navegador. Si `URL_COTIZACIONES` está vacío en `config.js`,
todo funciona en **modo de prueba** (guarda en el navegador; clave del panel: `demo`).
