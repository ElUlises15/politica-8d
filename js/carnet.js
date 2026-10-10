// Política 8D — "Carnet político" en canvas (secs. 40, 41, 46, 47)
// Arquitectura: CARNET_TEMPLATES es un registro {id, label, draw(ctx, data, W, H)}.
// renderCarnet() dibuja el marco común (fondo, encabezado, pie) y delega el cuerpo en la plantilla.

const CARNET_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const CV = {
  bg:"#0b0d12", panel:"#121620", panel2:"#171c28", line:"#2b3447", grid:"#273145", gridOuter:"#39465c",
  text:"#f3f5f7", soft:"#c3cada", muted:"#9ba6b8", accent:"#8ab4ff", accent2:"#b69cff", friend:"#85d7b6"
};
const CARNET_FORMATS = {portrait:{w:1080, h:1350, label:"1080×1350"}, square:{w:1080, h:1080, label:"1080×1080"}};
const DEFAULT_TEMPLATE = "completo";
const PAD = 64;

// ---------- Helpers de texto ----------
function setFont(ctx, size, weight){ ctx.font = `${weight || 400} ${size}px ${CARNET_FONT}`; }

// Achica la fuente hasta minSize y, si aún no entra, trunca con "…". Deja la fuente seteada.
function fitText(ctx, text, maxW, size, weight, minSize){
  text = String(text);
  const min = minSize || Math.round(size * 0.72);
  let s = size;
  setFont(ctx, s, weight);
  while(s > min && ctx.measureText(text).width > maxW){ s--; setFont(ctx, s, weight); }
  if(ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while(t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

// Dibuja texto (opcionalmente ajustado a maxW). Devuelve el ancho dibujado.
function drawText(ctx, text, x, y, o){
  ctx.fillStyle = o.color || CV.text;
  ctx.textAlign = o.align || "left";
  ctx.textBaseline = o.baseline || "alphabetic";
  let t = String(text);
  if(o.maxW) t = fitText(ctx, t, o.maxW, o.size, o.weight, o.minSize);
  else setFont(ctx, o.size, o.weight);
  ctx.fillText(t, x, y);
  return ctx.measureText(t).width;
}

// Parte un texto en líneas de ancho máximo; la última se trunca si sobra.
function wrapLines(ctx, text, maxW, maxLines, size, weight){
  setFont(ctx, size, weight);
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach(w => {
    const test = line ? line + " " + w : w;
    if(ctx.measureText(test).width <= maxW || !line) line = test;
    else { lines.push(line); line = w; }
  });
  if(line) lines.push(line);
  if(lines.length > maxLines){
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fitText(ctx, kept[maxLines - 1] + " " + lines.slice(maxLines).join(" "), maxW, size, weight, size);
    return kept;
  }
  return lines.map(l => fitText(ctx, l, maxW, size, weight, size));
}

function roundRectPath(ctx, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fillRoundRect(ctx, x, y, w, h, r, fill, stroke, lw){
  roundRectPath(ctx, x, y, w, h, r);
  if(fill){ ctx.fillStyle = fill; ctx.fill(); }
  if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}

// ---------- Piezas comunes ----------
function drawBackground(ctx, W, H){
  ctx.fillStyle = CV.bg;
  ctx.fillRect(0, 0, W, H);
  const g1 = ctx.createRadialGradient(W * 0.15, -H * 0.05, 0, W * 0.15, -H * 0.05, W * 0.9);
  g1.addColorStop(0, "rgba(138,180,255,.16)"); g1.addColorStop(1, "rgba(138,180,255,0)");
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.8);
  g2.addColorStop(0, "rgba(182,156,255,.12)"); g2.addColorStop(1, "rgba(182,156,255,0)");
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  fillRoundRect(ctx, 24, 24, W - 48, H - 48, 36, null, "rgba(255,255,255,.08)", 2);
}

function drawHeader(ctx, W, H, data, kicker){
  const sq = H <= W;
  fillRoundRect(ctx, PAD, 56, 52, 52, 14, "rgba(138,180,255,.18)", "rgba(255,255,255,.10)", 2);
  drawText(ctx, "8D", PAD + 26, 83, {size:22, weight:800, align:"center", baseline:"middle"});
  drawText(ctx, kicker || "POLÍTICA 8D", PAD + 70, 92, {size:26, weight:800, color:CV.accent, maxW:W - PAD * 2 - 330});
  drawText(ctx, "8 ejes · test abierto", W - PAD, 92, {size:22, weight:600, color:CV.muted, align:"right"});
  drawText(ctx, data.title || "Mi Política 8D", PAD, sq ? 172 : 180, {size:sq ? 54 : 62, weight:850, maxW:W - PAD * 2});
  if(data.alias) drawText(ctx, data.alias, PAD, sq ? 214 : 226, {size:32, weight:600, color:CV.soft, maxW:W - PAD * 2, minSize:24});
}

function drawFooter(ctx, W, H, data){
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(PAD, H - 118, W - PAD * 2, 2);
  drawText(ctx, data.url || "Política 8D · test abierto", PAD, H - 72, {size:26, weight:700, color:CV.soft, maxW:W - PAD * 2, minSize:20});
  drawText(ctx, "Estimación aproximada · no es una medición científica", PAD, H - 38, {size:22, color:CV.muted, maxW:W - PAD * 2});
}

/**
 * Radar 8D en canvas que se ajusta a una caja horizontal.
 * box: {x0, x1, cy, maxR} → el radio se calcula midiendo las etiquetas para que nunca pisen el polígono
 * ni se salgan de [x0, x1]. series: [{scores, color, fill, width}]. o: {labelSize, highlight:[ejes]}
 * Devuelve {cx, cy, R}.
 */
function drawRadarCanvas(ctx, box, series, o){
  o = o || {};
  const N = AXIS_KEYS.length, ls = o.labelSize || 26, gap = 14;
  const ang = i => -Math.PI / 2 + i * (2 * Math.PI / N);
  setFont(ctx, ls, 800); // se mide con el peso más ancho
  const lw = AXIS_KEYS.map(k => ctx.measureText(AXES[k].short).width);
  const extent = (R, side) => AXIS_KEYS.reduce((m, k, i) => {
    const c = Math.cos(ang(i));
    if(Math.abs(c) < 0.2) return Math.max(m, lw[i] / 2);
    return (side < 0 ? c < 0 : c > 0) ? Math.max(m, Math.abs(c) * R + gap + lw[i]) : m;
  }, 0);
  const span = box.x1 - box.x0;
  let R = box.maxR;
  while(R > 40 && extent(R, -1) + extent(R, 1) > span) R -= 2;
  const L = extent(R, -1), Rt = extent(R, 1);
  const cx = box.x0 + L + Math.max(0, span - L - Rt) / 2, cy = box.cy;
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * v / 100, cy + Math.sin(ang(i)) * R * v / 100];
  ctx.lineWidth = 2;
  [20, 40, 60, 80, 100].forEach(level => {
    ctx.beginPath();
    AXIS_KEYS.forEach((k, i) => { const [x, y] = pt(i, level); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.strokeStyle = level === 100 ? CV.gridOuter : CV.grid;
    ctx.stroke();
  });
  AXIS_KEYS.forEach((k, i) => {
    const [x, y] = pt(i, 100);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.strokeStyle = CV.grid; ctx.stroke();
  });
  series.forEach(s => {
    ctx.beginPath();
    AXIS_KEYS.forEach((k, i) => { const [x, y] = pt(i, clamp(Number(s.scores[k]) || 0, 0, 100)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.fillStyle = s.fill; ctx.fill();
    ctx.lineJoin = "round"; ctx.lineWidth = s.width || 5; ctx.strokeStyle = s.color; ctx.stroke();
    AXIS_KEYS.forEach((k, i) => {
      const [x, y] = pt(i, clamp(Number(s.scores[k]) || 0, 0, 100));
      const hi = o.highlight && o.highlight.includes(k);
      ctx.beginPath(); ctx.arc(x, y, hi ? 11 : 6, 0, Math.PI * 2);
      ctx.fillStyle = hi ? CV.accent2 : s.color; ctx.fill();
    });
  });
  // Etiquetas: arriba/abajo centradas; a los costados alineadas hacia afuera.
  AXIS_KEYS.forEach((k, i) => {
    const hi = o.highlight && o.highlight.includes(k);
    const c = Math.cos(ang(i)), s = Math.sin(ang(i));
    let x, y, align;
    if(Math.abs(c) < 0.2){ x = cx; y = cy + s * (R + ls * 0.95); align = "center"; }
    else{ x = cx + c * R + (c > 0 ? gap : -gap); y = cy + s * R + s * ls * 0.4; align = c > 0 ? "left" : "right"; }
    drawText(ctx, AXES[k].short, x, y, {size:ls, weight:hi ? 800 : 600, color:hi ? CV.accent2 : CV.soft, align, baseline:"middle"});
  });
  return {cx, cy, R};
}

// Barra horizontal 0–100 con marcador.
function drawBar(ctx, x, y, w, h, score, color){
  fillRoundRect(ctx, x, y, w, h, h / 2, "#222a3a");
  ctx.fillStyle = "#59657a"; ctx.fillRect(x + w / 2 - 1, y - 4, 2, h + 8);
  const fw = Math.max(h, w * clamp(score, 0, 100) / 100);
  fillRoundRect(ctx, x, y, fw, h, h / 2, color || CV.accent);
  ctx.beginPath(); ctx.arc(x + w * clamp(score, 0, 100) / 100, y + h / 2, h * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = "#fff"; ctx.fill();
}

// Caja del referente #1 (compacta o con coincidencias/diferencias).
function drawTopRefBox(ctx, x, y, w, h, top, detailed){
  fillRoundRect(ctx, x, y, w, h, 26, "rgba(138,180,255,.07)", "rgba(138,180,255,.25)", 2);
  const ix = x + 28, iw = w - 56;
  if(!top){
    drawText(ctx, "Sin referentes comparables", ix, y + 60, {size:28, weight:700, maxW:iw});
    return;
  }
  if(!detailed){
    drawText(ctx, "REFERENTE MÁS CERCANO EN EL MODELO", ix, y + 44, {size:22, weight:800, color:CV.accent, maxW:iw});
    drawText(ctx, `${top.similarity}%`, x + w - 28, y + 108, {size:64, weight:850, color:CV.accent, align:"right"});
    drawText(ctx, top.actor.name, ix, y + 96, {size:42, weight:800, maxW:iw - 190, minSize:28});
    drawText(ctx, `Similitud en el modelo: ${top.similarity}% · ${top.n}/8 ejes comparables`, ix, y + 134, {size:24, color:CV.muted, maxW:iw - 190, minSize:18});
    return;
  }
  // Versión detallada: renglones fijos que se achican para entrar (alto mínimo ≈ 326px).
  const twoLines = h >= 360;
  drawText(ctx, "REFERENTE MÁS CERCANO", ix, y + 44, {size:22, weight:800, color:CV.accent, maxW:iw});
  drawText(ctx, top.actor.name, ix, y + 92, {size:38, weight:800, maxW:iw, minSize:22});
  drawText(ctx, `Similitud en el modelo: ${top.similarity}%`, ix, y + 132, {size:28, weight:800, color:CV.accent, maxW:iw, minSize:18});
  drawText(ctx, `${top.n}/8 ejes · confianza ${top.actor.confidence}`, ix, y + 164, {size:22, color:CV.muted, maxW:iw, minSize:16});
  drawText(ctx, top.matchesTitle, ix, y + 206, {size:22, weight:700, color:CV.muted, maxW:iw, minSize:16});
  const names = joinEs(top.matches.map(m => AXES[m.axis].name));
  let cy = y + 238;
  if(twoLines){
    wrapLines(ctx, names, iw, 2, 24, 700).forEach((l, i) => drawText(ctx, l, ix, cy + i * 30, {size:24, weight:700}));
    cy += 30;
  }else{
    drawText(ctx, names, ix, cy, {size:24, weight:700, maxW:iw, minSize:17});
  }
  const d = top.differences[0];
  drawText(ctx, "Diferencia principal", ix, cy + 42, {size:22, weight:700, color:CV.muted, maxW:iw, minSize:16});
  drawText(ctx, d ? `${AXES[d.axis].name}: vos ${Math.round(d.user)} · ref. ${Math.round(d.actor)}` : "Sin diferencias de 20 puntos o más",
    ix, cy + 74, {size:24, weight:700, maxW:iw, minSize:17});
}

// ---------- Plantillas ----------
const CARNET_TEMPLATES = {
  minimal: {
    id:"minimal", label:"Minimal",
    draw(ctx, data, W, H){
      const sq = H <= W;
      const series = [{scores:data.scores, color:CV.accent, fill:"rgba(138,180,255,.16)"}];
      if(!sq){
        drawRadarCanvas(ctx, {x0:PAD, x1:W - PAD, cy:520, maxR:200}, series, {labelSize:28});
        // 8 puntajes compactos en 2 columnas
        AXIS_KEYS.forEach((k, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const x0 = col ? 556 : PAD, x1 = col ? W - PAD : 524, y = 832 + row * 62;
          drawText(ctx, AXES[k].short, x0, y, {size:30, weight:600, color:CV.soft, maxW:300});
          drawText(ctx, String(Math.round(data.scores[k])), x1, y, {size:40, weight:850, align:"right"});
          ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(x0, y + 18, x1 - x0, 2);
        });
        drawTopRefBox(ctx, PAD, 1064, W - PAD * 2, 152, data.top, false);
      }else{
        drawRadarCanvas(ctx, {x0:PAD, x1:676, cy:494, maxR:190}, series, {labelSize:24});
        AXIS_KEYS.forEach((k, i) => {
          const y = 300 + i * 54;
          drawText(ctx, AXES[k].short, 712, y, {size:28, weight:600, color:CV.soft, maxW:220});
          drawText(ctx, String(Math.round(data.scores[k])), W - PAD, y, {size:36, weight:850, align:"right"});
          ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(712, y + 16, W - PAD - 712, 2);
        });
        drawTopRefBox(ctx, PAD, 792, W - PAD * 2, 150, data.top, false);
      }
    }
  },

  completo: {
    id:"completo", label:"Completo",
    draw(ctx, data, W, H){
      const sq = H <= W;
      const series = [{scores:data.scores, color:CV.accent, fill:"rgba(138,180,255,.16)"}];
      if(!sq){
        drawRadarCanvas(ctx, {x0:PAD, x1:650, cy:440, maxR:150}, series, {labelSize:26});
        drawTopRefBox(ctx, 670, 252, W - PAD - 670, 380, data.top, true);
        AXIS_KEYS.forEach((k, i) => {
          const y = 656 + i * 70, s = Math.round(data.scores[k]);
          drawText(ctx, AXES[k].name, PAD, y + 30, {size:30, weight:800, maxW:620});
          drawText(ctx, `${s}/100`, W - PAD, y + 30, {size:30, weight:850, align:"right"});
          drawText(ctx, softLabel(k, s), PAD, y + 62, {size:26, weight:500, color:CV.muted, maxW:570, minSize:20});
          drawBar(ctx, 660, y + 46, W - PAD - 660, 12, s);
        });
      }else{
        drawRadarCanvas(ctx, {x0:PAD, x1:600, cy:402, maxR:140}, series, {labelSize:22});
        drawTopRefBox(ctx, 620, 240, W - PAD - 620, 326, data.top, true);
        AXIS_KEYS.forEach((k, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const x0 = col ? 560 : PAD, cw = 456, y = 586 + row * 92, s = Math.round(data.scores[k]);
          drawText(ctx, AXES[k].name, x0, y + 28, {size:28, weight:800, maxW:cw - 110, minSize:20});
          drawText(ctx, `${s}/100`, x0 + cw, y + 28, {size:28, weight:850, align:"right"});
          drawText(ctx, softLabel(k, s), x0, y + 58, {size:23, weight:500, color:CV.muted, maxW:cw, minSize:18});
          drawBar(ctx, x0, y + 70, cw, 10, s);
        });
      }
    }
  },

  social: {
    id:"social", label:"Social",
    draw(ctx, data, W, H){
      const sq = H <= W;
      const series = [{scores:data.scores, color:CV.accent, fill:"rgba(138,180,255,.18)", width:6}];
      const markedLine = k => `${AXES[k].short} ${Math.round(data.scores[k])} — ${softLabel(k, data.scores[k])}`;
      const cta = (x, y, w, h) => {
        fillRoundRect(ctx, x, y, w, h, h / 2, CV.accent);
        drawText(ctx, "¿Y vos? Hacé el test", x + w / 2, y + h / 2 + 2, {size:32, weight:850, color:"#09101f", align:"center", baseline:"middle", maxW:w - 40});
      };
      if(!sq){
        drawRadarCanvas(ctx, {x0:PAD, x1:W - PAD, cy:520, maxR:220}, series, {labelSize:28, highlight:data.marked});
        drawText(ctx, "TUS 3 RASGOS MÁS MARCADOS", PAD, 838, {size:24, weight:800, color:CV.accent});
        data.marked.forEach((k, i) => {
          drawText(ctx, markedLine(k), PAD, 880 + i * 40, {size:30, weight:700, maxW:W - PAD * 2, minSize:22});
        });
        drawText(ctx, "REFERENTES MÁS PARECIDOS EN EL MODELO", PAD, 1010, {size:24, weight:800, color:CV.accent, maxW:W - PAD * 2});
        const bw = (W - PAD * 2 - 40) / 3;
        data.ranked.slice(0, 3).forEach((r, i) => {
          const x = PAD + i * (bw + 20);
          fillRoundRect(ctx, x, 1028, bw, 98, 20, i === 0 ? "rgba(138,180,255,.12)" : "rgba(255,255,255,.04)", i === 0 ? "rgba(138,180,255,.45)" : "rgba(255,255,255,.10)", 2);
          drawText(ctx, `${i + 1}. ${r.actor.name}`, x + 20, 1066, {size:26, weight:700, maxW:bw - 40, minSize:18});
          drawText(ctx, `${r.similarity}%`, x + 20, 1110, {size:34, weight:850, color:CV.accent});
        });
        cta(PAD, 1146, W - PAD * 2, 62);
      }else{
        drawRadarCanvas(ctx, {x0:PAD, x1:W - PAD, cy:466, maxR:175}, series, {labelSize:26, highlight:data.marked});
        const cw = 440, x1 = W - PAD - cw;
        drawText(ctx, "TUS RASGOS MÁS MARCADOS", PAD, 730, {size:22, weight:800, color:CV.accent, maxW:cw});
        data.marked.forEach((k, i) => {
          const s = Math.round(data.scores[k]), y = 772 + i * 38;
          const pole = s > 60 ? lowerFirst(AXES[k].high) : s < 40 ? lowerFirst(AXES[k].low) : "mixto";
          const w = drawText(ctx, `${AXES[k].short} ${s}`, PAD, y, {size:28, weight:800, maxW:cw - 120});
          drawText(ctx, `→ ${pole}`, PAD + w + 12, y, {size:24, weight:600, color:CV.muted, maxW:cw - w - 12, minSize:17});
        });
        drawText(ctx, "REFERENTES MÁS PARECIDOS", x1, 730, {size:22, weight:800, color:CV.accent, maxW:cw});
        data.ranked.slice(0, 3).forEach((r, i) => {
          const y = 772 + i * 38;
          drawText(ctx, `${r.similarity}%`, W - PAD, y, {size:28, weight:850, color:CV.accent, align:"right"});
          drawText(ctx, `${i + 1}. ${r.actor.name}`, x1, y, {size:26, weight:700, maxW:cw - 90, minSize:18});
        });
        cta(PAD, 870, W - PAD * 2, 62);
      }
    }
  }
};

// Ejes con mayor distancia al centro (50).
function mostMarkedAxes(scores, count){
  return AXIS_KEYS.slice().sort((a, b) => Math.abs(scores[b] - 50) - Math.abs(scores[a] - 50)).slice(0, count || 3);
}

function cleanAlias(s){
  return String(s || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 32);
}

/**
 * renderCarnet(templateId, format, opts) → canvas
 * format: "portrait" (1080×1350) | "square" (1080×1080)
 * opts: {alias, scores, canvas}
 */
function renderCarnet(templateId, format, opts){
  opts = opts || {};
  const tpl = CARNET_TEMPLATES[templateId] || CARNET_TEMPLATES[DEFAULT_TEMPLATE];
  const fmt = CARNET_FORMATS[format] ? format : "portrait";
  const W = CARNET_FORMATS[fmt].w, H = CARNET_FORMATS[fmt].h;
  const canvas = opts.canvas || document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const scores = opts.scores || (typeof results !== "undefined" && results) || scoresToObject(AXIS_KEYS.map(() => 50));
  const ranked = rankActors(scores);
  const data = {
    scores, ranked, top: ranked[0] || null,
    marked: mostMarkedAxes(scores, 3),
    alias: cleanAlias(opts.alias),
    url: siteUrl()
  };
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H);
  drawHeader(ctx, W, H, data);
  tpl.draw(ctx, data, W, H);
  drawFooter(ctx, W, H, data);
  canvas.dataset.template = tpl.id;
  canvas.dataset.format = fmt;
  return canvas;
}
