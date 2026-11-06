/* =========================================================
   Don PEPE Repuestos - Servidor de cotizaciones (Google Apps Script)

   Se pega en: Google Sheets > Extensiones > Apps Script.
   Guarda las cotizaciones en la hoja "Cotizaciones".
   Los pasos completos están en CONFIGURAR-GOOGLE-SHEETS.md

   Acciones:
     crear       -> pública (la usan los clientes desde la tienda)
     verificar, listar, crearAdmin, actualizar, borrar
                 -> solo con la clave del panel (CLAVE_ADMIN)
   ========================================================= */

var NOMBRE_HOJA = "Cotizaciones";

var COLUMNAS = [
  "Número", "Fecha", "Estado", "Origen",
  "Cliente", "Teléfono", "Valor fiscal", "RNC/Cédula", "Vehículo",
  "Productos (JSON)", "ITBIS %", "Precios incluyen ITBIS",
  "Subtotal", "ITBIS", "Total", "Notas internas", "Actualizado"
];

var ESTADOS = ["Nueva", "Contactado", "Vendida", "Descartada"];

var LIMITES = {
  texto: 120,
  telefono: 30,
  notas: 1000,
  items: 50,
  cantidad: 999,
  precio: 10000000
};

/* ---------- Configuración inicial ----------
   Ejecútala UNA vez desde el editor de Apps Script (botón ▶ Ejecutar):
   - Google pide autorizar el script (necesario para que la aplicación web funcione).
   - Crea una clave aleatoria para el panel si todavía no existe, y la muestra en el
     "Registro de ejecución". Cópiala: es la que se usa en admin.html.
   Para cambiar la clave: Configuración del proyecto > Propiedades > CLAVE_ADMIN. */
function configurarInicial() {
  var propiedades = PropertiesService.getScriptProperties();
  var clave = propiedades.getProperty("CLAVE_ADMIN");
  if (!clave) {
    clave = Utilities.getUuid().replace(/-/g, "").slice(0, 16);
    propiedades.setProperty("CLAVE_ADMIN", clave);
  }
  obtenerHoja();
  Logger.log("Todo listo. Clave del panel: " + clave);
}

/* ---------- Entradas ---------- */

// Al abrir el enlace en el navegador: sirve para comprobar que funciona
function doGet() {
  return responder({ ok: true, mensaje: "Servidor de cotizaciones funcionando." });
}

function doPost(e) {
  try {
    var datos = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    switch (datos.accion) {
      case "crear":
        return responder({ ok: true, cotizacion: crear(datos.cotizacion, "Web") });

      case "verificar":
        verificarClave(datos.clave);
        return responder({ ok: true });

      case "listar":
        verificarClave(datos.clave);
        return responder({ ok: true, cotizaciones: listar() });

      case "crearAdmin":
        verificarClave(datos.clave);
        return responder({ ok: true, cotizacion: crear(datos.cotizacion, "Tienda") });

      case "actualizar":
        verificarClave(datos.clave);
        return responder({ ok: true, cotizacion: actualizar(datos.numero, datos.cotizacion) });

      case "borrar":
        verificarClave(datos.clave);
        borrar(datos.numero);
        return responder({ ok: true });

      default:
        throw errorCon("Acción no válida.", "ACCION");
    }
  } catch (err) {
    return responder({ ok: false, error: err.message, codigo: err.codigo || "SERVIDOR" });
  }
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorCon(mensaje, codigo) {
  var err = new Error(mensaje);
  err.codigo = codigo;
  return err;
}

/* ---------- Seguridad ---------- */

function verificarClave(clave) {
  var guardada = PropertiesService.getScriptProperties().getProperty("CLAVE_ADMIN");
  if (!guardada) {
    throw errorCon("Falta configurar CLAVE_ADMIN en las propiedades del script.", "SIN_CLAVE");
  }
  // trim(): ignora espacios que se cuelan al copiar y pegar la clave
  if (String(clave || "").trim() !== String(guardada).trim()) {
    Utilities.sleep(1500); // frena a quien intente adivinar la clave
    throw errorCon("Clave incorrecta.", "CLAVE");
  }
}

/* ---------- La hoja ---------- */

function obtenerHoja() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(NOMBRE_HOJA);
    hoja.getRange(1, 1, 1, COLUMNAS.length)
      .setValues([COLUMNAS])
      .setFontWeight("bold")
      .setBackground("#1f2a36")
      .setFontColor("#ffffff");
    hoja.setFrozenRows(1);
    // Teléfono y RNC como texto, para que Sheets no los convierta en números o fechas
    hoja.getRange(1, 6, hoja.getMaxRows(), 1).setNumberFormat("@");
    hoja.getRange(1, 8, hoja.getMaxRows(), 1).setNumberFormat("@");
    // Montos con 2 decimales
    hoja.getRange(1, 13, hoja.getMaxRows(), 3).setNumberFormat("#,##0.00");
  }
  return hoja;
}

// Evita que un texto que empieza con = + - @ se convierta en fórmula
function textoSeguro(valor) {
  var texto = String(valor == null ? "" : valor);
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function aFila(c) {
  return [
    c.numero, new Date(c.fecha), c.estado, c.origen,
    textoSeguro(c.cliente.nombre), textoSeguro(c.cliente.telefono),
    c.cliente.fiscal ? "Sí" : "No", textoSeguro(c.cliente.rnc), textoSeguro(c.vehiculo),
    JSON.stringify(c.items), c.itbisPorcentaje, c.incluyeItbis ? "Sí" : "No",
    c.subtotal, c.itbis, c.total, textoSeguro(c.notas), new Date(c.actualizado)
  ];
}

function deFila(f) {
  var items;
  try {
    items = JSON.parse(f[9] || "[]");
  } catch (e) {
    items = [];
  }
  return {
    numero: String(f[0]),
    fecha: aISO(f[1]),
    estado: String(f[2] || "Nueva"),
    origen: String(f[3] || ""),
    cliente: {
      nombre: String(f[4] || ""),
      telefono: String(f[5] || ""),
      fiscal: f[6] === "Sí",
      rnc: String(f[7] || "")
    },
    vehiculo: String(f[8] || ""),
    items: items,
    itbisPorcentaje: Number(f[10]) || 0,
    incluyeItbis: f[11] === "Sí",
    subtotal: Number(f[12]) || 0,
    itbis: Number(f[13]) || 0,
    total: Number(f[14]) || 0,
    notas: String(f[15] || ""),
    actualizado: aISO(f[16])
  };
}

function aISO(valor) {
  var fecha = valor instanceof Date ? valor : new Date(valor);
  return isNaN(fecha.getTime()) ? "" : fecha.toISOString();
}

function buscarFila(hoja, numero) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return -1;
  var numeros = hoja.getRange(2, 1, ultima - 1, 1).getValues();
  for (var i = 0; i < numeros.length; i++) {
    if (String(numeros[i][0]) === String(numero)) return i + 2;
  }
  return -1;
}

/* ---------- Validación y totales ---------- */

function recortar(valor, maximo) {
  return String(valor == null ? "" : valor).trim().slice(0, maximo);
}

function soloDigitos(texto) {
  return String(texto || "").replace(/\D/g, "");
}

function formatearRnc(rnc) {
  var d = soloDigitos(rnc);
  if (d.length === 9) return d[0] + "-" + d.slice(1, 3) + "-" + d.slice(3, 8) + "-" + d[8];
  if (d.length === 11) return d.slice(0, 3) + "-" + d.slice(3, 10) + "-" + d[10];
  return "";
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}

// Revisa y limpia lo que llega desde el navegador. Nunca confíes en datos del cliente.
function limpiarCotizacion(c) {
  if (!c || typeof c !== "object") throw errorCon("Datos de cotización inválidos.", "DATOS");
  var cliente = c.cliente || {};

  var limpia = {
    cliente: {
      nombre: recortar(cliente.nombre, LIMITES.texto),
      telefono: recortar(cliente.telefono, LIMITES.telefono),
      fiscal: cliente.fiscal === true,
      rnc: ""
    },
    vehiculo: recortar(c.vehiculo, LIMITES.texto),
    notas: recortar(c.notas, LIMITES.notas),
    itbisPorcentaje: Number(c.itbisPorcentaje),
    incluyeItbis: c.incluyeItbis === true,
    items: []
  };

  if (!limpia.cliente.nombre) throw errorCon("Falta el nombre del cliente.", "DATOS");

  if (limpia.cliente.fiscal) {
    limpia.cliente.rnc = formatearRnc(cliente.rnc);
    if (!limpia.cliente.rnc) throw errorCon("El RNC debe tener 9 dígitos o la cédula 11.", "DATOS");
  }

  if (!(limpia.itbisPorcentaje >= 0 && limpia.itbisPorcentaje <= 100)) limpia.itbisPorcentaje = 0;

  var items = Array.isArray(c.items) ? c.items : [];
  if (items.length === 0) throw errorCon("La cotización no tiene productos.", "DATOS");
  if (items.length > LIMITES.items) throw errorCon("Demasiados productos en una cotización.", "DATOS");

  items.forEach(function (item) {
    var cantidad = Math.floor(Number(item.cantidad));
    var precio = redondear(Number(item.precio));
    var nombre = recortar(item.nombre, LIMITES.texto);
    if (!nombre) throw errorCon("Hay un producto sin nombre.", "DATOS");
    if (!(cantidad >= 1 && cantidad <= LIMITES.cantidad)) throw errorCon("Cantidad inválida en " + nombre + ".", "DATOS");
    if (!(precio >= 0 && precio <= LIMITES.precio)) throw errorCon("Precio inválido en " + nombre + ".", "DATOS");
    limpia.items.push({ id: recortar(item.id, 20), nombre: nombre, cantidad: cantidad, precio: precio });
  });

  calcularTotales(limpia);
  return limpia;
}

function calcularTotales(c) {
  var suma = redondear(c.items.reduce(function (s, item) { return s + item.precio * item.cantidad; }, 0));
  var tasa = c.itbisPorcentaje / 100;
  if (!tasa) {
    c.subtotal = suma; c.itbis = 0; c.total = suma;
  } else if (c.incluyeItbis) {
    c.subtotal = redondear(suma / (1 + tasa)); c.itbis = redondear(suma - c.subtotal); c.total = suma;
  } else {
    c.subtotal = suma; c.itbis = redondear(suma * tasa); c.total = redondear(suma + c.itbis);
  }
}

/* ---------- Acciones ---------- */

// Número correlativo: COT-000001, COT-000002...
function siguienteNumero() {
  var propiedades = PropertiesService.getScriptProperties();
  var ultimo = Number(propiedades.getProperty("ULTIMO_NUMERO") || 0) + 1;
  propiedades.setProperty("ULTIMO_NUMERO", String(ultimo));
  return "COT-" + ("000000" + ultimo).slice(-6);
}

function crear(datos, origen) {
  var c = limpiarCotizacion(datos);
  var bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(10000); // dos clientes a la vez no reciben el mismo número
  try {
    var ahora = new Date().toISOString();
    c.numero = siguienteNumero();
    c.fecha = ahora;
    c.actualizado = ahora;
    c.origen = origen;
    c.estado = "Nueva";
    if (origen === "Web") c.notas = ""; // las notas internas solo las escribe el negocio
    obtenerHoja().appendRow(aFila(c));
    return c;
  } finally {
    bloqueo.releaseLock();
  }
}

function listar() {
  var hoja = obtenerHoja();
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var filas = hoja.getRange(2, 1, ultima - 1, COLUMNAS.length).getValues();
  return filas
    .filter(function (f) { return f[0]; })
    .map(deFila)
    .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; }); // más recientes primero
}

function actualizar(numero, datos) {
  var bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(10000);
  try {
    var hoja = obtenerHoja();
    var fila = buscarFila(hoja, numero);
    if (fila < 0) throw errorCon("No existe la cotización " + numero + ".", "NO_EXISTE");

    var anterior = deFila(hoja.getRange(fila, 1, 1, COLUMNAS.length).getValues()[0]);
    var c = limpiarCotizacion(datos);
    c.numero = anterior.numero;
    c.fecha = anterior.fecha;
    c.origen = anterior.origen;
    c.estado = ESTADOS.indexOf(datos.estado) >= 0 ? datos.estado : anterior.estado;
    c.actualizado = new Date().toISOString();

    hoja.getRange(fila, 1, 1, COLUMNAS.length).setValues([aFila(c)]);
    return c;
  } finally {
    bloqueo.releaseLock();
  }
}

function borrar(numero) {
  var bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(10000);
  try {
    var hoja = obtenerHoja();
    var fila = buscarFila(hoja, numero);
    if (fila < 0) throw errorCon("No existe la cotización " + numero + ".", "NO_EXISTE");
    hoja.deleteRow(fila);
  } finally {
    bloqueo.releaseLock();
  }
}
