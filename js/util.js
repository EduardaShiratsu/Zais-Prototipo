import { FUSO } from "./config.js";

// Escapa texto antes de colocar em HTML (nomes e observações vêm do banco).
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Data de hoje (YYYY-MM-DD) no fuso de São Paulo.
export function hojeISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: FUSO });
}

// "Dia da casa": até as 6h da manhã ainda vale o dia anterior
// (o baile de sábado à noite termina de madrugada, já no domingo).
export function diaOperacional() {
  const hora = Number(new Date().toLocaleString("en-GB", { timeZone: FUSO, hour: "2-digit", hour12: false }));
  const hoje = hojeISO();
  if (hora < 6) {
    const [y, m, d] = hoje.split("-").map(Number);
    const ontem = new Date(Date.UTC(y, m - 1, d - 1, 12));
    return ontem.toISOString().slice(0, 10);
  }
  return hoje;
}

export function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function somarDias(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE");
}

export function diaSemana(iso) {
  return parseISO(iso).getDay();
}

export function ehSabado(iso) {
  return diaSemana(iso) === 6;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function dataLonga(iso) {
  return cap(parseISO(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }));
}

export function dataCurta(iso) {
  return parseISO(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function diaDoMes(iso) {
  return String(parseISO(iso).getDate());
}

export function siglaDia(iso) {
  return parseISO(iso).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
}

export function mesAno(iso) {
  return cap(parseISO(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
}

export function dataHoraBR(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString("pt-BR", {
    timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function horaBR(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
}

export function brl(n) {
  const v = Number(n);
  if (!isFinite(v)) return "";
  return "R$ " + (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ","));
}

export function idBaile(data, turno) {
  return `${data}_${turno}`;
}

export function dividirId(id) {
  const [data, turno] = String(id).split("_");
  return { data, turno };
}

export function soDigitos(s) {
  return String(s || "").replace(/\D/g, "");
}

// Número de telefone para o link do WhatsApp (assume Brasil se vier sem 55).
export function telWhats(tel) {
  const d = soDigitos(tel);
  if (d.length < 10) return "";
  return d.startsWith("55") && d.length >= 12 ? d : "55" + d;
}

export function linkWhats(numero, texto) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* ignora */ }
    ta.remove();
    return ok;
  }
}

export function ordenarBailes(lista) {
  const peso = { tarde: 1, noite: 2, unico: 0 };
  return [...lista].sort((a, b) => (a.data === b.data ? (peso[a.turno] ?? 0) - (peso[b.turno] ?? 0) : a.data < b.data ? -1 : 1));
}

export function porNumero(a, b) {
  return Number(a) - Number(b);
}
