/* =========================================================
   Don PEPE Repuestos - CONFIGURACIÓN
   Este es el único archivo que necesitas editar.
   Lo usan la tienda (index.html) y el panel (admin.html).
   ========================================================= */

// Enlace de Google Apps Script que guarda las cotizaciones en Google Sheets.
// Pégalo aquí cuando sigas los pasos de CONFIGURAR-GOOGLE-SHEETS.md
// (termina en /exec). Mientras esté vacío, las cotizaciones NO se guardan.
const URL_COTIZACIONES = "https://script.google.com/macros/s/AKfycbyWlp9rzlbBTBK3i8aepHDTECB6isvNqxd1eZYPB9WEcXF-AXuW6ujvm0NoLGxpWNtxFw/exec";

// Número de WhatsApp del negocio: código de país + número, SIN "+", espacios ni guiones.
// Ejemplo: "18091234567". Si queda vacío, WhatsApp se abre y deja elegir el chat.
const NUMERO_WHATSAPP = "";

// Símbolo de moneda que se muestra delante de los precios.
const MONEDA = "RD$";

// Datos de la tienda que aparecen en la cotización (cámbialos por los reales).
const TIENDA = {
    nombre: "Don PEPE Repuestos",
    rnc: "",                                   // RNC de la tienda; si queda vacío no se muestra
    direccion: "Calle Ejemplo 123, Ciudad",
    telefono: "000 000 000",
    correo: "contacto@ejemplo.com",
};

// Impuesto: ITBIS en República Dominicana. Pon 0 para no desglosarlo.
const ITBIS_PORCENTAJE = 18;
// ¿Los precios de la lista YA incluyen el ITBIS? false = se suma encima.
const PRECIOS_INCLUYEN_ITBIS = false;

// Días que es válida una cotización.
const VALIDEZ_DIAS = 7;

// Lista de productos (precios de EJEMPLO, sin ITBIS).
// categoria debe ser: "frenos", "motor", "filtros" o "suspension".
const PRODUCTOS = [
    { id: "f1", nombre: "Pastillas de freno delanteras", categoria: "frenos", precio: 2500, imagen: "img/frenos.png" },
    { id: "f2", nombre: "Disco de freno ventilado", categoria: "frenos", precio: 3800, imagen: "img/frenos.png" },
    { id: "f3", nombre: "Líquido de frenos DOT 4 (1 L)", categoria: "frenos", precio: 650, imagen: "img/frenos.png" },

    { id: "m1", nombre: "Juego de bujías (4 unidades)", categoria: "motor", precio: 1800, imagen: "img/motor.png" },
    { id: "m2", nombre: "Kit de correa de distribución", categoria: "motor", precio: 6500, imagen: "img/motor.png" },
    { id: "m3", nombre: "Empaque de culata", categoria: "motor", precio: 2900, imagen: "img/motor.png" },

    { id: "t1", nombre: "Filtro de aceite", categoria: "filtros", precio: 450, imagen: "img/filtros.png" },
    { id: "t2", nombre: "Filtro de aire de motor", categoria: "filtros", precio: 900, imagen: "img/filtros.png" },
    { id: "t3", nombre: "Filtro de combustible", categoria: "filtros", precio: 1100, imagen: "img/filtros.png" },
    { id: "t4", nombre: "Filtro de habitáculo", categoria: "filtros", precio: 850, imagen: "img/filtros.png" },

    { id: "s1", nombre: "Amortiguador delantero", categoria: "suspension", precio: 4800, imagen: "img/suspension.png" },
    { id: "s2", nombre: "Rótula de suspensión", categoria: "suspension", precio: 1600, imagen: "img/suspension.png" },
];

const NOMBRES_CATEGORIA = {
    frenos: "Frenos",
    motor: "Motor",
    filtros: "Filtros",
    suspension: "Suspensión",
};

// Marcas que aparecen en el selector de vehículo (puedes agregar o quitar).
const MARCAS = [
    "Toyota", "Honda", "Nissan", "Hyundai", "Kia", "Mazda", "Mitsubishi", "Suzuki",
    "Chevrolet", "Ford", "Jeep", "Dodge", "Ram", "GMC", "Chrysler",
    "Volkswagen", "Subaru", "Isuzu", "Lexus", "Acura", "Infiniti",
    "BMW", "Mercedes-Benz", "Audi", "Volvo", "Land Rover", "Fiat",
];

// Años disponibles en el selector de vehículo.
const ANIO_MINIMO = 1990;
const ANIO_MAXIMO = new Date().getFullYear() + 1;

// API gratuita del gobierno de EE. UU. para marcas y modelos (no necesita clave).
const API_VEHICULOS = "https://vpic.nhtsa.dot.gov/api/vehicles";

// Estados que puede tener una cotización en el panel.
const ESTADOS = ["Nueva", "Contactado", "Vendida", "Descartada"];
