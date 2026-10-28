// Regras do negócio que não dependem de onde os dados ficam (Firebase ou demo).
import { TODAS, BLOQUEADAS_PADRAO } from "./layout.js";

// Status possíveis de uma mesa em um baile:
//   livre      – pode reservar
//   reservada  – reservada por alguém
//   pendente   – reservada, aguardando pagamento
//   cativa     – mesa fixa de um cliente (vem do modelo de cativos)
//   bloqueada  – não está à venda
export const STATUS = ["livre", "reservada", "pendente", "cativa", "bloqueada"];

export const ROTULO_STATUS = {
  livre: "Livre",
  reservada: "Reservada",
  pendente: "Aguardando pagamento",
  cativa: "Cativa",
  bloqueada: "Bloqueada",
};

// Permissões por nível do colaborador.
//   1 = só reserva · 2 = reserva, edita e cancela · 3 = tudo
export function pode(nivel, acao) {
  const minimo = {
    ver: 1,
    reservar: 1,
    editar: 2,
    cancelar: 2,
    confirmarPagamento: 2,
    bloquear: 3,
    gerenciarBailes: 3,
    gerenciarCativos: 3,
    gerenciarEquipe: 3,
  }[acao];
  return minimo !== undefined && Number(nivel) >= minimo;
}

// Estado inicial das mesas de um baile novo, a partir do modelo de cativos.
export function ocupacaoInicial(cativos = {}) {
  const mesas = {};
  for (const n of TODAS) {
    if (cativos[n] && cativos[n].nome) mesas[n] = "cativa";
    else if (BLOQUEADAS_PADRAO.includes(n)) mesas[n] = "bloqueada";
    else mesas[n] = "livre";
  }
  return { mesas };
}

// Reservas "de cativo" que acompanham um baile novo.
export function reservasDosCativos(cativos = {}, ator = {}) {
  const out = {};
  for (const [n, c] of Object.entries(cativos)) {
    if (!c || !c.nome || !TODAS.includes(n)) continue;
    out[n] = {
      mesa: n,
      nome: c.nome,
      telefone: c.telefone || "",
      obs: "",
      tipo: "cativo",
      pago: true,
      por: ator.nome || "Sistema",
    };
  }
  return out;
}

export function resumoOcupacao(mesas = {}) {
  const r = { livre: 0, reservada: 0, pendente: 0, cativa: 0, bloqueada: 0 };
  for (const [n, s] of Object.entries(mesas)) {
    if (s in r) r[s]++;
  }
  return r;
}

// Mensagem de confirmação para mandar ao cliente pelo WhatsApp.
export function mensagemConfirmacao({ mesa, nome, baile, dataLonga, horario }) {
  const banda = baile?.banda ? `\n🎶 Atração: ${baile.banda}` : "";
  return (
    `Sua reserva está confirmada! ✨\n\n` +
    `📋 Mesa: ${mesa}\n👤 Nome: ${nome}\n📅 Data: ${dataLonga}\n🕒 Horário: ${horario}${banda}\n\n` +
    `📍 Zais — Rua Domingos de Morais, 1630\nVila Mariana, São Paulo\nValet na porta\n\n` +
    `Te esperamos na pista! 🕺💃`
  );
}

export function validarBaile(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data || "")) throw new Error("Informe a data do baile.");
  if (!["tarde", "noite", "unico"].includes(d.turno)) throw new Error("Escolha o turno.");
}
