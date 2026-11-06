/* =========================================================
   Don PEPE Repuestos - Tienda: productos, carrito, vehículo y cotización
   Necesita config.js y comun.js cargados antes.
   ========================================================= */

/* ---------- 1. Aviso emergente ---------- */

let temporizadorAviso;
function mostrarAviso(texto) {
    const aviso = $("[data-aviso]");
    aviso.textContent = texto;
    aviso.classList.add("visible");
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove("visible"), 2200);
}

/* ---------- 2. Productos y filtros ---------- */

function pintarProductos(filtro = "todos") {
    const contenedor = $("[data-productos]");
    const lista = filtro === "todos" ? PRODUCTOS : PRODUCTOS.filter((p) => p.categoria === filtro);

    contenedor.innerHTML = lista
        .map(
            (p) => `
        <article class="producto">
            <div class="producto-imagen">
                <img src="${p.imagen}" alt="" loading="lazy" />
                <span class="producto-categoria">${NOMBRES_CATEGORIA[p.categoria]}</span>
            </div>
            <div class="producto-info">
                <h3>${escaparHTML(p.nombre)}</h3>
                <p class="producto-precio">${formatearPrecio(p.precio)}</p>
                <button type="button" class="boton boton-agregar" data-agregar="${p.id}">
                    Agregar al carrito
                </button>
            </div>
        </article>`
        )
        .join("");
}

function aplicarFiltro(filtro) {
    $$("[data-filtro]").forEach((boton) => {
        boton.classList.toggle("activo", boton.dataset.filtro === filtro);
    });
    pintarProductos(filtro);
}

/* ---------- 3. Carrito (se guarda en el navegador) ---------- */

const CLAVE_CARRITO = "donpepe-carrito";
let carrito = cargarCarrito(); // { idProducto: cantidad }

function cargarCarrito() {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || {};
        // Quita productos que ya no existan en la lista
        return Object.fromEntries(
            Object.entries(guardado).filter(([id, cant]) => buscarProducto(id) && cant > 0)
        );
    } catch {
        return {};
    }
}

function guardarCarrito() {
    try {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch {
        /* Si el navegador no deja guardar, el carrito sigue funcionando en esta visita */
    }
}

function buscarProducto(id) {
    return PRODUCTOS.find((p) => p.id === id);
}

function itemsCarrito() {
    return Object.entries(carrito).map(([id, cantidad]) => ({ ...buscarProducto(id), cantidad }));
}

function totalCarrito() {
    return itemsCarrito().reduce((suma, item) => suma + item.precio * item.cantidad, 0);
}

function cambiarCantidad(id, cambio) {
    const nueva = (carrito[id] || 0) + cambio;
    if (nueva <= 0) {
        delete carrito[id];
    } else {
        carrito[id] = nueva;
    }
    guardarCarrito();
    pintarCarrito();
}

function pintarCarrito() {
    const items = itemsCarrito();
    const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);

    // Contador del encabezado
    const contador = $("[data-contador]");
    contador.textContent = unidades;
    contador.classList.toggle("con-productos", unidades > 0);

    // Lista
    $("[data-carrito-lista]").innerHTML = items
        .map(
            (item) => `
        <li class="carrito-item">
            <img src="${item.imagen}" alt="" />
            <div class="carrito-item-info">
                <p class="carrito-item-nombre">${escaparHTML(item.nombre)}</p>
                <p class="carrito-item-precio">${formatearPrecio(item.precio)} c/u</p>
                <div class="cantidad">
                    <button type="button" data-restar="${item.id}" aria-label="Quitar uno de ${escaparHTML(item.nombre)}">−</button>
                    <span>${item.cantidad}</span>
                    <button type="button" data-sumar="${item.id}" aria-label="Agregar uno de ${escaparHTML(item.nombre)}">+</button>
                </div>
            </div>
            <div class="carrito-item-derecha">
                <strong>${formatearPrecio(item.precio * item.cantidad)}</strong>
                <button type="button" class="carrito-quitar" data-quitar="${item.id}">Quitar</button>
            </div>
        </li>`
        )
        .join("");

    const lineaVehiculo = $("[data-carrito-vehiculo]");
    lineaVehiculo.hidden = !vehiculo;
    lineaVehiculo.textContent = vehiculo ? `Para: ${textoVehiculo()}` : "";

    $("[data-carrito-vacio]").hidden = items.length > 0;
    const sumaItbis = ITBIS_PORCENTAJE > 0 && !PRECIOS_INCLUYEN_ITBIS;
    $("[data-carrito-total-etiqueta]").textContent = sumaItbis ? "Subtotal (sin ITBIS)" : "Total estimado";
    $("[data-carrito-total]").textContent = formatearPrecio(totalCarrito());
    $("[data-cotizar]").disabled = items.length === 0;
    $("[data-vaciar]").hidden = items.length === 0;
}

function textoCarrito() {
    const items = itemsCarrito();
    const lineas = items.map(
        (item) =>
            `• ${item.cantidad} x ${item.nombre} (${formatearPrecio(item.precio)} c/u) = ${formatearPrecio(item.precio * item.cantidad)}`
    );
    const totales = { itbisPorcentaje: ITBIS_PORCENTAJE, ...calcularTotalesDe(items) };
    return `${lineas.join("\n")}\n\n${textoTotalesDe(totales)}`;
}

/* ---------- 4. Abrir y cerrar el carrito ---------- */

function abrirCarrito() {
    $("#carrito").classList.add("abierto");
    $("#carrito").setAttribute("aria-hidden", "false");
    $(".carrito-fondo").hidden = false;
    document.body.classList.add("sin-scroll");
    $(".carrito-cerrar").focus();
}

function cerrarCarrito() {
    $("#carrito").classList.remove("abierto");
    $("#carrito").setAttribute("aria-hidden", "true");
    $(".carrito-fondo").hidden = true;
    document.body.classList.remove("sin-scroll");
    $(".carrito-boton").focus();
}

/* ---------- 5. Formulario de contacto ---------- */

function enviarFormulario(evento) {
    evento.preventDefault();
    const formulario = evento.target;
    const datos = new FormData(formulario);
    const nombre = datos.get("nombre").trim();
    const telefono = datos.get("telefono").trim();
    const vehiculoEscrito = datos.get("vehiculo").trim();
    const mensaje = datos.get("mensaje").trim();
    const error = $("[data-formulario-error]");

    if (!nombre || !mensaje) {
        error.textContent = "Por favor escribe tu nombre y tu mensaje.";
        (nombre ? formulario.mensaje : formulario.nombre).focus();
        return;
    }
    error.textContent = "";

    let texto = `Hola ${TIENDA.nombre}, soy ${nombre}.`;
    if (telefono) texto += `\nTeléfono: ${telefono}`;
    const vehiculoTexto = vehiculoEscrito || textoVehiculo();
    if (vehiculoTexto) texto += `\nVehículo: ${vehiculoTexto}`;
    texto += `\n\n${mensaje}`;
    if (datos.get("incluirCarrito") && itemsCarrito().length > 0) {
        texto += `\n\nProductos que me interesan:\n${textoCarrito()}`;
    }

    abrirWhatsApp(texto);
    formulario.reset();
    mostrarAviso("Abriendo WhatsApp…");
}

/* ---------- 6. Selector de vehículo (API NHTSA vPIC) ---------- */

const CLAVE_VEHICULO = "donpepe-vehiculo";
const OPCION_OTRO = "__otro__";
const cacheModelos = new Map(); // evita pedir dos veces lo mismo
let vehiculo = cargarVehiculo(); // { anio, marca, modelo } o null

function cargarVehiculo() {
    try {
        const v = JSON.parse(localStorage.getItem(CLAVE_VEHICULO));
        return v && v.anio && v.marca && v.modelo ? v : null;
    } catch {
        return null;
    }
}

function guardarVehiculo(nuevo) {
    vehiculo = nuevo;
    try {
        if (nuevo) localStorage.setItem(CLAVE_VEHICULO, JSON.stringify(nuevo));
        else localStorage.removeItem(CLAVE_VEHICULO);
    } catch {
        /* sin almacenamiento: funciona solo en esta visita */
    }
    pintarVehiculo();
    pintarCarrito();
}

function textoVehiculo() {
    return vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}` : "";
}

// "TOYOTA" -> "Toyota" (la API a veces devuelve todo en mayúsculas)
function nombreBonito(texto) {
    const conocida = MARCAS.find((m) => m.toLowerCase() === texto.toLowerCase());
    if (conocida) return conocida;
    return texto.toLowerCase().replace(/(^|[\s-])\S/g, (letra) => letra.toUpperCase());
}

function mostrarEstado(texto, tipo = "") {
    const estado = $("[data-vehiculo-estado]");
    estado.textContent = texto;
    estado.dataset.tipo = tipo; // "", "cargando", "error" u "ok"
}

function llenarSelect(select, textoInicial, opciones) {
    select.innerHTML = "";
    select.append(new Option(textoInicial, ""));
    opciones.forEach(([valor, texto]) => select.append(new Option(texto, valor)));
}

async function pedirJSON(url) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return respuesta.json();
}

async function buscarModelos(marca, anio) {
    const clave = `${marca}|${anio}`;
    if (!cacheModelos.has(clave)) {
        const url = `${API_VEHICULOS}/GetModelsForMakeYear/make/${encodeURIComponent(marca)}/modelyear/${anio}?format=json`;
        const datos = await pedirJSON(url);
        const nombres = [...new Set(datos.Results.map((r) => r.Model_Name.trim()))];
        nombres.sort((a, b) => a.localeCompare(b, "es"));
        cacheModelos.set(clave, nombres);
    }
    return cacheModelos.get(clave);
}

async function alCambiarMarcaOAnio() {
    const anio = $("[data-vehiculo-anio]").value;
    const marca = $("[data-vehiculo-marca]").value;
    const selectModelo = $("[data-vehiculo-modelo]");

    $("[data-vehiculo-marca]").disabled = !anio;
    mostrarManual(false);
    llenarSelect(selectModelo, "Modelo", []);
    selectModelo.disabled = true;
    if (!anio || !marca) return;

    mostrarEstado("Buscando modelos…", "cargando");
    try {
        const modelos = await buscarModelos(marca, anio);
        // Si mientras esperábamos el usuario cambió de marca o año, ignoramos esta respuesta
        if ($("[data-vehiculo-anio]").value !== anio || $("[data-vehiculo-marca]").value !== marca) return;

        llenarSelect(selectModelo, "Modelo", [
            ...modelos.map((m) => [m, m]),
            [OPCION_OTRO, "Mi modelo no aparece…"],
        ]);
        selectModelo.disabled = false;
        mostrarEstado(
            modelos.length
                ? `${modelos.length} modelos encontrados.`
                : "No hay modelos registrados para ese año. Elige “Mi modelo no aparece…”.",
            modelos.length ? "" : "error"
        );
        selectModelo.focus();
    } catch {
        // Sin internet o API caída: dejamos escribir el modelo a mano
        llenarSelect(selectModelo, "Modelo", [[OPCION_OTRO, "Escribir a mano…"]]);
        selectModelo.disabled = false;
        selectModelo.value = OPCION_OTRO;
        mostrarManual(true);
        mostrarEstado("No pudimos conectar con la base de datos. Escribe tu modelo a mano.", "error");
    }
}

function mostrarManual(mostrar) {
    $("[data-vehiculo-manual-campo]").hidden = !mostrar;
    if (mostrar) $("[data-vehiculo-manual]").focus();
}

function guardarDesdeFormulario(evento) {
    evento.preventDefault();
    const anio = $("[data-vehiculo-anio]").value;
    const marca = $("[data-vehiculo-marca]").value;
    let modelo = $("[data-vehiculo-modelo]").value;
    if (modelo === OPCION_OTRO) modelo = $("[data-vehiculo-manual]").value.trim();

    if (!anio || !marca || !modelo) {
        mostrarEstado("Completa año, marca y modelo.", "error");
        return;
    }
    guardarVehiculo({ anio, marca, modelo });
    mostrarEstado("");
    mostrarAviso(`🚗 ${textoVehiculo()} guardado`);
}

async function buscarPorVin() {
    const vin = $("[data-vin]").value.trim().toUpperCase();
    // Un VIN tiene 17 caracteres y nunca usa I, O ni Q
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
        mostrarEstado("El VIN debe tener 17 caracteres (letras y números, sin I, O ni Q).", "error");
        return;
    }

    mostrarEstado("Buscando tu vehículo…", "cargando");
    try {
        const datos = await pedirJSON(`${API_VEHICULOS}/DecodeVinValues/${vin}?format=json`);
        const r = datos.Results[0];
        if (!r.Make || !r.Model || !r.ModelYear) {
            mostrarEstado("No encontramos ese VIN. Revisa que esté bien escrito o elige el auto en las listas.", "error");
            return;
        }
        guardarVehiculo({ anio: r.ModelYear, marca: nombreBonito(r.Make), modelo: r.Model });
        $("[data-vin]").value = "";
        mostrarEstado("");
        mostrarAviso(`🚗 ¡Encontrado! ${textoVehiculo()}`);
    } catch {
        mostrarEstado("No pudimos conectar con la base de datos. Inténtalo de nuevo o elige el auto en las listas.", "error");
    }
}

function pintarVehiculo() {
    $("[data-vehiculo-form]").hidden = Boolean(vehiculo);
    $("[data-vehiculo-elegido]").hidden = !vehiculo;
    $("[data-vehiculo-texto]").textContent = textoVehiculo();

    // Rellena el campo "Vehículo" del formulario de contacto si está vacío
    const campo = $("#vehiculo");
    if (vehiculo && !campo.value) campo.value = textoVehiculo();
}

function iniciarVehiculo() {
    const anios = [];
    for (let a = ANIO_MAXIMO; a >= ANIO_MINIMO; a--) anios.push([String(a), String(a)]);
    llenarSelect($("[data-vehiculo-anio]"), "Año", anios);
    llenarSelect($("[data-vehiculo-marca]"), "Marca", MARCAS.map((m) => [m, m]));

    $("[data-vehiculo-anio]").addEventListener("change", alCambiarMarcaOAnio);
    $("[data-vehiculo-marca]").addEventListener("change", alCambiarMarcaOAnio);
    $("[data-vehiculo-modelo]").addEventListener("change", (e) => mostrarManual(e.target.value === OPCION_OTRO));
    $("[data-vehiculo-form]").addEventListener("submit", guardarDesdeFormulario);
    $("[data-vin-buscar]").addEventListener("click", buscarPorVin);
    $("[data-vin]").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            buscarPorVin();
        }
    });
    $("[data-vehiculo-cambiar]").addEventListener("click", () => {
        guardarVehiculo(null);
        $("[data-vehiculo-anio]").focus();
    });

    pintarVehiculo();
}

/* ---------- 7. Cotización (se registra en Google Sheets) ---------- */

const CLAVE_CLIENTE = "donpepe-cliente";
let cotizacionActual = null;

function cargarCliente() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_CLIENTE)) || {};
    } catch {
        return {};
    }
}

function guardarCliente(cliente) {
    try {
        localStorage.setItem(CLAVE_CLIENTE, JSON.stringify(cliente));
    } catch {
        /* sin almacenamiento */
    }
}

// Número provisional, solo si no se pudo registrar en Google Sheets
function numeroLocal(fecha) {
    const dos = (n) => String(n).padStart(2, "0");
    return `COT-L${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}-${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`;
}

function mostrarPasoCotizacion(paso) {
    const esDatos = paso === "datos";
    $("[data-cotizacion-form]").hidden = !esDatos;
    $("[data-cotizacion-vista]").hidden = esDatos;
    $("[data-cotizacion-titulo]").textContent = esDatos ? "Datos para tu cotización" : "Tu cotización";
}

function alCambiarFiscal() {
    const fiscal = $("[data-cot-fiscal]").checked;
    $("[data-cot-rnc-campo]").hidden = !fiscal;
    $("[data-cot-nombre-etiqueta]").textContent = fiscal
        ? "Razón social o nombre (como aparece en el RNC) *"
        : "Nombre o empresa *";
    if (fiscal) $("#cot-rnc").focus();
}

function abrirCotizacion() {
    if (itemsCarrito().length === 0) return;
    const cliente = cargarCliente();
    const form = $("[data-cotizacion-form]");
    form.nombre.value = cliente.nombre || "";
    form.telefono.value = cliente.telefono || "";
    form.fiscal.checked = Boolean(cliente.fiscal);
    form.rnc.value = cliente.rnc || "";
    alCambiarFiscal();
    $("[data-cot-error]").textContent = "";
    mostrarPasoCotizacion("datos");
    $("[data-cotizacion]").showModal();
    form.nombre.focus();
}

function mostrarRegistro(texto, tipo) {
    const aviso = $("[data-cot-registro]");
    aviso.textContent = texto;
    aviso.dataset.tipo = tipo;
    aviso.hidden = !texto;
}

async function generarCotizacion(evento) {
    evento.preventDefault();
    const form = evento.target;
    const error = $("[data-cot-error]");
    const cliente = {
        nombre: form.nombre.value.trim(),
        telefono: form.telefono.value.trim(),
        fiscal: form.fiscal.checked,
        rnc: form.rnc.value.trim(),
    };

    if (!cliente.nombre) {
        error.textContent = cliente.fiscal ? "Escribe la razón social o el nombre." : "Escribe tu nombre o el de tu empresa.";
        form.nombre.focus();
        return;
    }
    if (cliente.fiscal && !validarRnc(cliente.rnc)) {
        error.textContent = "El RNC debe tener 9 dígitos o la cédula 11 dígitos.";
        form.rnc.focus();
        return;
    }
    error.textContent = "";
    cliente.rnc = cliente.fiscal ? formatearRnc(cliente.rnc) : "";
    guardarCliente(cliente);

    const borrador = {
        cliente,
        vehiculo: textoVehiculo(),
        items: itemsCarrito().map(({ id, nombre, cantidad, precio }) => ({ id, nombre, cantidad, precio })),
        itbisPorcentaje: ITBIS_PORCENTAJE,
        incluyeItbis: PRECIOS_INCLUYEN_ITBIS,
    };

    const boton = $(".cotizacion-generar");
    boton.disabled = true;
    boton.textContent = "Generando…";

    try {
        // El servidor le pone el número correlativo y calcula los totales
        const respuesta = await llamarApi("crear", { cotizacion: borrador });
        cotizacionActual = respuesta.cotizacion;
        if (MODO_PRUEBA) {
            mostrarRegistro("Modo de prueba: guardada solo en este navegador (falta conectar Google Sheets).", "aviso");
        } else {
            mostrarRegistro(`✔ Cotización registrada. ${TIENDA.nombre} ya puede verla.`, "ok");
        }
    } catch {
        // Sin conexión con el servidor: se arma aquí y se puede enviar igual por WhatsApp
        const fecha = new Date();
        cotizacionActual = {
            ...borrador,
            numero: numeroLocal(fecha),
            fecha: fecha.toISOString(),
            ...calcularTotalesDe(borrador.items),
        };
        mostrarRegistro("No pudimos registrar la cotización en el sistema. Envíala por WhatsApp para que la recibamos.", "aviso");
    } finally {
        boton.disabled = false;
        boton.textContent = "Generar cotización";
    }

    $("[data-documento]").innerHTML = documentoHTML(cotizacionActual);
    mostrarPasoCotizacion("vista");
    $("[data-cot-enviar]").focus();
}

function iniciarCotizacion() {
    const dialogo = $("[data-cotizacion]");
    $("[data-cotizacion-form]").addEventListener("submit", generarCotizacion);
    $("[data-cot-fiscal]").addEventListener("change", alCambiarFiscal);
    $("[data-cerrar-cotizacion]").addEventListener("click", () => dialogo.close());
    $("[data-cot-editar]").addEventListener("click", () => {
        mostrarPasoCotizacion("datos");
        $("#cot-nombre").focus();
    });
    $("[data-cot-imprimir]").addEventListener("click", () => window.print());
    $("[data-cot-enviar]").addEventListener("click", () => {
        abrirWhatsApp(`${textoCotizacion(cotizacionActual)}\n\n¿Me confirman disponibilidad y precio final? Gracias.`);
        mostrarAviso("Abriendo WhatsApp…");
    });
    // Cerrar al hacer clic fuera de la ventana
    dialogo.addEventListener("click", (e) => {
        if (e.target === dialogo) dialogo.close();
    });
}

/* ---------- 8. Conectar todo ---------- */

document.addEventListener("DOMContentLoaded", () => {
    pintarProductos();
    pintarCarrito();
    iniciarVehiculo();
    iniciarCotizacion();

    // Botón flotante de WhatsApp
    $("[data-whatsapp-flotante]").href = enlaceWhatsApp(`Hola ${TIENDA.nombre}, quisiera hacer una consulta.`);

    // Un solo "escuchador" para todos los clics de la página
    document.addEventListener("click", (e) => {
        const el = e.target.closest(
            "[data-agregar], [data-sumar], [data-restar], [data-quitar], [data-filtro], [data-ir-categoria], .carrito-boton, [data-cerrar-carrito], [data-cotizar], [data-vaciar]"
        );
        if (!el) return;

        if (el.dataset.agregar) {
            cambiarCantidad(el.dataset.agregar, 1);
            mostrarAviso(`✔ ${buscarProducto(el.dataset.agregar).nombre} agregado`);
            const contador = $("[data-contador]");
            contador.classList.remove("rebote");
            void contador.offsetWidth; // reinicia la animación
            contador.classList.add("rebote");
        } else if (el.dataset.sumar) {
            cambiarCantidad(el.dataset.sumar, 1);
        } else if (el.dataset.restar) {
            cambiarCantidad(el.dataset.restar, -1);
        } else if (el.dataset.quitar) {
            cambiarCantidad(el.dataset.quitar, -Infinity);
        } else if (el.dataset.filtro) {
            aplicarFiltro(el.dataset.filtro);
        } else if (el.dataset.irCategoria) {
            aplicarFiltro(el.dataset.irCategoria); // el enlace ya baja hasta #productos
        } else if (el.matches(".carrito-boton")) {
            abrirCarrito();
        } else if (el.matches("[data-cerrar-carrito]")) {
            cerrarCarrito();
        } else if (el.matches("[data-cotizar]")) {
            abrirCotizacion();
        } else if (el.matches("[data-vaciar]")) {
            carrito = {};
            guardarCarrito();
            pintarCarrito();
        }
    });

    // Cerrar el carrito con la tecla Escape
    document.addEventListener("keydown", (e) => {
        if ($("[data-cotizacion]").open) return; // Escape cierra primero la ventana de cotización
        if (e.key === "Escape" && $("#carrito").classList.contains("abierto")) cerrarCarrito();
    });

    $("[data-formulario]").addEventListener("submit", enviarFormulario);
});
