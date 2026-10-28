// Ponto de entrada: monta a estrutura, controla as rotas e liga os eventos.
import { iniciarDados } from "./data/index.js";
import { ZAIS } from "./config.js";
import { pode } from "./dominio.js";
import { acoes, formularios, entradas, limparRegistros, icone, fecharFolha, folhaAberta, aviso } from "./ui.js";
import { diaOperacional, dataCurta, siglaDia, esc } from "./util.js";
import { viewInicio, viewBailes, viewBaile, viewChegar, viewSemDados } from "./telas/publico.js";
import { viewEquipe, viewBaileEquipe, viewBaileForm, viewCativos, viewColaboradores } from "./telas/equipe.js";
import { carregando } from "./telas/comum.js";

const raizApp = document.getElementById("app");
const NAV = [
  { href: "#/", rotulo: "Início", icone: "casa", chave: "inicio" },
  { href: "#/bailes", rotulo: "Programação", icone: "calendario", chave: "bailes" },
  { href: "#/chegar", rotulo: "Como chegar", icone: "pino", chave: "chegar" },
  { href: "#/equipe", rotulo: "Equipe", icone: "cadeado", chave: "equipe" },
];

const ctx = {
  api: null, sessao: null, sessaoCarregada: false, principal: null,
  navegar(hash) { if (location.hash === hash) renderizar(); else location.hash = hash; },
};
let limpar = () => {};

function montarEstrutura(demo) {
  const hoje = diaOperacional();
  raizApp.innerHTML = `
    ${demo ? `<div class="faixa-demo">Modo demonstração — nada aqui é real e nada é salvo. <a href="./">Sair da demonstração</a></div>` : ""}
    <header class="topbar"><div class="topbar-in">
      <a class="marca" href="#/" aria-label="Zais — início"><img src="assets/logo.png" alt="Zais"><span>A casa mais dançante</span></a>
      <nav class="nav-desktop" aria-label="Principal">${NAV.map((n) => `<a href="${n.href}" data-chave="${n.chave}">${n.rotulo}</a>`).join("")}</nav>
      <span class="pill-hoje hoje"><i></i>Hoje · ${esc(siglaDia(hoje))} ${esc(dataCurta(hoje))}</span>
    </div></header>
    <main class="principal" id="principal" tabindex="-1"></main>
    <nav class="nav-baixo" aria-label="Principal">${NAV.map((n) => `<a href="${n.href}" data-chave="${n.chave}">${icone(n.icone)}${n.rotulo === "Como chegar" ? "Chegar" : n.rotulo}</a>`).join("")}</nav>`;
  ctx.principal = document.getElementById("principal");
}

function rota() {
  const h = (location.hash || "#/").replace(/^#/, "");
  const p = h.split("?")[0].split("/").filter(Boolean);
  return p;
}

function marcarNav(chave) {
  document.querySelectorAll("[data-chave]").forEach((a) => {
    const ativo = a.dataset.chave === chave;
    a.classList.toggle("ativo", ativo);
    if (ativo) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

function negado(msg) {
  ctx.principal.innerHTML = `<div class="aviso">${esc(msg)}</div><p style="margin-top:12px"><a class="btn btn-sec" href="#/equipe">Voltar ao painel</a></p>`;
  return () => {};
}

function renderizar() {
  try { limpar(); } catch { /* ignora */ }
  limpar = () => {};
  limparRegistros();
  if (folhaAberta()) fecharFolha();
  const p = rota();
  const [a, b, c, d] = p;
  let chave = "inicio";
  let v;
  try {
    if (!a) v = viewInicio(ctx);
    else if (a === "bailes") { chave = "bailes"; v = viewBailes(ctx); }
    else if (a === "baile" && b) { chave = "bailes"; v = viewBaile(ctx, b); }
    else if (a === "chegar") { chave = "chegar"; v = viewChegar(ctx); }
    else if (a === "equipe") {
      chave = "equipe";
      const s = ctx.sessao;
      if (!ctx.sessaoCarregada || !s || !b) v = viewEquipe(ctx);
      else if (b === "baile" && c) {
        v = d === "editar"
          ? (pode(s.nivel, "gerenciarBailes") ? viewBaileForm(ctx, c) : negado("Só administradores editam bailes."))
          : viewBaileEquipe(ctx, c);
      } else if (b === "novo") v = pode(s.nivel, "gerenciarBailes") ? viewBaileForm(ctx, null) : negado("Só administradores criam bailes.");
      else if (b === "cativos") v = pode(s.nivel, "gerenciarCativos") ? viewCativos(ctx) : negado("Só administradores editam cativos.");
      else if (b === "usuarios") v = pode(s.nivel, "gerenciarEquipe") ? viewColaboradores(ctx) : negado("Só administradores gerenciam a equipe.");
      else v = viewEquipe(ctx);
    } else v = viewInicio(ctx);
  } catch (e) {
    console.error(e);
    v = viewSemDados(ctx, "Algo deu errado ao abrir esta tela. Tente recarregar a página.");
  }
  if (typeof v === "function") limpar = v;
  marcarNav(chave);
  window.scrollTo(0, 0);
}

// ---------- eventos globais ----------
document.addEventListener("click", async (ev) => {
  if (ev.target.closest("[data-fechar-folha]")) { fecharFolha(); return; }
  const el = ev.target.closest("[data-acao]");
  if (!el) return;
  const fn = acoes[el.dataset.acao];
  if (!fn) return;
  ev.preventDefault();
  try { await fn(el, ev); } catch (e) { console.error(e); aviso(e.message || "Algo deu errado.", "erro"); }
});
document.addEventListener("submit", async (ev) => {
  const f = ev.target.closest("[data-form]");
  if (!f) return;
  ev.preventDefault();
  const fn = formularios[f.dataset.form];
  if (!fn) return;
  try { await fn(f, ev); } catch (e) { console.error(e); aviso(e.message || "Algo deu errado.", "erro"); }
});
document.addEventListener("input", (ev) => {
  const el = ev.target.closest("[data-input]");
  if (!el || el.tagName === "SELECT") return;
  const fn = entradas[el.dataset.input];
  if (fn) fn(el, ev);
});
document.addEventListener("change", (ev) => {
  const el = ev.target.closest("[data-input]");
  if (!el || el.tagName !== "SELECT") return;
  const fn = entradas[el.dataset.input];
  if (fn) fn(el, ev);
});
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && folhaAberta()) fecharFolha(); });
window.addEventListener("hashchange", renderizar);

// ---------- início ----------
(async function iniciar() {
  const demo = new URLSearchParams(location.search).has("demo");
  montarEstrutura(demo);
  ctx.principal.innerHTML = carregando();
  try {
    ctx.api = await iniciarDados();
  } catch (e) {
    console.error(e);
    viewSemDados(ctx, "Não foi possível conectar ao sistema agora. Veja abaixo as informações da casa.");
    return;
  }
  let primeira = true;
  ctx.api.observarSessao((s) => {
    const mudou = (ctx.sessao && ctx.sessao.uid) !== (s && s.uid) || (ctx.sessao && s && ctx.sessao.nivel !== s.nivel);
    ctx.sessao = s;
    ctx.sessaoCarregada = true;
    if (primeira) { primeira = false; renderizar(); return; }
    if (mudou && rota()[0] === "equipe") {
      if (!s) location.hash = "#/equipe"; // saiu
      renderizar();
    }
  });
})();
