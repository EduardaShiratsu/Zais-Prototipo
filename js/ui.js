// Pequenas peças de interface compartilhadas pelas telas.

// Registros de eventos: cada tela registra aqui o que cada botão faz.
// (data-acao="nome" nos botões; data-form="nome" nos formulários)
export const acoes = {};
export const formularios = {};
export const entradas = {}; // data-input="nome": campos que reagem a "change"/"input"
export function limparRegistros() {
  for (const k of Object.keys(acoes)) delete acoes[k];
  for (const k of Object.keys(formularios)) delete formularios[k];
  for (const k of Object.keys(entradas)) delete entradas[k];
}

const ICONES = {
  casa: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  pino: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  seta: '<path d="M15 18l-6-6 6-6"/>',
};
export function icone(nome) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ""}</svg>`;
}

// ---------- avisos rápidos ----------
export function aviso(msg, tipo = "") {
  const host = document.getElementById("avisos");
  if (!host) return;
  const el = document.createElement("div");
  el.className = "aviso-rapido " + tipo;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), tipo === "erro" ? 5200 : 3000);
}

// ---------- folha (janela de baixo no celular, centralizada no computador) ----------
let folhaAtual = null;

export function abrirFolha({ render, assinatura = () => "", aoFechar } = {}) {
  const host = document.getElementById("camada");
  host.innerHTML =
    `<div class="fundo" data-fechar-folha></div>` +
    `<div class="folha" role="dialog" aria-modal="true">` +
    `<button class="fechar" data-fechar-folha aria-label="Fechar">×</button><div class="corpo"></div></div>`;
  const corpo = host.querySelector(".corpo");
  const f = {
    corpo,
    assinaturaAtual: null,
    aoFechar,
    desenhar() {
      corpo.innerHTML = render();
      this.assinaturaAtual = assinatura();
      const foco = corpo.querySelector("[data-foco]");
      if (foco) foco.focus({ preventScroll: true });
    },
    // Redesenha só se os dados mudaram (assim não apaga o que a pessoa está digitando).
    sincronizar() {
      const a = assinatura();
      if (a !== this.assinaturaAtual) this.desenhar();
    },
    fechar() { fecharFolha(); },
  };
  f.desenhar();
  folhaAtual = f;
  document.body.classList.add("travado");
  requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add("aberto")));
  return f;
}

export function fecharFolha() {
  const host = document.getElementById("camada");
  if (!host) return;
  const f = folhaAtual;
  folhaAtual = null;
  host.classList.remove("aberto");
  document.body.classList.remove("travado");
  setTimeout(() => { if (!folhaAtual) host.innerHTML = ""; }, 260);
  if (f && f.aoFechar) f.aoFechar();
}

export function folhaAberta() {
  return folhaAtual;
}

// Desabilita um botão enquanto uma ação assíncrona roda.
export async function ocupado(botao, fn) {
  if (botao) botao.disabled = true;
  try {
    return await fn();
  } finally {
    if (botao && botao.isConnected) botao.disabled = false;
  }
}
