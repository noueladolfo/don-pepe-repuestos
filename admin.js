/* =========================================================
   Don PEPE Repuestos - Panel de cotizaciones del negocio
   Necesita config.js, comun.js y html2pdf (para el PDF).
   ========================================================= */

const CLAVE_SESION = "donpepe-panel-clave";

let clave = sessionStorage.getItem(CLAVE_SESION) || "";
let cotizaciones = [];
let detalle = null;   // cotización abierta en el detalle
let edicion = null;   // { numero | null, items: [...], itbisPorcentaje, incluyeItbis }

/* ---------- Utilidades del panel ---------- */

let temporizadorAviso;
function mostrarAviso(texto) {
    const aviso = $("[data-aviso]");
    aviso.textContent = texto;
    aviso.classList.add("visible");
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove("visible"), 2600);
}

function estadoPanel(texto, tipo = "") {
    const p = $("[data-panel-estado]");
    p.textContent = texto;
    p.dataset.tipo = tipo;
}

function claseEstado(estado) {
    return "estado-" + String(estado).toLowerCase();
}

function opcionesEstado(select, actual) {
    select.innerHTML = ESTADOS.map(
        (e) => `<option value="${e}" ${e === actual ? "selected" : ""}>${e}</option>`
    ).join("");
}

// Si el servidor dice que la clave ya no sirve, volvemos a la entrada
function manejarError(err, contexto) {
    if (err.codigo === "CLAVE") {
        salir("La clave ya no es válida. Vuelve a entrar.");
        return;
    }
    mostrarAviso(`${contexto}: ${err.message}`);
    estadoPanel(`${contexto}: ${err.message}`, "error");
}

/* ---------- Entrada y salida ---------- */

async function entrar(evento) {
    evento.preventDefault();
    const input = $("#clave");
    const error = $("[data-login-error]");
    const boton = $(".login-boton");
    input.value = input.value.trim(); // al copiar la clave a veces se cuela un espacio
    if (!input.value) {
        error.textContent = "Escribe la clave.";
        input.focus();
        return;
    }
    boton.disabled = true;
    boton.textContent = "Entrando…";
    error.textContent = "";
    try {
        const r = await llamarApi("listar", { clave: input.value });
        clave = input.value;
        sessionStorage.setItem(CLAVE_SESION, clave);
        cotizaciones = r.cotizaciones;
        input.value = "";
        mostrarPanel();
    } catch (err) {
        error.textContent = err.message;
        input.select();
    } finally {
        boton.disabled = false;
        boton.textContent = "Entrar";
    }
}

function salir(mensaje = "") {
    clave = "";
    cotizaciones = [];
    sessionStorage.removeItem(CLAVE_SESION);
    $("[data-detalle]").close();
    $("[data-editor]").close();
    $("[data-panel]").hidden = true;
    $("[data-salir]").hidden = true;
    $("[data-login]").hidden = false;
    $("[data-login-error]").textContent = mensaje;
    $("#clave").focus();
}

function mostrarPanel() {
    $("[data-login]").hidden = true;
    $("[data-panel]").hidden = false;
    $("[data-salir]").hidden = false;
    pintarLista();
}

async function recargar() {
    estadoPanel("Cargando cotizaciones…", "cargando");
    try {
        const r = await llamarApi("listar", { clave });
        cotizaciones = r.cotizaciones;
        estadoPanel("");
        pintarLista();
        return true;
    } catch (err) {
        manejarError(err, "No se pudo cargar");
        return false;
    }
}

/* ---------- Lista y resumen ---------- */

function coincide(c, texto) {
    if (!texto) return true;
    const t = texto.toLowerCase();
    const digitos = soloDigitos(texto);
    const campos = [c.numero, c.cliente.nombre, c.cliente.telefono, c.cliente.rnc, c.vehiculo]
        .join(" ")
        .toLowerCase();
    if (campos.includes(t)) return true;
    // Permite buscar el RNC o el teléfono con o sin guiones
    return digitos.length >= 3 && (soloDigitos(c.cliente.rnc).includes(digitos) || soloDigitos(c.cliente.telefono).includes(digitos));
}

function pintarResumen() {
    ESTADOS.forEach((estado) => {
        const celda = $(`[data-resumen="${estado}"]`);
        if (celda) celda.textContent = cotizaciones.filter((c) => c.estado === estado).length;
    });
    const vendido = cotizaciones.filter((c) => c.estado === "Vendida").reduce((s, c) => s + Number(c.total), 0);
    $("[data-resumen-monto]").textContent = formatearPrecio(redondear(vendido));
}

function pintarLista() {
    pintarResumen();
    const texto = $("[data-buscar]").value.trim();
    const estado = $("[data-filtro-estado]").value;
    const visibles = cotizaciones.filter((c) => (!estado || c.estado === estado) && coincide(c, texto));

    $("[data-lista]").innerHTML = visibles
        .map(
            (c) => `
        <tr data-numero="${escaparHTML(c.numero)}">
            <td data-titulo="Número"><button type="button" class="enlace-numero" data-ver="${escaparHTML(c.numero)}">${escaparHTML(c.numero)}</button>
                ${c.origen === "Tienda" ? '<span class="etiqueta-origen">Tienda</span>' : ""}</td>
            <td data-titulo="Fecha">${formatearFechaHora(c.fecha)}</td>
            <td data-titulo="Cliente">
                <strong>${escaparHTML(c.cliente.nombre)}</strong>
                <small>${c.cliente.fiscal ? `RNC ${escaparHTML(c.cliente.rnc)}` : "Consumidor final"}${c.cliente.telefono ? ` · ${escaparHTML(c.cliente.telefono)}` : ""}</small>
            </td>
            <td data-titulo="Vehículo">${escaparHTML(c.vehiculo) || '<span class="tenue">—</span>'}</td>
            <td data-titulo="Total" class="num"><strong>${formatearMonto(c.total)}</strong></td>
            <td data-titulo="Estado">
                <select class="selector-estado ${claseEstado(c.estado)}" data-cambiar-estado="${escaparHTML(c.numero)}" aria-label="Estado de ${escaparHTML(c.numero)}">
                    ${ESTADOS.map((e) => `<option ${e === c.estado ? "selected" : ""}>${e}</option>`).join("")}
                </select>
            </td>
            <td><button type="button" class="boton boton-claro boton-ver" data-ver="${escaparHTML(c.numero)}">Ver</button></td>
        </tr>`
        )
        .join("");

    $("[data-vacio]").hidden = visibles.length > 0;
    $("[data-vacio]").textContent = cotizaciones.length
        ? "No hay cotizaciones que coincidan con la búsqueda."
        : "Todavía no hay cotizaciones. Cuando un cliente genere una en la tienda, aparecerá aquí.";
}

function buscarCotizacion(numero) {
    return cotizaciones.find((c) => c.numero === numero);
}

function reemplazarEnLista(c) {
    const i = cotizaciones.findIndex((x) => x.numero === c.numero);
    if (i >= 0) cotizaciones[i] = c;
    else cotizaciones.unshift(c);
}

/* ---------- Guardar en el servidor ---------- */

async function guardarCambios(numero, datos) {
    const r = await llamarApi("actualizar", { clave, numero, cotizacion: datos });
    reemplazarEnLista(r.cotizacion);
    return r.cotizacion;
}

async function cambiarEstado(numero, estado) {
    const c = buscarCotizacion(numero);
    if (!c || c.estado === estado) return;
    try {
        const nueva = await guardarCambios(numero, { ...c, estado });
        mostrarAviso(`${numero}: ${estado}`);
        pintarLista();
        if (detalle?.numero === numero) abrirDetalle(nueva);
    } catch (err) {
        manejarError(err, "No se pudo cambiar el estado");
        pintarLista(); // vuelve a mostrar el estado anterior
    }
}

/* ---------- Detalle ---------- */

function abrirDetalle(c) {
    detalle = c;
    $("[data-detalle-titulo]").textContent = `Cotización ${c.numero}`;
    opcionesEstado($("[data-detalle-estado]"), c.estado);
    $("[data-detalle-estado]").className = claseEstado(c.estado);
    $("[data-detalle-meta]").textContent =
        `Origen: ${c.origen === "Tienda" ? "creada en el panel" : "página web"} · Última modificación: ${formatearFechaHora(c.actualizado || c.fecha)}`;
    const notas = $("[data-detalle-notas]");
    notas.hidden = !c.notas;
    notas.textContent = c.notas ? `📝 ${c.notas}` : "";
    $("[data-detalle-doc]").innerHTML = documentoHTML(c);

    const whatsapp = $('[data-accion="whatsapp"]');
    whatsapp.disabled = !c.cliente.telefono;
    whatsapp.title = c.cliente.telefono ? "" : "El cliente no dejó teléfono";

    const dialogo = $("[data-detalle]");
    if (!dialogo.open) dialogo.showModal();
}

function whatsappCliente() {
    const c = detalle;
    const texto = `Hola ${c.cliente.nombre}, le escribimos de ${TIENDA.nombre} sobre su cotización ${c.numero}.\n\n${textoCotizacion(c)}`;
    abrirWhatsApp(texto, telefonoWhatsApp(c.cliente.telefono));
}

async function descargarPDF() {
    if (typeof html2pdf === "undefined") {
        mostrarAviso("No se cargó la librería de PDF (js/html2pdf.bundle.min.js).");
        return;
    }
    const boton = $('[data-accion="pdf"]');
    boton.disabled = true;
    boton.textContent = "Generando…";

    // Se genera desde una copia de ancho fijo, para que el PDF salga igual en celular y en computadora
    const contenedor = document.createElement("div");
    contenedor.className = "pdf-contenedor";
    const hoja = document.createElement("div");
    hoja.className = "documento documento-pdf";
    hoja.innerHTML = documentoHTML(detalle);
    contenedor.append(hoja);
    document.body.append(contenedor);

    try {
        await html2pdf()
            .set({
                margin: [10, 10, 10, 10],
                filename: `${detalle.numero}.pdf`,
                image: { type: "jpeg", quality: 0.96 },
                html2canvas: { scale: 2, backgroundColor: "#ffffff" },
                jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
            })
            .from(hoja)
            .save();
        mostrarAviso(`PDF ${detalle.numero} descargado`);
    } catch {
        mostrarAviso("No se pudo generar el PDF. Prueba con Imprimir → Guardar como PDF.");
    } finally {
        contenedor.remove();
        boton.disabled = false;
        boton.textContent = "Descargar PDF";
    }
}

async function borrarDetalle() {
    const c = detalle;
    const seguro = confirm(`¿Borrar la cotización ${c.numero} de ${c.cliente.nombre}?\n\nEsta acción no se puede deshacer.`);
    if (!seguro) return;
    try {
        await llamarApi("borrar", { clave, numero: c.numero });
        cotizaciones = cotizaciones.filter((x) => x.numero !== c.numero);
        $("[data-detalle]").close();
        pintarLista();
        mostrarAviso(`Cotización ${c.numero} borrada`);
    } catch (err) {
        manejarError(err, "No se pudo borrar");
    }
}

/* ---------- Editor (crear y editar) ---------- */

function abrirEditor(c = null) {
    const form = $("[data-editor-form]");
    form.reset();
    $("[data-ed-error]").textContent = "";

    edicion = {
        numero: c?.numero || null,
        items: c ? c.items.map((i) => ({ ...i })) : [],
        itbisPorcentaje: c ? c.itbisPorcentaje : ITBIS_PORCENTAJE,
        incluyeItbis: c ? c.incluyeItbis : PRECIOS_INCLUYEN_ITBIS,
    };

    $("[data-editor-titulo]").textContent = c ? `Editar ${c.numero}` : "Nueva cotización";
    form.nombre.value = c?.cliente.nombre || "";
    form.telefono.value = c?.cliente.telefono || "";
    form.fiscal.checked = Boolean(c?.cliente.fiscal);
    form.rnc.value = c?.cliente.rnc || "";
    form.vehiculo.value = c?.vehiculo || "";
    form.notas.value = c?.notas || "";
    opcionesEstado($("[data-ed-estado]"), c?.estado || "Nueva");
    alCambiarFiscalEditor();
    pintarItemsEditor();

    if ($("[data-detalle]").open) $("[data-detalle]").close();
    $("[data-editor]").showModal();
    form.nombre.focus();
}

function alCambiarFiscalEditor() {
    $("[data-ed-rnc-campo]").hidden = !$("[data-ed-fiscal]").checked;
}

function pintarItemsEditor() {
    $("[data-ed-items]").innerHTML = edicion.items
        .map(
            (item, i) => `
        <tr>
            <td data-titulo="Descripción"><input type="text" value="${escaparHTML(item.nombre)}" data-item="${i}" data-campo="nombre" maxlength="120" aria-label="Descripción" /></td>
            <td data-titulo="Cant." class="num"><input type="number" min="1" max="999" step="1" value="${item.cantidad}" data-item="${i}" data-campo="cantidad" aria-label="Cantidad" /></td>
            <td data-titulo="Precio" class="num"><input type="number" min="0" step="0.01" value="${item.precio}" data-item="${i}" data-campo="precio" aria-label="Precio unitario" /></td>
            <td data-titulo="Importe" class="num" data-importe="${i}">${formatearMonto(item.precio * item.cantidad)}</td>
            <td><button type="button" class="quitar-item" data-quitar-item="${i}" aria-label="Quitar ${escaparHTML(item.nombre)}">×</button></td>
        </tr>`
        )
        .join("");
    $("[data-ed-sin-items]").hidden = edicion.items.length > 0;
    pintarTotalesEditor();
}

function pintarTotalesEditor() {
    const validos = edicion.items.filter((i) => Number(i.cantidad) > 0 && Number(i.precio) >= 0);
    const t = calcularTotalesDe(validos, edicion.itbisPorcentaje, edicion.incluyeItbis);
    const conItbis = Number(edicion.itbisPorcentaje);
    $("[data-ed-totales]").innerHTML = `
        ${conItbis ? `<div><span>Subtotal</span><span>${formatearMonto(t.subtotal)}</span></div>
        <div><span>ITBIS (${edicion.itbisPorcentaje}%)</span><span>${formatearMonto(t.itbis)}</span></div>` : ""}
        <div class="doc-total"><span>Total</span><span>${formatearMonto(t.total)}</span></div>`;
}

function alEditarItem(e) {
    const input = e.target.closest("[data-item]");
    if (!input) return;
    const i = Number(input.dataset.item);
    const campo = input.dataset.campo;
    edicion.items[i][campo] = campo === "nombre" ? input.value : Number(input.value);
    const item = edicion.items[i];
    $(`[data-importe="${i}"]`).textContent = formatearMonto((Number(item.precio) || 0) * (Number(item.cantidad) || 0));
    pintarTotalesEditor();
}

function agregarItem() {
    const elegido = $("[data-ed-producto]").value;
    if (elegido === "__libre__") {
        edicion.items.push({ id: "", nombre: "", cantidad: 1, precio: 0 });
        pintarItemsEditor();
        $(`[data-item="${edicion.items.length - 1}"][data-campo="nombre"]`).focus();
        return;
    }
    const producto = PRODUCTOS.find((p) => p.id === elegido);
    if (!producto) return;
    const existente = edicion.items.find((i) => i.id === producto.id);
    if (existente) existente.cantidad = Number(existente.cantidad) + 1;
    else edicion.items.push({ id: producto.id, nombre: producto.nombre, cantidad: 1, precio: producto.precio });
    pintarItemsEditor();
}

async function guardarEditor(evento) {
    evento.preventDefault();
    const form = evento.target;
    const error = $("[data-ed-error]");
    const fiscal = form.fiscal.checked;

    const datos = {
        cliente: {
            nombre: form.nombre.value.trim(),
            telefono: form.telefono.value.trim(),
            fiscal,
            rnc: fiscal ? form.rnc.value.trim() : "",
        },
        vehiculo: form.vehiculo.value.trim(),
        estado: form.estado.value,
        notas: form.notas.value.trim(),
        items: edicion.items.map((i) => ({ ...i, nombre: String(i.nombre).trim() })),
        itbisPorcentaje: edicion.itbisPorcentaje,
        incluyeItbis: edicion.incluyeItbis,
    };

    // Validaciones antes de enviar
    let problema = "";
    if (!datos.cliente.nombre) problema = "Falta el nombre del cliente.";
    else if (fiscal && !validarRnc(datos.cliente.rnc)) problema = "El RNC debe tener 9 dígitos o la cédula 11.";
    else if (datos.items.length === 0) problema = "Agrega al menos un producto.";
    else if (datos.items.some((i) => !i.nombre)) problema = "Hay un producto sin descripción.";
    else if (datos.items.some((i) => !(Number.isInteger(i.cantidad) && i.cantidad >= 1 && i.cantidad <= 999)))
        problema = "Las cantidades deben ser números enteros entre 1 y 999.";
    else if (datos.items.some((i) => !(i.precio >= 0))) problema = "Hay un precio inválido.";
    if (problema) {
        error.textContent = problema;
        return;
    }
    error.textContent = "";

    const boton = $("[data-ed-guardar]");
    boton.disabled = true;
    boton.textContent = "Guardando…";
    try {
        let guardada;
        if (edicion.numero) {
            guardada = await guardarCambios(edicion.numero, datos);
        } else {
            const r = await llamarApi("crearAdmin", { clave, cotizacion: datos });
            guardada = r.cotizacion;
            // El servidor siempre crea en "Nueva"; si se eligió otro estado, se ajusta enseguida
            if (datos.estado !== "Nueva") guardada = await guardarCambios(guardada.numero, { ...guardada, estado: datos.estado });
            reemplazarEnLista(guardada);
        }
        $("[data-editor]").close();
        pintarLista();
        mostrarAviso(`Cotización ${guardada.numero} guardada`);
        abrirDetalle(guardada);
    } catch (err) {
        if (err.codigo === "CLAVE") manejarError(err, "");
        else error.textContent = err.message;
    } finally {
        boton.disabled = false;
        boton.textContent = "Guardar";
    }
}

/* ---------- Conectar todo ---------- */

document.addEventListener("DOMContentLoaded", async () => {
    $("[data-banda-prueba]").hidden = !MODO_PRUEBA;

    // Opciones fijas
    $("[data-filtro-estado]").insertAdjacentHTML("beforeend", ESTADOS.map((e) => `<option>${e}</option>`).join(""));
    $("[data-ed-producto]").innerHTML =
        `<option value="">Elegir producto del catálogo…</option>` +
        PRODUCTOS.map((p) => `<option value="${p.id}">${escaparHTML(p.nombre)} — ${formatearPrecio(p.precio)}</option>`).join("") +
        `<option value="__libre__">✎ Otro producto (escribirlo)</option>`;

    // Entrada / salida
    $("[data-login-form]").addEventListener("submit", entrar);
    $("[data-salir]").addEventListener("click", () => salir());

    // Lista
    $("[data-buscar]").addEventListener("input", pintarLista);
    $("[data-filtro-estado]").addEventListener("change", pintarLista);
    $("[data-recargar]").addEventListener("click", async () => {
        if (await recargar()) mostrarAviso("Lista actualizada");
    });
    $("[data-nueva]").addEventListener("click", () => abrirEditor());
    $("[data-lista]").addEventListener("click", (e) => {
        const ver = e.target.closest("[data-ver]");
        if (ver) abrirDetalle(buscarCotizacion(ver.dataset.ver));
    });
    $("[data-lista]").addEventListener("change", (e) => {
        const select = e.target.closest("[data-cambiar-estado]");
        if (select) cambiarEstado(select.dataset.cambiarEstado, select.value);
    });
    $$(".resumen-tarjeta[data-estado]").forEach((tarjeta) =>
        tarjeta.addEventListener("click", () => {
            const filtro = $("[data-filtro-estado]");
            filtro.value = filtro.value === tarjeta.dataset.estado ? "" : tarjeta.dataset.estado;
            pintarLista();
        })
    );

    // Detalle
    $("[data-detalle-estado]").addEventListener("change", (e) => cambiarEstado(detalle.numero, e.target.value));
    $("[data-detalle]").addEventListener("click", (e) => {
        const accion = e.target.closest("[data-accion]")?.dataset.accion;
        if (accion === "whatsapp") whatsappCliente();
        else if (accion === "pdf") descargarPDF();
        else if (accion === "imprimir") window.print();
        else if (accion === "editar") abrirEditor(detalle);
        else if (accion === "borrar") borrarDetalle();
    });

    // Editor
    $("[data-editor-form]").addEventListener("submit", guardarEditor);
    $("[data-ed-fiscal]").addEventListener("change", alCambiarFiscalEditor);
    $("[data-ed-items]").addEventListener("input", alEditarItem);
    $("[data-ed-items]").addEventListener("click", (e) => {
        const quitar = e.target.closest("[data-quitar-item]");
        if (!quitar) return;
        edicion.items.splice(Number(quitar.dataset.quitarItem), 1);
        pintarItemsEditor();
    });
    $("[data-ed-agregar]").addEventListener("click", agregarItem);

    // Cerrar ventanas (botón × y "Cancelar")
    $$("dialog [data-cerrar]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

    // Si ya había entrado en esta pestaña, se reconecta sola
    if (clave) {
        if (await recargar()) mostrarPanel();
    } else {
        $("#clave").focus();
    }
});
