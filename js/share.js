// Política 8D — enlace reproducible, portapapeles, toast y texto para compartir (secs. 48–50, 53)
// El enlace sólo lleva: versión + 8 puntajes enteros + id opcional del referente, en el hash.

const SHARE_VERSION = "1";
const SITE_URL = ""; // fallback cuando no hay URL pública (file://): se omite la línea de URL
const LS_LAST_RESULT = "politica8d-last-result";
const LS_ALIAS = "politica8d-alias";
const SS_FRIEND = "politica8d-friend";
const SS_COMPARE_ACTIVE = "politica8d-compare-active";

function isFileProtocol(){ return location.protocol === "file:"; }

// URL base de la página, sin hash.
function baseUrl(){
  if(isFileProtocol() || !location.origin || location.origin === "null") return location.href.split("#")[0];
  return location.origin + location.pathname;
}

// URL "pública" para mostrar en las imágenes: nunca una ruta local.
function siteUrl(){
  if(!/^https?:$/.test(location.protocol)) return SITE_URL;
  return (location.host + location.pathname).replace(/index\.html$/, "");
}

// Convierte un objeto {eje:puntaje} o un array de 8 en 8 enteros 0..100 en orden de AXES.
function normalizeScores(scores){
  const vals = Array.isArray(scores) ? scores : AXIS_KEYS.map(k => scores && scores[k]);
  if(vals.length !== AXIS_KEYS.length) return null;
  const out = vals.map(v => Math.round(clamp(Number(v), 0, 100)));
  return out.some(v => !Number.isFinite(v)) ? null : out;
}

function scoresToObject(arr){
  const o = {};
  AXIS_KEYS.forEach((k, i) => { o[k] = arr[i]; });
  return o;
}

function encodeShare(scores, topId){
  const vals = normalizeScores(scores);
  if(!vals) return null;
  let hash = "r=" + [SHARE_VERSION].concat(vals).join(".");
  if(topId && ACTORS.some(a => a.id === topId)) hash += "." + topId;
  return baseUrl() + "#" + hash;
}

// Validación estricta. Devuelve {version, scores, topId} o null.
function decodeShare(hashString){
  if(typeof hashString !== "string") return null;
  let h = hashString.trim();
  const hashPos = h.indexOf("#");
  if(hashPos >= 0) h = h.slice(hashPos + 1);
  if(!h.startsWith("r=")) return null;
  const parts = h.slice(2).split(".");
  if(parts[0] !== SHARE_VERSION) return null;
  if(parts.length !== 9 && parts.length !== 10) return null;
  const nums = parts.slice(1, 9);
  if(!nums.every(p => /^\d{1,3}$/.test(p))) return null;
  const vals = nums.map(Number);
  if(vals.some(v => v < 0 || v > 100)) return null;
  let topId = null;
  if(parts.length === 10){
    let id = parts[9];
    try{ id = decodeURIComponent(id); }catch(e){ id = ""; }
    if(ACTORS.some(a => a.id === id)) topId = id; // id desconocido → se ignora
  }
  return {version: Number(SHARE_VERSION), scores: scoresToObject(vals), topId};
}

// Texto para compartir, generado con los datos reales.
function buildShareText(scores){
  const top = rankActors(scores)[0];
  const line = AXIS_KEYS.map(k => `${AXES[k].short}: ${Math.round(scores[k])}`).join(" · ");
  const url = encodeShare(scores, top && top.actor.id);
  let txt = "Hice Política 8D.\n" + line + "\n";
  if(top) txt += `Mi referente más parecido en el modelo fue ${top.actor.name} (${top.similarity}%).\n`;
  txt += "Hacé el test y comparemos: " + url;
  return txt;
}

// ---- Portapapeles con fallback ----
function copyText(text){
  if(navigator.clipboard && window.isSecureContext){
    return navigator.clipboard.writeText(text).then(() => true, () => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}
function legacyCopy(text){
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try{ ok = document.execCommand("copy"); }catch(e){ ok = false; }
  document.body.removeChild(ta);
  return ok;
}

// ---- Toast ----
let toastTimer = null;
function showToast(msg, ms){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms || 3200);
}

// ---- Descarga de canvas ----
function canvasToBlob(canvas){
  return new Promise(resolve => {
    try{ canvas.toBlob(b => resolve(b), "image/png"); }catch(e){ resolve(null); }
  });
}
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---- Almacenamiento local (sólo puntajes agregados) ----
function safeGet(store, key){ try{ return store.getItem(key); }catch(e){ return null; } }
function safeSet(store, key, val){ try{ store.setItem(key, val); }catch(e){} }
function safeRemove(store, key){ try{ store.removeItem(key); }catch(e){} }

function saveLastResult(scores){
  const vals = normalizeScores(scores);
  if(vals) safeSet(localStorage, LS_LAST_RESULT, JSON.stringify(vals));
}
function loadLastResult(){
  try{
    const vals = JSON.parse(safeGet(localStorage, LS_LAST_RESULT) || "null");
    const ok = Array.isArray(vals) && vals.length === AXIS_KEYS.length &&
      vals.every(v => Number.isInteger(v) && v >= 0 && v <= 100);
    return ok ? scoresToObject(vals) : null;
  }catch(e){ return null; }
}
function saveFriend(friend){
  const vals = normalizeScores(friend.scores);
  if(vals) safeSet(sessionStorage, SS_FRIEND, JSON.stringify({scores: vals, topId: friend.topId || null}));
}
function loadFriend(){
  try{
    const f = JSON.parse(safeGet(sessionStorage, SS_FRIEND) || "null");
    if(!f || !Array.isArray(f.scores)) return null;
    const vals = normalizeScores(f.scores);
    if(!vals) return null;
    const topId = ACTORS.some(a => a.id === f.topId) ? f.topId : null;
    return {scores: scoresToObject(vals), topId};
  }catch(e){ return null; }
}
function clearFriend(){
  safeRemove(sessionStorage, SS_FRIEND);
  safeRemove(sessionStorage, SS_COMPARE_ACTIVE);
}

// noindex dinámico sólo cuando hay un hash compartido (best effort).
function setNoindex(on){
  let m = document.querySelector('meta[name="robots"][data-p8d]');
  if(on && !m){
    m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow"; m.setAttribute("data-p8d", "1");
    document.head.appendChild(m);
  }else if(!on && m){
    m.remove();
  }
}

// Aviso de privacidad (pestaña de compartir y Metodología).
function privacyHtml(){
  return `<ul class="privacy-list">
    <li><strong>Sin base de datos ni cuentas:</strong> el sitio es estático y no tiene servidor propio que guarde resultados.</li>
    <li><strong>Sin perfiles públicos:</strong> nada se publica automáticamente; compartir es siempre una decisión tuya.</li>
    <li><strong>El enlace sólo lleva tus 8 puntajes agregados</strong> (y, opcionalmente, el id del referente más parecido). Nunca incluye tus 48 respuestas, tu nombre ni datos personales.</li>
    <li><strong>El alias queda en tu dispositivo:</strong> se usa para dibujar la imagen y, como mucho, se recuerda en este navegador (localStorage). No va en ningún enlace.</li>
    <li>El enlace va después del “#”: esa parte no se envía al servidor que aloja la página. Igual, cualquiera que reciba el enlace puede ver esos 8 puntajes.</li>
  </ul>`;
}

// Quita el hash de la barra de direcciones sin recargar.
function clearHash(){
  try{ history.replaceState(null, "", location.pathname + location.search); }
  catch(e){ if(location.hash) location.hash = ""; }
}
