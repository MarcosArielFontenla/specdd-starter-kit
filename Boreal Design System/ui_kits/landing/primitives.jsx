// Boreal primitives — shared across the kit. Exported to window for cross-file use.
const { useState, useEffect, useRef } = React;

// Lucide icon (renders <i data-lucide>; App re-runs lucide.createIcons() each render)
function Icon({ name, className, style }) {
  return <i data-lucide={name} className={className} style={style}></i>;
}

function Eyebrow({ children, line = true }) {
  return (
    <span className="eyebrow">{line && <span className="ln"></span>}{children}</span>
  );
}

function Button({ variant = "primary", size, icon, iconRight, children, onClick }) {
  const cls = `btn btn-${variant}${size === "lg" ? " btn-lg" : ""}`;
  return (
    <button className={cls} onClick={onClick}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

function Chip({ active, data, icon, children, onClick }) {
  const cls = `chip${active ? " active" : ""}${data ? " chip-data" : ""}`;
  return (
    <span className={cls} onClick={onClick}>
      {icon && <Icon name={icon} />}{children}
    </span>
  );
}

// Reveal-on-scroll wrapper. Visual trigger ('in' class) is driven centrally
// from App's effect for reliability across the separate Babel scripts.
function Reveal({ children, className = "", as = "div" }) {
  const Tag = as;
  return <Tag className={`reveal ${className}`}>{children}</Tag>;
}

Object.assign(window, { Icon, Eyebrow, Button, Chip, Reveal });
