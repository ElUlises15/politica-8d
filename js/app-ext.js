// Política 8D — integración de las nuevas secciones con la app base.
// Se carga después del script principal de index.html (scripts clásicos, compatibles con file://).

const carnetState = {
  template: DEFAULT_TEMPLATE,
  format: "portrait",
  alias: cleanAlias(safeGet(localStorage, LS_ALIAS) || "")
};
let carnetBlob = null;      // PNG precalculado para que navigator.share no pierda la activación del usuario
let carnetVersion = 0;
let carnetTimer = null;
let pendingShared = null;   // resultado compartido que se está mostrando

// ---------- Resumen: referentes más parecidos ----------
function refCardHtml(r, i){
  const li = arr => arr.map(x => `<li>${escapeHtml(x.text)}</li>`).join("");
  return `<article class="ref-card ${i === 0 ? "top" : ""}">
    <div class="ref-rank">${i === 0 ? "Más parecido" : "#" + (i + 1)}</div>
    <div class="ref-head">
      <div class="avatar">${escapeHtml(r.actor.initials)}</div>
      <div class="ref-name">${escapeHtml(r.actor.name)}</div>
      <div class="ref-pct" title="${SIMILARITY_LABEL}">${r.similarity}%</div>
    </div>
    <div class="ref-meta">${r.n}/8 ejes comparables · confianza ${escapeHtml(r.actor.confidence)}</div>
    <div class="ref-label">${r.matchesTitle}</div>
    <ul>${li(r.matches)}</ul>
    <div class="ref-label">Diferencias principales</div>
    <ul>${r.differences.length ? li(r.differences) : `<li class="muted">Sin diferencias de 20 puntos o más.</li>`}</ul>
    <p class="ref-expl">${escapeHtml(r.explanation)}</p>
  </article>`;
}

function renderTopReferents(){
  const ranked = rankActors(results).slice(0, 3);
  $("#topReferentsCards").innerHTML = ranked.map(refCardHtml).join("");
  const top = ranked[0];
  $("#closestSummary").innerHTML = top
    ? `<strong>Referente más parecido en el modelo:</strong> ${escapeHtml(top.actor.name)} (${top.similarity}%). Mirá el detalle más abajo, en “Referente más parecido”.<br><span style="color:#9eabc0">${SIMILARITY_LABEL}: es aproximada, no científica y no indica afinidad política.</span>`
    : "";
}

// ---------- Carnet y compartir ----------
function carnetFilename(){
  const f = CARNET_FORMATS[carnetState.format];
  return `politica-8d-${carnetState.template}-${f.w}x${f.h}.png`;
}

function updateCarnet(){
  if(!results) return;
  const canvas = renderCarnet(carnetState.template, carnetState.format, {canvas:$("#carnetCanvas"), alias:carnetState.alias});
  const v = ++carnetVersion;
  carnetBlob = null;
  canvasToBlob(canvas).then(b => { if(v === carnetVersion) carnetBlob = b; });
}
function scheduleCarnet(delay){
  clearTimeout(carnetTimer);
  carnetTimer = setTimeout(updateCarnet, delay == null ? 120 : delay);
}

function syncSelectors(){
  $$("#templateSelector .seg-btn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.template === carnetState.template)));
  $$("#formatSelector .seg-btn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.format === carnetState.format)));
}

function renderShareTab(){
  $("#shareText").value = buildShareText(results);
  syncSelectors();
  scheduleCarnet(0);
}

function currentShareUrl(){
  const top = rankActors(results)[0];
  return encodeShare(results, top && top.actor.id);
}

function copyWithToast(text, okMsg){
  return copyText(text).then(ok => showToast(ok ? okMsg : "No se pudo copiar. Seleccioná el texto y copialo a mano."));
}

async function shareResult(){
  const text = buildShareText(results);
  const url = currentShareUrl();
  const blob = carnetBlob || await canvasToBlob($("#carnetCanvas"));
  try{
    if(blob && navigator.canShare && typeof File === "function"){
      const file = new File([blob], carnetFilename(), {type:"image/png"});
      if(navigator.canShare({files:[file]})){
        await navigator.share({files:[file], title:"Política 8D", text});
        return;
      }
    }
    if(navigator.share){
      await navigator.share({title:"Política 8D", text:text.replace(url, "").trim(), url});
      return;
    }
  }catch(e){
    if(e && e.name === "AbortError") return; // el usuario canceló
  }
  copyWithToast(text, "Tu navegador no permite compartir directo: copiamos el resumen para que lo pegues donde quieras.");
}

function initCarnetControls(){
  $("#privacyShareBody").innerHTML = privacyHtml();
  $("#templateSelector").innerHTML = Object.values(CARNET_TEMPLATES)
    .map(t => `<button type="button" class="seg-btn" data-template="${t.id}">${escapeHtml(t.label)}</button>`).join("");
  $("#formatSelector").innerHTML = Object.entries(CARNET_FORMATS)
    .map(([id, f]) => `<button type="button" class="seg-btn" data-format="${id}">${f.label}</button>`).join("");
  $$("#templateSelector .seg-btn").forEach(b => b.onclick = () => { carnetState.template = b.dataset.template; syncSelectors(); scheduleCarnet(0); });
  $$("#formatSelector .seg-btn").forEach(b => b.onclick = () => { carnetState.format = b.dataset.format; syncSelectors(); scheduleCarnet(0); });

  const alias = $("#carnetAlias");
  alias.value = carnetState.alias;
  alias.addEventListener("input", () => {
    carnetState.alias = cleanAlias(alias.value);
    if(carnetState.alias) safeSet(localStorage, LS_ALIAS, carnetState.alias);
    else safeRemove(localStorage, LS_ALIAS);
    scheduleCarnet();
  });

  $("#btnDownload").onclick = async () => {
    const blob = carnetBlob || await canvasToBlob($("#carnetCanvas"));
    if(!blob){ showToast("No se pudo generar la imagen en este navegador."); return; }
    downloadBlob(blob, carnetFilename());
    showToast("Imagen descargada.");
  };
  $("#btnCopyLink").onclick = () => copyWithToast(currentShareUrl(),
    isFileProtocol() ? "Enlace copiado. Ojo: estás usando el archivo local, así que sólo funciona en este dispositivo." : "Enlace copiado. Sólo incluye tus 8 puntajes.");
  $("#btnCopySummary").onclick = () => copyWithToast($("#shareText").value, "Resumen copiado.");
  $("#btnShare").onclick = shareResult;
  $("#btnShareResult").onclick = () => { activateTab("share"); $("#tab-share").scrollIntoView({behavior:"smooth", block:"start"}); };

  // comparación
  $("#btnDownloadCompare").onclick = async () => {
    const f = loadFriend();
    if(!f || !results) return;
    const blob = await canvasToBlob(renderCompareCard(results, f.scores));
    if(!blob){ showToast("No se pudo generar la imagen en este navegador."); return; }
    downloadBlob(blob, "politica-8d-comparacion-1080x1350.png");
    showToast("Comparación descargada.");
  };
  $("#btnGoShare").onclick = () => activateTab("share");
  $("#btnRemoveCompare").onclick = () => {
    clearFriend();
    renderCompareTab();
    activateTab("summary");
    showToast("Comparación quitada.");
  };
}

// ---------- Vista compartida (#r=...) ----------
function handleHash(){
  const h = location.hash || "";
  if(h.startsWith("#r=")){
    const d = decodeShare(h);
    if(d){
      pendingShared = d;
      setNoindex(true);
      $("#hashNotice").classList.add("hidden");
      renderSharedScreen(d);
      showScreen("sharedScreen");
      return true;
    }
    pendingShared = null;
    setNoindex(false);
    $("#hashNotice").classList.remove("hidden");
    if($("#sharedScreen").classList.contains("active")) showScreen("homeScreen");
    showToast("El enlace compartido no es válido o está incompleto.");
    return false;
  }
  pendingShared = null;
  setNoindex(false);
  if($("#sharedScreen").classList.contains("active")) showScreen("homeScreen");
  return false;
}

function leaveSharedView(){
  clearHash();
  setNoindex(false);
}

function updateFriendBanner(){
  $("#friendPending").classList.toggle("hidden", !loadFriend() || !!results);
}

function initSharedControls(){
  $("#btnCompareStart").onclick = () => {
    if(!pendingShared) return;
    saveFriend(pendingShared);
    leaveSharedView();
    // si en memoria quedó un test terminado, se arranca uno nuevo
    if(!answers.some(v => v === null)){ answers = Array(QUESTIONS.length).fill(null); current = 0; }
    loadProgress();
    renderQuestion();
    showScreen("quizScreen");
  };
  $("#btnCompareNow").onclick = () => {
    const last = loadLastResult();
    if(!pendingShared || !last) return;
    saveFriend(pendingShared);
    safeSet(sessionStorage, SS_COMPARE_ACTIVE, "1");
    leaveSharedView();
    results = last;
    renderResults();
    activateTab("compare");
    showScreen("resultsScreen");
  };
  $("#btnSharedHome").onclick = () => { leaveSharedView(); pendingShared = null; showScreen("homeScreen"); };
  $("#btnDiscardFriend").onclick = () => { clearFriend(); updateFriendBanner(); };
  $("#btnHashNoticeClose").onclick = () => { $("#hashNotice").classList.add("hidden"); leaveSharedView(); };
}

// Llamado por finishTest() después de renderResults().
function onResultsReady(){
  saveLastResult(results);
  updateFriendBanner();
  if(loadFriend()){
    safeSet(sessionStorage, SS_COMPARE_ACTIVE, "1");
    renderCompareTab();
    activateTab("compare");
  }else{
    activateTab("summary");
  }
}

// ---------- Hook de pruebas ----------
function setAnswersForTest(values){
  if(!Array.isArray(values) || values.length !== QUESTIONS.length ||
     !values.every(v => Number.isInteger(v) && v >= 1 && v <= 5)){
    throw new Error("setAnswersForTest: se esperan 48 valores enteros de 1 a 5");
  }
  answers = values.slice();
  current = QUESTIONS.length - 1;
  finishTest();
  return results;
}

window.P8D = {computeSimilarity, rankActors, encodeShare, decodeShare, renderCarnet, setAnswersForTest, compareProfiles, renderCompareCard};

// ---------- Arranque ----------
initCarnetControls();
initSharedControls();
window.addEventListener("hashchange", handleHash);
if(!handleHash()){
  const friend = loadFriend(), last = loadLastResult();
  if(friend && last && safeGet(sessionStorage, SS_COMPARE_ACTIVE) === "1"){
    // recarga durante una comparación: se restaura la vista
    results = last;
    renderResults();
    activateTab("compare");
    showScreen("resultsScreen");
  }
  updateFriendBanner();
}
