/* @ds-bundle: {"format":3,"namespace":"BorealDesignSystem_cdc95d","components":[],"sourceHashes":{"ui_kits/landing/app.jsx":"e75113a753fa","ui_kits/landing/primitives.jsx":"a0f95d31deeb","ui_kits/landing/sections-main.jsx":"a58b297f1e13","ui_kits/landing/sections-top.jsx":"f8abd58a9ccf"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.BorealDesignSystem_cdc95d = window.BorealDesignSystem_cdc95d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/landing/app.jsx
try { (() => {
// Boreal — app shell + booking modal
function BookingModal({
  open,
  onClose
}) {
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!open) setSent(false);
  }, [open]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-bd",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "glass modal",
    style: {
      position: "relative"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x"
  })), sent ? /*#__PURE__*/React.createElement("div", {
    className: "modal-ok"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check"
  })), /*#__PURE__*/React.createElement("h3", null, "Plaza reservada"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Te hemos enviado el itinerario y el listado de equipo. Nos vemos sobre el hielo."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: onClose
  }, "Cerrar")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Eyebrow, null, "RESERVA \xB7 EXPEDICI\xD3N 01"), /*#__PURE__*/React.createElement("h3", {
    style: {
      marginTop: 12
    }
  }, "Reserva tu expedici\xF3n"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Plazas limitadas a grupos de ocho. Sin pago hasta confirmar disponibilidad."), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    placeholder: "Nombre completo"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    placeholder: "tu@correo.com"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    placeholder: "Fechas preferidas \xB7 DIC\u2013MAR"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: "snowflake",
    onClick: () => setSent(true)
  }, "Confirmar solicitud"))));
}
function App() {
  const [booking, setBooking] = useState(false);
  const openBook = () => setBooking(true);
  // Re-render Lucide icons after every paint
  useEffect(() => {
    if (window.lucide) lucide.createIcons();
  });
  // Reveal all content on mount (entrance animation plays for in-view items;
  // off-screen items are simply already visible when scrolled to).
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
    els.forEach((el, i) => setTimeout(() => el.classList.add("in"), 60 + i * 70));
  }, []);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "grain"
  }), /*#__PURE__*/React.createElement(Nav, {
    onBook: openBook
  }), /*#__PURE__*/React.createElement(Hero, {
    onBook: openBook
  }), /*#__PURE__*/React.createElement(StatBar, null), /*#__PURE__*/React.createElement(Tours, {
    onBook: openBook
  }), /*#__PURE__*/React.createElement(Itinerary, null), /*#__PURE__*/React.createElement(Testimonials, null), /*#__PURE__*/React.createElement(Booking, {
    onBook: openBook
  }), /*#__PURE__*/React.createElement(Footer, null), /*#__PURE__*/React.createElement(BookingModal, {
    open: booking,
    onClose: () => setBooking(false)
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/primitives.jsx
try { (() => {
// Boreal primitives — shared across the kit. Exported to window for cross-file use.
const {
  useState,
  useEffect,
  useRef
} = React;

// Lucide icon (renders <i data-lucide>; App re-runs lucide.createIcons() each render)
function Icon({
  name,
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("i", {
    "data-lucide": name,
    className: className,
    style: style
  });
}
function Eyebrow({
  children,
  line = true
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, line && /*#__PURE__*/React.createElement("span", {
    className: "ln"
  }), children);
}
function Button({
  variant = "primary",
  size,
  icon,
  iconRight,
  children,
  onClick
}) {
  const cls = `btn btn-${variant}${size === "lg" ? " btn-lg" : ""}`;
  return /*#__PURE__*/React.createElement("button", {
    className: cls,
    onClick: onClick
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon
  }), children, iconRight && /*#__PURE__*/React.createElement(Icon, {
    name: iconRight
  }));
}
function Chip({
  active,
  data,
  icon,
  children,
  onClick
}) {
  const cls = `chip${active ? " active" : ""}${data ? " chip-data" : ""}`;
  return /*#__PURE__*/React.createElement("span", {
    className: cls,
    onClick: onClick
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon
  }), children);
}

// Reveal-on-scroll wrapper. Visual trigger ('in' class) is driven centrally
// from App's effect for reliability across the separate Babel scripts.
function Reveal({
  children,
  className = "",
  as = "div"
}) {
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, {
    className: `reveal ${className}`
  }, children);
}
Object.assign(window, {
  Icon,
  Eyebrow,
  Button,
  Chip,
  Reveal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/primitives.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/sections-main.jsx
try { (() => {
// Boreal — content sections
const TOURS = [{
  id: 1,
  cat: "RUTA BAIKAL",
  name: "Travesía sobre hielo",
  badge: "EXPEDICIÓN 01",
  desc: "Camina y patina sobre la superficie helada del lago más profundo del planeta.",
  days: 6,
  temp: "−24°C",
  diff: "3/5",
  price: "1.840",
  grad: "var(--grad-glacier)",
  feat: true,
  filter: "lagos"
}, {
  id: 2,
  cat: "CUEVAS DE HIELO",
  name: "Bajo el lago",
  badge: "EXPEDICIÓN 02",
  desc: "Grutas de hielo turquesa formadas por el viento y el agua bajo la orilla.",
  days: 4,
  temp: "−18°C",
  diff: "2/5",
  price: "1.120",
  grad: "var(--grad-night)",
  filter: "cuevas"
}, {
  id: 3,
  cat: "CORDILLERA SAYÁN",
  name: "Cumbres nevadas",
  badge: "EXPEDICIÓN 03",
  desc: "Ascenso con raquetas a los miradores helados sobre el valle congelado.",
  days: 8,
  temp: "−29°C",
  diff: "4/5",
  price: "2.260",
  grad: "linear-gradient(135deg,#16293B,#2C6791)",
  filter: "montana"
}, {
  id: 4,
  cat: "ALDEA OLKHÓN",
  name: "Noche boreal",
  badge: "EXPEDICIÓN 04",
  desc: "Auroras sobre la isla sagrada, trineo de perros y baño de hielo.",
  days: 5,
  temp: "−21°C",
  diff: "2/5",
  price: "1.480",
  grad: "linear-gradient(135deg,#0E1B2A,#1F4E70)",
  filter: "lagos"
}, {
  id: 5,
  cat: "RÍO LENA",
  name: "Pilares de piedra",
  badge: "EXPEDICIÓN 05",
  desc: "Travesía en moto de nieve entre los pilares helados del Lena.",
  days: 7,
  temp: "−27°C",
  diff: "4/5",
  price: "2.040",
  grad: "linear-gradient(135deg,#122335,#244660)",
  filter: "montana"
}, {
  id: 6,
  cat: "TERMAS DE GORYACHINSK",
  name: "Vapor y escarcha",
  badge: "EXPEDICIÓN 06",
  desc: "Aguas termales humeantes rodeadas de bosque nevado y silencio.",
  days: 3,
  temp: "−15°C",
  diff: "1/5",
  price: "880",
  grad: "linear-gradient(135deg,#1A3047,#3C82B4)",
  filter: "cuevas"
}];
const FILTERS = [{
  id: "todas",
  label: "Todas"
}, {
  id: "lagos",
  label: "Lagos helados",
  icon: "waves"
}, {
  id: "cuevas",
  label: "Cuevas de hielo",
  icon: "gem"
}, {
  id: "montana",
  label: "Montaña",
  icon: "mountain-snow"
}];
const ITIN = [{
  d: "01",
  t: "Llegada a Irkutsk",
  p: "Recepción, equipamiento térmico y briefing con los guías locales. Primera noche en cabaña de madera junto al bosque.",
  tags: ["Equipo incluido", "−12°C"]
}, {
  d: "02",
  t: "Primer hielo",
  p: "Salida al lago. Caminata sobre hielo transparente y prueba de patines. El Baikal cruje bajo tus pies como un instrumento vivo.",
  tags: ["8 km", "Guía 1:4"]
}, {
  d: "03",
  t: "Cuevas turquesa",
  p: "Exploración de grutas de hielo en la orilla este, esculpidas por el viento durante el invierno.",
  tags: ["Cascos", "Linternas"]
}, {
  d: "04",
  t: "Travesía mayor",
  p: "Jornada larga sobre la superficie helada hacia la isla de Olkhón, con parada para comer sobre el lago.",
  tags: ["22 km", "−24°C"]
}];
function StatBar() {
  return /*#__PURE__*/React.createElement("section", {
    className: "section",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement(Reveal, {
    className: "glass statbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "route"
  }), " Rutas activas"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "12")), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "footprints"
  }), " Viajeros"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "2.4k", /*#__PURE__*/React.createElement("b", null, "+"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "thermometer-snowflake"
  }), " M\xEDnima"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "\u221231", /*#__PURE__*/React.createElement("b", null, "\xB0"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star"
  }), " Valoraci\xF3n"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "4,9")))));
}
function TourCard({
  t,
  onBook
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `glass tour${t.feat ? " feat" : ""}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "tour-photo",
    style: {
      background: t.grad
    },
    onClick: onBook
  }, /*#__PURE__*/React.createElement("div", {
    className: "scrim"
  }), /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, t.badge), /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, /*#__PURE__*/React.createElement("b", null, "\u20AC"), t.price)), /*#__PURE__*/React.createElement("div", {
    className: "tour-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eye"
  }, t.cat), /*#__PURE__*/React.createElement("h3", null, t.name), /*#__PURE__*/React.createElement("p", null, t.desc), /*#__PURE__*/React.createElement("div", {
    className: "tour-meta"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar"
  }), " ", t.days, " d\xEDas"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
    name: "thermometer-snowflake"
  }), " ", t.temp), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
    name: "mountain-snow"
  }), " ", t.diff))));
}
function Tours({
  onBook
}) {
  const [filter, setFilter] = useState("todas");
  const list = TOURS.filter(t => filter === "todas" || t.filter === filter);
  return /*#__PURE__*/React.createElement("section", {
    className: "section",
    id: "rutas"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "TEMPORADA \xB7 DIC\u2013MAR"), /*#__PURE__*/React.createElement("h2", null, "Seis maneras de pisar el invierno.")), /*#__PURE__*/React.createElement("p", {
    className: "section-sub"
  }, "Cada expedici\xF3n est\xE1 guiada por especialistas locales y limitada a grupos peque\xF1os.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      marginBottom: 28
    }
  }, FILTERS.map(f => /*#__PURE__*/React.createElement(Chip, {
    key: f.id,
    active: filter === f.id,
    icon: f.icon,
    onClick: () => setFilter(f.id)
  }, f.label))), /*#__PURE__*/React.createElement("div", {
    className: "tour-grid"
  }, list.map(t => /*#__PURE__*/React.createElement(TourCard, {
    key: t.id,
    t: t,
    onBook: onBook
  })))));
}
function Itinerary() {
  return /*#__PURE__*/React.createElement("section", {
    className: "section",
    id: "itinerario"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "RUTA BAIKAL \xB7 EXPEDICI\xD3N 01"), /*#__PURE__*/React.createElement("h2", null, "D\xEDa a d\xEDa sobre el hielo.")), /*#__PURE__*/React.createElement("p", {
    className: "section-sub"
  }, "Un itinerario de seis d\xEDas dise\xF1ado para aclimatarte poco a poco al fr\xEDo extremo.")), /*#__PURE__*/React.createElement("div", {
    className: "itin"
  }, ITIN.map(r => /*#__PURE__*/React.createElement(Reveal, {
    key: r.d,
    className: "itin-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "itin-day"
  }, "D\xCDA", /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, r.d)), /*#__PURE__*/React.createElement("div", {
    className: "itin-c"
  }, /*#__PURE__*/React.createElement("h3", null, r.t), /*#__PURE__*/React.createElement("p", null, r.p), /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, r.tags.map(tg => /*#__PURE__*/React.createElement(Chip, {
    key: tg,
    data: true
  }, tg)))))))));
}
function Testimonials() {
  return /*#__PURE__*/React.createElement("section", {
    className: "section",
    id: "opiniones"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement(Reveal, {
    className: "glass testi"
  }, /*#__PURE__*/React.createElement("p", {
    className: "q"
  }, "\u201CNunca hab\xEDa escuchado un silencio as\xED. El hielo ten\xEDa ", /*#__PURE__*/React.createElement("span", {
    className: "em"
  }, "un metro de grosor"), " y se ve\xEDa el fondo del lago bajo mis botas. Boreal lo organiz\xF3 hasta el \xFAltimo grado.\u201D"), /*#__PURE__*/React.createElement("div", {
    className: "testi-who"
  }, /*#__PURE__*/React.createElement("div", {
    className: "testi-av"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, "Marina Cordero"), /*#__PURE__*/React.createElement("div", {
    className: "rl"
  }, "EXPEDICI\xD3N BAIKAL \xB7 ENERO 2026"))))));
}
function Booking({
  onBook
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "section",
    id: "reservar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement(Reveal, {
    className: "booking"
  }, /*#__PURE__*/React.createElement("div", {
    className: "booking-in"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "PLAZAS LIMITADAS"), /*#__PURE__*/React.createElement("h2", null, "Tu expedici\xF3n empieza aqu\xED.")), /*#__PURE__*/React.createElement("div", {
    className: "booking-form"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Salida"), /*#__PURE__*/React.createElement("div", {
    className: "ctrl"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar"
  }), " 12 \u2014 18 ene")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Viajeros"), /*#__PURE__*/React.createElement("div", {
    className: "ctrl"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users"
  }), " 2 personas")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: "snowflake",
    onClick: onBook
  }, "Reservar"))))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "footer-top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "footer-logo"
  }, /*#__PURE__*/React.createElement("img", {
    src: LOGO,
    alt: ""
  }), "BOREAL"), /*#__PURE__*/React.createElement("p", null, "Expediciones de invierno a lagos helados y monta\xF1as nevadas. Gu\xEDas locales, grupos peque\xF1os, fr\xEDo de verdad.")), /*#__PURE__*/React.createElement("div", {
    className: "footer-cols"
  }, /*#__PURE__*/React.createElement("div", {
    className: "footer-col"
  }, /*#__PURE__*/React.createElement("h4", null, "Rutas"), /*#__PURE__*/React.createElement("a", {
    href: "#rutas"
  }, "Lago Baikal"), /*#__PURE__*/React.createElement("a", {
    href: "#rutas"
  }, "Cuevas de hielo"), /*#__PURE__*/React.createElement("a", {
    href: "#rutas"
  }, "Cordillera Say\xE1n"), /*#__PURE__*/React.createElement("a", {
    href: "#rutas"
  }, "Isla Olkh\xF3n")), /*#__PURE__*/React.createElement("div", {
    className: "footer-col"
  }, /*#__PURE__*/React.createElement("h4", null, "Boreal"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Nosotros"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Gu\xEDas"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Seguridad"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Diario")), /*#__PURE__*/React.createElement("div", {
    className: "footer-col"
  }, /*#__PURE__*/React.createElement("h4", null, "Contacto"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "hola@boreal.travel"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "+34 900 000 000"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Irkutsk \xB7 Madrid")))), /*#__PURE__*/React.createElement("div", {
    className: "footer-bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 BOREAL WINTER EXPEDITIONS"), /*#__PURE__*/React.createElement("span", null, "53.5\xB0N \xB7 \u221224\xB0C \xB7 DIC\u2013MAR"))));
}
Object.assign(window, {
  StatBar,
  Tours,
  Itinerary,
  Testimonials,
  Booking,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/sections-main.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/sections-top.jsx
try { (() => {
// Boreal — Nav + Hero
const LOGO = "../../assets/logo-boreal-mark.svg";
function Nav({
  onBook
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-inner"
  }, /*#__PURE__*/React.createElement("a", {
    className: "nav-logo",
    href: "#top"
  }, /*#__PURE__*/React.createElement("img", {
    src: LOGO,
    alt: ""
  }), "BOREAL"), /*#__PURE__*/React.createElement("div", {
    className: "nav-links"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#rutas"
  }, "Rutas"), /*#__PURE__*/React.createElement("a", {
    href: "#itinerario"
  }, "Itinerario"), /*#__PURE__*/React.createElement("a", {
    href: "#opiniones"
  }, "Opiniones"), /*#__PURE__*/React.createElement("a", {
    href: "#reservar"
  }, "Temporada")), /*#__PURE__*/React.createElement("div", {
    className: "nav-right"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onBook
  }, "Iniciar sesi\xF3n"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onBook
  }, "Reservar")))));
}
function Hero({
  onBook
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "hero",
    id: "top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-bg"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-sun"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-ridge"
  }), /*#__PURE__*/React.createElement("div", {
    className: "wrap hero-content"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "EXPEDICI\xD3N 01 \xB7 LAGO BAIKAL"), /*#__PURE__*/React.createElement("h1", null, "El lago se vuelve ", /*#__PURE__*/React.createElement("span", {
    className: "em"
  }, "cristal"), "."), /*#__PURE__*/React.createElement("p", {
    className: "hero-lead"
  }, "Seis d\xEDas sobre hielo transparente de un metro de espesor. Salidas de diciembre a marzo, cuando el Baikal alcanza \u221224 \xB0C y el agua se vuelve vidrio."), /*#__PURE__*/React.createElement("div", {
    className: "hero-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: "snowflake",
    onClick: onBook
  }, "Reservar expedici\xF3n"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    iconRight: "arrow-right"
  }, "Ver las rutas"))), /*#__PURE__*/React.createElement("div", {
    className: "hero-scroll"
  }, "SCROLL ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-down"
  })));
}
Object.assign(window, {
  Nav,
  Hero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/sections-top.jsx", error: String((e && e.message) || e) }); }

})();
