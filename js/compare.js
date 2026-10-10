// Política 8D — vista compartida y comparación "Vos vs tu amigo" (secs. 50–52, 54)

const COLOR_USER = "#8ab4ff";
const COLOR_FRIEND = "#85d7b6";

// Radar SVG genérico con el mismo estilo que renderRadar(). series: [{scores, color, fill}]
function radarSvg(series, label){
  const W = 720, H = 590, cx = W / 2, cy = H / 2 + 5, R = 195;
  const angle = i => -Math.PI / 2 + i * (2 * Math.PI / AXIS_KEYS.length);
  const pt = (i, val) => { const r = R * (val / 100), a = angle(i); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(label || "Radar 8D")}">`;
  [20, 40, 60, 80, 100].forEach(level => {
    const poly = AXIS_KEYS.map((k, i) => pt(i, level).join(",")).join(" ");
    svg += `<polygon points="${poly}" fill="none" stroke="${level === 100 ? "#39465c" : "#273145"}" stroke-width="1"/>`;
  });
  AXIS_KEYS.forEach((k, i) => {
    const [x2, y2] = pt(i, 100);
    svg += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#273145"/>`;
    const [lx, ly] = pt(i, 122);
    svg += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="#aab4c5" font-size="24">${AXES[k].short}</text>`;
  });
  series.forEach(s => {
    const poly = AXIS_KEYS.map((k, i) => pt(i, s.scores[k]).join(",")).join(" ");
    svg += `<polygon points="${poly}" fill="${s.fill}" stroke="${s.color}" stroke-width="3"/>`;
  });
  return svg + "</svg>";
}

// Compatibilidad = clamp(100 − rms de las 8 diferencias).
function compareProfiles(user, friend){
  const rows = AXIS_KEYS.map(k => {
    const u = Math.round(user[k]), f = Math.round(friend[k]);
    return {axis:k, user:u, friend:f, diff:Math.abs(u - f)};
  });
  const rms = Math.sqrt(rows.reduce((a, r) => a + r.diff * r.diff, 0) / rows.length);
  const compatibility = Math.round(clamp(100 - rms, 0, 100));
  const best = rows.slice().sort((a, b) => a.diff - b.diff)[0];
  const worst = rows.slice().sort((a, b) => b.diff - a.diff)[0];
  const bestText = `${AXES[best.axis].name}: vos ${best.user}, tu amigo ${best.friend} (diferencia ${best.diff}).`;
  const worstPole = worst.friend > worst.user ? AXES[worst.axis].high : AXES[worst.axis].low;
  const worstText = worst.diff === 0
    ? `${AXES[worst.axis].name}: no hay diferencias entre ustedes.`
    : `${AXES[worst.axis].name}: vos ${worst.user}, tu amigo ${worst.friend} (diferencia ${worst.diff}). Tu amigo se ubica más hacia “${worstPole}”.`;
  return {rows, rms, compatibility, best, worst, bestText, worstText};
}

// ---------- Vista compartida ----------
function renderSharedScreen(shared){
  const s = shared.scores;
  const top = rankActors(s)[0];
  $("#sharedAxes").innerHTML = AXIS_KEYS.map(k => `
    <div class="axis-row">
      <div class="axis-labels"><span>${AXES[k].low}</span><strong>${AXES[k].name} <span class="score-badge friend">${s[k]}</span></strong><span>${AXES[k].high}</span></div>
      <div class="track"><div class="user-marker friend" style="left:${s[k]}%"></div></div>
    </div>`).join("");
  $("#sharedRadar").innerHTML = radarSvg([{scores:s, color:COLOR_FRIEND, fill:"rgba(133,215,182,.14)"}], "Radar del resultado compartido");
  let ref = "";
  if(top){
    ref = `<strong>Referente más parecido en el modelo:</strong> ${escapeHtml(top.actor.name)} · ${top.similarity}% <span class="muted">(${top.n}/8 ejes comparables)</span>`;
    if(shared.topId && shared.topId !== top.actor.id){
      const enc = ACTORS.find(a => a.id === shared.topId);
      ref += `<br><span class="muted">El enlace indicaba ${escapeHtml(enc.name)}; se recalculó con la versión actual del modelo.</span>`;
    }
    ref += `<br><span class="muted">${SIMILARITY_LABEL}. ${SIMILARITY_NOTE}</span>`;
  }
  $("#sharedReferent").innerHTML = ref;
  $("#btnCompareNow").classList.toggle("hidden", !loadLastResult());
}

// ---------- Pestaña de comparación ----------
function renderCompareTab(){
  const friend = loadFriend();
  const tabBtn = $('.tab[data-tab="compare"]');
  if(!friend || !results){
    tabBtn.classList.add("hidden");
    if($("#tab-compare").classList.contains("active")) activateTab("summary");
    return false;
  }
  tabBtn.classList.remove("hidden");
  const c = compareProfiles(results, friend.scores);
  $("#compareRows").innerHTML = c.rows.map(r => `
    <div class="axis-row compare-row">
      <div class="axis-labels"><span>${AXES[r.axis].low}</span><strong>${AXES[r.axis].name}</strong><span>${AXES[r.axis].high}</span></div>
      <div class="track">
        <div class="user-marker friend" style="left:${r.friend}%"></div>
        <div class="user-marker" style="left:${r.user}%"></div>
      </div>
      <div class="compare-nums"><span class="c-user">Vos ${r.user}</span><span class="c-friend">Tu amigo ${r.friend}</span><span class="c-diff">Diferencia ${r.diff}</span></div>
    </div>`).join("");
  $("#compareRadar").innerHTML = radarSvg([
    {scores:friend.scores, color:COLOR_FRIEND, fill:"rgba(133,215,182,.12)"},
    {scores:results, color:COLOR_USER, fill:"rgba(138,180,255,.12)"}
  ], "Radar comparado");
  $("#compareCompat").textContent = `Compatibilidad política 8D: ${c.compatibility}%`;
  $("#compareBest").textContent = c.bestText;
  $("#compareWorst").textContent = c.worstText;
  return true;
}

// ---------- Imagen de comparación 1080×1350 ----------
function renderCompareCard(user, friend, canvas){
  const W = 1080, H = 1350;
  canvas = canvas || document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const c = compareProfiles(user, friend);
  drawBackground(ctx, W, H);
  drawHeader(ctx, W, H, {title:"Vos vs tu amigo"}, "POLÍTICA 8D · Vos vs tu amigo");
  // leyenda
  const legend = (x, color, text) => {
    ctx.beginPath(); ctx.arc(x + 10, 216, 10, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    return drawText(ctx, text, x + 30, 226, {size:28, weight:700, color:CV.soft});
  };
  const lw = legend(PAD, COLOR_USER, "Vos");
  legend(PAD + lw + 70, COLOR_FRIEND, "Tu amigo");

  drawRadarCanvas(ctx, {x0:PAD, x1:W - PAD, cy:480, maxR:175}, [
    {scores:friend, color:COLOR_FRIEND, fill:"rgba(133,215,182,.14)"},
    {scores:user, color:COLOR_USER, fill:"rgba(138,180,255,.14)"}
  ], {labelSize:26});

  drawText(ctx, `Compatibilidad política 8D: ${c.compatibility}%`, PAD, 760, {size:40, weight:850, maxW:W - PAD * 2});
  drawText(ctx, "Sólo mide cercanía en estos 8 ejes; no resume afinidad política ni personal.", PAD, 796, {size:22, color:CV.muted, maxW:W - PAD * 2});

  // filas
  const colU = 700, colF = 850, colD = W - PAD;
  drawText(ctx, "Vos", colU, 838, {size:22, weight:800, color:COLOR_USER, align:"right"});
  drawText(ctx, "Amigo", colF, 838, {size:22, weight:800, color:COLOR_FRIEND, align:"right"});
  drawText(ctx, "Dif.", colD, 838, {size:22, weight:800, color:CV.muted, align:"right"});
  c.rows.forEach((r, i) => {
    const y = 874 + i * 35;
    drawText(ctx, AXES[r.axis].name, PAD, y, {size:28, weight:600, color:CV.soft, maxW:colU - PAD - 120});
    drawText(ctx, String(r.user), colU, y, {size:28, weight:800, color:COLOR_USER, align:"right"});
    drawText(ctx, String(r.friend), colF, y, {size:28, weight:800, color:COLOR_FRIEND, align:"right"});
    drawText(ctx, String(r.diff), colD, y, {size:28, weight:700, color:CV.muted, align:"right"});
  });
  ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(PAD, 1136, W - PAD * 2, 2);
  const wB = drawText(ctx, "Mayor coincidencia · ", PAD, 1176, {size:26, weight:700, color:CV.muted});
  drawText(ctx, `${AXES[c.best.axis].name}: vos ${c.best.user} · amigo ${c.best.friend}`, PAD + wB, 1176, {size:26, weight:700, maxW:W - PAD * 2 - wB, minSize:18});
  const wW = drawText(ctx, "Mayor diferencia · ", PAD, 1212, {size:26, weight:700, color:CV.muted});
  drawText(ctx, `${AXES[c.worst.axis].name}: vos ${c.worst.user} · amigo ${c.worst.friend}`, PAD + wW, 1212, {size:26, weight:700, maxW:W - PAD * 2 - wW, minSize:18});
  drawFooter(ctx, W, H, {url:siteUrl()});
  return canvas;
}
