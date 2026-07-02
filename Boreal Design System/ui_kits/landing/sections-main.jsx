// Boreal — content sections
const TOURS = [
  { id: 1, cat: "RUTA BAIKAL", name: "Travesía sobre hielo", badge: "EXPEDICIÓN 01",
    desc: "Camina y patina sobre la superficie helada del lago más profundo del planeta.",
    days: 6, temp: "−24°C", diff: "3/5", price: "1.840", grad: "var(--grad-glacier)", feat: true, filter: "lagos" },
  { id: 2, cat: "CUEVAS DE HIELO", name: "Bajo el lago", badge: "EXPEDICIÓN 02",
    desc: "Grutas de hielo turquesa formadas por el viento y el agua bajo la orilla.",
    days: 4, temp: "−18°C", diff: "2/5", price: "1.120", grad: "var(--grad-night)", filter: "cuevas" },
  { id: 3, cat: "CORDILLERA SAYÁN", name: "Cumbres nevadas", badge: "EXPEDICIÓN 03",
    desc: "Ascenso con raquetas a los miradores helados sobre el valle congelado.",
    days: 8, temp: "−29°C", diff: "4/5", price: "2.260", grad: "linear-gradient(135deg,#16293B,#2C6791)", filter: "montana" },
  { id: 4, cat: "ALDEA OLKHÓN", name: "Noche boreal", badge: "EXPEDICIÓN 04",
    desc: "Auroras sobre la isla sagrada, trineo de perros y baño de hielo.",
    days: 5, temp: "−21°C", diff: "2/5", price: "1.480", grad: "linear-gradient(135deg,#0E1B2A,#1F4E70)", filter: "lagos" },
  { id: 5, cat: "RÍO LENA", name: "Pilares de piedra", badge: "EXPEDICIÓN 05",
    desc: "Travesía en moto de nieve entre los pilares helados del Lena.",
    days: 7, temp: "−27°C", diff: "4/5", price: "2.040", grad: "linear-gradient(135deg,#122335,#244660)", filter: "montana" },
  { id: 6, cat: "TERMAS DE GORYACHINSK", name: "Vapor y escarcha", badge: "EXPEDICIÓN 06",
    desc: "Aguas termales humeantes rodeadas de bosque nevado y silencio.",
    days: 3, temp: "−15°C", diff: "1/5", price: "880", grad: "linear-gradient(135deg,#1A3047,#3C82B4)", filter: "cuevas" },
];

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "lagos", label: "Lagos helados", icon: "waves" },
  { id: "cuevas", label: "Cuevas de hielo", icon: "gem" },
  { id: "montana", label: "Montaña", icon: "mountain-snow" },
];

const ITIN = [
  { d: "01", t: "Llegada a Irkutsk", p: "Recepción, equipamiento térmico y briefing con los guías locales. Primera noche en cabaña de madera junto al bosque.", tags: ["Equipo incluido", "−12°C"] },
  { d: "02", t: "Primer hielo", p: "Salida al lago. Caminata sobre hielo transparente y prueba de patines. El Baikal cruje bajo tus pies como un instrumento vivo.", tags: ["8 km", "Guía 1:4"] },
  { d: "03", t: "Cuevas turquesa", p: "Exploración de grutas de hielo en la orilla este, esculpidas por el viento durante el invierno.", tags: ["Cascos", "Linternas"] },
  { d: "04", t: "Travesía mayor", p: "Jornada larga sobre la superficie helada hacia la isla de Olkhón, con parada para comer sobre el lago.", tags: ["22 km", "−24°C"] },
];

function StatBar() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <Reveal className="glass statbar">
          <div className="stat"><div className="k"><Icon name="route" /> Rutas activas</div><div className="v">12</div></div>
          <div className="stat"><div className="k"><Icon name="footprints" /> Viajeros</div><div className="v">2.4k<b>+</b></div></div>
          <div className="stat"><div className="k"><Icon name="thermometer-snowflake" /> Mínima</div><div className="v">−31<b>°</b></div></div>
          <div className="stat"><div className="k"><Icon name="star" /> Valoración</div><div className="v">4,9</div></div>
        </Reveal>
      </div>
    </section>
  );
}

function TourCard({ t, onBook }) {
  return (
    <div className={`glass tour${t.feat ? " feat" : ""}`}>
      <div className="tour-photo" style={{ background: t.grad }} onClick={onBook}>
        <div className="scrim"></div>
        <span className="badge">{t.badge}</span>
        <span className="price"><b>€</b>{t.price}</span>
      </div>
      <div className="tour-body">
        <div className="eye">{t.cat}</div>
        <h3>{t.name}</h3>
        <p>{t.desc}</p>
        <div className="tour-meta">
          <span><Icon name="calendar" /> {t.days} días</span>
          <span><Icon name="thermometer-snowflake" /> {t.temp}</span>
          <span><Icon name="mountain-snow" /> {t.diff}</span>
        </div>
      </div>
    </div>
  );
}

function Tours({ onBook }) {
  const [filter, setFilter] = useState("todas");
  const list = TOURS.filter((t) => filter === "todas" || t.filter === filter);
  return (
    <section className="section" id="rutas">
      <div className="wrap">
        <div className="section-head">
          <div>
            <Eyebrow>TEMPORADA · DIC–MAR</Eyebrow>
            <h2>Seis maneras de pisar el invierno.</h2>
          </div>
          <p className="section-sub">Cada expedición está guiada por especialistas locales y limitada a grupos pequeños.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
          {FILTERS.map((f) => (
            <Chip key={f.id} active={filter === f.id} icon={f.icon} onClick={() => setFilter(f.id)}>{f.label}</Chip>
          ))}
        </div>
        <div className="tour-grid">
          {list.map((t) => <TourCard key={t.id} t={t} onBook={onBook} />)}
        </div>
      </div>
    </section>
  );
}

function Itinerary() {
  return (
    <section className="section" id="itinerario">
      <div className="wrap">
        <div className="section-head">
          <div>
            <Eyebrow>RUTA BAIKAL · EXPEDICIÓN 01</Eyebrow>
            <h2>Día a día sobre el hielo.</h2>
          </div>
          <p className="section-sub">Un itinerario de seis días diseñado para aclimatarte poco a poco al frío extremo.</p>
        </div>
        <div className="itin">
          {ITIN.map((r) => (
            <Reveal key={r.d} className="itin-row">
              <div className="itin-day">DÍA<span className="n">{r.d}</span></div>
              <div className="itin-c">
                <h3>{r.t}</h3>
                <p>{r.p}</p>
                <div className="tags">{r.tags.map((tg) => <Chip key={tg} data>{tg}</Chip>)}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="section" id="opiniones">
      <div className="wrap">
        <Reveal className="glass testi">
          <p className="q">
            “Nunca había escuchado un silencio así. El hielo tenía <span className="em">un metro de grosor</span> y se veía el fondo del lago bajo mis botas. Boreal lo organizó hasta el último grado.”
          </p>
          <div className="testi-who">
            <div className="testi-av"></div>
            <div>
              <div className="nm">Marina Cordero</div>
              <div className="rl">EXPEDICIÓN BAIKAL · ENERO 2026</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Booking({ onBook }) {
  return (
    <section className="section" id="reservar">
      <div className="wrap">
        <Reveal className="booking">
          <div className="booking-in">
            <div>
              <Eyebrow>PLAZAS LIMITADAS</Eyebrow>
              <h2>Tu expedición empieza aquí.</h2>
            </div>
            <div className="booking-form">
              <div className="field"><label>Salida</label><div className="ctrl"><Icon name="calendar" /> 12 — 18 ene</div></div>
              <div className="field"><label>Viajeros</label><div className="ctrl"><Icon name="users" /> 2 personas</div></div>
              <Button variant="primary" size="lg" icon="snowflake" onClick={onBook}>Reservar</Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <div className="footer-logo"><img src={LOGO} alt="" />BOREAL</div>
            <p>Expediciones de invierno a lagos helados y montañas nevadas. Guías locales, grupos pequeños, frío de verdad.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Rutas</h4>
              <a href="#rutas">Lago Baikal</a><a href="#rutas">Cuevas de hielo</a><a href="#rutas">Cordillera Sayán</a><a href="#rutas">Isla Olkhón</a>
            </div>
            <div className="footer-col">
              <h4>Boreal</h4>
              <a href="#">Nosotros</a><a href="#">Guías</a><a href="#">Seguridad</a><a href="#">Diario</a>
            </div>
            <div className="footer-col">
              <h4>Contacto</h4>
              <a href="#">hola@boreal.travel</a><a href="#">+34 900 000 000</a><a href="#">Irkutsk · Madrid</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 BOREAL WINTER EXPEDITIONS</span>
          <span>53.5°N · −24°C · DIC–MAR</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { StatBar, Tours, Itinerary, Testimonials, Booking, Footer });
