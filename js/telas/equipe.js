// Área da equipe: login, painel, gestão das mesas de cada baile, bailes, cativos e colaboradores.
import { acoes, formularios, entradas, abrirFolha, fecharFolha, aviso, icone, ocupado } from "../ui.js";
import {
  esc, brl, dataLonga, dataHoraBR, linkWhats, telWhats, copiar, hojeISO, ehSabado, diaOperacional,
} from "../util.js";
import { NIVEIS, TURNOS, PADROES } from "../config.js";
import { pode, ROTULO_STATUS, mensagemConfirmacao, resumoOcupacao } from "../dominio.js";
import { CATIVOS_ANTIGOS, URL_BANCO_ANTIGO } from "../cativos-antigos.js";
import { criarMapa } from "../mapa.js";
import { MESAS, TODAS, ZONAS, lugaresDe, zonaDaMesa } from "../layout.js";
import {
  tituloBaile, horarioBaile, precoMesa, cartaoBaile, zonasChips, legendaEquipe, ferramentasMapa, carregando, vazio,
} from "./comum.js";

const q = (raiz, sel) => raiz.querySelector(sel);
const ordemTurno = { unico: 0, tarde: 1, noite: 2 };

function textoEvento(e) {
  const nome = e.nome ? ` — ${esc(e.nome)}` : "";
  const det = e.detalhe ? ` <span class="muted">(${esc(e.detalhe)})</span>` : "";
  return `<b>${esc(e.por || "")}</b> ${esc(e.acao || "")}${nome}${det}`;
}

function mostrarErro(raiz, msg) {
  const el = raiz.querySelector(".erro-form");
  if (el) { el.hidden = false; el.textContent = msg; } else aviso(msg, "erro");
}

// =====================================================================
// Entrada: login ou painel
// =====================================================================
export function viewEquipe(ctx) {
  if (!ctx.sessaoCarregada) {
    ctx.principal.innerHTML = carregando("Verificando acesso…");
    return () => {};
  }
  return ctx.sessao ? viewPainel(ctx) : viewLogin(ctx);
}

function viewLogin(ctx) {
  const demo = ctx.api.modo === "demo";
  ctx.principal.innerHTML = `
    <div class="login-caixa pilha">
      <div class="cartao">
        <h1 style="font-size:24px;font-weight:800">Área da equipe</h1>
        <p class="muted small" style="margin:6px 0 16px">Entre com o usuário e a senha que o administrador criou para você.</p>
        <form data-form="login" class="pilha" autocomplete="on">
          <div class="campo"><label for="f-usuario">Usuário</label>
            <input id="f-usuario" name="usuario" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required data-foco></div>
          <div class="campo"><label for="f-senha">Senha</label>
            <input id="f-senha" name="senha" type="password" autocomplete="current-password" required></div>
          <div class="erro-form" hidden></div>
          <button class="btn btn-prim btn-bloco" type="submit">Entrar</button>
        </form>
      </div>
      ${demo ? `<div class="cartao areia"><h3>Modo demonstração</h3><p class="small muted">Use um destes acessos de teste:<br>
        <b>admin</b> / admin — nível 3, acesso total<br><b>caixa</b> / caixa — nível 2, reserva e cancela<br><b>recepcao</b> / recepcao — nível 1, só reserva</p></div>` : ""}
    </div>`;
  const campo = q(ctx.principal, "#f-usuario");
  if (campo) campo.focus();
  formularios.login = async (form) => {
    const botao = form.querySelector("button[type=submit]");
    form.querySelector(".erro-form").hidden = true;
    try {
      await ocupado(botao, () => ctx.api.entrar(form.usuario.value, form.senha.value));
    } catch (e) {
      mostrarErro(form, e.message);
    }
  };
  return () => {};
}

// =====================================================================
// Painel
// =====================================================================
function viewPainel(ctx) {
  const raiz = ctx.principal;
  const s = ctx.sessao;
  const adm = pode(s.nivel, "gerenciarBailes");
  raiz.innerHTML = `
    <div class="pilha-g">
      <div class="painel-topo">
        <div class="avatar">${esc((s.nome || "?").trim().charAt(0).toUpperCase())}</div>
        <div class="flex1"><b>${esc(s.nome)}</b><br><small>${esc(NIVEIS[s.nivel]?.nome || "")}</small></div>
        <button class="btn btn-fantasma-claro btn-peq" data-acao="sair">Sair</button>
      </div>
      ${adm ? `<div class="acoes-adm">
        <a class="btn btn-prim" href="#/equipe/novo">Novo baile</a>
        <a class="btn btn-sec" href="#/equipe/importar">Importar</a>
        <a class="btn btn-sec" href="#/equipe/cativos">Cativos</a>
        <a class="btn btn-sec" href="#/equipe/usuarios">Equipe</a></div>` : ""}
      <section>
        <div class="titulo-secao"><h2>Bailes</h2></div>
        <div class="lista-bailes duas" id="proximos">${carregando()}</div>
        <div style="margin-top:12px"><button class="btn btn-sec btn-peq" data-acao="anteriores" id="btn-ant">Ver bailes anteriores</button></div>
        <div class="lista-bailes duas" id="anteriores" style="margin-top:10px"></div>
      </section>
    </div>`;

  const hrefDe = (b) => (b.reservavel ? `#/equipe/baile/${b.id}` : adm ? `#/equipe/baile/${b.id}/editar` : `#/baile/${b.id}`);
  acoes.sair = async () => { await ctx.api.sair(); ctx.navegar("#/equipe"); };
  acoes.anteriores = async (el) => {
    await ocupado(el, async () => {
      try {
        const lista = await ctx.api.buscarBailesAnteriores(20);
        q(raiz, "#anteriores").innerHTML = lista.length
          ? lista.map((b) => cartaoBaile(b, hrefDe(b))).join("")
          : vazio("Nenhum baile anterior");
        el.hidden = true;
      } catch (e) { aviso(e.message, "erro"); }
    });
  };

  // Sábados que ainda não receberam os cativos (criados antes desta função): aplica sozinho, uma vez por baile.
  let aplicando = false;
  async function completarCativos(lista) {
    if (!adm || aplicando) return;
    const faltam = lista.filter((b) => b.reservavel && !b.cativosAplicados);
    if (!faltam.length) return;
    aplicando = true;
    try {
      for (const b of faltam) await ctx.api.aplicarCativos(b.id, { uid: ctx.sessao.uid, nome: ctx.sessao.nome });
      aviso("Cativos colocados nos sábados cadastrados.", "ok");
    } catch (e) { console.error(e); } finally { aplicando = false; }
  }

  const des = ctx.api.ouvirBailes((lista, err) => {
    const box = q(raiz, "#proximos");
    if (!box) return;
    if (!err && lista) completarCativos(lista);
    if (err) { box.innerHTML = vazio("Não foi possível carregar os bailes", "Confira a conexão e tente de novo."); return; }
    box.innerHTML = lista.length
      ? lista.map((b) => cartaoBaile(b, hrefDe(b))).join("")
      : vazio("Nenhum baile cadastrado", adm ? "Toque em “Novo baile” para criar o primeiro." : "Peça a um administrador para cadastrar os bailes.");
  });
  return () => des();
}

// =====================================================================
// Gestão das mesas de um baile
// =====================================================================
export function viewBaileEquipe(ctx, id) {
  const raiz = ctx.principal;
  const s = ctx.sessao;
  const nivel = s.nivel;
  const ator = () => ({ uid: ctx.sessao.uid, nome: ctx.sessao.nome });
  raiz.innerHTML = carregando();

  let baile, ocup, reservas = {}, historico = [], montado = false;
  let aba = "mapa", filtro = "todas", busca = "", selecionada = null, mapa = null;
  let folha = null, mesaAberta = null, passo = "ver";

  const nomesDoMapa = () => Object.fromEntries(Object.entries(reservas).map(([n, r]) => [n, r.nome]));

  function montar() {
    const b = baile;
    const adm = pode(nivel, "gerenciarBailes");
    raiz.innerHTML = `
      <a class="voltar" href="#/equipe">${icone("seta").replace("<svg", '<svg width="16" height="16"')} Bailes</a>
      <div class="titulo-pagina"><h1>${esc(tituloBaile(b))}</h1>
        <p>${esc(dataLonga(b.data))}${horarioBaile(b) ? " · " + esc(horarioBaile(b)) : ""}${b.turno !== "unico" ? " · " + esc(TURNOS[b.turno]) : ""}</p></div>
      ${adm ? `<div class="linha quebra" style="margin-bottom:14px">
        <a class="btn btn-sec btn-peq" href="#/equipe/baile/${id}/editar">Editar baile</a>
        ${b.reservavel ? `<button class="btn btn-sec btn-peq" data-acao="aplicar-cativos">Aplicar cativos do modelo</button>` : ""}</div>` : ""}
      ${b.reservavel ? `
        <div class="resumo" id="resumo"></div>
        <div style="height:14px"></div>
        <div class="abas" id="abas">
          <button class="aba ativa" data-acao="aba" data-aba="mapa">Mapa</button>
          <button class="aba" data-acao="aba" data-aba="lista">Lista</button>
          <button class="aba" data-acao="aba" data-aba="historico">Histórico</button></div>
        <div style="height:12px"></div>
        <div id="aba-mapa">${zonasChips()}${ferramentasMapa()}<div class="mapa-caixa" id="mapa-host"></div>${legendaEquipe()}</div>
        <div id="aba-lista" hidden></div>
        <div id="aba-historico" hidden></div>`
        : `<div class="cartao areia"><p class="small muted">Este baile não tem reserva de mesa pelo sistema (só os bailes de sábado da casa têm). Aqui você pode ajustar atração, horários e valores.</p></div>`}`;
    if (b.reservavel) mapa = criarMapa(q(raiz, "#mapa-host"), { publico: false, aoClicar: abrirMesa });
    montado = true;
    atualizar();
  }

  function atualizar() {
    if (!montado || !baile.reservavel) return;
    if (ocup === undefined) return;
    if (ocup === null) {
      q(raiz, "#resumo").innerHTML = "";
      q(raiz, "#aba-mapa").innerHTML = vazio("Este baile ainda não tem mapa de mesas", "Peça a um administrador para conferir o cadastro do baile.");
      mapa = null;
      return;
    }
    const r = resumoOcupacao(ocup);
    q(raiz, "#resumo").innerHTML =
      `<div><b>${r.livre}</b><span>Livres</span></div><div><b>${r.reservada}</b><span>Reservadas</span></div>` +
      `<div><b>${r.pendente}</b><span>Aguardando</span></div><div><b>${r.cativa}</b><span>Cativas</span></div>`;
    if (mapa) mapa.atualizar({ status: ocup, nomes: nomesDoMapa(), selecionada });
    if (aba === "lista") desenharLista();
    if (aba === "historico") desenharHistorico();
    if (folha) folha.sincronizar();
  }

  function desenharLista() {
    const box = q(raiz, "#aba-lista");
    const foco = document.activeElement && document.activeElement.id === "busca-mesas";
    const chips = [["todas", "Com reserva"], ["reservada", "Reservadas"], ["pendente", "Aguardando"], ["cativa", "Cativas"], ["livre", "Livres"]]
      .map(([v, r]) => `<button class="chip${filtro === v ? " ativo" : ""}" data-acao="filtro" data-f="${v}">${r}</button>`).join("");
    const termo = busca.trim().toLowerCase();
    const linhas = TODAS.filter((n) => {
      const st = ocup[n] || "livre";
      if (filtro === "todas" && !["reservada", "pendente", "cativa"].includes(st)) return false;
      if (filtro !== "todas" && st !== filtro) return false;
      if (!termo) return true;
      const r = reservas[n] || {};
      return `${n} ${r.nome || ""} ${r.telefone || ""} ${r.obs || ""}`.toLowerCase().includes(termo);
    }).map((n) => {
      const st = ocup[n] || "livre";
      const r = reservas[n];
      const sub = [`${lugaresDe(n)} lugares`, r && r.telefone, r && r.obs].filter(Boolean).join(" · ");
      return `<button class="linha-res" data-acao="mesa" data-mesa="${n}"><span class="n">${n}</span>
        <span class="t"><b>${esc(r ? r.nome : "Livre")}</b><small>${esc(sub)}</small></span>
        <span class="pill ${st}">${esc(ROTULO_STATUS[st])}</span></button>`;
    }).join("");
    box.innerHTML =
      `<div class="busca">${icone("busca")}<input id="busca-mesas" type="search" placeholder="Buscar por nome, telefone ou mesa" value="${esc(busca)}" data-input="busca" autocomplete="off"></div>` +
      `<div style="height:10px"></div><div class="chips">${chips}</div>` +
      `<div class="pilha" style="gap:8px">${linhas || vazio("Nenhuma mesa encontrada")}</div>`;
    if (foco) { const i = q(box, "#busca-mesas"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }

  function desenharHistorico() {
    const box = q(raiz, "#aba-historico");
    box.innerHTML = historico.length
      ? `<div class="cartao"><div class="historico">${historico.map((e) =>
          `<div class="ev"><time>${esc(dataHoraBR(e.quando))}</time><span class="m">${esc(e.mesa || "")}</span><span>${textoEvento(e)}</span></div>`).join("")}</div></div>`
      : vazio("Nenhum registro ainda", "Reservas e cancelamentos deste baile aparecem aqui.");
  }

  // ---------- folha da mesa ----------
  function assinaturaMesa(n) {
    const evs = historico.filter((e) => e.mesa === n);
    return [ocup && ocup[n], JSON.stringify(reservas[n] || null), evs.length, evs[0] && evs[0].id].join("|");
  }

  function historicoDaMesa(n) {
    const evs = historico.filter((e) => e.mesa === n);
    return `<h3 style="margin:24px 0 4px;font-size:14px;font-weight:800">Histórico desta mesa neste baile</h3>` +
      (evs.length
        ? `<div class="historico">${evs.map((e) => `<div class="ev"><time>${esc(dataHoraBR(e.quando))}</time><span>${textoEvento(e)}</span></div>`).join("")}</div>`
        : `<p class="small muted" style="margin-top:6px">Nenhum registro ainda.</p>`);
  }

  function msgConfirmacao(n, nome) {
    return mensagemConfirmacao({
      mesa: n, nome, baile, dataLonga: dataLonga(baile.data),
      horario: horarioBaile(baile) || "—",
    });
  }

  function renderMesa(n) {
    const st = (ocup && ocup[n]) || "livre";
    const r = reservas[n];
    const lug = lugaresDe(n);
    const preco = precoMesa(baile, lug);
    const cab = `<h2>Mesa ${n}</h2><p class="sub">${lug} lugares${preco ? " · " + esc(preco) : ""} · <span class="pill ${st}">${esc(ROTULO_STATUS[st])}</span></p>`;
    let corpo = "";

    if (st === "livre") {
      corpo = `<form data-form="mesa-reservar" class="pilha" style="margin-top:16px" autocomplete="off">
        <div class="campo"><label for="m-nome">Nome</label><input id="m-nome" name="nome" required data-foco autocomplete="off"></div>
        <div class="form-grid dois">
          <div class="campo"><label for="m-tel">Telefone (opcional)</label><input id="m-tel" name="telefone" type="tel" inputmode="tel" autocomplete="off"></div>
          <div class="campo"><label for="m-obs">Observação</label><input id="m-obs" name="obs" autocomplete="off"></div></div>
        <label class="marcar"><input type="checkbox" name="pendente"> Aguardando pagamento (Pix)</label>
        <div class="erro-form" hidden></div>
        <button class="btn btn-prim btn-bloco" type="submit">Reservar mesa ${n}</button></form>
        ${pode(nivel, "bloquear") ? `<button class="btn btn-sec btn-bloco btn-peq" style="margin-top:10px" data-acao="mesa-bloquear">Bloquear mesa (tirar de venda)</button>` : ""}`;
    } else if (st === "bloqueada") {
      corpo = `<div class="pilha" style="margin-top:16px"><div class="aviso">Esta mesa está bloqueada e não aparece para o público.</div>
        ${pode(nivel, "bloquear") ? `<button class="btn btn-prim btn-bloco" data-acao="mesa-liberar">Liberar mesa</button>` : ""}
        <div class="erro-form" hidden></div></div>`;
    } else if (passo === "editar" && r) {
      corpo = `<form data-form="mesa-editar" class="pilha" style="margin-top:16px" autocomplete="off">
        <div class="campo"><label for="m-nome">Nome</label><input id="m-nome" name="nome" value="${esc(r.nome)}" required data-foco autocomplete="off"></div>
        <div class="form-grid dois">
          <div class="campo"><label for="m-tel">Telefone</label><input id="m-tel" name="telefone" type="tel" inputmode="tel" value="${esc(r.telefone || "")}" autocomplete="off"></div>
          <div class="campo"><label for="m-obs">Observação</label><input id="m-obs" name="obs" value="${esc(r.obs || "")}" autocomplete="off"></div></div>
        <div class="erro-form" hidden></div>
        <button class="btn btn-prim btn-bloco" type="submit">Salvar alterações</button>
        <button class="btn btn-sec btn-bloco" type="button" data-acao="mesa-passo" data-passo="ver">Voltar</button></form>`;
    } else if (passo === "cancelar" && r) {
      const cativo = r.tipo === "cativo";
      corpo = `<div class="pilha" style="margin-top:16px"><div class="aviso">${cativo
        ? `Remover o cativo <b>${esc(r.nome)}</b> só deste baile? Nos outros bailes ele continua. A mesa fica livre para outra pessoa.`
        : `Cancelar a reserva de <b>${esc(r.nome)}</b>? A mesa volta a ficar livre.`}</div>
        <div class="erro-form" hidden></div>
        <button class="btn btn-perigo btn-bloco" data-acao="mesa-cancelar-ok">${cativo ? "Sim, remover o cativo" : "Sim, cancelar a reserva"}</button>
        <button class="btn btn-sec btn-bloco" data-acao="mesa-passo" data-passo="ver">Voltar</button></div>`;
    } else {
      // reservada, pendente ou cativa
      const nome = r ? r.nome : "(sem dados da reserva)";
      const cativo = r && r.tipo === "cativo";
      const msg = msgConfirmacao(n, nome);
      const tel = r && r.telefone ? telWhats(r.telefone) : "";
      corpo = `<div class="cartao" style="margin-top:16px">
          <div style="font-size:20px;font-weight:800">${esc(nome)}</div>
          ${cativo ? `<span class="etiqueta cinza">Cliente cativo</span>` : ""}
          ${r && r.telefone ? `<div class="small" style="margin-top:6px"><a href="tel:${esc(r.telefone)}">${esc(r.telefone)}</a></div>` : ""}
          ${r && r.obs ? `<div class="small muted" style="margin-top:2px">${esc(r.obs)}</div>` : ""}
          ${r && r.por ? `<div class="tiny muted" style="margin-top:8px">Registrado por ${esc(r.por)}${r.quando ? " em " + esc(dataHoraBR(r.quando)) : ""}</div>` : ""}
        </div>
        <div class="pilha" style="margin-top:14px">
          <div class="erro-form" hidden></div>
          ${st === "pendente" && pode(nivel, "confirmarPagamento") ? `<button class="btn btn-prim btn-bloco" data-acao="mesa-pago">Confirmar pagamento</button>` : ""}
          <button class="btn btn-sec btn-bloco" data-acao="mesa-copiar">Copiar confirmação para o cliente</button>
          ${tel ? `<a class="btn btn-zap btn-bloco" href="${linkWhats(tel, msg)}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>` : ""}
          ${r && pode(nivel, "editar") ? `<button class="btn btn-sec btn-bloco" data-acao="mesa-passo" data-passo="editar">Editar dados</button>` : ""}
          ${pode(nivel, "cancelar") ? `<button class="btn btn-perigo btn-bloco" data-acao="mesa-passo" data-passo="cancelar">${cativo ? "Remover cativo deste baile" : "Cancelar reserva"}</button>` : ""}
          ${!pode(nivel, "cancelar") ? `<div class="aviso">Seu acesso permite fazer reservas, mas não editar nem cancelar. Fale com um administrador.</div>` : ""}
        </div>`;
    }
    return cab + corpo + historicoDaMesa(n);
  }

  function abrirMesa(n) {
    if (!ocup) { aviso("Este baile ainda não tem mapa de mesas.", "erro"); return; }
    mesaAberta = n;
    passo = "ver";
    selecionada = n;
    if (mapa) mapa.atualizar({ status: ocup, nomes: nomesDoMapa(), selecionada });
    folha = abrirFolha({
      render: () => renderMesa(n),
      assinatura: () => assinaturaMesa(n),
      aoFechar: () => {
        selecionada = null; mesaAberta = null; folha = null; passo = "ver";
        if (mapa) mapa.atualizar({ status: ocup || {}, nomes: nomesDoMapa(), selecionada });
      },
    });
  }

  // Executa uma ação da folha: mostra erro dentro dela, fecha se der certo.
  async function executar(origem, fn, ok, fechar = true) {
    const corpo = folha ? folha.corpo : raiz;
    const botao = origem.matches && origem.matches("form") ? origem.querySelector("button[type=submit]") : origem;
    const erroEl = corpo.querySelector(".erro-form");
    if (erroEl) erroEl.hidden = true;
    try {
      await ocupado(botao, fn);
      aviso(ok, "ok");
      if (fechar) fecharFolha();
    } catch (e) {
      mostrarErro(corpo, e.message);
    }
  }

  formularios["mesa-reservar"] = (form) =>
    executar(form, () => ctx.api.reservar(id, mesaAberta, {
      nome: form.nome.value, telefone: form.telefone.value, obs: form.obs.value, pendente: form.pendente.checked,
    }, ator()), `Mesa ${mesaAberta} reservada.`);
  formularios["mesa-editar"] = (form) =>
    executar(form, () => ctx.api.editarReserva(id, mesaAberta, {
      nome: form.nome.value, telefone: form.telefone.value, obs: form.obs.value,
    }, ator()), "Reserva atualizada.");

  acoes["mesa-passo"] = (el) => { passo = el.dataset.passo; if (folha) folha.desenhar(); };
  acoes["mesa-pago"] = (el) => executar(el, () => ctx.api.confirmarPagamento(id, mesaAberta, ator()), "Pagamento confirmado.", false);
  acoes["mesa-cancelar-ok"] = (el) => executar(el, () => ctx.api.cancelarReserva(id, mesaAberta, ator()), "Pronto: a mesa está livre.");
  acoes["mesa-bloquear"] = (el) => executar(el, () => ctx.api.definirBloqueio(id, mesaAberta, true, ator()), "Mesa bloqueada.");
  acoes["mesa-liberar"] = (el) => executar(el, () => ctx.api.definirBloqueio(id, mesaAberta, false, ator()), "Mesa liberada.");
  acoes["mesa-copiar"] = async () => {
    const r = reservas[mesaAberta];
    const ok = await copiar(msgConfirmacao(mesaAberta, r ? r.nome : ""));
    aviso(ok ? "Mensagem copiada." : "Não foi possível copiar.", ok ? "ok" : "erro");
  };

  acoes.mesa = (el) => abrirMesa(el.dataset.mesa);
  acoes.aba = (el) => {
    aba = el.dataset.aba;
    raiz.querySelectorAll("#abas .aba").forEach((b) => b.classList.toggle("ativa", b === el));
    for (const a of ["mapa", "lista", "historico"]) q(raiz, "#aba-" + a).hidden = aba !== a;
    if (aba === "lista") desenharLista();
    if (aba === "historico") desenharHistorico();
  };
  acoes.filtro = (el) => { filtro = el.dataset.f; desenharLista(); };
  entradas.busca = (el) => { busca = el.value; desenharLista(); };
  acoes.zona = (el) => { if (!mapa) return; el.dataset.zona === "geral" ? mapa.visaoGeral() : mapa.irParaZona(el.dataset.zona); };
  acoes["zoom-mais"] = () => mapa && mapa.zoomMais();
  acoes["zoom-menos"] = () => mapa && mapa.zoomMenos();
  acoes["aplicar-cativos"] = (el) =>
    ocupado(el, async () => {
      try {
        const n = await ctx.api.aplicarCativos(id, ator());
        aviso(n ? `${n} cativo(s) aplicado(s).` : "Nenhum cativo novo para aplicar.", "ok");
      } catch (e) { aviso(e.message, "erro"); }
    });

  const desfazer = [];
  desfazer.push(ctx.api.ouvirBaile(id, (b, err) => {
    baile = b;
    if (b === null) {
      montado = false;
      raiz.innerHTML = `<a class="voltar" href="#/equipe">Bailes</a>` + vazio(err ? "Não foi possível carregar este baile" : "Baile não encontrado");
      return;
    }
    if (!montado) montar();
  }));
  desfazer.push(ctx.api.ouvirOcupacao(id, (m) => { ocup = m; atualizar(); }));
  desfazer.push(ctx.api.ouvirReservas(id, (r, err) => {
    if (err) aviso("Sem permissão para ver os nomes das reservas.", "erro");
    reservas = r || {}; atualizar();
  }));
  desfazer.push(ctx.api.ouvirHistorico(id, (h) => { historico = h || []; atualizar(); }));
  return () => { desfazer.forEach((f) => f()); fecharFolha(); };
}

// =====================================================================
// Novo baile / editar baile (administrador)
// =====================================================================
export function viewBaileForm(ctx, id) {
  const raiz = ctx.principal;
  const editando = !!id;
  const ator = () => ({ uid: ctx.sessao.uid, nome: ctx.sessao.nome });
  raiz.innerHTML = carregando();
  let desfazer = () => {};

  function desenhar(b) {
    const n = (v) => (v === null || v === undefined ? "" : v);
    const base = b || { data: diaOperacional(), turno: "noite", ...PADROES.noite, mesa2: PADROES.mesa2, mesa4: PADROES.mesa4, reservavel: ehSabado(diaOperacional()) };
    raiz.innerHTML = `
      <a class="voltar" href="${editando ? (b.reservavel ? "#/equipe/baile/" + id : "#/equipe") : "#/equipe"}">${icone("seta").replace("<svg", '<svg width="16" height="16"')} Voltar</a>
      <div class="titulo-pagina"><h1>${editando ? "Editar baile" : "Novo baile"}</h1>
        <p>${editando ? esc(dataLonga(b.data)) + " · " + esc(TURNOS[b.turno]) : "Cadastre a data, a atração e os valores."}</p></div>
      <form data-form="baile" class="cartao pilha" autocomplete="off">
        <div class="form-grid dois">
          <div class="campo"><label for="b-data">Data</label><input id="b-data" name="data" type="date" value="${esc(base.data)}" required ${editando ? "disabled" : ""}></div>
          <div class="campo"><label for="b-turno">Turno</label><select id="b-turno" name="turno" ${editando ? "disabled" : ""}>
            ${["tarde", "noite", "unico"].map((t) => `<option value="${t}" ${base.turno === t ? "selected" : ""}>${t === "unico" ? "Único (dia inteiro)" : TURNOS[t]}</option>`).join("")}</select></div></div>
        <div class="campo"><label for="b-banda">Atração / banda</label><input id="b-banda" name="banda" value="${esc(base.banda || "")}" placeholder="Ex.: Banda Reflexus"></div>
        <div class="campo"><label for="b-estilo">Estilo ou descrição curta</label><input id="b-estilo" name="estilo" value="${esc(base.estilo || "")}" placeholder="Ex.: Dança de salão · samba · bolero"></div>
        <div class="form-grid dois">
          <div class="campo"><label for="b-abre">Abre</label><input id="b-abre" name="abre" value="${esc(n(base.abre))}" placeholder="22h"></div>
          <div class="campo"><label for="b-fecha">Fecha</label><input id="b-fecha" name="fecha" value="${esc(n(base.fecha))}" placeholder="4h"></div></div>
        <div class="form-grid dois">
          <div class="campo"><label for="b-ingresso">Ingresso (R$ por pessoa)</label><input id="b-ingresso" name="ingresso" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(n(base.ingresso))}"></div>
          <div class="campo"><label for="b-promo">Na lista / promocional (R$)</label><input id="b-promo" name="promo" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(n(base.promo))}"></div></div>
        <div class="form-grid dois">
          <div class="campo"><label for="b-m2">Mesa de 2 lugares (R$)</label><input id="b-m2" name="mesa2" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(n(base.mesa2))}"></div>
          <div class="campo"><label for="b-m4">Mesa de 4 lugares (R$)</label><input id="b-m4" name="mesa4" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(n(base.mesa4))}"></div></div>
        <label class="marcar"><input type="checkbox" name="reservavel" ${base.reservavel ? "checked" : ""} ${editando ? "disabled" : ""}> Aceita reserva de mesa (bailes de sábado da casa)</label>
        ${editando ? "" : `<p class="tiny muted">Ao criar com reserva de mesa, as mesas já nascem com os cativos do modelo (tela “Cativos”).</p>`}
        <div class="campo"><label for="b-obs">Descrição do baile (aparece para o público, opcional)</label><textarea id="b-obs" name="obs">${esc(base.obs || "")}</textarea></div>
        <div class="erro-form" hidden></div>
        <button class="btn btn-prim btn-bloco" type="submit">${editando ? "Salvar alterações" : "Criar baile"}</button>
      </form>`;

    const form = q(raiz, "form");
    if (!editando) {
      const sugerirReserva = () => {
        form.reservavel.checked = form.turno.value !== "unico" && ehSabado(form.data.value || diaOperacional());
      };
      form.turno.addEventListener("change", () => {
        const p = PADROES[form.turno.value] || PADROES.unico;
        form.abre.value = p.abre ?? ""; form.fecha.value = p.fecha ?? "";
        form.ingresso.value = p.ingresso ?? ""; form.promo.value = p.promo ?? "";
        sugerirReserva();
      });
      form.data.addEventListener("change", sugerirReserva);
    }
  }

  formularios.baile = async (form) => {
    const botao = form.querySelector("button[type=submit]");
    form.querySelector(".erro-form").hidden = true;
    const dados = {
      data: form.data.value, turno: form.turno.value, banda: form.banda.value, estilo: form.estilo.value,
      abre: form.abre.value.trim(), fecha: form.fecha.value.trim(),
      ingresso: form.ingresso.value, promo: form.promo.value, mesa2: form.mesa2.value, mesa4: form.mesa4.value,
      reservavel: form.reservavel.checked, obs: form.obs.value,
    };
    try {
      await ocupado(botao, async () => {
        if (editando) {
          await ctx.api.atualizarBaile(id, dados);
          aviso("Baile atualizado.", "ok");
          ctx.navegar("#/equipe");
        } else {
          const novo = await ctx.api.criarBaile(dados, ator());
          aviso("Baile criado.", "ok");
          ctx.navegar(dados.reservavel ? `#/equipe/baile/${novo}` : "#/equipe");
        }
      });
    } catch (e) {
      mostrarErro(form, e.message);
    }
  };

  if (editando) {
    let feito = false;
    desfazer = ctx.api.ouvirBaile(id, (b) => {
      if (feito || b === undefined) return;
      feito = true;
      if (b === null) { raiz.innerHTML = vazio("Baile não encontrado"); return; }
      desenhar(b);
    });
  } else desenhar(null);
  return () => desfazer();
}

// =====================================================================
// Modelo de cativos (administrador)
// =====================================================================
export function viewCativos(ctx) {
  const raiz = ctx.principal;
  let turno = "noite", modelo = null;

  raiz.innerHTML = `
    <a class="voltar" href="#/equipe">${icone("seta").replace("<svg", '<svg width="16" height="16"')} Voltar</a>
    <div class="titulo-pagina"><h1>Cativos</h1><p>Clientes com mesa fixa. Este é o modelo usado quando um baile novo é criado.</p></div>
    <div class="aviso" style="margin-bottom:14px">Os cativos valem para <b>todos os sábados</b>: os novos já nascem com eles e, os sábados já cadastrados recebem sozinhos na primeira vez (só em mesas livres, sem mexer em reservas). Mudanças depois valem para os próximos bailes; para levar uma mudança aos sábados já criados, use o botão abaixo. Para tirar um cativo de uma data só, cancele direto na mesa daquele baile.</div>
    <button class="btn btn-sec btn-bloco btn-peq" style="margin-bottom:12px" data-acao="cativo-aplicar-todos">Aplicar nos sábados já cadastrados</button>
    <div class="abas" id="abas-turno">
      <button class="aba" data-acao="turno" data-t="tarde">Sábado tarde</button>
      <button class="aba ativa" data-acao="turno" data-t="noite">Sábado noite</button></div>
    <div style="height:12px"></div>
    <div class="linha" style="gap:8px">
      <button class="btn btn-prim" style="flex:1" data-acao="cativo-novo">Adicionar cativo</button>
      <button class="btn btn-sec" style="flex:1" data-acao="cativo-antigo">Trazer do site antigo</button></div>
    <div style="height:12px"></div>
    <div class="pilha" id="lista" style="gap:8px">${carregando()}</div>`;

  // Leva o modelo para todos os sábados futuros já cadastrados (só ocupa mesas livres; nunca mexe em reservas).
  async function propagar(turnos) {
    const bailes = await new Promise((ok, no) => {
      let des = () => {};
      let feito = false;
      des = ctx.api.ouvirBailes((lista, err) => {
        if (feito) return;
        feito = true;
        setTimeout(() => des(), 0);
        err ? no(new Error("Não foi possível ler os bailes.")) : ok(lista || []);
      });
    });
    let mesas = 0, bailesTocados = 0;
    for (const b of bailes) {
      if (!b.reservavel || !turnos.includes(b.turno)) continue;
      const n = await ctx.api.aplicarCativos(b.id, { uid: ctx.sessao.uid, nome: ctx.sessao.nome });
      if (n) { mesas += n; bailesTocados++; }
    }
    return { mesas, bailesTocados };
  }
  async function propagarComAviso(turnos) {
    try {
      const r = await propagar(turnos);
      aviso(r.mesas ? `Cativos aplicados em ${r.bailesTocados} sábado(s) (${r.mesas} mesas).` : "Todos os sábados já estão com os cativos.", "ok");
    } catch (e) { aviso(e.message, "erro"); }
  }

  async function carregar() {
    q(raiz, "#lista").innerHTML = carregando();
    try { modelo = await ctx.api.lerCativos(turno); } catch (e) { modelo = null; aviso(e.message, "erro"); }
    desenhar();
  }

  function desenhar() {
    const box = q(raiz, "#lista");
    if (!modelo) { box.innerHTML = vazio("Não foi possível carregar os cativos"); return; }
    const mesas = Object.keys(modelo).sort((a, b) => Number(a) - Number(b));
    box.innerHTML = mesas.length
      ? mesas.map((n) => `<button class="linha-res" data-acao="cativo-editar" data-mesa="${n}"><span class="n">${n}</span>
          <span class="t"><b>${esc(modelo[n].nome)}</b><small>${esc(modelo[n].telefone || "sem telefone")}</small></span></button>`).join("")
      : vazio("Nenhum cativo neste turno");
  }

  function abrirEdicao(mesaAtual) {
    const novo = !mesaAtual;
    const livres = TODAS.filter((n) => !modelo[n]);
    const c = novo ? { nome: "", telefone: "" } : modelo[mesaAtual];
    folhaCativo({ novo, mesaAtual, livres, c });
  }

  function folhaCativo({ novo, mesaAtual, livres, c }) {
    abrirFolha({
      render: () => `<h2>${novo ? "Novo cativo" : "Mesa " + mesaAtual}</h2>
        <p class="sub">${esc(turno === "tarde" ? "Sábado tarde" : "Sábado noite")}</p>
        <form data-form="cativo" class="pilha" style="margin-top:16px" autocomplete="off">
          <div class="campo"><label for="c-mesa">Mesa</label>
            ${novo ? `<select id="c-mesa" name="mesa" required>${livres.map((n) => `<option value="${n}">${n} · ${lugaresDe(n)} lugares</option>`).join("")}</select>`
              : `<input id="c-mesa" name="mesa" value="${mesaAtual}" readonly>`}</div>
          <div class="campo"><label for="c-nome">Nome</label><input id="c-nome" name="nome" value="${esc(c.nome)}" required data-foco autocomplete="off"></div>
          <div class="campo"><label for="c-tel">Telefone</label><input id="c-tel" name="telefone" type="tel" inputmode="tel" value="${esc(c.telefone || "")}" autocomplete="off"></div>
          <div class="erro-form" hidden></div>
          <button class="btn btn-prim btn-bloco" type="submit">Salvar</button>
          ${novo ? "" : `<button class="btn btn-perigo btn-bloco" type="button" data-acao="cativo-remover" data-mesa="${mesaAtual}">Remover do modelo</button>`}
        </form>`,
    });
  }

  async function salvar(origem, fn, ok) {
    const botao = origem.matches && origem.matches("form") ? origem.querySelector("button[type=submit]") : origem;
    try {
      await ocupado(botao, async () => { await fn(); await ctx.api.salvarCativos(turno, modelo); });
      aviso(ok, "ok");
      fecharFolha();
      desenhar();
    } catch (e) {
      const el = document.querySelector("#camada .erro-form");
      if (el) { el.hidden = false; el.textContent = e.message; } else aviso(e.message, "erro");
    }
  }

  formularios.cativo = (form) =>
    salvar(form, () => { modelo[form.mesa.value] = { nome: form.nome.value.trim(), telefone: form.telefone.value.trim() }; }, "Cativo salvo no modelo.");
  acoes["cativo-remover"] = (el) => salvar(el, () => { delete modelo[el.dataset.mesa]; }, "Cativo removido do modelo.");
  // Junta a lista fixa do site antigo com as mudanças feitas lá depois (lidas do banco antigo).
  acoes["cativo-antigo"] = (el) => ocupado(el, async () => {
    const novo = { tarde: {}, noite: {} };
    let aviso2 = "";
    for (const t of ["tarde", "noite"]) {
      const m = {};
      for (const [n, nome] of Object.entries(CATIVOS_ANTIGOS[t])) m[n] = { nome, telefone: "" };
      try {
        const r = await fetch(`${URL_BANCO_ANTIGO}/cativos/${t}.json`);
        if (!r.ok) throw new Error(r.status);
        const vivo = (await r.json()) || {};
        for (const [n, v] of Object.entries(vivo)) {
          const nome = v && typeof v === "object" ? v.nome : v;
          if (nome) m[n] = { nome: String(nome), telefone: v && v.telefone ? String(v.telefone) : "" };
          else delete m[n];
        }
      } catch { aviso2 = "Não consegui ler as alterações recentes do site antigo; usei só a lista fixa."; }
      novo[t] = m;
    }
    const total = (t) => Object.keys(novo[t]).length;
    abrirFolha({
      render: () => `<h2>Trazer do site antigo</h2>
        <p class="sub">Sábado tarde: <b>${total("tarde")}</b> cativos · Sábado noite: <b>${total("noite")}</b> cativos</p>
        ${aviso2 ? `<div class="aviso" style="margin-top:12px">${esc(aviso2)}</div>` : ""}
        <div class="aviso" style="margin-top:12px">Isso <b>substitui</b> o modelo atual de cativos dos dois turnos. Depois de importar, os cativos também são aplicados em todos os sábados já cadastrados.</div>
        <div class="erro-form" hidden></div>
        <button class="btn btn-prim btn-bloco" style="margin-top:14px" data-acao="cativo-antigo-ok">Importar agora</button>`,
    });
    acoes["cativo-antigo-ok"] = (b) => ocupado(b, async () => {
      try {
        await ctx.api.salvarCativos("tarde", novo.tarde);
        await ctx.api.salvarCativos("noite", novo.noite);
        modelo = novo[turno];
        fecharFolha(); desenhar();
        aviso("Cativos importados.", "ok");
        await propagarComAviso(["tarde", "noite"]);
      } catch (e) { const er = document.querySelector("#camada .erro-form"); if (er) { er.hidden = false; er.textContent = e.message; } }
    });
  });
  acoes["cativo-aplicar-todos"] = (el) => ocupado(el, () => propagarComAviso([turno]));
  acoes["cativo-novo"] = () => { if (modelo) abrirEdicao(null); };
  acoes["cativo-editar"] = (el) => { if (modelo) abrirEdicao(el.dataset.mesa); };
  acoes.turno = (el) => {
    turno = el.dataset.t;
    raiz.querySelectorAll("#abas-turno .aba").forEach((b) => b.classList.toggle("ativa", b === el));
    carregar();
  };

  carregar();
  return () => fecharFolha();
}

// =====================================================================
// Colaboradores (administrador)
// =====================================================================
export function viewColaboradores(ctx) {
  const raiz = ctx.principal;
  raiz.innerHTML = `
    <a class="voltar" href="#/equipe">${icone("seta").replace("<svg", '<svg width="16" height="16"')} Voltar</a>
    <div class="titulo-pagina"><h1>Equipe</h1><p>Quem pode entrar no sistema e o que cada pessoa pode fazer.</p></div>
    <div class="grade-2 igual">
      <div class="pilha"><div class="tabela-colab" id="lista">${carregando()}</div></div>
      <div class="cartao"><h3>Novo colaborador</h3>
        <form data-form="colab" class="pilha" autocomplete="off">
          <div class="campo"><label for="n-nome">Nome</label><input id="n-nome" name="nome" required autocomplete="off"></div>
          <div class="campo"><label for="n-usuario">Usuário (para entrar)</label><input id="n-usuario" name="usuario" required autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off">
            <span class="dica">Letras minúsculas, números, ponto, traço ou _. Ex.: maria.caixa</span></div>
          <div class="campo"><label for="n-senha">Senha</label><input id="n-senha" name="senha" type="text" minlength="6" required autocomplete="off" autocapitalize="none">
            <span class="dica">Mínimo de 6 caracteres. Passe a senha para a pessoa pessoalmente.</span></div>
          <div class="campo"><label for="n-nivel">Nível de acesso</label><select id="n-nivel" name="nivel">
            ${[1, 2, 3].map((n) => `<option value="${n}" ${n === 2 ? "selected" : ""}>${n} · ${esc(NIVEIS[n].nome)}</option>`).join("")}</select>
            <span class="dica" id="dica-nivel"></span></div>
          <div class="erro-form" hidden></div>
          <button class="btn btn-prim btn-bloco" type="submit">Criar colaborador</button>
        </form>
        <p class="tiny muted" style="margin-top:12px">Esqueceram a senha? Desative o acesso antigo e crie um usuário novo. A pessoa também pode ter a senha redefinida no console do Firebase.</p>
      </div>
    </div>`;

  const form = q(raiz, "form");
  const dica = () => { q(raiz, "#dica-nivel").textContent = NIVEIS[form.nivel.value].desc; };
  form.nivel.addEventListener("change", dica);
  dica();

  formularios.colab = async (f) => {
    const botao = f.querySelector("button[type=submit]");
    f.querySelector(".erro-form").hidden = true;
    try {
      await ocupado(botao, () => ctx.api.criarColaborador({ nome: f.nome.value, usuario: f.usuario.value, senha: f.senha.value, nivel: f.nivel.value }, { nome: ctx.sessao.nome }));
      aviso("Colaborador criado.", "ok");
      f.reset(); f.nivel.value = "2"; dica();
    } catch (e) {
      mostrarErro(f, e.message);
    }
  };
  entradas["colab-nivel"] = async (el) => {
    try { await ctx.api.atualizarColaborador(el.dataset.uid, { nivel: el.value }); aviso("Nível atualizado.", "ok"); }
    catch (e) { aviso(e.message, "erro"); }
  };
  acoes["colab-ativo"] = async (el) => {
    try {
      await ocupado(el, () => ctx.api.atualizarColaborador(el.dataset.uid, { ativo: el.dataset.ativo === "1" }));
      aviso(el.dataset.ativo === "1" ? "Acesso reativado." : "Acesso desativado.", "ok");
    } catch (e) { aviso(e.message, "erro"); }
  };

  const des = ctx.api.ouvirColaboradores((lista, err) => {
    const box = q(raiz, "#lista");
    if (!box) return;
    if (err || !lista) { box.innerHTML = vazio("Não foi possível carregar a equipe", "Confira se você é administrador."); return; }
    box.innerHTML = lista.map((c) => {
      const eu = c.uid === ctx.sessao.uid;
      return `<div class="colab${c.ativo ? "" : " inativo"}"><div class="t"><b>${esc(c.nome)}${eu ? " (você)" : ""}</b><small class="muted">usuário: ${esc(c.usuario)}${c.ativo ? "" : " · desativado"}</small></div>
        <select data-input="colab-nivel" data-uid="${esc(c.uid)}" ${eu ? "disabled" : ""} aria-label="Nível de ${esc(c.nome)}">
          ${[1, 2, 3].map((n) => `<option value="${n}" ${Number(c.nivel) === n ? "selected" : ""}>Nível ${n}</option>`).join("")}</select>
        ${eu ? "" : `<button class="btn btn-sec btn-peq" data-acao="colab-ativo" data-uid="${esc(c.uid)}" data-ativo="${c.ativo ? 0 : 1}">${c.ativo ? "Desativar" : "Reativar"}</button>`}</div>`;
    }).join("") || vazio("Nenhum colaborador");
  });
  return () => des();
}

// =====================================================================
// Importar programação (administrador): cola uma lista e cria vários bailes de uma vez
// =====================================================================
export function viewImportar(ctx) {
  const raiz = ctx.principal;
  const ator = () => ({ uid: ctx.sessao.uid, nome: ctx.sessao.nome });
  let lista = null;

  raiz.innerHTML = `
    <a class="voltar" href="#/equipe">${icone("seta").replace("<svg", '<svg width="16" height="16"')} Voltar</a>
    <div class="titulo-pagina"><h1>Importar programação</h1><p>Cole aqui a lista de bailes que a Claude preparou a partir do documento do mês.</p></div>
    <div class="cartao pilha">
      <div class="campo"><label for="imp-texto">Lista de bailes</label>
        <textarea id="imp-texto" rows="9" spellcheck="false" placeholder='[ {"data":"2026-11-01","turno":"unico","banda":"Alexandre","abre":"18h","fecha":"23h","descricao":"Noite de bolero e samba"} ]'></textarea>
        <span class="dica">Cada baile pode ter uma "descricao" (texto livre que aparece para o público). Datas que já existem são puladas, então não tem problema colar duas vezes.</span></div>
      <div class="erro-form" hidden></div>
      <button class="btn btn-sec btn-bloco" data-acao="imp-conferir">Conferir lista</button>
      <div id="imp-previa"></div>
    </div>`;

  const erro = (m) => { const e = q(raiz, ".erro-form"); e.hidden = !m; e.textContent = m || ""; };

  acoes["imp-conferir"] = () => {
    erro("");
    q(raiz, "#imp-previa").innerHTML = "";
    lista = null;
    let dados;
    try { dados = JSON.parse(q(raiz, "#imp-texto").value); } catch { erro("Não consegui ler a lista. Cole exatamente o texto que a Claude mandou, do [ até o ]."); return; }
    if (!Array.isArray(dados) || !dados.length) { erro("A lista está vazia."); return; }
    for (const d of dados) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data || "") || !["tarde", "noite", "unico"].includes(d.turno)) {
        erro(`Item com data ou turno inválido: ${JSON.stringify(d).slice(0, 80)}`); return;
      }
      if (d.descricao && !d.obs) d.obs = d.descricao;
      if (d.reservavel === undefined) d.reservavel = d.turno !== "unico" && ehSabado(d.data);
    }
    lista = dados;
    q(raiz, "#imp-previa").innerHTML =
      `<p class="small muted" style="margin:6px 0">${dados.length} bailes encontrados. Confira e clique em importar.</p>` +
      `<div class="pilha" style="gap:6px">${dados.map((d) =>
        `<div class="linha-res" style="cursor:default"><span class="n" style="width:auto;padding:0 8px">${esc(d.data.slice(8))}/${esc(d.data.slice(5, 7))}</span>
        <span class="t"><b>${esc(d.banda || "(sem atração)")}</b><small>${esc(TURNOS[d.turno] || "")} · ${esc(d.abre || "?")} às ${esc(d.fecha || "?")}${d.reservavel ? " · com reserva de mesa" : ""}${d.obs ? " · " + esc(String(d.obs).slice(0, 60)) + (String(d.obs).length > 60 ? "…" : "") : ""}</small></span></div>`).join("")}</div>
      <div style="height:12px"></div><button class="btn btn-prim btn-bloco" data-acao="imp-importar">Importar ${dados.length} bailes</button>`;
  };

  acoes["imp-importar"] = (el) => ocupado(el, async () => {
    let novos = 0, pulados = 0;
    const falhas = [];
    for (const d of lista) {
      try { await ctx.api.criarBaile(d, ator()); novos++; }
      catch (e) { if (/Já existe/.test(e.message)) pulados++; else falhas.push(`${d.data}: ${e.message}`); }
    }
    q(raiz, "#imp-previa").innerHTML =
      `<div class="aviso"><b>${novos}</b> bailes criados · <b>${pulados}</b> já existiam e foram pulados${falhas.length ? ` · <b>${falhas.length}</b> com erro:<br>${falhas.map(esc).join("<br>")}` : ""}</div>
       <p style="margin-top:12px"><a class="btn btn-prim" href="#/equipe">Ver no painel</a></p>`;
    aviso("Importação concluída.", falhas.length ? "erro" : "ok");
  });
  return () => {};
}
