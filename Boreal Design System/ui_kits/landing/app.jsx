// Boreal — app shell + booking modal
function BookingModal({ open, onClose }) {
  const [sent, setSent] = useState(false);
  useEffect(() => { if (!open) setSent(false); }, [open]);
  if (!open) return null;
  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="glass modal" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><Icon name="x" /></button>
        {sent ? (
          <div className="modal-ok">
            <div className="ic"><Icon name="check" /></div>
            <h3>Plaza reservada</h3>
            <p className="sub">Te hemos enviado el itinerario y el listado de equipo. Nos vemos sobre el hielo.</p>
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          </div>
        ) : (
          <React.Fragment>
            <Eyebrow>RESERVA · EXPEDICIÓN 01</Eyebrow>
            <h3 style={{ marginTop: 12 }}>Reserva tu expedición</h3>
            <p className="sub">Plazas limitadas a grupos de ocho. Sin pago hasta confirmar disponibilidad.</p>
            <div className="field"><input className="inp" placeholder="Nombre completo" /></div>
            <div className="field"><input className="inp" placeholder="tu@correo.com" /></div>
            <div className="field"><input className="inp" placeholder="Fechas preferidas · DIC–MAR" /></div>
            <Button variant="primary" size="lg" icon="snowflake" onClick={() => setSent(true)}>Confirmar solicitud</Button>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

function App() {
  const [booking, setBooking] = useState(false);
  const openBook = () => setBooking(true);
  // Re-render Lucide icons after every paint
  useEffect(() => { if (window.lucide) lucide.createIcons(); });
  // Reveal all content on mount (entrance animation plays for in-view items;
  // off-screen items are simply already visible when scrolled to).
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
    els.forEach((el, i) => setTimeout(() => el.classList.add("in"), 60 + i * 70));
  }, []);
  return (
    <React.Fragment>
      <div className="grain"></div>
      <Nav onBook={openBook} />
      <Hero onBook={openBook} />
      <StatBar />
      <Tours onBook={openBook} />
      <Itinerary />
      <Testimonials />
      <Booking onBook={openBook} />
      <Footer />
      <BookingModal open={booking} onClose={() => setBooking(false)} />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
