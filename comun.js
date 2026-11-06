/* =========================================================
   Don PEPE Repuestos - Funciones compartidas
   Las usan la tienda (script.js) y el panel (admin.js).
   Necesita que config.js se cargue antes.
   ========================================================= */

/* ---------- Atajos ---------- */
const $ = (selector, raiz = document) => raiz.querySelector(selector);
const $$ = (selector, raiz = document) => raiz.querySelectorAll(selector);

/* ---------- Formatos ---------- */

// RD$2,500  (sin decimales si es un número entero)
function formatearPrecio(valor) {
    return MONEDA + Number(valor).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// RD$2,500.00  (siempre con 2 decimales, para la cotización)
function formatearMonto(valor) {
    return MONEDA + Number(valor).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 05/11/2026
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// 05/11/2026 14:32
function formatearFechaHora(fecha) {
    const f = new Date(fecha);
    return `${formatearFecha(f)} ${f.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}`;
}

function fechaVencimiento(fecha) {
    const vence = new Date(fecha);
    vence.setDate(vence.getDate() + VALIDEZ_DIAS);
    return vence;
}

// Evita que un texto escrito por alguien se interprete como HTML
function escaparHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------- RNC / cédula ---------- */

// Deja solo los números: "131-12345-6" -> "131123456"
const soloDigitos = (texto) => String(texto ?? "").replace(/\D/g, "");

// RNC de empresa = 9 dígitos · Cédula de persona = 11 dígitos
function validarRnc(rnc) {
    const d = soloDigitos(rnc);
    return d.length === 9 || d.length === 11;
}

// 131123456 -> 1-31-12345-6 · 00112345678 -> 001-1234567-8
function formatearRnc(rnc) {
    const d = soloDigitos(rnc);
    if (d.length === 9) return `${d[0]}-${d.slice(1, 3)}-${d.slice(3, 8)}-${d[8]}`;
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d[10]}`;
    return rnc;
}

/* ---------- Totales ---------- */

const redondear = (n) => Math.round(n * 100) / 100;

// Separa subtotal, ITBIS y total de una lista de productos
function calcularTotalesDe(items, porcentaje = ITBIS_PORCENTAJE, incluye = PRECIOS_INCLUYEN_ITBIS) {
    const suma = redondear(items.reduce((s, item) => s + Number(item.precio) * Number(item.cantidad), 0));
    const tasa = Number(porcentaje) / 100;
    if (!tasa) return { subtotal: suma, itbis: 0, total: suma };
    if (incluye) {
        const subtotal = redondear(suma / (1 + tasa));
        return { subtotal, itbis: redondear(suma - subtotal), total: suma };
    }
    const itbis = redondear(suma * tasa);
    return { subtotal: suma, itbis, total: redondear(suma + itbis) };
}

/* ---------- WhatsApp ---------- */

// Convierte un teléfono escrito por una persona al formato de wa.me.
// En República Dominicana, 809/829/849 + 7 dígitos -> se le agrega el 1.
function telefonoWhatsApp(telefono) {
    const d = soloDigitos(telefono);
    if (d.length === 10 && /^(809|829|849)/.test(d)) return "1" + d;
    return d;
}

// Sin número, wa.me abre WhatsApp con el mensaje y deja elegir a quién enviarlo
function enlaceWhatsApp(texto, numero = NUMERO_WHATSAPP) {
    return `https://wa.me/${soloDigitos(numero)}?text=${encodeURIComponent(texto)}`;
}

function abrirWhatsApp(texto, numero = NUMERO_WHATSAPP) {
    window.open(enlaceWhatsApp(texto, numero), "_blank", "noopener");
}

/* ---------- La cotización ----------
   Forma de una cotización:
   { numero, fecha, estado, origen, notas, actualizado,
     cliente: { nombre, telefono, fiscal, rnc },
     vehiculo, items: [{ id, nombre, cantidad, precio }],
     itbisPorcentaje, incluyeItbis, subtotal, itbis, total }
*/

function textoTotalesDe(c) {
    if (!Number(c.itbisPorcentaje)) return `*Total: ${formatearMonto(c.total)}*`;
    return [
        `Subtotal: ${formatearMonto(c.subtotal)}`,
        `ITBIS (${c.itbisPorcentaje}%): ${formatearMonto(c.itbis)}`,
        `*Total: ${formatearMonto(c.total)}*`,
    ].join("\n");
}

// Texto de la cotización para WhatsApp
function textoCotizacion(c) {
    const lineas = [
        `*COTIZACIÓN ${c.numero}*`,
        `Fecha: ${formatearFecha(c.fecha)} · Válida hasta: ${formatearFecha(fechaVencimiento(c.fecha))}`,
        "",
        `*Cliente:* ${c.cliente.nombre}`,
    ];
    if (c.cliente.telefono) lineas.push(`Teléfono: ${c.cliente.telefono}`);
    if (c.cliente.fiscal) {
        lineas.push("*Comprobante:* Factura con valor fiscal");
        lineas.push(`*RNC/Cédula:* ${c.cliente.rnc}`);
    } else {
        lineas.push("Comprobante: Consumidor final");
    }
    if (c.vehiculo) lineas.push(`*Vehículo:* ${c.vehiculo}`);
    lineas.push("", "*Productos:*");
    c.items.forEach((item) =>
        lineas.push(`• ${item.cantidad} x ${item.nombre} (${formatearMonto(item.precio)} c/u) = ${formatearMonto(item.precio * item.cantidad)}`)
    );
    lineas.push("", textoTotalesDe(c));
    return lineas.join("\n");
}

// HTML de la "hoja" de la cotización
function documentoHTML(c) {
    const filas = c.items
        .map(
            (item) => `
            <tr>
                <td>${escaparHTML(item.nombre)}</td>
                <td class="num">${Number(item.cantidad)}</td>
                <td class="num">${formatearMonto(item.precio)}</td>
                <td class="num">${formatearMonto(item.precio * item.cantidad)}</td>
            </tr>`
        )
        .join("");

    const filaItbis = Number(c.itbisPorcentaje)
        ? `<div><span>Subtotal</span><span>${formatearMonto(c.subtotal)}</span></div>
           <div><span>ITBIS (${Number(c.itbisPorcentaje)}%)</span><span>${formatearMonto(c.itbis)}</span></div>`
        : "";

    return `
        <header class="doc-cabecera">
            <div>
                <p class="doc-tienda">${escaparHTML(TIENDA.nombre)}</p>
                <p>${escaparHTML(TIENDA.direccion)}</p>
                <p>Tel.: ${escaparHTML(TIENDA.telefono)} · ${escaparHTML(TIENDA.correo)}</p>
                ${TIENDA.rnc ? `<p>RNC: ${escaparHTML(TIENDA.rnc)}</p>` : ""}
            </div>
            <div class="doc-numero">
                <p class="doc-etiqueta">Cotización</p>
                <p class="doc-codigo">${escaparHTML(c.numero)}</p>
                <p>Fecha: ${formatearFecha(c.fecha)}</p>
                <p>Válida hasta: ${formatearFecha(fechaVencimiento(c.fecha))}</p>
            </div>
        </header>

        <section class="doc-cliente">
            <div>
                <p class="doc-etiqueta">Cliente</p>
                <p class="doc-dato">${escaparHTML(c.cliente.nombre)}</p>
                ${c.cliente.telefono ? `<p>Tel.: ${escaparHTML(c.cliente.telefono)}</p>` : ""}
            </div>
            <div>
                <p class="doc-etiqueta">Comprobante</p>
                <p class="doc-dato">${c.cliente.fiscal ? "Factura con valor fiscal" : "Consumidor final"}</p>
                ${c.cliente.fiscal ? `<p>RNC/Cédula: <strong>${escaparHTML(c.cliente.rnc)}</strong></p>` : ""}
            </div>
            ${
                c.vehiculo
                    ? `<div><p class="doc-etiqueta">Vehículo</p><p class="doc-dato">${escaparHTML(c.vehiculo)}</p></div>`
                    : ""
            }
        </section>

        <table class="doc-tabla">
            <thead>
                <tr><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>

        <div class="doc-totales">
            ${filaItbis}
            <div class="doc-total"><span>Total</span><span>${formatearMonto(c.total)}</span></div>
        </div>

        <p class="doc-nota">
            Precios sujetos a disponibilidad y a confirmación. Cotización válida por ${VALIDEZ_DIAS} días.
            ${c.cliente.fiscal ? "El comprobante fiscal se emitirá al momento de la compra." : ""}
        </p>`;
}

/* ---------- Conexión con Google Sheets (Apps Script) ---------- */

class ErrorApi extends Error {
    constructor(mensaje, codigo) {
        super(mensaje);
        this.codigo = codigo;
    }
}

// Sin enlace de Google, todo funciona en "modo de prueba" (solo en este navegador)
const MODO_PRUEBA = !URL_COTIZACIONES;
const CLAVE_PRUEBA = "demo";

// Envía una acción al Apps Script y devuelve su respuesta.
// Se usa "text/plain" para que el navegador no haga una consulta previa (CORS) que Google no acepta.
async function llamarApi(accion, datos = {}) {
    if (MODO_PRUEBA) return apiDePrueba(accion, datos);
    let respuesta;
    try {
        respuesta = await fetch(URL_COTIZACIONES, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ accion, ...datos }),
        });
    } catch {
        throw new ErrorApi("No hay conexión con el servidor de cotizaciones.", "SIN_CONEXION");
    }
    if (!respuesta.ok) throw new ErrorApi(`El servidor respondió con error ${respuesta.status}.`, "HTTP");
    const json = await respuesta.json();
    if (!json.ok) throw new ErrorApi(json.error || "Error desconocido del servidor.", json.codigo || "SERVIDOR");
    return json;
}

/* ---------- Modo de prueba: imita al servidor usando el navegador ---------- */

const CLAVE_DATOS_PRUEBA = "donpepe-prueba-cotizaciones";

function leerPrueba() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_DATOS_PRUEBA)) || { ultimo: 0, lista: [] };
    } catch {
        return { ultimo: 0, lista: [] };
    }
}

function guardarPrueba(datos) {
    localStorage.setItem(CLAVE_DATOS_PRUEBA, JSON.stringify(datos));
}

function prepararPrueba(c) {
    if (!c?.cliente?.nombre) throw new ErrorApi("Falta el nombre del cliente.", "DATOS");
    if (!c.items?.length) throw new ErrorApi("La cotización no tiene productos.", "DATOS");
    const items = c.items.map((i) => ({
        id: i.id || "",
        nombre: String(i.nombre),
        cantidad: Math.floor(Number(i.cantidad)),
        precio: redondear(Number(i.precio)),
    }));
    const itbisPorcentaje = Number(c.itbisPorcentaje) || 0;
    const incluyeItbis = c.incluyeItbis === true;
    return {
        cliente: {
            nombre: c.cliente.nombre,
            telefono: c.cliente.telefono || "",
            fiscal: c.cliente.fiscal === true,
            rnc: c.cliente.fiscal ? formatearRnc(c.cliente.rnc) : "",
        },
        vehiculo: c.vehiculo || "",
        notas: c.notas || "",
        items,
        itbisPorcentaje,
        incluyeItbis,
        ...calcularTotalesDe(items, itbisPorcentaje, incluyeItbis),
    };
}

async function apiDePrueba(accion, datos) {
    const db = leerPrueba();
    const ahora = new Date().toISOString();
    const exigirClave = () => {
        if (datos.clave !== CLAVE_PRUEBA) throw new ErrorApi("Clave incorrecta.", "CLAVE");
    };
    const buscar = (numero) => {
        const i = db.lista.findIndex((c) => c.numero === numero);
        if (i < 0) throw new ErrorApi(`No existe la cotización ${numero}.`, "NO_EXISTE");
        return i;
    };

    switch (accion) {
        case "crear":
        case "crearAdmin": {
            if (accion === "crearAdmin") exigirClave();
            const c = prepararPrueba(datos.cotizacion);
            db.ultimo += 1;
            Object.assign(c, {
                numero: `COT-P${String(db.ultimo).padStart(5, "0")}`,
                fecha: ahora,
                actualizado: ahora,
                estado: "Nueva",
                origen: accion === "crear" ? "Web" : "Tienda",
            });
            if (accion === "crear") c.notas = "";
            db.lista.push(c);
            guardarPrueba(db);
            return { ok: true, cotizacion: c };
        }
        case "verificar":
            exigirClave();
            return { ok: true };
        case "listar":
            exigirClave();
            return { ok: true, cotizaciones: [...db.lista].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) };
        case "actualizar": {
            exigirClave();
            const i = buscar(datos.numero);
            const anterior = db.lista[i];
            const c = prepararPrueba(datos.cotizacion);
            Object.assign(c, {
                numero: anterior.numero,
                fecha: anterior.fecha,
                origen: anterior.origen,
                estado: ESTADOS.includes(datos.cotizacion.estado) ? datos.cotizacion.estado : anterior.estado,
                actualizado: ahora,
            });
            db.lista[i] = c;
            guardarPrueba(db);
            return { ok: true, cotizacion: c };
        }
        case "borrar": {
            exigirClave();
            db.lista.splice(buscar(datos.numero), 1);
            guardarPrueba(db);
            return { ok: true };
        }
        default:
            throw new ErrorApi("Acción no válida.", "ACCION");
    }
}
