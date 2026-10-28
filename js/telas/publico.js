// Telas abertas ao público: início, programação, baile (mapa de mesas) e como chegar.
import { acoes, abrirFolha, fecharFolha, aviso, icone } from "../ui.js";
import { esc, brl, dataLonga, hojeISO, somarDias, mesAno, linkWhats } from "../util.js";
import { ZAIS, TURNOS } from "../config.js";
import { criarMapa } from "../mapa.js";
import { MESAS, ZONAS, lugaresDe } from "../layout.js";
import {
  tituloBaile, horarioBaile, precoTexto, precoMesa, cartaoBaile, horariosCard, enderecoCard, contatoCard,
  zonasChips, legendaPublico, ferramentasMapa, carregando, vazio,
} from "./comum.js";

const q = (raiz, sel) => raiz.querySelector(sel);

// =====================================================================
// Início
// =====================================================================
export function viewInicio(ctx) {
  const raiz = ctx.principal;
  raiz.innerHTML = `
    <div class="grade-2">
      <div class="pilha-g">
        <div id="destaque">${carregando()}</div>
        <div class="atalhos">
          <a class="atalho" href="#/bailes">${icone("calendario")}Programação</a>
          <a class="atalho" href="#/chegar">${icone("pino")}Como chegar</a>
          <a class="atalho" href="#/chegar">${icone("relogio")}Horários</a>
        </div>
        <section>
          <div class="titulo-secao"><h2 id="semana-titulo">Esta semana</h2><a href="#/bailes" class="small" style="font-weight:700">ver tudo</a></div>
          <div class="lista-bailes" id="semana"></div>
        </section>
      </div>
      <div class="pilha">${enderecoCard()}${horariosCard()}${contatoCard()}</div>
    </div>`;

  let bailes = null, erro = null, livres = null, idOcup = null, desOcup = null;

  function ouvirOcupacao() {
    const prox = bailes && bailes[0];
    const id = prox && prox.reservavel ? prox.id : null;
    if (id === idOcup) return;
    if (desOcup) desOcup();
    desOcup = null; idOcup = id; livres = null;
    if (id) {
      desOcup = ctx.api.ouvirOcupacao(id, (s) => {
        livres = s ? Object.values(s).filter((v) => v === "livre").length : null;
        desenhar();
      });
    }
  }

  function destaqueVazio() {
    const nota = erro ? `<p class="small" style="margin-top:12px;color:var(--ouro)">Não foi possível carregar a programação agora. Tente de novo em instantes.</p>` : "";
    return `<div class="destaque"><span class="rotulo">Zais · A casa mais dançante</span>
      <h2>Venha dançar com a gente</h2>
      <div class="estilo">Dança de salão, samba de gafieira e bandas ao vivo na Vila Mariana.</div>${nota}
      <div class="acoes"><a class="btn btn-claro flex1" href="${linkWhats(ZAIS.whatsapp.numero, "Olá! Gostaria de informações sobre a Zais.")}" target="_blank" rel="noopener">Falar no WhatsApp</a>
      <a class="btn btn-fantasma-claro" href="#/chegar">Horários</a></div></div>`;
  }

  function destaqueBaile(b) {
    const hora = horarioBaile(b);
    const lista = Number(b.promo) > 0 ? `<span class="selo">Na lista ${esc(brl(b.promo))}</span>` : "";
    const preco = Number(b.ingresso) > 0 ? `${esc(brl(b.ingresso))} / pessoa` : "Consulte os valores";
    const cont = b.reservavel && livres !== null ? `<span class="contagem">${livres} mesas livres</span>` : "";
    return `<div class="destaque">
      <div class="linha entre"><span class="rotulo">Próximo baile</span>${cont}</div>
      <h2>${esc(tituloBaile(b))}</h2>
      ${b.estilo ? `<div class="estilo">${esc(b.estilo)}</div>` : ""}
      <div class="selos"><span class="selo">${esc(dataLonga(b.data))}</span>${hora ? `<span class="selo">${esc(hora)}</span>` : ""}
        <span class="selo ouro">${preco}</span>${lista}</div>
      <div class="acoes"><a class="btn btn-claro flex1" href="#/baile/${b.id}">${b.reservavel ? "Reservar mesa" : "Ver detalhes"}</a>
      <a class="btn btn-fantasma-claro" href="#/bailes">Programação</a></div></div>`;
  }

  function desenhar() {
    const dEl = q(raiz, "#destaque"), sEl = q(raiz, "#semana"), tEl = q(raiz, "#semana-titulo");
    if (!dEl) return;
    if (bailes === null && !erro) { dEl.innerHTML = carregando(); return; }
    const lista = bailes || [];
    if (!lista.length) {
      dEl.innerHTML = destaqueVazio();
      sEl.innerHTML = vazio("Programação em breve", "Os próximos bailes aparecem aqui assim que forem publicados.");
      return;
    }
    dEl.innerHTML = destaqueBaile(lista[0]);
    const limite = somarDias(hojeISO(), 7);
    let sem = lista.filter((b) => b.data <= limite);
    tEl.textContent = "Esta semana";
    if (!sem.length) { sem = lista.slice(0, 4); tEl.textContent = "Próximos bailes"; }
    sEl.innerHTML = sem.map((b) => cartaoBaile(b, `#/baile/${b.id}`)).join("");
  }

  const desBailes = ctx.api.ouvirBailes((lista, err) => {
    bailes = lista; erro = err || null;
    ouvirOcupacao();
    desenhar();
  });
  return () => { desBailes(); if (desOcup) desOcup(); };
}

// =====================================================================
// Programação
// =====================================================================
export function viewBailes(ctx) {
  const raiz = ctx.principal;
  raiz.innerHTML = `
    <div class="titulo-pagina"><h1>Programação</h1><p>Próximos bailes da Zais. A casa fecha às terças.</p></div>
    <div class="chips" id="filtros">
      <button class="chip ativo" data-acao="filtro" data-f="todos">Todos</button>
      <button class="chip" data-acao="filtro" data-f="sabados">Sábados (reserva de mesa)</button>
      <button class="chip" data-acao="filtro" data-f="outros">Outros dias</button>
    </div>
    <div id="lista">${carregando()}</div>`;
  let bailes = null, erro = null, filtro = "todos";

  acoes.filtro = (el) => {
    filtro = el.dataset.f;
    raiz.querySelectorAll("#filtros .chip").forEach((c) => c.classList.toggle("ativo", c === el));
    desenhar();
  };

  function desenhar() {
    const box = q(raiz, "#lista");
    if (!box) return;
    if (bailes === null && !erro) { box.innerHTML = carregando(); return; }
    let lista = bailes || [];
    if (filtro === "sabados") lista = lista.filter((b) => b.reservavel);
    if (filtro === "outros") lista = lista.filter((b) => !b.reservavel);
    if (!lista.length) {
      box.innerHTML =
        vazio(erro ? "Não foi possível carregar a programação" : "Nenhum baile publicado por enquanto",
          erro ? "Tente de novo em instantes." : "Veja os horários de funcionamento abaixo.") +
        `<div style="margin-top:8px">${horariosCard()}</div>`;
      return;
    }
    const grupos = [];
    for (const b of lista) {
      const m = mesAno(b.data);
      let g = grupos.find((x) => x.m === m);
      if (!g) grupos.push((g = { m, itens: [] }));
      g.itens.push(b);
    }
    box.innerHTML = grupos
      .map((g) => `<div class="titulo-secao"><h2>${esc(g.m)}</h2></div><div class="lista-bailes duas">${g.itens.map((b) => cartaoBaile(b, `#/baile/${b.id}`)).join("")}</div>`)
      .join('<div style="height:10px"></div>');
  }

  const des = ctx.api.ouvirBailes((lista, err) => { bailes = lista; erro = err || null; desenhar(); });
  return () => des();
}

// =====================================================================
// Baile (mapa de mesas público)
// =====================================================================
export function viewBaile(ctx, id) {
  const raiz = ctx.principal;
  raiz.innerHTML = carregando();
  let baile = undefined, erro = null, status = undefined, mapa = null, montado = false;
  let aba = "mapa", filtroLugares = 0, selecionada = null;

  function montar() {
    const b = baile;
    const hora = horarioBaile(b);
    const lista = Number(b.promo) > 0 ? `<span class="selo">Na lista ${esc(brl(b.promo))}</span>` : "";
    const preco = Number(b.ingresso) > 0 ? `${esc(brl(b.ingresso))} / pessoa` : "Consulte os valores";
    raiz.innerHTML = `
      <a class="voltar" href="#/bailes">${icone("seta").replace("<svg", '<svg width="16" height="16"')} Programação</a>
      <div class="destaque">
        <div class="linha entre"><span class="rotulo">${b.turno === "unico" ? "Baile" : "Baile de " + esc(TURNOS[b.turno].toLowerCase())}</span></div>
        <h2>${esc(tituloBaile(b))}</h2>
        ${b.estilo ? `<div class="estilo">${esc(b.estilo)}</div>` : ""}
        <div class="selos"><span class="selo">${esc(dataLonga(b.data))}</span>${hora ? `<span class="selo">${esc(hora)}</span>` : ""}
          <span class="selo ouro">${preco}</span>${lista}</div>
        ${b.obs ? `<p class="small" style="margin-top:12px;color:rgba(255,243,228,.85)">${esc(b.obs)}</p>` : ""}
      </div>
      <div style="height:20px"></div>
      ${b.reservavel ? reservaHTML() : naoReservaHTML()}
      <div style="height:20px"></div>
      <div class="grade-2 igual">${enderecoCard()}${horariosCard()}</div>`;
    if (b.reservavel) {
      mapa = criarMapa(q(raiz, "#mapa-host"), { publico: true, aoClicar: abrirMesa });
      atualizar();
    }
    montado = true;
  }

  function naoReservaHTML() {
    return `<div class="cartao areia"><h3>Reserva de mesa</h3>
      <p class="muted small">A Zais faz reserva de mesa nos bailes de sábado, que são da própria casa. Para este evento, fale com a organização (o contato está no flyer do evento) ou chame a gente no WhatsApp.</p>
      <a class="btn btn-zap btn-bloco" style="margin-top:12px" href="${linkWhats(ZAIS.whatsapp.numero, "Olá! Gostaria de informações sobre o baile de " + dataLonga(baile.data) + ".")}" target="_blank" rel="noopener">WhatsApp ${esc(ZAIS.whatsapp.rotulo)}</a></div>`;
  }

  function reservaHTML() {
    const b = baile;
    const p2 = precoMesa(b, 2), p4 = precoMesa(b, 4);
    return `<section>
      <div class="titulo-secao"><h2>Escolha sua mesa</h2><span class="small muted" id="contagem"></span></div>
      <div class="abas" id="abas"><button class="aba ativa" data-acao="aba" data-aba="mapa">Mapa do salão</button><button class="aba" data-acao="aba" data-aba="lista">Lista de mesas livres</button></div>
      <div style="height:12px"></div>
      <div id="aba-mapa">${zonasChips()}${ferramentasMapa()}<div class="mapa-caixa" id="mapa-host"></div>${legendaPublico()}</div>
      <div id="aba-lista" hidden></div>
      <div class="cartao areia" style="margin-top:16px"><h3>Como funciona</h3>
        <p class="small muted">Mesa de 4 lugares${p4 ? " " + esc(p4) : ""} · mesa de 2 lugares${p2 ? " " + esc(p2) : ""}. A bilheteria é cobrada por pessoa, à parte.
        Toque numa mesa livre e fale com a gente pelo WhatsApp: a equipe confirma a sua reserva.</p></div>
    </section>`;
  }

  function atualizar() {
    if (!montado || !baile.reservavel) return;
    if (status === undefined) return;
    // Sem dados do mapa (documento ausente ou erro): nada aparece como livre.
    const st = status || Object.fromEntries(MESAS.map((m) => [m.n, "bloqueada"]));
    if (mapa) mapa.atualizar({ status: st, selecionada });
    const livres = Object.values(st).filter((v) => v === "livre").length;
    const c = q(raiz, "#contagem");
    if (c) c.textContent = status ? `${livres} mesas livres` : "Mapa indisponível agora";
    if (aba === "lista") desenharLista();
  }

  function desenharLista() {
    const box = q(raiz, "#aba-lista");
    const st = status || {};
    const chips = [[0, "Todas"], [2, "2 lugares"], [4, "4 lugares"]]
      .map(([v, r]) => `<button class="chip${filtroLugares === v ? " ativo" : ""}" data-acao="lugares" data-v="${v}">${r}</button>`).join("");
    let html = `<div class="chips">${chips}</div>`;
    if (!status) html += vazio("Mapa indisponível", "Não conseguimos carregar as mesas agora. Tente de novo em instantes.");
    else {
      let total = 0;
      for (const z of ZONAS) {
        const mesas = MESAS.filter((m) => m.zona === z.id && st[m.n] === "livre" && (!filtroLugares || m.lugares === filtroLugares));
        if (!mesas.length) continue;
        total += mesas.length;
        html += `<div class="grupo-mesas"><h4>${esc(z.nome)} · ${mesas.length}</h4><div class="lista-mesas">` +
          mesas.map((m) => `<button class="mesa-card livre" data-acao="mesa" data-mesa="${m.n}"><b>Mesa ${m.n}</b><small>${m.lugares} lugares${precoMesa(baile, m.lugares) ? " · " + esc(precoMesa(baile, m.lugares)) : ""}</small></button>`).join("") +
          `</div></div>`;
      }
      if (!total) html += vazio("Nenhuma mesa livre com esse filtro", "Tente outro filtro ou fale com a gente pelo WhatsApp.");
    }
    box.innerHTML = html;
  }

  function abrirMesa(n) {
    if (!status || status[n] !== "livre") {
      aviso(status ? "Esta mesa não está disponível." : "Mapa indisponível agora.", "erro");
      return;
    }
    selecionada = n;
    atualizar();
    const lug = lugaresDe(n);
    const preco = precoMesa(baile, lug);
    const msg =
      `Olá! Gostaria de reservar a mesa ${n} (${lug} lugares) para o baile de ${dataLonga(baile.data)}` +
      `${baile.turno !== "unico" ? " (" + TURNOS[baile.turno].toLowerCase() + ")" : ""}.\n\nNome: \nQuantidade de pessoas: `;
    abrirFolha({
      render: () => `<h2>Mesa ${n}</h2>
        <p class="sub">${lug} lugares${preco ? " · " + esc(preco) : ""} · ${esc(dataLonga(baile.data))}</p>
        <div class="pilha" style="margin-top:16px">
          <p class="small muted">Para garantir a mesa, mande uma mensagem para a equipe da Zais. Ela confirma a reserva com você. A bilheteria é cobrada por pessoa, à parte.</p>
          <a class="btn btn-zap btn-bloco" href="${linkWhats(ZAIS.whatsapp.numero, msg)}" target="_blank" rel="noopener">Reservar pelo WhatsApp</a>
          <button class="btn btn-sec btn-bloco" data-fechar-folha>Escolher outra mesa</button>
        </div>`,
      aoFechar: () => { selecionada = null; atualizar(); },
    });
  }

  acoes.aba = (el) => {
    aba = el.dataset.aba;
    raiz.querySelectorAll("#abas .aba").forEach((b) => b.classList.toggle("ativa", b === el));
    q(raiz, "#aba-mapa").hidden = aba !== "mapa";
    q(raiz, "#aba-lista").hidden = aba !== "lista";
    if (aba === "lista") desenharLista();
  };
  acoes.lugares = (el) => { filtroLugares = Number(el.dataset.v); desenharLista(); };
  acoes.mesa = (el) => abrirMesa(el.dataset.mesa);
  acoes.zona = (el) => { if (!mapa) return; el.dataset.zona === "geral" ? mapa.visaoGeral() : mapa.irParaZona(el.dataset.zona); };
  acoes["zoom-mais"] = () => mapa && mapa.zoomMais();
  acoes["zoom-menos"] = () => mapa && mapa.zoomMenos();

  function tentarMontar() {
    if (baile === undefined) return;
    if (baile === null) {
      raiz.innerHTML = `<a class="voltar" href="#/bailes">Programação</a>` +
        vazio(erro ? "Não foi possível carregar este baile" : "Baile não encontrado", erro ? "Tente de novo em instantes." : "Ele pode ter sido removido ou o endereço está errado.");
      return;
    }
    if (!montado) montar();
    else atualizar();
  }

  const d1 = ctx.api.ouvirBaile(id, (b, err) => { baile = b; erro = err || null; tentarMontar(); });
  const d2 = ctx.api.ouvirOcupacao(id, (s) => { status = s; atualizar(); });
  return () => { d1(); d2(); fecharFolha(); };
}

// =====================================================================
// Como chegar
// =====================================================================
export function viewChegar(ctx) {
  ctx.principal.innerHTML = `
    <div class="titulo-pagina"><h1>Como chegar</h1><p>${esc(ZAIS.endereco)} · ${esc(ZAIS.bairro)}</p></div>
    <div class="grade-2 igual">
      <div class="pilha">${enderecoCard()}${contatoCard()}</div>
      <div class="pilha">${horariosCard()}</div>
    </div>`;
  return () => {};
}

// =====================================================================
// Sem conexão com o banco de dados (a parte informativa continua funcionando)
// =====================================================================
export function viewSemDados(ctx, mensagem) {
  ctx.principal.innerHTML = `
    <div class="aviso" style="margin-bottom:16px">${esc(mensagem || "Não foi possível conectar agora. Mostrando só as informações fixas da casa.")}</div>
    <div class="grade-2 igual"><div class="pilha">${enderecoCard()}${contatoCard()}</div><div class="pilha">${horariosCard()}</div></div>`;
  return () => {};
}
