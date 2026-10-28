// Pedaços de tela reaproveitados (cartões de baile, horários, endereço, contato).
import { ZAIS, HORARIOS, TURNOS } from "../config.js";
import { esc, brl, diaDoMes, siglaDia, diaSemana, hojeISO, linkWhats } from "../util.js";
import { ZONAS } from "../layout.js";

export function tituloBaile(b) {
  return b.banda || { tarde: "Tarde dançante", noite: "Baile da noite", unico: "Baile" }[b.turno] || "Baile";
}

export function horarioBaile(b) {
  if (b.abre && b.fecha) return `${b.abre} às ${b.fecha}`;
  return b.abre || b.fecha || "";
}

export function precoTexto(b) {
  return Number(b.ingresso) > 0 ? brl(b.ingresso) : "Consulte";
}

export function precoMesa(b, lugares) {
  const v = lugares >= 4 ? b.mesa4 : b.mesa2;
  return Number(v) > 0 ? brl(v) : "";
}

export function cartaoBaile(b, href) {
  const sub = [b.estilo, horarioBaile(b)].filter(Boolean).join(" · ");
  const turno = b.turno !== "unico" ? `<span class="etiqueta cinza">${esc(TURNOS[b.turno])}</span> ` : "";
  const reserva = b.reservavel ? `<span class="etiqueta">Reserva de mesa</span>` : "";
  return (
    `<a class="baile" href="${href}">` +
    `<span class="data-bloco"><b>${diaDoMes(b.data)}</b><span>${esc(siglaDia(b.data))}</span></span>` +
    `<span class="info"><b>${esc(tituloBaile(b))}</b><small>${esc(sub)}</small><span>${turno}${reserva}</span></span>` +
    `<span class="preco">${esc(precoTexto(b))}</span></a>`
  );
}

export function horariosCard() {
  const hoje = diaSemana(hojeISO());
  const linhas = HORARIOS.map(
    (h) =>
      `<div class="h${h.dia === hoje ? " hoje" : ""}${h.fechado ? " fechado" : ""}">` +
      `<span class="d"><b>${esc(h.nome)}</b>${h.nota ? `<span class="nota">${esc(h.nota)}</span>` : ""}</span>` +
      `<span class="v">${esc(h.horas)}</span></div>`
  ).join("");
  return `<div class="cartao"><h3>Horários</h3><div class="horarios">${linhas}</div>` +
    `<p class="tiny muted" style="margin-top:10px">Atrações e valores variam conforme o evento. Serviço de garçom nas mesas em todos os bailes.</p></div>`;
}

export function enderecoCard() {
  return (
    `<div class="cartao"><div class="endereco-img"><img src="assets/mapa-local.jpg" alt="Mapa da região da Zais na Vila Mariana" loading="lazy"></div>` +
    `<div class="pilha" style="margin-top:12px;gap:3px"><b>${esc(ZAIS.endereco)}</b>` +
    `<span class="muted small">${esc(ZAIS.bairro)} · ${esc(ZAIS.referencia)}</span>` +
    `<span class="small" style="color:var(--terra-d);font-weight:700;margin-top:4px">${esc(ZAIS.extras)}</span></div>` +
    `<a class="btn btn-sec btn-bloco btn-peq" style="margin-top:12px" href="${ZAIS.mapsUrl}" target="_blank" rel="noopener">Abrir no Google Maps</a></div>`
  );
}

export function contatoCard() {
  const msg = "Olá! Gostaria de informações sobre a Zais.";
  return (
    `<div class="cartao areia"><h3>Reservas e contato</h3><div class="pilha" style="gap:8px">` +
    `<a class="btn btn-zap btn-bloco" href="${linkWhats(ZAIS.whatsapp.numero, msg)}" target="_blank" rel="noopener">WhatsApp ${esc(ZAIS.whatsapp.rotulo)}</a>` +
    `<span class="small muted">Telefone ${esc(ZAIS.telefoneFixo)} · <a href="https://instagram.com/${ZAIS.instagram}" target="_blank" rel="noopener">@${esc(ZAIS.instagram)}</a></span>` +
    `<span class="tiny muted">Reserva de mesa só nos bailes de sábado, que são da própria casa. Nos outros dias, fale com a organização do evento (contato no flyer).</span>` +
    `<span class="tiny muted">Aniversariantes: fechando acima de 15 convidados, ganha 1 bolo e 1 champagne, e os convidados entram com preço promocional.</span>` +
    `</div></div>`
  );
}

export function zonasChips() {
  return (
    `<div class="chips" role="group" aria-label="Ir para uma parte do salão">` +
    `<button class="chip" data-acao="zona" data-zona="geral">Salão todo</button>` +
    ZONAS.map((z) => `<button class="chip" data-acao="zona" data-zona="${z.id}">${esc(z.nome)}</button>`).join("") +
    `</div>`
  );
}

export function legendaPublico() {
  return (
    `<div class="legenda"><span><i class="l-livre-pub"></i>Livre</span><span><i class="l-ocupada"></i>Ocupada</span></div>`
  );
}

export function legendaEquipe() {
  return (
    `<div class="legenda"><span><i></i>Livre</span><span><i class="l-reservada"></i>Reservada</span>` +
    `<span><i class="l-pendente"></i>Aguardando pagamento</span><span><i class="l-cativa"></i>Cativa</span>` +
    `<span><i class="l-bloqueada"></i>Bloqueada</span></div>`
  );
}

export function ferramentasMapa() {
  return (
    `<div class="mapa-ferr"><span class="small muted">Toque numa mesa. Use + e − para aproximar.</span>` +
    `<div class="zoom-btns"><button data-acao="zoom-menos" aria-label="Afastar">−</button><button data-acao="zoom-mais" aria-label="Aproximar">+</button></div></div>`
  );
}

export function carregando(texto = "Carregando…") {
  return `<div class="carregando">${esc(texto)}</div>`;
}

export function vazio(titulo, texto = "") {
  return `<div class="vazio"><b>${esc(titulo)}</b>${esc(texto)}</div>`;
}
