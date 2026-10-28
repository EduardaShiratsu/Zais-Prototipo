// Mapa de mesas em SVG, com zoom e atalhos por zona.
// O mapa é criado uma vez e só atualizado depois (assim o zoom e a posição
// da rolagem não se perdem quando alguém reserva uma mesa).
import { MESAS, VIEWBOX, MESA, ZONA_GEO } from "./layout.js";
import { esc } from "./util.js";
import { ROTULO_STATUS } from "./dominio.js";

const NS = "http://www.w3.org/2000/svg";

function cadeiras(lugares) {
  // 2 lugares: cadeiras dos lados. 4 lugares: dos quatro lados.
  let s =
    `<rect class="cad" x="-8" y="10" width="5" height="20" rx="2"/>` +
    `<rect class="cad" x="43" y="10" width="5" height="20" rx="2"/>`;
  if (lugares >= 4) {
    s +=
      `<rect class="cad" x="10" y="-8" width="20" height="5" rx="2"/>` +
      `<rect class="cad" x="10" y="43" width="20" height="5" rx="2"/>`;
  }
  return s;
}

function abreviar(nome) {
  const n = String(nome || "").trim();
  if (n.length <= 12) return n;
  return n.slice(0, 11) + "…";
}

function montarSvg(publico) {
  const mesas = MESAS.map(
    (m) =>
      `<g class="mesa s-livre" data-mesa="${m.n}" transform="translate(${m.x} ${m.y})">` +
      `<title></title><rect class="area" x="-10" y="-10" width="60" height="60"/>` +
      cadeiras(m.lugares) +
      `<rect class="tampo" x="0" y="0" width="${MESA}" height="${MESA}" rx="6"/>` +
      `<text class="num" x="20" y="26">${m.n}</text>` +
      `<text class="nome" x="20" y="${m.lugares >= 4 ? 60 : 55}"></text></g>`
  ).join("");
  return (
    `<svg class="mapa-svg ${publico ? "publico" : ""}" xmlns="${NS}" viewBox="${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}" role="group" aria-label="Mapa de mesas do salão">` +
    `<rect class="deco-pista" x="230" y="415" width="540" height="110" rx="26"/>` +
    `<text class="deco-rotulo" x="500" y="478">PISTA</text>` +
    `<text class="deco-rotulo" x="110" y="478">ENTRADA</text>` +
    `<rect class="deco-palco" x="822" y="352" width="92" height="180" rx="8"/>` +
    `<text class="deco-rotulo claro" transform="translate(878 442) rotate(90)">PALCO</text>` +
    mesas +
    `</svg>`
  );
}

export function criarMapa(host, { publico = false, aoClicar } = {}) {
  host.innerHTML = `<div class="mapa-wrap">${montarSvg(publico)}</div>`;
  const wrap = host.querySelector(".mapa-wrap");
  const svg = host.querySelector("svg");
  const grupos = {};
  svg.querySelectorAll(".mesa").forEach((g) => (grupos[g.dataset.mesa] = g));

  let zoom = 1;
  const escala = () => svg.clientWidth / VIEWBOX.w;

  function definirZoom(novo, centro) {
    const antes = escala();
    const cx = centro ? centro.x : (wrap.scrollLeft + wrap.clientWidth / 2) / antes;
    const cy = centro ? centro.y : (wrap.scrollTop + wrap.clientHeight / 2) / antes;
    zoom = Math.min(4, Math.max(1, novo));
    svg.style.width = Math.round(wrap.clientWidth * zoom) + "px";
    const depois = escala();
    wrap.scrollLeft = cx * depois - wrap.clientWidth / 2;
    wrap.scrollTop = cy * depois - wrap.clientHeight / 2;
  }

  // No celular, começa ampliado para as mesas ficarem grandes o bastante para o toque.
  zoom = wrap.clientWidth < 640 ? 2 : 1;
  svg.style.width = Math.round(wrap.clientWidth * zoom) + "px";

  svg.addEventListener("click", (e) => {
    const g = e.target.closest(".mesa");
    if (g && aoClicar) aoClicar(g.dataset.mesa);
  });

  return {
    atualizar({ status = {}, nomes = {}, selecionada = null } = {}) {
      for (const m of MESAS) {
        const g = grupos[m.n];
        const st = status[m.n] || "livre";
        g.setAttribute("class", `mesa s-${st}${selecionada === m.n ? " sel" : ""}`);
        const nome = nomes[m.n] || "";
        g.querySelector(".nome").textContent = publico ? "" : abreviar(nome);
        const rot = publico
          ? st === "livre" ? "Livre" : "Ocupada"
          : ROTULO_STATUS[st] + (nome ? ` — ${nome}` : "");
        g.querySelector("title").textContent = `Mesa ${m.n} · ${m.lugares} lugares · ${rot}`;
      }
    },
    zoomMais() { definirZoom(zoom * 1.4); },
    zoomMenos() { definirZoom(zoom / 1.4); },
    irParaZona(id) {
      const g = ZONA_GEO[id];
      if (!g) return;
      const alvo = Math.min(3.4, Math.max(1, VIEWBOX.w / (g.w + 110)));
      definirZoom(alvo, { x: g.cx, y: g.cy });
      // Como o mapa não tem rolagem própria na vertical, leva a página até a zona.
      const topo = wrap.getBoundingClientRect().top + window.scrollY + (g.cy - VIEWBOX.y) * escala() - window.innerHeight / 2;
      window.scrollTo({ top: Math.max(0, topo), behavior: "smooth" });
    },
    visaoGeral() { definirZoom(1); wrap.scrollTo({ left: 0, top: 0 }); },
  };
}
