// Política 8D — similitud con referentes (secs. 42–45)
// Depende de AXES y ACTORS (definidos en index.html).

const AXIS_KEYS = Object.keys(AXES);

// Factor de confianza editorial del perfil del referente.
const CONFIDENCE_FACTOR = {"alta":1, "media":1, "media-alta":1, "media-baja":0.94, "baja":0.88};

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

// Primera letra en minúscula (salvo siglas): "Más mercado" → "más mercado".
function lowerFirst(s){
  if(!s) return s;
  if(s.length > 1 && s[1] === s[1].toUpperCase() && s[1] !== s[1].toLowerCase()) return s;
  return s[0].toLowerCase() + s.slice(1);
}

// Etiqueta suave para un puntaje 0–100.
function softLabel(axis, score){
  const a = AXES[axis], s = Math.round(score);
  if(s <= 20) return `Fuerte inclinación a ${lowerFirst(a.low)}`;
  if(s < 40) return `Inclinación a ${lowerFirst(a.low)}`;
  if(s <= 60) return "Mixto / contextual";
  if(s < 80) return `Inclinación a ${lowerFirst(a.high)}`;
  return `Fuerte inclinación a ${lowerFirst(a.high)}`;
}

// Une una lista en castellano: "a, b y c".
function joinEs(list){
  if(list.length <= 1) return list.join("");
  return list.slice(0, -1).join(", ") + " y " + list[list.length - 1];
}

/**
 * Similitud dentro del modelo Política 8D.
 * rms sobre ejes comparables (no nulos) → base = 100 − rms,
 * × cobertura (0.55 + 0.45·n/8) × factor de confianza.
 * Devuelve null si hay menos de 3 ejes comparables.
 */
function computeSimilarity(userScores, actor){
  if(!userScores || !actor || !actor.scores) return null;
  const keys = AXIS_KEYS.filter(k => actor.scores[k] !== null && actor.scores[k] !== undefined);
  const n = keys.length;
  if(n < 3) return null;

  const perAxis = keys.map(k => {
    const user = Number(userScores[k]), ref = actor.scores[k];
    return {axis:k, user, actor:ref, diff:Math.abs(user - ref)};
  });
  const rms = Math.sqrt(perAxis.reduce((acc, p) => acc + p.diff * p.diff, 0) / n);
  const base = clamp(100 - rms, 0, 100);
  const coverage = 0.55 + 0.45 * (n / AXIS_KEYS.length);
  const conf = Object.prototype.hasOwnProperty.call(CONFIDENCE_FACTOR, actor.confidence)
    ? CONFIDENCE_FACTOR[actor.confidence] : 0.94;
  const similarity = Math.round(base * coverage * conf);

  const fmt = p => `${AXES[p.axis].name}: vos ${Math.round(p.user)} · ref. ${Math.round(p.actor)}`;
  const byDiffAsc = perAxis.slice().sort((a, b) => a.diff - b.diff);
  const byDiffDesc = perAxis.slice().sort((a, b) => b.diff - a.diff);

  // Coincidencias: diff ≤ 12 (máx. 3); si no hay, los 2 ejes más cercanos.
  let matches = byDiffAsc.filter(p => p.diff <= 12).slice(0, 3);
  let matchesFallback = false;
  if(!matches.length){ matches = byDiffAsc.slice(0, 2); matchesFallback = true; }
  matches = matches.map(p => Object.assign({}, p, {text:fmt(p)}));

  // Diferencias: diff ≥ 20 (máx. 3), con dirección genérica según los polos del eje.
  const differences = byDiffDesc.filter(p => p.diff >= 20).slice(0, 3).map(p => {
    const pole = p.actor > p.user ? AXES[p.axis].high : AXES[p.axis].low;
    return Object.assign({}, p, {pole, text:`${fmt(p)} (más hacia “${pole}” que vos)`});
  });

  // Explicación automática a partir de las diferencias reales.
  const name = actor.name;
  const matchAxes = joinEs(matches.map(p => AXES[p.axis].name));
  let explanation = matchesFallback
    ? `Tu perfil se acerca más al de ${name} en ${matchAxes}.`
    : `Tu perfil se parece al de ${name} en ${matchAxes}.`;
  const far = byDiffDesc[0];
  if(far.diff >= 8){
    const pole = far.actor > far.user ? AXES[far.axis].high : AXES[far.axis].low;
    explanation += far.diff >= 20
      ? ` La mayor distancia aparece en ${AXES[far.axis].name}: ${name} se ubica más hacia “${pole}”.`
      : ` No hay diferencias grandes; la mayor (${Math.round(far.diff)} puntos) aparece en ${AXES[far.axis].name}, donde ${name} se ubica algo más hacia “${pole}”.`;
  }else{
    explanation += " No aparecen diferencias marcadas en los ejes comparables.";
  }
  if(n < AXIS_KEYS.length){
    explanation += ` Sólo se comparan ${n} de ${AXIS_KEYS.length} ejes porque el resto no tiene puntaje editorial.`;
  }

  return {
    actor, similarity, n, rms, base, coverage, confidenceFactor:conf,
    perAxis, matches, matchesFallback,
    matchesTitle: matchesFallback ? "Lo más cercano" : "Coincidís especialmente en",
    differences, explanation
  };
}

// Ranking por similitud desc; empates → más ejes comparables primero.
function rankActors(userScores, list){
  return (list || ACTORS)
    .map(a => computeSimilarity(userScores, a))
    .filter(Boolean)
    .sort((x, y) => (y.similarity - x.similarity) || (y.n - x.n));
}

const SIMILARITY_LABEL = "Similitud dentro del modelo Política 8D";
const SIMILARITY_NOTE = "Es una aproximación: no es una medición científica ni indica afinidad política.";
