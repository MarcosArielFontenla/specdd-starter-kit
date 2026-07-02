// Boreal — Nav + Hero
const LOGO = "../../assets/logo-boreal-mark.svg";

function Nav({ onBook }) {
  return (
    <nav className="nav">
      <div className="wrap">
        <div className="nav-inner">
          <a className="nav-logo" href="#top"><img src={LOGO} alt="" />BOREAL</a>
          <div className="nav-links">
            <a href="#rutas">Rutas</a>
            <a href="#itinerario">Itinerario</a>
            <a href="#opiniones">Opiniones</a>
            <a href="#reservar">Temporada</a>
          </div>
          <div className="nav-right">
            <Button variant="ghost" onClick={onBook}>Iniciar sesión</Button>
            <Button variant="primary" onClick={onBook}>Reservar</Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onBook }) {
  return (
    <header className="hero" id="top">
      <div className="hero-bg"></div>
      <div className="hero-sun"></div>
      <div className="hero-ridge"></div>
      <div className="wrap hero-content">
        <Eyebrow>EXPEDICIÓN 01 · LAGO BAIKAL</Eyebrow>
        <h1>El lago se vuelve <span className="em">cristal</span>.</h1>
        <p className="hero-lead">
          Seis días sobre hielo transparente de un metro de espesor. Salidas de
          diciembre a marzo, cuando el Baikal alcanza −24 °C y el agua se vuelve vidrio.
        </p>
        <div className="hero-actions">
          <Button variant="primary" size="lg" icon="snowflake" onClick={onBook}>Reservar expedición</Button>
          <Button variant="secondary" size="lg" iconRight="arrow-right">Ver las rutas</Button>
        </div>
      </div>
      <div className="hero-scroll">SCROLL <Icon name="arrow-down" /></div>
    </header>
  );
}

Object.assign(window, { Nav, Hero });
