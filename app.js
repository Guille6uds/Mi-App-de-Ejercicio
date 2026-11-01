/* =====================================================================
   Mi vuelta a entrenar — v2.1
   Contenido del plan: plan.js (window.PLAN) o el plan pegado desde la app
   Datos personales: localStorage del iPhone (exportables).
   ===================================================================== */
(function () {
  "use strict";

  const APP_VERSION = "2.4";
  const NOVEDADES = [
    "Nueva pestaña Estadísticas: resumen con anillos, fuerza por ejercicio, cardio y recuperación, con filtros de periodo.",
    "Duración en todas las sesiones, metros en natación y minutos de trote y caminando en carrera (el temporizador los anota solo).",
    "En los ejercicios con mancuernas se registra el peso de una sola mancuerna.",
  ];
  const NOVEDADES_23 = [
    "Plan revisado con ChatGPT: notas técnicas (toca «Técnica»), nuevos incrementos y alternativas.",
    "Salto real por ejercicio: toca «salto» bajo los kilos e indica el incremento que permite tu material. Las sugerencias usan solo ese salto.",
    "El resumen semanal separa sesiones completas, parciales y no realizadas, ejercicios sustituidos, cargas con RIR y molestias.",
  ];
  const NOVEDADES_22 = [
    "Descanso con mínimo y máximo: al llegar al mínimo te avisa, pero nunca obliga a empezar.",
    "Al terminar las series de un ejercicio puedes anotar el RIR de la última.",
    "Registro opcional de molestias al terminar cada sesión, y del sueño en la revisión semanal.",
    "Dominadas con lastre o con asistencia, cada una con su progresión.",
    "La sugerencia de subir carga exige el máximo del rango con 2 o más en recámara, y no aparece en la semana 4.",
    "Revisión completa del bloque al terminarlo, para preparar el siguiente con ChatGPT.",
  ];
  const NOVEDADES_21 = [
    "Copia el resumen y abre ChatGPT con un toque.",
    "Actualiza el plan pegando lo que te dé ChatGPT, con vista previa de los cambios.",
    "Los domingos, la tarjeta Ahora te propone revisar la semana.",
    "Añade las sesiones de la semana a tu Calendario.",
    "Series de calentamiento, máximo de cada ejercicio y récords personales.",
    "Ejercicios alternativos si una máquina está ocupada.",
    "Temporizador visual para la carrera.",
    "Borrar ahora se puede deshacer.",
  ];
  const CLAVE = "mva-datos-v1"; // misma clave que la v1: el historial se conserva
  const $app = document.getElementById("app");

  // Plan activo: el pegado desde la app (si es válido) tiene prioridad sobre plan.js
  const PLAN_BASE = window.PLAN;
  let PLAN = PLAN_BASE, PLAN_ORIGEN = "fichero";
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (guardado && guardado.planPropio && validarPlan(guardado.planPropio).length === 0) { PLAN = guardado.planPropio; PLAN_ORIGEN = "app"; }
  } catch (e) {}
  if (!PLAN || !PLAN.bloque || !Array.isArray(PLAN.fuerza)) {
    $app.innerHTML =
      '<div class="titulo-grande" style="padding-top:60px"><h1>No se pudo leer el plan</h1>' +
      '<p>Hay un error en plan.js (suele ser una coma o una comilla). Tus datos siguen guardados. ' +
      "Restaura la versión anterior del fichero en GitHub (History) y vuelve a abrir la app.</p></div>";
    return;
  }

  const DIAS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const DIAS_LARGO = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const N = PLAN.bloque.semanas;
  const HUECOS = PLAN.huecos || [];
  const DESCANSO = PLAN.descanso || { principal: [120, 180], accesorio: [60, 90] };
  // Un descanso puede ser un número (segundos) o [mínimo, máximo]
  const rangoDescanso = (v) => (Array.isArray(v) ? [v[0], v[1] || v[0]] : [v, v]);

  /* ------------------------------------------------- Validación del plan
     Devuelve una lista de errores en lenguaje claro. Vacía = plan válido. */
  function validarPlan(pl) {
    const err = [];
    const esTxt = (v) => typeof v === "string" && v.trim() !== "";
    const esNum = (v) => typeof v === "number" && isFinite(v);
    const idOk = (v) => esTxt(v) && /^[a-z0-9][a-z0-9-]*$/.test(v);
    const descansoOk = (v) => (esNum(v) && v > 0) || (Array.isArray(v) && v.length === 2 && v.every((x) => esNum(x) && x > 0) && v[0] <= v[1]);
    if (!pl || typeof pl !== "object") return ["No es un plan."];
    if (!pl.bloque || !esTxt(pl.bloque.id) || !esTxt(pl.bloque.nombre) || !esNum(pl.bloque.semanas) || pl.bloque.semanas < 1)
      err.push("Falta «bloque» con id, nombre y número de semanas.");
    const n = pl.bloque && pl.bloque.semanas;
    if (!Array.isArray(pl.semanas)) err.push("Falta la lista «semanas» con el enfoque de cada semana.");
    else if (pl.semanas.some((s) => !s || !esNum(s.n) || (s.progresion != null && typeof s.progresion !== "boolean"))) err.push("Cada semana necesita «n» y, si lleva «progresion», debe ser true o false.");
    if (pl.descanso && (!descansoOk(pl.descanso.principal) || !descansoOk(pl.descanso.accesorio))) err.push("«descanso» necesita «principal» y «accesorio» en segundos o como [mínimo, máximo].");
    if (!Array.isArray(pl.fuerza) || !pl.fuerza.length) err.push("Falta la lista «fuerza» con las sesiones de fuerza.");
    const ids = new Set(), idsSesion = new Set(["natacion", "carrera"]);
    (pl.fuerza || []).forEach((s, i) => {
      const donde = `Fuerza ${s && s.nombre ? "«" + s.nombre + "»" : i + 1}`;
      if (!s || !idOk(s.id)) { err.push(`${donde}: id no válido (minúsculas, números y guiones).`); return; }
      if (idsSesion.has(s.id)) err.push(`${donde}: el id "${s.id}" está repetido.`);
      idsSesion.add(s.id);
      if (!esTxt(s.nombre)) err.push(`${donde}: falta el nombre.`);
      if (!Array.isArray(s.ejercicios) || !s.ejercicios.length) { err.push(`${donde}: no tiene ejercicios.`); return; }
      const enSesion = new Set();
      s.ejercicios.forEach((e, j) => {
        const de = `${donde}, ejercicio ${e && e.nombre ? "«" + e.nombre + "»" : j + 1}`;
        if (!e || !idOk(e.id)) { err.push(`${de}: id no válido.`); return; }
        if (enSesion.has(e.id)) err.push(`${de}: id repetido en la misma sesión.`);
        enSesion.add(e.id); ids.add(e.id);
        if (!esTxt(e.nombre)) err.push(`${de}: falta el nombre.`);
        if (!Array.isArray(e.series) || !e.series.length || !e.series.every((x) => esNum(x) && x > 0)) err.push(`${de}: «series» debe ser una lista de números.`);
        else if (n && e.series.length !== n) err.push(`${de}: «series» tiene ${e.series.length} valores y el bloque ${n} semanas.`);
        if (!esTxt(e.reps)) err.push(`${de}: faltan las repeticiones («reps»).`);
        if (e.paso != null && !(esNum(e.paso) && e.paso > 0)) err.push(`${de}: «paso» debe ser un número.`);
        if (e.carga != null && e.carga !== "corporal") err.push(`${de}: «carga» solo admite "corporal".`);
        [e].concat(e.alternativas || []).forEach((x) => { if (x && x.implemento != null && x.implemento !== "mancuernas") err.push(`${de}: «implemento» solo admite "mancuernas".`); });
        if (e.descanso != null && !descansoOk(e.descanso)) err.push(`${de}: «descanso» debe ser segundos o [mínimo, máximo].`);
        (e.alternativas || []).forEach((a) => { if (!a || !idOk(a.id) || !esTxt(a.nombre)) err.push(`${de}: alternativa sin id o nombre válido.`); });
      });
    });
    if (!Array.isArray(pl.micros)) err.push("Falta la lista «micros».");
    (pl.micros || []).forEach((m, i) => {
      const donde = `Micro ${m && m.nombre ? "«" + m.nombre + "»" : i + 1}`;
      if (!m || !idOk(m.id)) { err.push(`${donde}: id no válido.`); return; }
      if (idsSesion.has(m.id)) err.push(`${donde}: el id "${m.id}" está repetido.`);
      idsSesion.add(m.id);
      if (!esTxt(m.nombre) || !esTxt(m.duracion)) err.push(`${donde}: falta nombre o duración.`);
      if (!Array.isArray(m.ejercicios) || !m.ejercicios.every((e) => e && esTxt(e.nombre) && esTxt(e.pauta))) err.push(`${donde}: cada ejercicio necesita «nombre» y «pauta».`);
    });
    if (!pl.natacion || !Array.isArray(pl.natacion.semanas) || !pl.natacion.semanas.every((s) => Array.isArray(s))) err.push("«natacion.semanas» debe ser una lista de pasos por semana.");
    if (!pl.carrera || !Array.isArray(pl.carrera.semanas) || !pl.carrera.semanas.every((c) => c && esNum(c.trote) && esNum(c.andar) && esNum(c.repeticiones)))
      err.push("«carrera.semanas» necesita trote, andar y repeticiones (números) en cada semana.");
    if (!Array.isArray(pl.semana_tipo) || !pl.semana_tipo.length) err.push("Falta «semana_tipo».");
    (pl.semana_tipo || []).forEach((it) => {
      if (!it || !idsSesion.has(it.sesion)) err.push(`Semana tipo: "${it && it.sesion}" no coincide con ninguna sesión.`);
      else {
        if (!(esNum(it.dia) && it.dia >= 1 && it.dia <= 7)) err.push(`Semana tipo, ${it.sesion}: «dia» debe ir de 1 a 7.`);
        if (it.hora != null && !/^\d{1,2}:\d{2}$/.test(it.hora)) err.push(`Semana tipo, ${it.sesion}: «hora» debe ser "HH:MM".`);
      }
    });
    (pl.huecos || []).forEach((h) => { if (!h || !(h.dia >= 1 && h.dia <= 7) || !/^\d{1,2}:\d{2}$/.test(h.desde || "") || !/^\d{1,2}:\d{2}$/.test(h.hasta || "")) err.push("Algún hueco no tiene día (1–7) y horas «desde»/«hasta» en formato HH:MM."); });
    return [...new Set(err)].slice(0, 12);
  }

  /* ---------------------------------------------------------------- Fechas */
  const pad = (n) => String(n).padStart(2, "0");
  const aISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const deISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
  const hoyISO = () => aISO(new Date());
  const diasEntre = (a, b) => Math.round((deISO(b) - deISO(a)) / 86400000);
  const diaSemana = (iso) => ((deISO(iso).getDay() + 6) % 7) + 1;
  const sumarDias = (iso, n) => { const d = deISO(iso); d.setDate(d.getDate() + n); return aISO(d); };
  const fechaCorta = (iso) => { const d = deISO(iso); return `${DIAS[diaSemana(iso)].toLowerCase()} ${d.getDate()} ${MESES[d.getMonth()]}`; };
  const fechaLarga = (iso) => { const d = deISO(iso); return `${DIAS_LARGO[diaSemana(iso)]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
  const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const aMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const minAhora = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

  function inicioPorDefecto() {
    const hoy = hoyISO(), dia = diaSemana(hoy);
    return dia >= 6 ? sumarDias(hoy, 8 - dia) : sumarDias(hoy, 1 - dia);
  }

  /* ----------------------------------------------------------------- Datos */
  const uiPorDefecto = () => ({ abiertos: { fuerza: true }, sugerencias: true, temporizador: true });
  const vacio = () => ({ v: 2, inicio: null, semanaManual: null, agenda: {}, registros: [], borradores: {}, revisadas: {}, semanal: {}, saltos: {}, ui: uiPorDefecto() });
  let S = cargar();

  function cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      const d = crudo ? Object.assign(vacio(), JSON.parse(crudo)) : vacio();
      d.ui = Object.assign(uiPorDefecto(), d.ui || {});
      d.saltos = d.saltos || {}; d.semanal = d.semanal || {}; d.revisadas = d.revisadas || {};
      return d;
    } catch (e) { return vacio(); }
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(S)); }
    catch (e) { aviso("No se pudo guardar. Exporta una copia en Ajustes."); }
  }
  if (!S.inicio) S.inicio = inicioPorDefecto();
  S.v = 2; guardar();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ------------------------------------------------------------- Programa */
  function estadoPrograma() {
    const d = diasEntre(S.inicio, hoyISO());
    const auto = Math.floor(d / 7) + 1;
    return {
      semana: S.semanaManual || Math.min(Math.max(auto, 1), N),
      antesDeEmpezar: !S.semanaManual && d < 0,
      terminado: !S.semanaManual && auto > N,
      manual: !!S.semanaManual,
    };
  }
  const semanaActual = () => estadoPrograma().semana;

  const CAT = {};
  PLAN.fuerza.forEach((s) => (CAT[s.id] = { id: s.id, nombre: s.nombre, duracion: s.duracion, tipo: "fuerza", href: `#/fuerza/${s.id}` }));
  PLAN.micros.forEach((s) => (CAT[s.id] = { id: s.id, nombre: s.nombre, largo: `Micro ${s.nombre.toLowerCase()}`, duracion: s.duracion, tipo: "micro", href: `#/micros/${s.id}` }));
  CAT.natacion = { id: "natacion", nombre: PLAN.natacion.nombre, duracion: PLAN.natacion.duracion, tipo: "natacion", href: "#/natacion" };
  CAT.carrera = { id: "carrera", nombre: PLAN.carrera.nombre, duracion: PLAN.carrera.duracion, tipo: "carrera", href: "#/carrera" };
  const nombreLargo = (id) => (CAT[id] ? CAT[id].largo || CAT[id].nombre : id);

  const ordenFecha = (a, b) => (a.fecha === b.fecha ? (a.creado < b.creado ? 1 : -1) : a.fecha < b.fecha ? 1 : -1);
  const registrosSemana = (w) => S.registros.filter((r) => r.bloque === PLAN.bloque.id && r.semana === w);
  const hechoEnSemana = (w, id) => registrosSemana(w).filter((r) => r.sesion === id).sort(ordenFecha)[0];
  const claveAgenda = (w) => `${PLAN.bloque.id}:${w}`;
  const diaPrevisto = (w, it) => { const a = S.agenda[claveAgenda(w)]; return (a && a[it.sesion]) || it.dia; };
  const prioritarias = () => PLAN.semana_tipo.filter((i) => i.prioritaria);

  /* --------------------------------------------------- Pesos y progresión */
  const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? null : n; };
  const fmt = (n) => (n == null || n === "" ? "" : String(Math.round(Number(n) * 100) / 100).replace(".", ","));
  const maxRango = (reps) => { const m = String(reps).match(/\d+/g); return m ? Math.max(...m.slice(0, 2).map(Number)) : null; };
  const minRango = (reps) => { const m = String(reps).match(/\d+/); return m ? Number(m[0]) : null; };
  const seriesPlan = (e, w) => e.series[w - 1] || e.series[e.series.length - 1] || 2;
  const formatoSerie = (s) => {
    if (s.corp) {
      const k = num(s.kg) || 0, r = s.reps || "?";
      return k > 0 ? `+${fmt(k)} kg lastre×${r}` : k < 0 ? `${fmt(-k)} kg asistencia×${r}` : `${r} reps`;
    }
    return s.kg ? `${fmt(s.kg)}×${s.reps || "?"}` : s.reps ? `${s.reps} reps` : "hecha";
  };
  const fmtCarga = (k, corp) => (corp ? (k > 0 ? `+${fmt(k)} kg de lastre` : k < 0 ? `${fmt(-k)} kg de asistencia` : "peso corporal") : `${fmt(k)} kg`);
  // ¿Ejercicio de peso corporal o con mancuernas? (por id, incluidas alternativas)
  const CORPORAL = new Set(), MANCUERNAS = new Set();
  PLAN.fuerza.forEach((s) => s.ejercicios.forEach((e) => {
    [e].concat(e.alternativas || []).forEach((x) => {
      if (x.carga === "corporal") CORPORAL.add(x.id);
      if (x.implemento === "mancuernas") MANCUERNAS.add(x.id);
    });
  }));

  function ultimaVez(exId) {
    const r = S.registros
      .filter((x) => x.ejercicios && x.ejercicios[exId] && x.ejercicios[exId].series.some((s) => s.kg || s.reps))
      .sort(ordenFecha)[0];
    return r ? { fecha: r.fecha, series: r.ejercicios[exId].series.filter((s) => s.kg || s.reps), rir: r.ejercicios[exId].rir } : null;
  }

  // Estimación del máximo a una repetición (fórmula de Epley)
  const e1rm = (kg, reps) => { const k = num(kg), r = num(reps); return k && r ? k * (1 + r / 30) : 0; };

  // Mejor marca histórica de un ejercicio: la serie más pesada y el mejor 1RM estimado
  // En peso corporal, «más» = más lastre o menos asistencia (kg con signo); no hay 1RM estimado.
  function marcas(exId, excluir) {
    const corp = CORPORAL.has(exId);
    let max = null, mejor1rm = 0;
    S.registros.forEach((r) => {
      const e = r.ejercicios && r.ejercicios[exId];
      if (!e || r.id === excluir) return;
      e.series.forEach((s) => {
        const k = num(s.kg);
        if (k == null || (!corp && k <= 0) || !num(s.reps)) return;
        if (!max || k > max.kg || (k === max.kg && (num(s.reps) || 0) > (num(max.reps) || 0))) max = { kg: k, reps: s.reps, fecha: r.fecha, corp };
        if (!corp) mejor1rm = Math.max(mejor1rm, e1rm(s.kg, s.reps));
      });
    });
    return { max, mejor1rm, corp };
  }
  // ¿Supera esta serie la mejor marca? Normal: 1RM estimado. Corporal: carga con signo y luego repeticiones.
  function esRecord(exId, serie, otrasDeHoy) {
    const mk = marcas(exId);
    if (!mk.max) return false;
    if (mk.corp) {
      const mejor = [mk.max].concat(otrasDeHoy.map((s) => ({ kg: num(s.kg) || 0, reps: s.reps })));
      const k = num(serie.kg) || 0, r = num(serie.reps) || 0;
      return mejor.every((m) => k > m.kg || (k === m.kg && r > (num(m.reps) || 0)));
    }
    const previo = Math.max(mk.mejor1rm, ...otrasDeHoy.map((s) => e1rm(s.kg, s.reps)));
    return e1rm(serie.kg, serie.reps) > previo + 0.01;
  }

  // Ejercicio efectivo: el del plan o la alternativa elegida en la sesión
  function efectivo(e, d) {
    const alt = d && d.alt && (e.alternativas || []).find((a) => a.id === d.alt);
    const base = alt
      ? { id: alt.id, nombre: alt.nombre, pasoPlan: alt.paso || e.paso || 2.5, alt: true, corp: alt.carga === "corporal", mancuernas: alt.implemento === "mancuernas" }
      : { id: e.id, nombre: e.nombre, pasoPlan: e.paso || 2.5, alt: false, corp: e.carga === "corporal", mancuernas: e.implemento === "mancuernas" };
    const real = S.saltos && S.saltos[base.id];
    return Object.assign(base, { paso: real || base.pasoPlan, pasoConfirmado: !!real });
  }

  // Aproximación al peso de trabajo.
  // Básicos: barra vacía ×8–10, 50 % ×5, 70 % ×3 y 80–85 % ×1–2. Accesorios: una aproximación ligera opcional.
  function calentamiento(e, ef, kgTrabajo) {
    const T = num(kgTrabajo);
    if (ef.corp || !T || T <= 0) return null;
    const redondear = (x) => Math.round(x / ef.paso) * ef.paso;
    if (!e.principal) {
      const k = redondear(T * 0.5);
      return k > 0 && k < T ? { texto: `Si la necesitas, una aproximación ligera: ${fmt(k)}×8` } : null;
    }
    const barra = e.barra && !ef.alt ? 20 : 0;
    const pasos = barra && T > barra ? ["barra vacía ×8–10"] : [];
    const usados = new Set();
    [[0.5, "5"], [0.7, "3"], [0.825, "1–2"]].forEach(([pct, reps]) => {
      const k = redondear(T * pct);
      if (k > barra && k < T && !usados.has(k)) { usados.add(k); pasos.push(`${fmt(k)}×${reps}`); }
    });
    return pasos.length ? { texto: `Calentamiento: ${pasos.join(", ")}` } : null;
  }

  // Doble progresión: subir solo si la última vez se llegó al máximo del rango en todas las series
  // con al menos 2 RIR en la última. Nunca en semanas con «progresion: false» (consolidación).
  const semanaSinProgresion = (w) => { const s = PLAN.semanas.find((x) => x.n === w); return !!s && s.progresion === false; };
  function sugerencia(e, w, ef) {
    if (!S.ui.sugerencias || semanaSinProgresion(w)) return null;
    ef = ef || efectivo(e);
    const u = ultimaVez(ef.id), tope = maxRango(e.reps);
    if (!u || !tope) return null;
    const conPeso = u.series.filter((s) => num(s.kg) != null && num(s.reps) != null);
    if (conPeso.length < Math.min(seriesPlan(e, w), 2)) return null;
    if (!conPeso.every((s) => num(s.reps) >= tope)) return null;
    if (u.rir != null && u.rir < 2) return null;
    const base = Math.max(...conPeso.map((s) => num(s.kg)));
    return { kg: base + ef.paso, tope, rir: u.rir, corp: ef.corp, confirmado: ef.pasoConfirmado, paso: ef.paso };
  }
  // Sin salto confirmado no se propone una cifra concreta: puede que el material no la permita
  function textoSugerencia(sug) {
    const carga = !sug.confirmado
      ? (sug.corp ? "progresar con el menor cambio de asistencia o lastre que permita tu material" : "subir el menor salto que permita tu material")
      : sug.corp ? (sug.kg < 0 ? `bajar a ${fmt(-sug.kg)} kg de asistencia` : sug.kg === 0 ? "hacerlas sin asistencia" : `añadir ${fmt(sug.kg)} kg de lastre`) : `subir a ${fmt(sug.kg)} kg`;
    const base = sug.rir != null
      ? `Completaste ${sug.tope} repeticiones en todas las series y te quedaron ${sug.rir >= 4 ? "4 o más" : sug.rir} en recámara. Si la técnica fue buena, puedes ${carga}.`
      : `Completaste ${sug.tope} repeticiones en todas las series. Si la técnica fue buena y te quedaron 2 o más en recámara, puedes ${carga}.`;
    return sug.confirmado ? base : `${base} Indica ese salto en «salto», bajo los kilos, y la app calculará la cifra.`;
  }

  /* ------------------------------------------------------------ Utilidades */
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CHEV = '<svg class="chev" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5 6.5 6.5 1.5 11.5"/></svg>';
  const FLECHA = '<svg class="flecha" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 5 7 9.5 11.5 5"/></svg>';
  const ATRAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const ENGRANAJE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/></svg>';

  let tAviso, accionDeshacer = null;
  function aviso(texto, deshacer) {
    const t = document.getElementById("toast");
    accionDeshacer = deshacer || null;
    t.innerHTML = esc(texto) + (deshacer ? ' <button data-action="deshacer">Deshacer</button>' : "");
    t.hidden = false;
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    clearTimeout(tAviso);
    tAviso = setTimeout(() => { t.hidden = true; accionDeshacer = null; }, deshacer ? 5000 : 2400);
  }

  function escala(campo, valor, izq, der) {
    return `<div class="escala" role="group">${[1, 2, 3, 4, 5].map((n) =>
      `<button data-action="valor" data-campo="${campo}" data-v="${n}" aria-pressed="${valor === n}">${n}</button>`).join("")}</div>
      <div class="escala-txt"><span>${izq}</span><span>${der}</span></div>`;
  }

  // Molestias: zona e intensidad, opcional
  const ZONAS = ["Cuello", "Hombro", "Codo", "Muñeca", "Espalda alta", "Zona lumbar", "Cadera", "Rodilla", "Tobillo", "Otra"];
  function bloqueMolestia(m) {
    return `<div class="campo-form"><span>Molestias (opcional)</span>
      <select class="input" data-action="molestia-zona" aria-label="Zona de la molestia">
        <option value="">Ninguna</option>${ZONAS.map((z) => `<option ${m && m.zona === z ? "selected" : ""}>${z}</option>`).join("")}
      </select>
      <div class="escala-molestia" ${m && m.zona ? "" : "hidden"}>${escala("molestia", (m && m.intensidad) || null, "Leve", "Fuerte")}</div></div>`;
  }
  const textoMolestia = (m) => (m && m.zona ? `${m.zona.toLowerCase()}${m.intensidad ? ` ${m.intensidad}/5` : ""}` : "");

  // Metros previstos en el plan de natación (solo como sugerencia, nunca como dato)
  function metrosPrevistos(w) {
    const pasos = PLAN.natacion.semanas[w - 1] || [];
    let total = 0;
    pasos.forEach((t) => { const m = String(t).match(/(\d+)\s*[×x]\s*(\d+)\s*m\b/); if (m) total += Number(m[1]) * Number(m[2]); });
    return total || null;
  }
  // Campos del cierre según el tipo de sesión. Los valores medidos por el temporizador se rellenan solos.
  function camposCardio(id) {
    const campo = (idc, txt, attrs) => `<label class="campo-form"><span>${txt}</span><input class="input" type="number" inputmode="decimal" id="${idc}" ${attrs}></label>`;
    if (id === "natacion") {
      const pv = metrosPrevistos(semanaActual());
      return campo("fin-duracion", "Duración (min)", 'min="1" max="300" placeholder="Sin anotar"') +
        campo("fin-metros", "Metros nadados", `min="0" max="10000" step="25" placeholder="${pv ? `${pv} previstos: anota los reales` : "Sin anotar"}"`);
    }
    if (id === "carrera") {
      const u = S.ui.ultimoIntervalo && S.ui.ultimoIntervalo.fecha === hoyISO() ? S.ui.ultimoIntervalo : null;
      const v = (x) => (x == null ? "" : fmt(x).replace(",", "."));
      return (u ? `<p class="pie-grupo" style="margin:10px 16px 0">Rellenado con lo que midió el temporizador.</p>` : "") +
        campo("fin-duracion", "Duración (min)", `min="1" max="300" placeholder="Sin anotar" value="${u ? Math.max(1, Math.round((u.trote + u.andar) / 60)) : ""}"`) +
        campo("fin-trote", "Minutos trotando", `min="0" max="300" step="0.5" placeholder="Sin anotar" value="${u ? v(Math.round((u.trote / 60) * 10) / 10) : ""}"`) +
        campo("fin-andar", "Minutos caminando", `min="0" max="300" step="0.5" placeholder="Sin anotar" value="${u ? v(Math.round((u.andar / 60) * 10) / 10) : ""}"`) +
        campo("fin-km", "Distancia en km (opcional)", 'min="0" max="100" step="0.01" placeholder="Solo si la conoces"');
    }
    return campo("fin-duracion", "Duración (min)", 'min="1" max="300" placeholder="Sin anotar"');
  }

  // Formulario de cierre común (micro, natación, carrera). Valores temporales en TMP.
  const tmpVacio = () => ({ energia: null, esfuerzo: null, molestia: null });
  let TMP = tmpVacio();
  function formCierre(id, boton) {
    return `
      <h2 class="cab-grupo">Al terminar</h2>
      <div class="grupo">
        <label class="campo-form"><span>Fecha</span><input class="input" type="date" id="fin-fecha" value="${hoyISO()}" max="${hoyISO()}"></label>
        ${camposCardio(id)}
        <div class="campo-form"><span>Energía</span>${escala("energia", TMP.energia, "Sin fuerzas", "A tope")}</div>
        <div class="campo-form"><span>Esfuerzo</span>${escala("esfuerzo", TMP.esfuerzo, "Muy suave", "Al límite")}</div>
        ${bloqueMolestia(TMP.molestia)}
        <label class="campo-form"><span>Notas</span><textarea id="fin-notas" placeholder="Sensaciones, qué cambiarías…"></textarea></label>
      </div>
      <div class="espacio"></div>
      <button class="btn" data-action="guardar-simple" data-id="${esc(id)}">${esc(boton)}</button>`;
  }

  /* =================================================================== VISTAS
     Cada vista devuelve { titulo, sub, volver:{href,label}, derecha, html, foco } */

  /* ------------------------------------------------------------- «Ahora» */
  function hayDatos(b) { return b && Object.values(b.ej || {}).some((e) => e.series.some((s) => s.ok || s.kg || s.reps)); }
  function contarSeries(b) {
    let hechas = 0, total = 0;
    Object.values(b.ej || {}).forEach((e) => { total += e.series.length; hechas += e.series.filter((s) => s.ok).length; });
    return { hechas, total };
  }
  function detalleSesion(id, w) {
    if (id === "natacion") { const p = PLAN.natacion.semanas[w - 1] || []; return p.slice(1, 3).join(", "); }
    if (id === "carrera") { const c = PLAN.carrera.semanas[w - 1]; return c ? `${c.trote} min trotando + ${c.andar} andando, ${c.repeticiones} veces` : ""; }
    const f = PLAN.fuerza.find((s) => s.id === id);
    if (f) return `${f.ejercicios.length} ejercicios, ${f.duracion}`;
    return CAT[id] ? CAT[id].duracion : "";
  }
  function microSugerido() {
    const ultima = (id) => (S.registros.filter((r) => r.sesion === id).sort(ordenFecha)[0] || {}).fecha || "";
    return PLAN.micros.slice().sort((a, b) => (ultima(a.id) < ultima(b.id) ? -1 : 1))[0];
  }

  // Datos breves de una semana: prioritarias, récords y subidas de carga
  // Carga máxima de un ejercicio en una lista de series (con signo en peso corporal)
  function cargaMax(series, corp) {
    const ks = series.map((s) => num(s.kg)).filter((k) => k != null && (corp || k > 0));
    return ks.length ? Math.max(...ks) : null;
  }
  const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  // Datos de un conjunto de semanas: adherencia, récords, cargas, sensaciones, RIR y molestias
  function estadisticas(semanas) {
    const regs = S.registros.filter((r) => r.bloque === PLAN.bloque.id && semanas.includes(r.semana));
    const pr = prioritarias();
    const hechas = semanas.reduce((acc, w) => acc + pr.filter((p) => regs.some((r) => r.semana === w && r.sesion === p.sesion)).length, 0);
    let records = 0;
    const vistos = {}, rirs = [];
    regs.forEach((r) => Object.entries(r.ejercicios || {}).forEach(([id, e]) => {
      records += e.series.filter((s) => s.pr).length;
      if (e.rir != null) rirs.push(e.rir);
      const corp = CORPORAL.has(id), k = cargaMax(e.series, corp);
      if (k == null) return;
      const v = vistos[id] || (vistos[id] = { nombre: e.nombre, corp, max: k, primera: { fecha: r.fecha, kg: k } });
      if (k > v.max) v.max = k;
      if (r.fecha < v.primera.fecha) v.primera = { fecha: r.fecha, kg: k };
    }));
    const mejoras = [];
    Object.entries(vistos).forEach(([id, v]) => {
      let antes = null;
      S.registros.forEach((r) => {
        const e = r.ejercicios && r.ejercicios[id];
        if (e && r.fecha < v.primera.fecha) { const k = cargaMax(e.series, v.corp); if (k != null) antes = antes == null ? k : Math.max(antes, k); }
      });
      const de = antes != null ? antes : semanas.length > 1 ? v.primera.kg : null;
      if (de != null && v.max > de) mejoras.push({ nombre: v.nombre, de, a: v.max, corp: v.corp });
    });
    return {
      regs, hechas, total: pr.length * semanas.length, records, mejoras,
      energia: media(regs.map((r) => r.energia).filter(Boolean)),
      esfuerzo: media(regs.map((r) => r.esfuerzo).filter(Boolean)),
      rir: media(rirs),
      molestias: regs.filter((r) => r.molestia && r.molestia.zona).map((r) => ({ fecha: r.fecha, sesion: r.sesion, ...r.molestia })),
    };
  }
  const estadisticasSemana = (w) => estadisticas([w]);

  // ¿Sesión de fuerza completa o parcial? Compara lo hecho con lo previsto ese día.
  function estadoSesion(r) {
    const out = { completa: true, faltan: [], incompletos: [], sustituciones: [] };
    if (r.tipo !== "fuerza") return out;
    let previsto = r.previsto;
    if (!previsto) {
      const ses = PLAN.fuerza.find((s) => s.id === r.sesion);
      previsto = ses ? ses.ejercicios.map((x) => ({ id: x.id, nombre: x.nombre, series: seriesPlan(x, r.semana), alts: (x.alternativas || []).map((a) => a.id) })) : [];
    }
    previsto.forEach((pv) => {
      const idHecho = [pv.id].concat(pv.alts || []).find((id) => r.ejercicios && r.ejercicios[id]);
      const e = idHecho && r.ejercicios[idHecho];
      const hechas = e ? e.series.filter((s) => s.ok || (s.kg && s.reps)).length : 0;
      if (e && idHecho !== pv.id) out.sustituciones.push({ original: pv.nombre, alternativa: e.nombre });
      if (!hechas) { out.faltan.push(pv.nombre); out.completa = false; }
      else if (hechas < pv.series) { out.incompletos.push({ nombre: e.nombre, hechas, previstas: pv.series }); out.completa = false; }
    });
    return out;
  }

  // Estado de una semana: qué se completó, qué quedó a medias, qué no se hizo y qué cambió
  function estadoSemana(w) {
    const regs = registrosSemana(w).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    const completas = [], parciales = [], sustituciones = [];
    regs.forEach((r) => {
      const st = estadoSesion(r);
      (st.completa ? completas : parciales).push({ r, st });
      st.sustituciones.forEach((s) => sustituciones.push({ ...s, r }));
    });
    const noRealizadas = PLAN.semana_tipo.filter((it) => !regs.some((r) => r.sesion === it.sesion));
    // Cargas y RIR: mejor carga de la semana frente a la última sesión anterior de ese ejercicio
    const cargas = [], vistos = new Set();
    regs.forEach((r) => Object.entries(r.ejercicios || {}).forEach(([id, e]) => {
      if (vistos.has(id)) return; vistos.add(id);
      const corp = CORPORAL.has(id);
      const deLaSemana = regs.filter((x) => x.ejercicios && x.ejercicios[id]);
      const ahora = cargaMax(deLaSemana.flatMap((x) => x.ejercicios[id].series), corp);
      if (ahora == null) return;
      const primeraFecha = deLaSemana[0].fecha;
      const anterior = S.registros.filter((x) => x.ejercicios && x.ejercicios[id] && x.fecha < primeraFecha).sort(ordenFecha)[0];
      // Sin sesión previa a la semana: se compara la primera de la semana con la mejor
      const primeraSemana = cargaMax(deLaSemana[0].ejercicios[id].series, corp);
      const antes = anterior ? cargaMax(anterior.ejercicios[id].series, corp) : deLaSemana.length > 1 ? primeraSemana : null;
      const rirs = deLaSemana.map((x) => x.ejercicios[id].rir).filter((v) => v != null);
      cargas.push({ nombre: e.nombre, antes, ahora, corp, rir: rirs.length ? rirs[rirs.length - 1] : null });
    }));
    const molestias = regs.filter((r) => r.molestia && r.molestia.zona).map((r) => ({ ...r.molestia, fecha: r.fecha, sesion: r.sesion }));
    return { regs, completas, parciales, noRealizadas, sustituciones, cargas, molestias };
  }
  const nombreConFecha = (r) => `${nombreLargo(r.sesion) || r.nombre} (${fechaCorta(r.fecha)})`;
  function textoParcial(st) {
    const partes = [];
    if (st.faltan.length) partes.push(`faltó ${st.faltan.join(", ").toLowerCase()}`);
    st.incompletos.forEach((i) => partes.push(`${i.nombre.toLowerCase()} ${i.hechas} de ${i.previstas} series`));
    return partes.join("; ");
  }
  function lineasEstadoSemana(w) {
    const es = estadoSemana(w), L = [];
    const fuera = (it) => `${nombreLargo(it.sesion)}${it.prioritaria ? "" : " (opcional)"}`;
    const rirTxt = (v) => (v == null ? "" : ` (RIR ${v >= 4 ? "4+" : v})`);
    L.push(`Completadas: ${es.completas.length ? es.completas.map((x) => nombreConFecha(x.r)).join(", ") : "ninguna"}.`);
    L.push(`Parciales: ${es.parciales.length ? es.parciales.map((x) => `${nombreConFecha(x.r)}: ${textoParcial(x.st)}`).join(". ") : "ninguna"}.`);
    L.push(`No realizadas: ${es.noRealizadas.length ? es.noRealizadas.map(fuera).join(", ") : "ninguna"}.`);
    L.push(`Ejercicios sustituidos: ${es.sustituciones.length ? es.sustituciones.map((s) => `${s.original} → ${s.alternativa} (${fechaCorta(s.r.fecha)})`).join(", ") : "ninguno"}.`);
    if (es.cargas.length) {
      L.push("Cargas y RIR:");
      es.cargas.forEach((c) => L.push(`  ${c.nombre}: ${c.antes == null ? fmtCarga(c.ahora, c.corp) : c.antes === c.ahora ? `${fmtCarga(c.ahora, c.corp)} (igual)` : `${fmtCarga(c.antes, c.corp)} → ${fmtCarga(c.ahora, c.corp)}`}${rirTxt(c.rir)}`));
    } else L.push("Cargas y RIR: sin datos de fuerza.");
    L.push(`Molestias: ${es.molestias.length ? es.molestias.map((m) => `${textoMolestia(m)} (${fechaCorta(m.fecha)}, ${nombreLargo(m.sesion).toLowerCase()})`).join("; ") : "ninguna"}.`);
    return L;
  }
  function lineaEstadisticas(st) {
    const partes = [`${st.hechas} de ${st.total} prioritarias`];
    if (st.mejoras.length && !st.mejoras[0].corp) partes.push(`${st.mejoras[0].nombre.toLowerCase()} +${fmt(st.mejoras[0].a - st.mejoras[0].de)} kg`);
    if (st.records) partes.push(`${st.records} récord${st.records > 1 ? "s" : ""}`);
    return partes.join(", ");
  }

  function calcularAhora() {
    const P = estadoPrograma(), w = P.semana, hoy = hoyISO(), dia = diaSemana(hoy), min = minAhora();

    const enCurso = PLAN.fuerza.find((s) => hayDatos(S.borradores[s.id]));
    if (enCurso) {
      const c = contarSeries(S.borradores[enCurso.id]);
      return { eti: "En curso", titulo: `Continuar ${enCurso.nombre}`, sub: `${c.hechas} de ${c.total} series hechas`, href: `#/fuerza/${enCurso.id}`, ir: "Continuar", enCurso: true };
    }
    if (P.antesDeEmpezar) {
      const p = PLAN.fuerza[0];
      return { eti: `Empiezas el ${fechaLarga(S.inicio)}`, titulo: p.nombre, sub: "La primera sesión del bloque. Puedes adelantarla si te apetece.", href: `#/fuerza/${p.id}`, ir: "Ver sesión" };
    }
    // Fin del bloque: revisión completa antes de preparar el siguiente
    if ((P.terminado || (w === N && dia === 7)) && !S.revisadas[`${PLAN.bloque.id}:bloque`] && S.registros.some((r) => r.bloque === PLAN.bloque.id)) {
      const st = estadisticas(semanasDe("bloque"));
      return { eti: "Bloque terminado", titulo: "Revisa el bloque", sub: `${st.hechas} de ${st.total} prioritarias. Prepara con ChatGPT las semanas 5 a 8.`, href: "#/resumen/bloque", ir: "Revisar bloque", revision: true };
    }
    // Domingo: cierre de semana, si hay algo que revisar y aún no se ha hecho
    if (dia === 7 && !S.revisadas[claveAgenda(w)] && registrosSemana(w).length) {
      const st = estadisticasSemana(w);
      return { eti: "Cierre de semana", titulo: "Revisa tu semana", sub: mayus(lineaEstadisticas(st)) + ". Prepara el resumen para ChatGPT.", href: "#/resumen/semana", ir: "Revisar", revision: true };
    }
    const hueco = HUECOS.find((h) => h.dia === dia && min >= aMin(h.desde) && min <= aMin(h.hasta) - 15);
    if (hueco) {
      const m = microSugerido();
      return { eti: `Tienes un hueco hasta las ${hueco.hasta}`, titulo: m.nombre, sub: `${m.duracion}. ${m.objetivo}.`, href: `#/micros/${m.id}`, ir: "Abrir micro", micro: true };
    }
    const items = PLAN.semana_tipo.slice().sort((a, b) => (b.prioritaria - a.prioritaria) || diaPrevisto(w, a) - diaPrevisto(w, b));
    const pendientes = items.filter((i) => !hechoEnSemana(w, i.sesion));
    const deHoy = pendientes.find((i) => diaPrevisto(w, i) === dia);
    if (deHoy) return { eti: "Hoy toca", titulo: nombreLargo(deHoy.sesion), sub: detalleSesion(deHoy.sesion, w) + (deHoy.prioritaria ? "" : ". Opcional."), href: CAT[deHoy.sesion].href, ir: "Empezar" };

    const pendP = pendientes.filter((i) => i.prioritaria).sort((a, b) => diaPrevisto(w, a) - diaPrevisto(w, b));
    if (pendP.length) {
      const sig = pendP.find((i) => diaPrevisto(w, i) > dia) || pendP[0];
      const d = diaPrevisto(w, sig);
      const cuando = d > dia ? `Prevista para el ${DIAS_LARGO[d]}.` : "Se quedó pendiente: hazla cuando te venga bien.";
      return { eti: "Siguiente", titulo: nombreLargo(sig.sesion), sub: `${cuando} ${detalleSesion(sig.sesion, w)}.`, href: CAT[sig.sesion].href, ir: "Ver sesión" };
    }
    const opc = pendientes.find((i) => !i.prioritaria);
    return opc
      ? { eti: "Semana cumplida", titulo: "Lo prioritario está hecho", sub: `Si te apetece, queda ${nombreLargo(opc.sesion).toLowerCase()}.`, href: CAT[opc.sesion].href, ir: "Ver" }
      : { eti: "Semana cumplida", titulo: "Todo hecho", sub: "Descansa. La semana que viene, más.", href: "#/progreso", ir: "Ver progreso" };
  }

  /* ------------------------------------------------------------------ Hoy */
  function vistaHoy() {
    const P = estadoPrograma(), w = P.semana;
    const info = PLAN.semanas.find((s) => s.n === w) || { titulo: "", texto: "" };
    const a = calcularAhora();
    const pr = prioritarias(), hechas = pr.filter((i) => hechoEnSemana(w, i.sesion)).length;
    const pista = Array.from({ length: N }, (_, i) => `<i class="${i + 1 < w ? "pasada" : i + 1 === w ? "actual" : ""}"></i>`).join("");
    const items = PLAN.semana_tipo.slice().sort((x, y) => diaPrevisto(w, x) - diaPrevisto(w, y));
    const micros = registrosSemana(w).filter((r) => r.tipo === "micro").length;

    const filas = items.map((it) => {
      const c = CAT[it.sesion]; if (!c) return "";
      const r = hechoEnSemana(w, it.sesion);
      const glifo = r ? "hecho" : it.prioritaria ? "" : "opcional";
      const sub = r ? `Hecha el ${fechaCorta(r.fecha)}` : it.prioritaria ? c.duracion : `Opcional, ${c.duracion}`;
      const ops = [1, 2, 3, 4, 5, 6, 7].map((d) => `<option value="${d}" ${d === diaPrevisto(w, it) ? "selected" : ""}>${DIAS[d]}</option>`).join("");
      return `<div class="fila-dia">
        <a class="celda" href="${c.href}"><span class="glifo ${glifo}"></span><span class="txt"><b>${esc(nombreLargo(it.sesion))}</b><small>${esc(sub)}</small></span><span></span></a>
        <select class="dia" data-action="cambiar-dia" data-sesion="${esc(it.sesion)}" aria-label="Día para ${esc(c.nombre)}">${ops}</select>
      </div>`;
    }).join("");

    const calendario = `<div class="espacio"></div><div class="grupo"><button class="celda boton sin-icono" data-action="calendario"><span class="txt"><b>Añadir semana al Calendario</b><small>Las sesiones pendientes, con su día y hora</small></span><span class="dcha">${CHEV}</span></button></div>`;
    const final = P.terminado
      ? `<p class="pie-grupo">Has terminado las ${N} semanas del bloque. Genera el resumen en Progreso, revísalo con ChatGPT y actualiza el plan.</p>`
      : "";

    return {
      titulo: "Hoy",
      sub: mayus(fechaLarga(hoyISO())),
      html: `
        <a class="ahora" href="${a.href}">
          <p class="eti">${esc(a.eti)}</p>
          <h2>${esc(a.titulo)}</h2>
          <p>${esc(a.sub)}</p>
          <span class="ir">${esc(a.ir)}</span>
        </a>
        ${a.micro || a.enCurso ? "" : (() => {
          const m = microSugerido();
          return `<div class="espacio"></div><div class="grupo"><a class="celda" href="#/micros/${m.id}">
            <span class="rayo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/></svg></span>
            <span class="txt"><b>Tengo un rato libre</b><small>${esc(m.nombre)}, ${esc(m.duracion)}</small></span>
            <span class="dcha">${CHEV}</span></a></div>`;
        })()}

        <h2 class="cab-grupo">Esta semana</h2>
        <div class="grupo">
          <div class="semana">
            <div class="linea1"><span class="num">Semana ${w} <span>de ${N}</span></span><span class="enf">${esc(info.titulo)}</span></div>
            <p>${esc(info.texto)}</p>
            <div class="pista" style="--n:${N}">${pista}</div>
          </div>
        </div>
        <div class="espacio"></div>
        <div class="grupo">${filas}</div>
        <p class="pie-grupo">${hechas} de ${pr.length} sesiones prioritarias${micros ? `, más ${micros} micro${micros > 1 ? "s" : ""}` : ""}. Los días son orientativos: cámbialos cuando quieras.</p>
        ${final}
        ${calendario}`,
    };
  }

  /* ----------------------------------------------------------- Biblioteca */
  function vistaBiblioteca() {
    const w = semanaActual();
    const ab = S.ui.abiertos;
    const celda = (href, titulo, sub, dcha, glifo) =>
      `<a class="celda ${glifo === undefined ? "sin-icono" : ""}" href="${href}">${glifo !== undefined ? `<span class="glifo ${glifo}"></span>` : ""}<span class="txt"><b>${esc(titulo)}</b><small>${esc(sub)}</small></span><span class="dcha">${dcha || ""}${CHEV}</span></a>`;

    const fuerza = PLAN.fuerza.map((s) => {
      const r = hechoEnSemana(w, s.id), b = S.borradores[s.id];
      const sub = r ? `Hecha el ${fechaCorta(r.fecha)}` : hayDatos(b) ? "A medias" : `${s.ejercicios.length} ejercicios`;
      return celda(`#/fuerza/${s.id}`, s.nombre, sub, esc(s.duracion));
    }).join("");
    const micros = PLAN.micros.map((m) => {
      const n = S.registros.filter((r) => r.sesion === m.id).length;
      return celda(`#/micros/${m.id}`, m.nombre, n ? `${m.objetivo}. Hecho ${n} ${n === 1 ? "vez" : "veces"}` : m.objetivo, esc(m.duracion));
    }).join("");
    const cardio = [
      celda("#/natacion", "Natación", detalleSesion("natacion", w), hechoEnSemana(w, "natacion") ? "Hecha" : ""),
      celda("#/carrera", "Carrera suave", detalleSesion("carrera", w), hechoEnSemana(w, "carrera") ? "Hecha" : "Opcional"),
    ].join("");

    const grupo = (id, titulo, cuenta, contenido) => `
      <details class="desplegable" data-grupo="${id}" ${ab[id] ? "open" : ""}>
        <summary><b>${titulo}</b><small>${cuenta}</small>${FLECHA}</summary>
        <div class="contenido">${contenido}</div>
      </details>`;

    return {
      titulo: "Biblioteca",
      sub: `Contenido de la semana ${w}`,
      html:
        grupo("fuerza", "Fuerza", `${PLAN.fuerza.length}`, fuerza) +
        grupo("micros", "Microentrenamientos", `${PLAN.micros.length}`, micros) +
        grupo("cardio", "Cardio", "2", cardio) +
        `<p class="pie-grupo" style="margin-top:14px">${esc(PLAN.intensidad)}</p>`,
    };
  }

  /* ------------------------------------------------- Modo entrenamiento */
  function borradorPara(sesion, w) {
    let b = S.borradores[sesion.id];
    if (!b) b = S.borradores[sesion.id] = { notas: "", ej: {}, pos: { ex: 0, serie: 0 }, abierta: Date.now() };
    if (!b.pos) b.pos = { ex: 0, serie: 0 };
    sesion.ejercicios.forEach((e) => {
      if (!b.ej[e.id]) b.ej[e.id] = { nota: "", series: Array.from({ length: seriesPlan(e, w) }, () => ({ kg: "", reps: "", ok: false })) };
    });
    b.pos.ex = Math.min(b.pos.ex, sesion.ejercicios.length - 1);
    return b;
  }

  // Valor que se muestra en la serie: lo anotado, o lo sugerido (gris) si aún no hay nada.
  function valorSerie(e, d, i, campo, ult) {
    const s = d.series[i];
    if (s[campo] !== "") return { v: s[campo], sugerido: false };
    const prev = d.series.slice(0, i).reverse().find((x) => x[campo] !== "");
    if (prev) return { v: prev[campo], sugerido: true, origen: "serie" };
    if (ult && ult.series[Math.min(i, ult.series.length - 1)]) {
      const u = ult.series[Math.min(i, ult.series.length - 1)][campo];
      if (u) return { v: u, sugerido: true, origen: "ultima" };
    }
    if (campo === "reps") return { v: String(minRango(PLAN_REPS[e.id]) || ""), sugerido: true };
    return { v: "", sugerido: true };
  }
  const PLAN_REPS = {};
  PLAN.fuerza.forEach((s) => s.ejercicios.forEach((e) => (PLAN_REPS[e.id] = e.reps)));

  function vistaFuerza(id) {
    const sesion = PLAN.fuerza.find((s) => s.id === id);
    if (!sesion) return vistaNoEncontrada();
    const w = semanaActual();
    const b = borradorPara(sesion, w);
    guardar();
    const ix = b.pos.ex, e = sesion.ejercicios[ix], d = b.ej[e.id];
    const ef = efectivo(e, d);
    let si = Math.min(b.pos.serie, d.series.length - 1);
    const ult = ultimaVez(ef.id);
    const sug = sugerencia(e, w, ef);
    const mx = marcas(ef.id).max;
    const todas = d.series.every((s) => s.ok);
    const ultimo = ix === sesion.ejercicios.length - 1;

    const tira = sesion.ejercicios.map((x, i) => {
      const dx = b.ej[x.id], ok = dx.series.filter((s) => s.ok).length;
      const cls = i === ix ? "actual" : ok === dx.series.length ? "hecho" : ok ? "parcial" : "";
      return `<button class="${cls}" data-action="ir-ej" data-i="${i}" aria-label="${esc(x.nombre)}"><i></i></button>`;
    }).join("");

    const chips = d.series.map((s, i) =>
      `<button class="chip ${s.ok ? "ok" : ""} ${i === si ? "sel" : ""}" data-action="sel-serie" data-i="${i}">${s.ok ? formatoSerie(s) : `Serie ${i + 1}`}${s.pr ? '<span class="pr" aria-label="récord"></span>' : ""}</button>`).join("") +
      `<button class="chip mas" data-action="mas-serie" aria-label="Añadir serie">+ Serie</button>`;

    const kg = valorSerie(e, d, si, "kg", ult), reps = valorSerie(e, d, si, "reps", ult);
    const s = d.series[si];
    const calen = si === 0 && !s.ok ? calentamiento(e, ef, kg.v) : null;
    // Peso corporal: se muestra el valor absoluto con un selector Asistencia / Lastre
    const kgNum = num(kg.v);
    const modo = ef.corp ? d.modo || (kgNum > 0 ? "lastre" : "asistencia") : null;
    const kgVista = ef.corp ? (kgNum == null ? "" : fmt(Math.abs(kgNum))) : fmt(kg.v);
    const rirBloque = todas
      ? `<div class="rir"><span>Repeticiones en recámara en la última serie</span>
          <div class="escala" role="group">${[0, 1, 2, 3, 4].map((n) => `<button data-action="rir" data-v="${n}" aria-pressed="${d.rir === n}">${n === 4 ? "4+" : n}</button>`).join("")}</div></div>`
      : "";
    const alts = e.alternativas && e.alternativas.length
      ? `<div class="alternativas" ${b.verAlt === e.id ? "" : "hidden"}>
          ${[{ id: null, nombre: e.nombre }].concat(e.alternativas).map((a) =>
            `<button class="alt ${(a.id || null) === (d.alt || null) ? "sel" : ""}" data-action="elegir-alt" data-alt="${a.id || ""}">${esc(a.nombre)}</button>`).join("")}
        </div>`
      : "";

    return {
      foco: true,
      html: `
      <header class="foco-cab">
        <div class="barra-in">
          <span class="izq"><button class="nav-btn" data-action="cerrar-foco" aria-label="Salir">${ATRAS}<span>Salir</span></button></span>
          <span></span>
          <span class="der"><a class="nav-btn" href="#/fuerza/${id}/fin" style="font-weight:600">Terminar</a></span>
        </div>
        <div class="tira" style="--n:${sesion.ejercicios.length}">${tira}</div>
      </header>

      <section class="ej-cab">
        <p class="pos">${esc(sesion.nombre)}, ejercicio ${ix + 1} de ${sesion.ejercicios.length}</p>
        <h1>${esc(ef.nombre)}</h1>
        <p class="pauta">${seriesPlan(e, w)} × ${esc(e.reps)}${alts ? ` <button class="txt-btn cambiar" data-action="ver-alt">${ef.alt ? "En lugar de " + esc(e.nombre.toLowerCase()) : "Cambiar"}</button>` : ""}</p>
        ${alts}
        ${ult ? `<p class="info">Última vez, ${fechaCorta(ult.fecha)}: ${ult.series.map(formatoSerie).join("  ")}</p>` : `<p class="info">Primera vez: elige una carga cómoda y deja 2–3 repeticiones en recámara.</p>`}
        ${mx ? `<p class="info">Máximo: ${fmtCarga(mx.kg, mx.corp)} × ${esc(mx.reps || "?")}, ${fechaCorta(mx.fecha)}</p>` : ""}
        ${e.nota && !ef.alt ? `<details class="tecnica"><summary>Técnica</summary><p>${esc(e.nota)}</p></details>` : ""}
        ${sug ? `<p class="sugerencia">${esc(textoSugerencia(sug))}</p>` : semanaSinProgresion(w) && ult ? `<p class="info">Semana de consolidación: mantén cargas y cuida la técnica.</p>` : ""}
      </section>

      <div class="series-chips">${chips}</div>

      <section class="panel">
        ${calen ? `<p class="calentamiento">${esc(calen.texto)}</p>` : ""}
        ${ef.corp ? `<div class="segmentado" style="margin-bottom:10px">${["asistencia", "lastre"].map((m) => `<button data-action="modo-corp" data-v="${m}" aria-pressed="${modo === m}">${m === "asistencia" ? "Con asistencia" : "Con lastre"}</button>`).join("")}</div>` : ""}
        <div class="titulo-serie"><b>Serie ${si + 1}</b><small>${s.ok ? "Hecha" : kg.sugerido && kg.v ? (kg.origen === "serie" ? "Como la serie anterior" : "Como la última vez") : ""}</small></div>
        <div class="steppers">
          <div class="stepper">
            <input inputmode="decimal" data-campo="kg" value="${esc(kgVista)}" class="${kg.sugerido ? "sugerido" : ""}" placeholder="0" aria-label="Kilos">
            <div class="unidad">${ef.corp ? (modo === "lastre" ? "kg de lastre" : "kg de asistencia") : ef.mancuernas ? "kg por mancuerna" : "kg"}<button class="salto-btn" data-action="ver-salto">salto ${fmt(ef.paso)}${ef.pasoConfirmado ? "" : "?"}</button></div>
            <div class="mm"><button data-action="paso" data-campo="kg" data-d="-1" aria-label="Menos peso">−</button><button data-action="paso" data-campo="kg" data-d="1" aria-label="Más peso">+</button></div>
          </div>
          <div class="stepper">
            <input inputmode="numeric" data-campo="reps" value="${esc(reps.v)}" class="${reps.sugerido ? "sugerido" : ""}" placeholder="0" aria-label="Repeticiones">
            <div class="unidad">repeticiones</div>
            <div class="mm"><button data-action="paso" data-campo="reps" data-d="-1" aria-label="Una repetición menos">−</button><button data-action="paso" data-campo="reps" data-d="1" aria-label="Una repetición más">+</button></div>
          </div>
        </div>
        <div class="saltos" ${b.verSalto === ef.id ? "" : "hidden"}>
          <p>¿Cuál es el menor salto que permite tu material en ${esc(ef.nombre.toLowerCase())}?</p>
          <div class="alternativas">${[0.5, 1, 1.25, 2, 2.5, 5].map((v) => `<button class="alt ${ef.pasoConfirmado && ef.paso === v ? "sel" : ""}" data-action="elegir-salto" data-v="${v}">${fmt(v)} kg</button>`).join("")}
          ${ef.pasoConfirmado ? `<button class="alt" data-action="elegir-salto" data-v="">Usar el del plan (${fmt(ef.pasoPlan)})</button>` : ""}</div>
        </div>
        ${s.ok
          ? `<button class="btn sec" data-action="deshacer-serie">Desmarcar serie</button>`
          : `<button class="btn" data-action="serie-hecha">Serie hecha</button>`}
        ${rirBloque}
        <div style="display:flex;justify-content:space-between;margin-top:4px">
          ${d.series.length > 1 ? `<button class="txt-btn" data-action="menos-serie">Quitar última serie</button>` : "<span></span>"}
          <button class="txt-btn" data-action="ver-nota">${d.nota ? "Ver nota" : "Añadir nota"}</button>
        </div>
        <textarea data-campo="nota" placeholder="Observaciones de este ejercicio" ${d.nota ? "" : "hidden"}>${esc(d.nota)}</textarea>
      </section>

      <div class="foco-pie"><div class="in">
        <button class="btn sec" data-action="ir-ej" data-i="${ix - 1}" ${ix === 0 ? "disabled style=\"opacity:.4\"" : ""}>Anterior</button>
        ${ultimo
          ? `<a class="btn ${todas ? "" : "sec"}" href="#/fuerza/${id}/fin">Terminar sesión</a>`
          : `<button class="btn ${todas ? "" : "sec"}" data-action="ir-ej" data-i="${ix + 1}">Siguiente</button>`}
      </div></div>`,
    };
  }

  function vistaFinFuerza(id) {
    const sesion = PLAN.fuerza.find((s) => s.id === id);
    if (!sesion) return vistaNoEncontrada();
    const w = semanaActual(), b = borradorPara(sesion, w);
    const filas = sesion.ejercicios.map((e) => {
      const d = b.ej[e.id], ok = d.series.filter((s) => s.ok);
      return `<div class="celda sin-icono"><span class="txt"><b>${esc(efectivo(e, d).nombre)}</b><small>${ok.length ? ok.map(formatoSerie).join("  ") + (d.rir != null ? `. RIR ${d.rir === 4 ? "4+" : d.rir}` : "") : "Sin series marcadas"}</small></span><span class="dcha">${ok.length}/${d.series.length}</span></div>`;
    }).join("");
    const r = hechoEnSemana(w, id);
    const desde = b.abierta || b.empezada;
    const medidaBruta = desde ? Math.round((Date.now() - desde) / 60000) : null;
    const medida = medidaBruta && medidaBruta > 0 && medidaBruta < 240 ? medidaBruta : null;
    return {
      titulo: `Terminar ${sesion.nombre}`,
      volver: { href: `#/fuerza/${id}`, label: "Sesión" },
      html: `
        ${r ? `<p class="pie-grupo" style="margin:0 16px 12px">Ya registraste ${esc(sesion.nombre)} esta semana (${fechaCorta(r.fecha)}). Esta se guardará como otra sesión.</p>` : ""}
        <div class="grupo">${filas}</div>
        <h2 class="cab-grupo">Cómo ha ido</h2>
        <div class="grupo">
          <label class="campo-form"><span>Fecha</span><input class="input" type="date" id="fin-fecha" value="${hoyISO()}" max="${hoyISO()}"></label>
          <label class="campo-form"><span>Duración (min)${medida ? ", medida desde que abriste la sesión" : ""}</span><input class="input" type="number" inputmode="numeric" min="1" max="300" id="fin-duracion" value="${medida || ""}" placeholder="Sin anotar"></label>
          <div class="campo-form"><span>Energía</span>${escala("energia", b.energia || null, "Sin fuerzas", "A tope")}</div>
          <div class="campo-form"><span>Esfuerzo</span>${escala("esfuerzo", b.esfuerzo || null, "Muy suave", "Al límite")}</div>
          ${bloqueMolestia(b.molestia)}
          <label class="campo-form"><span>Notas</span><textarea data-campo="notas-sesion" placeholder="Sueño, molestias, sensaciones…">${esc(b.notas)}</textarea></label>
        </div>
        <div class="espacio"></div>
        <button class="btn" data-action="guardar-fuerza" data-id="${id}">Guardar sesión</button>
        <button class="btn sec" data-action="descartar" data-id="${id}" style="color:var(--peligro)">Descartar lo anotado</button>`,
    };
  }

  /* ---------------------------------------------------------------- Micros */
  function vistaMicro(id) {
    const m = PLAN.micros.find((x) => x.id === id);
    if (!m) return vistaNoEncontrada();
    return {
      titulo: m.nombre,
      sub: `${m.duracion}. ${m.objetivo}.`,
      volver: { href: "#/biblioteca", label: "Biblioteca" },
      html: `
        <div class="segmentado" role="tablist">${PLAN.micros.map((x) => `<button role="tab" aria-selected="${x.id === m.id}" data-action="cambiar-micro" data-href="#/micros/${x.id}">${esc(x.nombre)}</button>`).join("")}</div>
        <div class="espacio"></div>
        <div class="grupo">${m.ejercicios.map((e) =>
          `<div class="celda sin-icono" style="grid-template-columns:1fr auto auto"><span class="txt"><b>${esc(e.nombre)}</b></span><span class="dcha">${esc(e.pauta)}</span><button class="check-ej" data-action="toggle-local" aria-pressed="false" aria-label="${esc(e.nombre)} hecho"></button></div>`).join("")}
        </div>
        <p class="pie-grupo">Es extra: suma, pero nunca cuenta como sesión obligatoria.</p>
        ${formCierre(m.id, "Marcar como hecho")}`,
    };
  }

  /* ---------------------------------------------------------------- Cardio */
  function tabsSemanas(base, sel, w) {
    return `<div class="segmentado" role="tablist">${Array.from({ length: N }, (_, i) => i + 1).map((n) =>
      `<button role="tab" aria-selected="${n === sel}" data-action="ir" data-href="${base}/${n}">${n === w ? `Semana ${n}` : n}</button>`).join("")}</div><div class="espacio"></div>`;
  }
  function vistaNatacion(semSel) {
    const w = semanaActual(), sel = Math.min(Math.max(semSel || w, 1), N);
    const r = hechoEnSemana(w, "natacion");
    return {
      titulo: "Natación",
      sub: `${PLAN.natacion.duracion}. ${PLAN.natacion.enfoque}`,
      volver: { href: "#/biblioteca", label: "Biblioteca" },
      html: tabsSemanas("#/natacion", sel, w) +
        `<div class="grupo"><ol class="pasos">${(PLAN.natacion.semanas[sel - 1] || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ol></div>` +
        (r && sel === w ? `<p class="pie-grupo">Hecha esta semana, ${fechaCorta(r.fecha)}.</p>` : "") +
        formCierre("natacion", "Marcar natación como hecha"),
    };
  }
  function vistaCarrera(semSel) {
    const w = semanaActual(), sel = Math.min(Math.max(semSel || w, 1), N);
    const c = PLAN.carrera.semanas[sel - 1];
    const r = hechoEnSemana(w, "carrera");
    return {
      titulo: "Carrera suave",
      sub: `Opcional, ${PLAN.carrera.duracion}. ${PLAN.carrera.enfoque}`,
      volver: { href: "#/biblioteca", label: "Biblioteca" },
      html: tabsSemanas("#/carrera", sel, w) +
        (c ? `<div class="grupo"><div class="intervalo">
            <div><b>${c.trote}′</b><small>trotando</small></div>
            <div><b>${c.andar}′</b><small>andando</small></div>
            <div><b>${c.repeticiones}</b><small>veces</small></div>
          </div></div>
          <p class="pie-grupo">Unos ${(c.trote + c.andar) * c.repeticiones} minutos. Si no puedes hablar mientras trotas, baja el ritmo.</p>
          <div class="espacio"></div>
          <a class="btn" href="#/intervalos/${sel}">Empezar con temporizador</a>` : "") +
        (r && sel === w ? `<p class="pie-grupo">Hecha esta semana, ${fechaCorta(r.fecha)}.</p>` : "") +
        formCierre("carrera", "Marcar carrera como hecha"),
    };
  }

  /* ------------------------------------------- Temporizador de intervalos
     Sin sonido: la pantalla entera cambia de color en cada fase.
     Trotar = fondo oscuro. Andar = fondo claro. */
  let INT = null; // { fases, inicio, pausa, pausado, semana }
  function fasesCarrera(c) {
    const f = [];
    for (let i = 0; i < c.repeticiones; i++) {
      f.push({ tipo: "trote", seg: c.trote * 60, bloque: i + 1 });
      f.push({ tipo: "andar", seg: c.andar * 60, bloque: i + 1 });
    }
    return f;
  }
  function estadoIntervalo() {
    const t = ((INT.pausado || Date.now()) - INT.inicio - INT.pausa) / 1000;
    let acum = 0;
    for (let i = 0; i < INT.fases.length; i++) {
      const f = INT.fases[i];
      if (t < acum + f.seg) return { fase: f, resta: Math.ceil(acum + f.seg - t), total: INT.fases.reduce((a, x) => a + x.seg, 0) - t };
      acum += f.seg;
    }
    return { fin: true };
  }
  // Segundos reales de trote y de caminar hasta ahora (o hasta el final)
  function medidoIntervalo() {
    if (!INT) return null;
    let t = ((INT.pausado || Date.now()) - INT.inicio - INT.pausa) / 1000;
    const out = { trote: 0, andar: 0 };
    INT.fases.forEach((f) => { const u = Math.max(0, Math.min(f.seg, t)); out[f.tipo] += u; t -= u; });
    return out;
  }
  function guardarIntervalo() {
    const m = medidoIntervalo();
    if (m && m.trote + m.andar >= 30) { S.ui.ultimoIntervalo = { fecha: hoyISO(), trote: Math.round(m.trote), andar: Math.round(m.andar) }; guardar(); }
  }
  function vistaIntervalos(sem) {
    const c = PLAN.carrera.semanas[(sem || semanaActual()) - 1];
    if (!c) return vistaNoEncontrada();
    if (!INT || INT.semana !== sem) INT = { fases: fasesCarrera(c), inicio: Date.now(), pausa: 0, pausado: null, semana: sem, reps: c.repeticiones };
    return {
      foco: true,
      intervalos: true,
      html: `
      <header class="foco-cab sin-fondo">
        <div class="barra-in">
          <span class="izq"><button class="nav-btn" data-action="salir-intervalos">${ATRAS}<span>Salir</span></button></span><span></span><span class="der"></span>
        </div>
      </header>
      <section class="intervalos" id="intervalos"></section>
      <div class="foco-pie sin-fondo"><div class="in" style="grid-template-columns:1fr">
        <button class="btn" data-action="pausa-intervalos" id="btn-pausa">Pausar</button>
      </div></div>`,
    };
  }
  function pintarIntervalos() {
    const el = document.getElementById("intervalos");
    if (!el || !INT) return;
    const e = estadoIntervalo();
    const body = document.body;
    if (e.fin) {
      guardarIntervalo();
      body.classList.remove("fase-trote"); body.classList.add("fase-andar");
      el.innerHTML = `<p class="fase">Terminado</p><p class="cuenta">✓</p><p class="detalle">Buen trabajo. Regístrala para que cuente esta semana.</p>
        <a class="btn" href="#/carrera" style="margin-top:28px">Registrar carrera</a>`;
      const pie = document.querySelector(".foco-pie"); if (pie) pie.hidden = true;
      INT = null; return;
    }
    body.classList.toggle("fase-trote", e.fase.tipo === "trote");
    body.classList.toggle("fase-andar", e.fase.tipo !== "trote");
    const mmss = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
    el.innerHTML = `<p class="fase">${e.fase.tipo === "trote" ? "Trota" : "Anda"}</p>
      <p class="cuenta">${mmss(e.resta)}</p>
      <p class="detalle">Bloque ${e.fase.bloque} de ${INT.reps}. Quedan ${mmss(Math.max(0, e.total))} en total.</p>
      ${INT.pausado ? '<p class="detalle">En pausa</p>' : ""}`;
    const b = document.getElementById("btn-pausa"); if (b) b.textContent = INT.pausado ? "Seguir" : "Pausar";
  }
  setInterval(() => { if (location.hash.startsWith("#/intervalos")) pintarIntervalos(); }, 250);

  /* -------------------------------------------------------------- Progreso */
  function vistaProgreso() {
    const w = semanaActual(), pr = prioritarias();
    const semanas = Array.from({ length: N }, (_, i) => i + 1).map((n) => {
      const regs = registrosSemana(n);
      const puntos = pr.map((p) => `<i class="${regs.some((r) => r.sesion === p.sesion) ? "on" : ""}"></i>`).join("");
      const extra = [];
      const nc = regs.filter((r) => r.tipo === "carrera").length, nm = regs.filter((r) => r.tipo === "micro").length;
      if (nc) extra.push(`${nc} carrera`);
      if (nm) extra.push(`${nm} micro${nm > 1 ? "s" : ""}`);
      return `<div class="celda sin-icono"><span class="txt"><b style="${n === w ? "font-weight:700" : ""}">Semana ${n}${n === w ? " (actual)" : ""}</b><small>${extra.join(", ") || (n <= w ? "Sin extras" : "Por llegar")}</small></span><span class="puntos">${puntos}</span></div>`;
    }).join("");

    const hist = S.registros.slice().sort(ordenFecha);
    const lista = hist.length
      ? hist.slice(0, 60).map((r) => {
          const d = deISO(r.fecha);
          const sub = r.notas || [r.energia ? `Energía ${r.energia}/5` : "", r.esfuerzo ? `Esfuerzo ${r.esfuerzo}/5` : ""].filter(Boolean).join(", ") || `Semana ${r.semana}`;
          return `<a class="celda" href="#/registro/${r.id}"><span class="fecha-chip"><b>${d.getDate()}</b><small>${MESES[d.getMonth()]}</small></span><span class="txt"><b>${esc(nombreLargo(r.sesion) || r.nombre)}</b><small style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(sub)}</small></span><span class="dcha">${CHEV}</span></a>`;
        }).join("")
      : `<p class="vacio">Aún no hay sesiones. Cuando guardes la primera aparecerá aquí.</p>`;

    const ejercicios = listaEjercicios();
    const copia = copiaPendiente();
    const avisoCopia = copia
      ? `<div class="espacio"></div><div class="grupo"><button class="celda boton sin-icono" data-action="exportar"><span class="txt"><b>Haz una copia de seguridad</b><small>${copia}</small></span><span class="dcha">${CHEV}</span></button></div>`
      : "";

    return {
      titulo: "Progreso",
      derecha: `<a class="nav-btn" href="#/ajustes" aria-label="Ajustes">${ENGRANAJE}</a>`,
      html: `
        <a class="ahora" href="#/resumen">
          <p class="eti">Para tu revisión con ChatGPT</p>
          <h2>Resumen de la semana</h2>
          <p>Sesiones, cargas, sensaciones y notas en un texto listo para pegar.</p>
          <span class="ir">Preparar resumen</span>
        </a>
        ${avisoCopia}
        <h2 class="cab-grupo">Semanas del bloque</h2>
        <div class="grupo">${semanas}</div>
        <p class="pie-grupo">Cada punto es una sesión prioritaria: fuerza A, natación y fuerza B.</p>
        <div class="espacio"></div>
        <details class="desplegable" data-grupo="ejercicios" ${S.ui.abiertos.ejercicios ? "open" : ""}>
        <summary><b>Evolución por ejercicio</b><small>${ejercicios.filter((e) => ultimaVez(e.id)).length} con datos</small>${FLECHA}</summary>
        <div class="contenido">${ejercicios.map((e) => {
          const m = marcas(e.id).max;
          return `<a class="celda sin-icono" href="#/ejercicio/${e.id}"><span class="txt"><b>${esc(e.nombre)}</b><small>${m ? `Máximo: ${fmtCarga(m.kg, m.corp)} × ${esc(m.reps || "?")}` : "Sin registros"}</small></span><span class="dcha">${CHEV}</span></a>`;
        }).join("")}</div></details>
        <h2 class="cab-grupo">Historial</h2>
        <div class="grupo">${lista}</div>`,
    };
  }

  // Ejercicios del plan + alternativas que ya tienen registros
  function listaEjercicios() {
    const out = [], ids = new Set();
    PLAN.fuerza.forEach((s) => s.ejercicios.forEach((e) => {
      if (!ids.has(e.id)) { ids.add(e.id); out.push({ id: e.id, nombre: e.nombre, reps: e.reps }); }
      (e.alternativas || []).forEach((a) => { if (!ids.has(a.id) && ultimaVez(a.id)) { ids.add(a.id); out.push({ id: a.id, nombre: a.nombre, reps: e.reps }); } });
    }));
    return out;
  }
  function copiaPendiente() {
    if (S.registros.length < 3) return null;
    const ref = S.ultimaCopia || S.registros.map((r) => r.fecha).sort()[0];
    const dias = diasEntre(ref, hoyISO());
    if (dias < 14) return null;
    return S.ultimaCopia ? `La última fue hace ${dias} días` : "Aún no has guardado ninguna";
  }

  function vistaEjercicio(exId) {
    let ej = listaEjercicios().find((e) => e.id === exId);
    if (!ej) {
      const r = S.registros.find((x) => x.ejercicios && x.ejercicios[exId]);
      if (r) ej = { id: exId, nombre: r.ejercicios[exId].nombre, reps: "" };
    }
    if (!ej) return vistaNoEncontrada();
    const mk = marcas(exId);
    const regs = S.registros.filter((r) => r.ejercicios && r.ejercicios[exId] && r.ejercicios[exId].series.some((s) => s.kg || s.reps))
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    const puntos = regs.map((r) => ({ fecha: r.fecha, kg: cargaMax(r.ejercicios[exId].series, mk.corp) })).filter((p) => p.kg != null);
    let grafico = "";
    if (puntos.length >= 2) {
      const W = 320, H = 90, min = Math.min(...puntos.map((p) => p.kg)), max = Math.max(...puntos.map((p) => p.kg));
      const rango = max - min || 1;
      const xy = puntos.map((p, i) => [12 + (i * (W - 24)) / (puntos.length - 1), H - 14 - ((p.kg - min) / rango) * (H - 30)]);
      grafico = `<div class="grupo" style="padding:14px 16px 8px">
        <div style="display:flex;justify-content:space-between;color:var(--gris);font-size:13px"><span>${mk.corp ? "Carga por sesión (arriba = más lastre o menos asistencia)" : "Peso máximo por sesión"}</span><span>${mk.corp ? "" : `${fmt(min)}–${fmt(max)} kg`}</span></div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;margin-top:6px" aria-hidden="true">
          <polyline points="${xy.map((p) => p.join(",")).join(" ")}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
          ${xy.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === xy.length - 1 ? 4 : 2.5}" fill="currentColor"/>`).join("")}
        </svg></div><div class="espacio"></div>`;
    }
    const resumenMarcas = mk.max
      ? `<div class="grupo">
          <div class="celda sin-icono"><span class="txt"><b>Máximo</b></span><span class="dcha">${fmtCarga(mk.max.kg, mk.corp)} × ${esc(mk.max.reps || "?")}, ${fechaCorta(mk.max.fecha)}</span></div>
          ${mk.mejor1rm ? `<div class="celda sin-icono"><span class="txt"><b>Máximo estimado a 1 repetición</b></span><span class="dcha">${fmt(Math.round(mk.mejor1rm * 2) / 2)} kg</span></div>` : ""}
        </div><div class="espacio"></div>`
      : "";
    return {
      titulo: ej.nombre,
      sub: ej.reps ? `${ej.reps} repeticiones` : "",
      volver: { href: "#/progreso", label: "Progreso" },
      html: resumenMarcas + grafico + (regs.length
        ? `<div class="grupo">${regs.slice().reverse().map((r) => `<a class="celda sin-icono" href="#/registro/${r.id}"><span class="txt"><b>${fechaCorta(r.fecha)}</b><small>${r.ejercicios[exId].series.filter((s) => s.kg || s.reps).map((s) => formatoSerie(s) + (s.pr ? " (récord)" : "")).join("  ")}</small></span><span class="dcha">${CHEV}</span></a>`).join("")}</div>`
        : `<div class="grupo"><p class="vacio">Cuando registres este ejercicio verás aquí su evolución.</p></div>`),
    };
  }

  function vistaDetalle(id) {
    const r = S.registros.find((x) => x.id === id);
    if (!r) return vistaNoEncontrada();
    const ej = r.ejercicios ? Object.values(r.ejercicios).map((e) => `
      <div class="campo-form"><span style="color:var(--tinta);font-weight:500">${esc(e.nombre)}</span>
        <table class="tabla"><tbody>${e.series.map((s, i) => `<tr><td>Serie ${i + 1}${s.pr ? ' <span class="pr-txt">Récord</span>' : ""}</td><td>${esc(formatoSerie(s))}</td></tr>`).join("")}</tbody></table>
        ${e.nota ? `<small style="color:var(--gris)">${esc(e.nota)}</small>` : ""}
      </div>`).join("") : "";
    return {
      titulo: nombreLargo(r.sesion) || r.nombre,
      sub: `Semana ${r.semana}${r.bloque !== PLAN.bloque.id ? " de un bloque anterior" : ""}${r.duracion ? `. ${r.duracion} minutos` : ""}`,
      volver: { href: "#/progreso", label: "Progreso" },
      html: `
        <div class="grupo">
          <label class="campo-form"><span>Fecha</span><input class="input" type="date" data-action="cambiar-fecha-registro" data-id="${r.id}" value="${r.fecha}" max="${hoyISO()}"></label>
          ${r.energia ? `<div class="celda sin-icono"><span class="txt"><b>Energía</b></span><span class="dcha">${r.energia} de 5</span></div>` : ""}
          ${r.esfuerzo ? `<div class="celda sin-icono"><span class="txt"><b>Esfuerzo</b></span><span class="dcha">${r.esfuerzo} de 5</span></div>` : ""}
          ${r.notas ? `<div class="campo-form"><span>Notas</span><div>${esc(r.notas)}</div></div>` : ""}
        </div>
        ${ej ? `<h2 class="cab-grupo">Ejercicios</h2><div class="grupo">${ej}</div>` : ""}
        <div class="espacio"></div>
        <div class="grupo"><button class="celda boton peligro sin-icono" data-action="borrar-registro" data-id="${r.id}">Borrar esta sesión</button></div>`,
    };
  }

  /* ---------------------------------------------------- Resumen ChatGPT */
  let alcanceResumen = "semana";
  const r1 = (x) => fmt(Math.round(x * 10) / 10);
  const semanasDe = (alcance) => {
    const w = semanaActual();
    return alcance === "bloque" ? Array.from({ length: estadoPrograma().terminado ? N : w }, (_, i) => i + 1) : alcance === "anterior" ? [Math.max(1, w - 1)] : [w];
  };
  function textoResumen(alcance) {
    const semanas = semanasDe(alcance);
    const L = [];
    L.push(`Resumen de entrenamiento: «${PLAN.bloque.nombre}» (${N} semanas, inicio ${fechaLarga(S.inicio)}).`);
    L.push(`Objetivo semanal: Fuerza A, Fuerza B y natación prioritarias; carrera opcional; micros como extra. Criterio: ${PLAN.intensidad}`);
    L.push("Leyenda: 60×8 = 60 kg por 8 repeticiones; en ejercicios con mancuernas, el peso es de una mancuerna. En dominadas, «asistencia» resta y «lastre» suma. RIR = repeticiones en recámara en la última serie. Energía, esfuerzo, calidad de sueño y molestias van de 1 a 5.");

    if (alcance === "bloque") {
      const st = estadisticas(semanas);
      L.push("");
      L.push(`ANÁLISIS DEL BLOQUE (semanas ${semanas[0]}–${semanas[semanas.length - 1]})`);
      L.push(`Adherencia: ${st.hechas} de ${st.total} sesiones prioritarias (${st.total ? Math.round((st.hechas / st.total) * 100) : 0} %).`);
      const tot = semanas.map(estadoSemana);
      L.push(`Sesiones completas: ${tot.reduce((a, x) => a + x.completas.length, 0)}. Parciales: ${tot.reduce((a, x) => a + x.parciales.length, 0)}. Ejercicios sustituidos: ${tot.reduce((a, x) => a + x.sustituciones.length, 0)}.`);
      semanas.forEach((n) => { const sn = estadisticasSemana(n); const nm = sn.regs.filter((r) => r.tipo === "micro").length; L.push(`  Semana ${n}: ${sn.hechas} de ${sn.total}${nm ? `, ${nm} micro${nm > 1 ? "s" : ""}` : ""}${sn.regs.some((r) => r.tipo === "carrera") ? ", con carrera" : ""}.`); });
      if (st.mejoras.length) { L.push("Evolución de cargas (primera sesión → mejor del bloque):"); st.mejoras.forEach((m) => L.push(`  ${m.nombre}: ${fmtCarga(m.de, m.corp)} → ${fmtCarga(m.a, m.corp)}`)); }
      else L.push("Evolución de cargas: sin cambios registrados todavía.");
      L.push(`Récords: ${st.records}. RIR medio en la última serie: ${st.rir != null ? r1(st.rir) : "sin datos"}.`);
      L.push(`Energía media: ${st.energia ? r1(st.energia) + "/5" : "sin datos"}. Esfuerzo medio: ${st.esfuerzo ? r1(st.esfuerzo) + "/5" : "sin datos"}.`);
      const suenos = semanas.map((n) => S.semanal[claveAgenda(n)]).filter((x) => x && x.suenoHoras);
      if (suenos.length) L.push(`Sueño medio: ${r1(media(suenos.map((x) => x.suenoHoras)))} h por noche.`);
      L.push(st.molestias.length ? `Molestias: ${st.molestias.map((m) => `${textoMolestia(m)} (${fechaCorta(m.fecha)}, ${nombreLargo(m.sesion).toLowerCase()})`).join("; ")}.` : "Molestias: ninguna registrada.");
    }

    semanas.forEach((n) => {
      const info = PLAN.semanas.find((s) => s.n === n) || {};
      const regs = registrosSemana(n).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      const pr = prioritarias();
      const hechas = pr.filter((p) => regs.some((r) => r.sesion === p.sesion));
      L.push("");
      L.push(`SEMANA ${n} (${info.titulo || ""}): ${hechas.length} de ${pr.length} prioritarias.`);
      lineasEstadoSemana(n).forEach((l) => L.push(l));
      const sem = S.semanal[claveAgenda(n)];
      if (sem && (sem.suenoHoras || sem.suenoCalidad)) L.push(`Sueño: ${[sem.suenoHoras ? `${fmt(sem.suenoHoras)} h de media` : "", sem.suenoCalidad ? `calidad ${sem.suenoCalidad}/5` : ""].filter(Boolean).join(", ")}.`);
      if (!regs.length) L.push("No hay sesiones registradas.");
      else L.push("Detalle:");
      regs.forEach((r) => {
        const c = r.carrera || {};
        const extra = [
          r.duracion ? `${r.duracion} min` : "",
          r.natacion && r.natacion.metros ? `${r.natacion.metros} m` : "",
          c.troteMin != null ? `${fmt(c.troteMin)} min trotando` : "",
          c.andarMin != null ? `${fmt(c.andarMin)} min caminando` : "",
          c.distanciaKm ? `${fmt(c.distanciaKm)} km` : "",
          r.energia ? `energía ${r.energia}/5` : "", r.esfuerzo ? `esfuerzo ${r.esfuerzo}/5` : "",
        ].filter(Boolean).join(", ");
        L.push(`- ${mayus(fechaCorta(r.fecha))}: ${nombreLargo(r.sesion) || r.nombre}${extra ? ` (${extra})` : ""}`);
        if (r.ejercicios) Object.values(r.ejercicios).forEach((e) => {
          const series = e.series.map((s) => formatoSerie(s) + (s.pr ? " (récord)" : "")).join(", ");
          L.push(`    ${e.nombre}${e.original ? ` (en lugar de ${e.original.toLowerCase()})` : ""}: ${[series, e.rir != null ? `RIR ${e.rir >= 4 ? "4+" : e.rir}` : "", e.nota ? `nota: ${e.nota}` : ""].filter(Boolean).join(". ")}`);
        });
        if (r.molestia && r.molestia.zona) L.push(`    Molestia: ${textoMolestia(r.molestia)}`);
        if (r.notas) L.push(`    Notas: ${r.notas}`);
      });
    });
    L.push("");
    L.push(alcance === "bloque"
      ? "Con estos datos, ¿cómo planteas el siguiente bloque de cuatro semanas?"
      : "¿Qué ajustarías en volumen, cargas o ejercicios para la próxima semana?");
    return L.join("\n");
  }

  function vistaResumen() {
    const opciones = [["semana", "Esta semana"], ["anterior", "Anterior"], ["bloque", "Todo el bloque"]];
    const semanas = semanasDe(alcanceResumen);
    const st = estadisticas(semanas);
    const unaSemana = alcanceResumen !== "bloque";
    const clave = claveAgenda(semanas[0]);
    const sem = S.semanal[clave] || {};
    const fila = (t, v) => `<div class="celda sin-icono"><span class="txt"><b>${t}</b></span><span class="dcha">${v}</span></div>`;
    const horas = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
    const es = unaSemana ? estadoSemana(semanas[0]) : null;
    const datos = `
        <div class="grupo">
          ${fila(unaSemana ? "Prioritarias" : "Adherencia", `${st.hechas} de ${st.total}${unaSemana ? "" : ` (${st.total ? Math.round((st.hechas / st.total) * 100) : 0} %)`}`)}
          ${es ? fila("Completas", es.completas.length) + fila("Parciales", es.parciales.length) + fila("No realizadas", esc(es.noRealizadas.length ? es.noRealizadas.map((it) => nombreLargo(it.sesion)).join(", ") : "ninguna")) + (es.sustituciones.length ? fila("Sustituidos", es.sustituciones.length) : "") : ""}
          ${st.mejoras.map((m) => fila(esc(m.nombre), `${fmtCarga(m.de, m.corp)} → ${fmtCarga(m.a, m.corp)}`)).join("")}
          ${st.records ? fila("Récords", st.records) : ""}
          ${st.rir != null ? fila("RIR medio", r1(st.rir)) : ""}
          ${st.energia ? fila("Energía media", `${r1(st.energia)} de 5`) : ""}
          ${st.esfuerzo ? fila("Esfuerzo medio", `${r1(st.esfuerzo)} de 5`) : ""}
          ${st.molestias.length ? fila("Molestias", esc(st.molestias.map(textoMolestia).join(", "))) : ""}
        </div>
        ${unaSemana ? `
        <h2 class="cab-grupo">Sueño de la semana (opcional)</h2>
        <div class="grupo">
          <label class="campo-form"><span>Horas por noche, de media</span>
            <select class="input" data-action="sueno" data-clave="${clave}"><option value="">Sin anotar</option>${horas.map((h) => `<option value="${h}" ${sem.suenoHoras === h ? "selected" : ""}>${fmt(h)} h${h === 9 ? " o más" : ""}</option>`).join("")}</select></label>
          <div class="campo-form"><span>Calidad</span>${escala("sueno-calidad", sem.suenoCalidad || null, "Mala", "Muy buena")}</div>
        </div>` : ""}
        <div class="espacio"></div>`;
    return {
      titulo: unaSemana ? "Resumen" : "Revisión del bloque",
      sub: unaSemana ? "Cópialo y pégalo en tu conversación de entrenamiento en ChatGPT." : "Adherencia, cargas, RIR, esfuerzo, energía y molestias del bloque, listos para preparar el siguiente con ChatGPT.",
      volver: { href: "#/progreso", label: "Progreso" },
      html: `
        <div class="segmentado">${opciones.map(([v, t]) => `<button data-action="alcance" data-v="${v}" aria-pressed="${alcanceResumen === v}">${t}</button>`).join("")}</div>
        <div class="espacio"></div>
        ${datos}
        <div class="grupo"><pre class="resumen-txt" id="resumen-txt">${esc(textoResumen(alcanceResumen))}</pre></div>
        <div class="espacio"></div>
        <button class="btn" data-action="abrir-chatgpt">Copiar y abrir ChatGPT</button>
        <button class="btn sec" data-action="copiar-resumen">Solo copiar</button>
        <p class="pie-grupo">ChatGPT se abre sin texto para que entres en la conversación donde lleva tus entrenamientos y pegues el resumen allí.${unaSemana && S.revisadas[clave] ? " Semana revisada." : ""}</p>`,
    };
  }

  /* --------------------------------------------------------------- Ajustes */
  function vistaAjustes() {
    const P = estadoPrograma();
    const seg = [["auto", "Auto"], ...Array.from({ length: N }, (_, i) => [String(i + 1), String(i + 1)])]
      .map(([v, t]) => `<button data-action="semana-manual" data-v="${v}" aria-pressed="${v === "auto" ? !S.semanaManual : S.semanaManual === Number(v)}">${t}</button>`).join("");
    const sw = (campo, on) => `<label class="switch"><input type="checkbox" data-action="ui-toggle" data-campo="${campo}" ${on ? "checked" : ""}><i></i></label>`;
    return {
      titulo: "Ajustes",
      volver: { href: "#/progreso", label: "Progreso" },
      html: `
        <h2 class="cab-grupo">Programa</h2>
        <div class="grupo">
          <label class="campo-form"><span>Inicio del bloque</span><input class="input" type="date" data-action="cambiar-inicio" value="${S.inicio}"></label>
          <div class="campo-form"><span>Semana actual</span><div class="segmentado">${seg}</div></div>
        </div>
        <p class="pie-grupo">La semana avanza sola cada 7 días. Si quieres repetir una, fíjala a mano. Ahora: semana ${P.semana}.</p>

        <h2 class="cab-grupo">Durante la sesión</h2>
        <div class="grupo">
          <div class="celda sin-icono"><span class="txt"><b>Temporizador de descanso</b><small>Arranca al marcar cada serie</small></span>${sw("temporizador", S.ui.temporizador)}</div>
          <div class="celda sin-icono"><span class="txt"><b>Sugerir subir carga</b><small>Cuando completas el rango en todas las series</small></span>${sw("sugerencias", S.ui.sugerencias)}</div>
        </div>

        <h2 class="cab-grupo">Plan de entrenamiento</h2>
        <div class="grupo">
          <button class="celda boton sin-icono" data-action="copiar-para-chatgpt"><span class="txt"><b>Copiar para ChatGPT</b><small>Instrucciones de formato y tu plan actual</small></span><span class="dcha">${CHEV}</span></button>
          <a class="celda sin-icono" href="#/plan-nuevo"><span class="txt"><b>Pegar plan nuevo</b><small>Revisa los cambios antes de aplicarlos</small></span><span class="dcha">${CHEV}</span></a>
          ${S.planAnterior ? `<button class="celda boton sin-icono" data-action="restaurar-plan"><span class="txt"><b>Volver al plan anterior</b><small>«${esc(S.planAnterior.bloque.nombre)}»</small></span><span class="dcha">${CHEV}</span></button>` : ""}
          ${PLAN_ORIGEN === "app" ? `<button class="celda boton sin-icono" data-action="usar-fichero"><span class="txt"><b>Usar el plan del fichero</b><small>El de plan.js en GitHub</small></span><span class="dcha">${CHEV}</span></button>` : ""}
        </div>
        <p class="pie-grupo">Estás usando ${PLAN_ORIGEN === "app" ? `el plan pegado en la app${S.planFecha ? ` el ${fechaCorta(S.planFecha)}` : ""}` : "el plan del fichero plan.js"}: «${esc(PLAN.bloque.nombre)}».</p>

        <h2 class="cab-grupo">Copia de seguridad</h2>
        <div class="grupo">
          <button class="celda boton sin-icono" data-action="exportar"><span class="txt"><b>Exportar datos</b></span><span class="dcha">${CHEV}</span></button>
          <button class="celda boton sin-icono" data-action="importar"><span class="txt"><b>Importar copia</b></span><span class="dcha">${CHEV}</span></button>
        </div>
        <input type="file" id="fichero-importar" accept="application/json,.json" hidden>
        <p class="pie-grupo">Tus datos solo están en este iPhone. Exporta una copia de vez en cuando a Archivos o iCloud Drive.${S.ultimaCopia ? ` Última copia: ${fechaCorta(S.ultimaCopia)}.` : ""}</p>

        <div class="espacio"></div>
        <div class="grupo"><button class="celda boton peligro sin-icono" data-action="borrar-todo">Borrar todos los datos</button></div>
        <p class="pie-grupo" style="text-align:center;margin-top:18px">Plan «${esc(PLAN.bloque.nombre)}». ${S.registros.length} sesiones guardadas. Versión ${APP_VERSION}.</p>`,
    };
  }

  /* ----------------------------------------------- Plan desde ChatGPT */
  const INSTRUCCIONES_CHATGPT = `Esta es la estructura del plan de mi app de entrenamiento «Mi vuelta a entrenar». A partir de ahora, cuando propongas cambios en mi planificación, explícamelos como siempre y, además, al final devuélveme el plan COMPLETO en un único bloque de código JSON con exactamente esta estructura, para pegarlo en la app.

Reglas:
1. Devuelve siempre el plan completo, no solo los cambios.
2. JSON válido: comillas dobles, sin comentarios y sin comas al final de listas u objetos.
3. No cambies el "id" de ningún ejercicio que se mantenga: la app enlaza el historial de pesos por id. Para ejercicios nuevos usa un id nuevo en minúsculas, sin tildes ni espacios, con guiones (por ejemplo "face-pull").
4. "series" tiene un número por semana del bloque (tantos como "bloque.semanas").
5. "reps" es texto, como "6–8" o "8–10 por pierna".
6. En cada ejercicio de fuerza: "principal": true si es un básico (descanso largo y series de calentamiento completas), "barra": true si se hace con barra olímpica, "paso" es el incremento de kilos de los botones (por defecto 2.5; usa el menor disponible en mancuernas y accesorios), "carga": "corporal" para ejercicios con lastre o asistencia (la app guarda la asistencia como kilos negativos y cuenta como progreso tener menos asistencia o más lastre), "implemento": "mancuernas" si se registra el peso de UNA mancuerna (también en alternativas), "nota" es una indicación técnica fija opcional, "descanso" es opcional y "alternativas" es una lista opcional de {"id", "nombre", "paso", "carga"} para cuando una máquina esté ocupada. Cada alternativa tiene su propio historial.
6b. "descanso" general: {"principal": [mínimo, máximo], "accesorio": [mínimo, máximo]} en segundos. Al llegar al mínimo, la app avisa de que se puede seguir; nunca obliga a empezar.
6c. En "semanas", cada semana puede llevar "progresion": false para que la app no sugiera subir carga (semanas de consolidación).
6d. La app calcula sola el calentamiento (básicos: barra vacía ×8–10, 50 % ×5, 70 % ×3, 80–85 % ×1–2; accesorios: una aproximación ligera opcional) y solo sugiere subir carga si se alcanzó el máximo del rango en todas las series con 2 o más de RIR en la última.
7. "semana_tipo" lista las sesiones de la semana: "sesion" debe ser el id de una sesión de fuerza, "natacion" o "carrera"; "dia" va de 1 (lunes) a 7 (domingo); "hora" en formato "HH:MM"; "prioritaria" true o false.
8. "huecos" son momentos fijos en los que la app me propone un microentrenamiento.
9. Para empezar un bloque nuevo, cambia "bloque.id" (por ejemplo "bloque-2") y "bloque.nombre".

Este es mi plan actual:`;

  const textoPlan = (pl) => JSON.stringify(pl, null, 2);

  function leerPlanPegado(txt) {
    let t = String(txt || "").trim();
    const ini = t.indexOf("{"), fin = t.lastIndexOf("}");
    if (ini === -1 || fin === -1) throw new Error("No encuentro ningún plan en el texto pegado.");
    t = t.slice(ini, fin + 1).replace(/,\s*([}\]])/g, "$1").replace(/[“”]/g, '"');
    try { return JSON.parse(t); }
    catch (e) { throw new Error("El texto no es un JSON válido. Pide a ChatGPT que lo devuelva en un único bloque de código JSON."); }
  }

  function compararPlanes(a, b) {
    const out = [];
    if (a.bloque.id !== b.bloque.id) out.push(`Bloque nuevo: «${b.bloque.nombre}». El historial anterior se conserva.`);
    else if (a.bloque.nombre !== b.bloque.nombre) out.push(`Nombre del bloque: «${b.bloque.nombre}».`);
    if (a.bloque.semanas !== b.bloque.semanas) out.push(`Duración: ${a.bloque.semanas} → ${b.bloque.semanas} semanas.`);
    const sesA = Object.fromEntries(a.fuerza.map((s) => [s.id, s])), sesB = Object.fromEntries(b.fuerza.map((s) => [s.id, s]));
    b.fuerza.forEach((s) => { if (!sesA[s.id]) out.push(`Sesión nueva: ${s.nombre}.`); });
    a.fuerza.forEach((s) => { if (!sesB[s.id]) out.push(`Se quita la sesión ${s.nombre}.`); });
    b.fuerza.forEach((s) => {
      const v = sesA[s.id]; if (!v) return;
      const ea = Object.fromEntries(v.ejercicios.map((e) => [e.id, e]));
      const eb = Object.fromEntries(s.ejercicios.map((e) => [e.id, e]));
      s.ejercicios.forEach((e) => {
        const o = ea[e.id];
        if (!o) {
          const mismoNombre = v.ejercicios.find((x) => x.nombre.toLowerCase() === e.nombre.toLowerCase() && !eb[x.id]);
          out.push(mismoNombre ? `${s.nombre}: «${e.nombre}» cambia de id. Perderías el enlace con su historial: pide a ChatGPT que mantenga el id "${mismoNombre.id}".` : `${s.nombre}: nuevo ejercicio, ${e.nombre} (${e.series.join("/")} × ${e.reps}).`);
          return;
        }
        const cambios = [];
        if (o.nombre !== e.nombre) cambios.push(`nombre «${e.nombre}»`);
        if (o.series.join("/") !== e.series.join("/")) cambios.push(`series ${o.series.join("/")} → ${e.series.join("/")}`);
        if (o.reps !== e.reps) cambios.push(`repeticiones ${o.reps} → ${e.reps}`);
        if (JSON.stringify(o.alternativas || []) !== JSON.stringify(e.alternativas || [])) cambios.push("alternativas");
        if ((o.paso || 2.5) !== (e.paso || 2.5)) cambios.push(`incremento ${fmt(o.paso || 2.5)} → ${fmt(e.paso || 2.5)} kg`);
        if ((o.carga || "") !== (e.carga || "")) cambios.push(e.carga === "corporal" ? "pasa a peso corporal (lastre o asistencia)" : "deja de ser de peso corporal");
        if (JSON.stringify(o.descanso || null) !== JSON.stringify(e.descanso || null)) cambios.push("descanso propio");
        if ((o.nota || "") !== (e.nota || "")) cambios.push(e.nota ? "nota técnica" : "sin nota técnica");
        if (!!o.principal !== !!e.principal) cambios.push(e.principal ? "pasa a básico" : "pasa a accesorio");
        if (cambios.length) out.push(`${s.nombre}, ${o.nombre}: ${cambios.join(", ")}.`);
      });
      v.ejercicios.forEach((e) => { if (!eb[e.id] && !s.ejercicios.some((x) => x.nombre.toLowerCase() === e.nombre.toLowerCase())) out.push(`${s.nombre}: se quita ${e.nombre}. Su historial se conserva.`); });
      if (v.ejercicios.map((e) => e.id).join() !== s.ejercicios.map((e) => e.id).join() && v.ejercicios.length === s.ejercicios.length && s.ejercicios.every((e) => ea[e.id])) out.push(`${s.nombre}: cambia el orden de los ejercicios.`);
    });
    const mA = Object.fromEntries(a.micros.map((m) => [m.id, m]));
    b.micros.forEach((m) => { const o = mA[m.id]; if (!o) out.push(`Micro nuevo: ${m.nombre}.`); else if (JSON.stringify(o) !== JSON.stringify(m)) out.push(`Micro ${m.nombre}: cambia su contenido.`); });
    a.micros.forEach((m) => { if (!b.micros.some((x) => x.id === m.id)) out.push(`Se quita el micro ${m.nombre}.`); });
    if (JSON.stringify(a.natacion.semanas) !== JSON.stringify(b.natacion.semanas)) out.push("Natación: cambia la progresión semanal.");
    if (JSON.stringify(a.carrera.semanas) !== JSON.stringify(b.carrera.semanas)) out.push("Carrera: cambia la progresión semanal.");
    if (JSON.stringify(a.semana_tipo) !== JSON.stringify(b.semana_tipo)) out.push("Cambia la semana tipo (días, horas o prioridades).");
    if (JSON.stringify(a.semanas) !== JSON.stringify(b.semanas)) out.push("Cambia el enfoque de las semanas.");
    if (JSON.stringify(a.huecos || []) !== JSON.stringify(b.huecos || [])) out.push("Cambian los huecos fijos para micros.");
    if (JSON.stringify(a.descanso || {}) !== JSON.stringify(b.descanso || {})) out.push("Cambian los tiempos de descanso.");
    if (a.intensidad !== b.intensidad) out.push("Cambia el criterio de intensidad.");
    return out;
  }

  let PROPUESTA = null; // { plan, cambios, errores }
  function vistaPlanNuevo() {
    let cuerpo = "";
    if (PROPUESTA && PROPUESTA.errores.length) {
      cuerpo = `<h2 class="cab-grupo">No se puede aplicar</h2>
        <div class="grupo">${PROPUESTA.errores.map((e) => `<div class="celda sin-icono"><span class="txt"><small style="color:var(--tinta)">${esc(e)}</small></span></div>`).join("")}</div>
        <p class="pie-grupo">Copia estos errores a ChatGPT y pídele que lo corrija. No se ha cambiado nada.</p>`;
    } else if (PROPUESTA) {
      cuerpo = `<h2 class="cab-grupo">Cambios</h2>
        <div class="grupo">${(PROPUESTA.cambios.length ? PROPUESTA.cambios : ["El plan es igual al actual."]).map((c) => `<div class="celda sin-icono"><span class="txt"><small style="color:var(--tinta);font-size:15px">${esc(c)}</small></span></div>`).join("")}</div>
        <div class="espacio"></div>
        <button class="btn" data-action="aplicar-plan" ${PROPUESTA.cambios.length ? "" : "disabled style=\"opacity:.4\""}>Aplicar plan</button>
        <button class="btn sec" data-action="cancelar-plan">Cancelar</button>
        <p class="pie-grupo">Tu historial no se toca. Podrás volver al plan actual desde Ajustes.</p>`;
    }
    return {
      titulo: "Plan nuevo",
      sub: "Pega la respuesta de ChatGPT tal cual. La app busca el plan dentro del texto.",
      volver: { href: "#/ajustes", label: "Ajustes" },
      html: `
        <div class="grupo"><label class="campo-form"><span>Plan</span><textarea id="plan-pegado" style="min-height:160px;font-size:14px" placeholder="Pega aquí el bloque de código que te ha dado ChatGPT">${PROPUESTA ? esc(PROPUESTA.texto) : ""}</textarea></label></div>
        <div class="espacio"></div>
        ${PROPUESTA ? "" : `<button class="btn" data-action="revisar-plan">Revisar cambios</button>`}
        ${PROPUESTA && PROPUESTA.errores.length ? `<button class="btn" data-action="revisar-plan">Volver a revisar</button>` : ""}
        ${cuerpo}`,
    };
  }

  /* ---------------------------------------------------- Aviso de novedades */
  function hojaNovedades() {
    const vista = S.versionVista;
    if (vista === APP_VERSION) return;
    if (!vista && !S.registros.length) { S.versionVista = APP_VERSION; guardar(); return; }
    const capa = document.createElement("div");
    capa.className = "hoja-capa";
    capa.innerHTML = `<div class="hoja" role="dialog" aria-label="Novedades">
      <p class="eti">Actualizada a la versión ${APP_VERSION}</p>
      <h2>Novedades</h2>
      <ul>${NOVEDADES.concat(vista === "2.3" ? [] : NOVEDADES_23).concat(vista === "2.3" || vista === "2.2" ? [] : NOVEDADES_22).concat(["2.3", "2.2", "2.1"].includes(vista) ? [] : NOVEDADES_21).map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      <button class="btn" data-action="cerrar-novedades">Entendido</button>
    </div>`;
    document.body.appendChild(capa);
  }

  /* ------------------------------------------------------------ Calendario */
  function exportarCalendario() {
    const P = estadoPrograma(), w = P.semana, hoy = hoyISO();
    const lunes = S.semanaManual || P.antesDeEmpezar || P.terminado ? sumarDias(hoy, 1 - diaSemana(hoy)) : sumarDias(S.inicio, (w - 1) * 7);
    const base = P.antesDeEmpezar ? S.inicio : lunes;
    const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const eventos = [];
    PLAN.semana_tipo.forEach((it) => {
      if (hechoEnSemana(w, it.sesion)) return;
      const fecha = sumarDias(base, diaPrevisto(w, it) - 1);
      if (fecha < hoy) return;
      const c = CAT[it.sesion]; if (!c) return;
      const [h, m] = (it.hora || "19:00").split(":").map(Number);
      const dur = Math.max(...(String(c.duracion).match(/\d+/g) || [45]).map(Number));
      const fin = new Date(deISO(fecha).setHours(h, m + dur, 0, 0));
      const f = fecha.replace(/-/g, "");
      eventos.push([
        "BEGIN:VEVENT",
        `UID:${PLAN.bloque.id}-s${w}-${it.sesion}@mi-vuelta-a-entrenar`,
        `DTSTAMP:${sello}`,
        `DTSTART:${f}T${pad(h)}${pad(m)}00`,
        `DTEND:${aISO(fin).replace(/-/g, "")}T${pad(fin.getHours())}${pad(fin.getMinutes())}00`,
        `SUMMARY:${nombreLargo(it.sesion)}${it.prioritaria ? "" : " (opcional)"}`,
        `DESCRIPTION:${detalleSesion(it.sesion, w).replace(/,/g, "\\,")}`,
        "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${nombreLargo(it.sesion)}`, "END:VALARM",
        "END:VEVENT",
      ].join("\r\n"));
    });
    if (!eventos.length) { aviso("No quedan sesiones pendientes esta semana"); return; }
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mi vuelta a entrenar//ES", "CALSCALE:GREGORIAN", ...eventos, "END:VCALENDAR"].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `entrenamiento-semana-${w}.ics`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    aviso(`${eventos.length} ${eventos.length > 1 ? "sesiones" : "sesión"} para el Calendario`);
  }

  function vistaNoEncontrada() {
    return { titulo: "No encontrado", volver: { href: "#/hoy", label: "Hoy" }, html: `<p class="vacio">Esto ya no existe en el plan actual.</p>` };
  }

  /* ================================================================ ESTADÍSTICAS
     Todo se calcula al abrir la pantalla a partir de S.registros: no se guarda
     ningún dato derivado, así que cualquier cambio en las sesiones se refleja solo.
     Criterio: si no hay datos suficientes se dice, nunca se muestra un cero. */

  const SIN_DATOS = "Sin datos suficientes";
  const lunesDe = (iso) => sumarDias(iso, 1 - diaSemana(iso));
  const fechaMini = (iso) => { const d = deISO(iso); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  const signo = (v, dec) => { const r = dec ? Math.round(v * 10) / 10 : Math.round(v); return r > 0 ? `+${fmt(r)}` : r < 0 ? `−${fmt(-r)}` : "igual"; };

  /* ------------------------------------------------------------- Periodos */
  const PERIODOS = [["7", "7 días"], ["28", "28 días"], ["bloque", "Bloque"], ["todo", "Todo"]];
  function periodoActual() {
    const p = S.ui.periodo || { tipo: "28" };
    if (p.tipo === "semana" && !(p.semana >= 1 && p.semana <= N)) return { tipo: "28" };
    return p;
  }
  // Rango de fechas del periodo y su periodo equivalente anterior (para comparar)
  function rangoPeriodo(per) {
    const hoy = hoyISO();
    const enBloque = (r) => r.bloque === PLAN.bloque.id;
    if (per.tipo === "7" || per.tipo === "28") {
      const n = Number(per.tipo);
      return {
        desde: sumarDias(hoy, -(n - 1)), hasta: hoy, etiqueta: `Últimos ${n} días`,
        prev: { desde: sumarDias(hoy, -(2 * n - 1)), hasta: sumarDias(hoy, -n), texto: `los ${n} días anteriores` },
      };
    }
    if (per.tipo === "semana") {
      const desde = sumarDias(S.inicio, (per.semana - 1) * 7);
      return {
        desde, hasta: sumarDias(desde, 6), etiqueta: `Semana ${per.semana} del bloque`, filtro: enBloque, semana: per.semana,
        prev: per.semana > 1 ? { desde: sumarDias(desde, -7), hasta: sumarDias(desde, -1), texto: `la semana ${per.semana - 1}`, filtro: enBloque } : null,
      };
    }
    if (per.tipo === "bloque") {
      const otros = S.registros.filter((r) => r.bloque !== PLAN.bloque.id);
      const prevId = otros.length ? otros.slice().sort(ordenFecha)[0].bloque : null;
      const delPrev = otros.filter((r) => r.bloque === prevId).map((r) => r.fecha).sort();
      const fin = sumarDias(S.inicio, N * 7 - 1);
      return {
        desde: S.inicio < hoy ? S.inicio : hoy, hasta: fin < hoy ? fin : hoy, etiqueta: `Bloque «${PLAN.bloque.nombre}»`, filtro: enBloque,
        prev: prevId ? { desde: delPrev[0], hasta: delPrev[delPrev.length - 1], texto: "el bloque anterior", filtro: (r) => r.bloque === prevId, sinAdherencia: true } : null,
      };
    }
    const todas = S.registros.map((r) => r.fecha).sort();
    return { desde: todas[0] || hoy, hasta: hoy, etiqueta: "Todo el historial", prev: null };
  }
  const registrosEn = (rg) => (rg ? S.registros.filter((r) => r.fecha >= rg.desde && r.fecha <= rg.hasta && (!rg.filtro || rg.filtro(r))) : []);

  // Adherencia = prioritarias completadas / prioritarias programadas (cuyo día previsto cae en el rango y ya ha llegado).
  // Una sesión cuenta en su semana del programa aunque se hiciera otro día. Las parciales van aparte.
  function adherencia(rg) {
    const hoy = hoyISO();
    const out = { prog: 0, comp: 0, parc: 0, no: 0 };
    if (!rg || rg.sinAdherencia) return out;
    for (let w = 1; w <= N; w++) {
      const ini = sumarDias(S.inicio, (w - 1) * 7);
      prioritarias().forEach((it) => {
        const f = sumarDias(ini, diaPrevisto(w, it) - 1);
        if (f < rg.desde || f > rg.hasta || f > hoy) return;
        out.prog++;
        const regs = registrosSemana(w).filter((r) => r.sesion === it.sesion && r.fecha <= rg.hasta);
        if (!regs.length) out.no++;
        else if (regs.some((r) => estadoSesion(r).completa)) out.comp++;
        else out.parc++;
      });
    }
    return out;
  }
  function adherenciaSemana(w) {
    const ini = sumarDias(S.inicio, (w - 1) * 7);
    return adherencia({ desde: ini, hasta: sumarDias(ini, 6) });
  }

  /* --------------------------------------------------------------- Gráficos */
  const ANILLOS = {}; // último valor dibujado de cada anillo, para animar desde ahí
  function anillo(clave, frac, centro, sub, tam) {
    tam = tam || 132;
    const g = Math.max(8, Math.round(tam / 11)), r = (tam - g) / 2, C = 2 * Math.PI * r;
    const valido = frac != null && isFinite(frac);
    const f = valido ? Math.max(0, Math.min(1, frac)) : 0;
    const previo = ANILLOS[clave] != null ? ANILLOS[clave] : 0;
    ANILLOS[clave] = f;
    return `<div class="anillo" style="width:${tam}px;height:${tam}px">
      <svg viewBox="0 0 ${tam} ${tam}" aria-hidden="true">
        <circle class="pista" cx="${tam / 2}" cy="${tam / 2}" r="${r}" stroke-width="${g}"/>
        ${valido ? `<circle class="valor" cx="${tam / 2}" cy="${tam / 2}" r="${r}" stroke-width="${g}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - previo)}" data-objetivo="${C * (1 - f)}" transform="rotate(-90 ${tam / 2} ${tam / 2})"/>` : ""}
      </svg>
      <div class="anillo-centro"><b>${centro}</b>${sub ? `<small>${sub}</small>` : ""}</div>
    </div>`;
  }
  function animarAnillos() {
    const els = $app.querySelectorAll(".anillo circle.valor");
    if (!els.length) return;
    requestAnimationFrame(() => requestAnimationFrame(() => els.forEach((el) => (el.style.strokeDashoffset = el.dataset.objetivo))));
  }

  const TONOS = ["t1", "t2", "t3", "t4", "t5"];
  function dona(segs, centro, sub, tam) {
    tam = tam || 132;
    const total = segs.reduce((a, s) => a + s.valor, 0);
    if (!total) return null;
    const g = Math.round(tam / 7), r = (tam - g) / 2, C = 2 * Math.PI * r;
    let acum = 0;
    const arcos = segs.filter((s) => s.valor > 0).map((s) => {
      const largo = (s.valor / total) * C;
      const hueco = segs.filter((x) => x.valor > 0).length > 1 ? Math.min(2, largo / 3) : 0;
      const a = `<circle class="seg ${s.tono}" cx="${tam / 2}" cy="${tam / 2}" r="${r}" stroke-width="${g}" stroke-dasharray="${Math.max(0, largo - hueco)} ${C}" stroke-dashoffset="${-acum}" transform="rotate(-90 ${tam / 2} ${tam / 2})" data-tip="${esc(`${s.etiqueta}: ${s.valor}`)}"/>`;
      acum += largo;
      return a;
    }).join("");
    return `<div class="dona-fila"><div class="anillo grafico" style="width:${tam}px;height:${tam}px"><svg viewBox="0 0 ${tam} ${tam}">${arcos}</svg>
        <div class="anillo-centro"><b>${centro}</b>${sub ? `<small>${sub}</small>` : ""}</div><div class="tip" hidden></div></div>
      <ul class="leyenda">${segs.map((s) => `<li><i class="${s.tono}"></i><span>${esc(s.etiqueta)}</span><b>${s.valor}</b></li>`).join("")}</ul></div>`;
  }

  const ANCHO = 340;
  // Marcas del eje con valores redondos (1, 2, 2,5, 5, 10…)
  function ticks(y0, y1) {
    const bruto = (y1 - y0) / 3, mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= bruto) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(y0 / paso) * paso; v <= y1 + 1e-9; v += paso) out.push(Math.round(v * 100) / 100);
    return out.length ? out : [y0, y1];
  }
  // series: [{ puntos: [{ x: iso, y, tip }], estilo: "solida" | "discontinua" | "gris" }]
  function lineas(series, op) {
    op = op || {};
    const todos = series.flatMap((s) => s.puntos);
    if (todos.length < 2) return `<div class="sin-datos">${esc(op.vacio || SIN_DATOS)}</div>`;
    const H = op.alto || 160, pl = 40, pr = 12, pt = 14, pb = 26;
    const ts = todos.map((p) => deISO(p.x).getTime());
    let x0 = Math.min(...ts), x1 = Math.max(...ts);
    if (x0 === x1) { x0 -= 86400000; x1 += 86400000; }
    const ys = todos.map((p) => p.y);
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (op.cero) { y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); }
    if (op.min != null) y0 = Math.min(y0, op.min);
    if (op.max != null) y1 = Math.max(y1, op.max);
    if (y0 === y1) { y0 -= 1; y1 += 1; }
    if (op.min == null && op.max == null) { const m = (y1 - y0) * 0.12; y0 -= m; y1 += m; if (!op.cero && Math.min(...ys) >= 0 && y0 < 0) y0 = 0; }
    const X = (t) => pl + ((t - x0) / (x1 - x0)) * (ANCHO - pl - pr);
    const Y = (v) => pt + (1 - (v - y0) / (y1 - y0)) * (H - pt - pb);
    const rejilla = ticks(y0, y1).map((v) => `<line class="rej" x1="${pl}" x2="${ANCHO - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="eje" x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${op.fmtY ? op.fmtY(v) : fmt(Math.round(v * 10) / 10)}</text>`).join("");
    const cero = op.cero && y0 < 0 && y1 > 0 ? `<line class="cero" x1="${pl}" x2="${ANCHO - pr}" y1="${Y(0)}" y2="${Y(0)}"/>` : "";
    const trazos = series.map((s) => {
      if (!s.puntos.length) return "";
      const pts = s.puntos.map((p) => [X(deISO(p.x).getTime()), Y(p.y), p.tip]);
      const linea = pts.length > 1 ? `<polyline class="serie ${s.estilo || "solida"}" points="${pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ")}"/>` : "";
      const puntos = pts.map((q) => `<circle class="punto ${s.estilo || "solida"}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3.5"/><circle class="toque" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="14" data-tip="${esc(q[2] || "")}"/>`).join("");
      return linea + puntos;
    }).join("");
    const ejeX = `<text class="eje" x="${pl}" y="${H - 6}">${fechaMini(aISO(new Date(x0)))}</text><text class="eje" x="${ANCHO - pr}" y="${H - 6}" text-anchor="end">${fechaMini(aISO(new Date(x1)))}</text>`;
    return `<div class="grafico"><svg viewBox="0 0 ${ANCHO} ${H}" role="img" aria-label="${esc(op.aria || "Gráfico de evolución")}">${rejilla}${cero}${trazos}${ejeX}</svg><div class="tip" hidden></div></div>`;
  }
  // items: [{ etiqueta, valor, valor2 (apilado), fantasma (previsto), tip }]
  function barras(items, op) {
    op = op || {};
    if (!items.length || items.every((i) => !(i.valor || i.valor2))) return `<div class="sin-datos">${esc(op.vacio || SIN_DATOS)}</div>`;
    const H = op.alto || 150, pl = 40, pr = 8, pt = 16, pb = 26;
    const max = Math.max(...items.map((i) => Math.max((i.valor || 0) + (i.valor2 || 0), i.fantasma || 0))) || 1;
    const hueco = (ANCHO - pl - pr) / items.length, ancho = Math.min(28, hueco * 0.62);
    const Y = (v) => pt + (1 - v / max) * (H - pt - pb);
    const cada = Math.ceil(items.length / 7);
    // En recuentos (todo enteros) el eje solo lleva enteros
    const enteros = items.every((i) => Number.isInteger(i.valor || 0) && Number.isInteger(i.valor2 || 0) && Number.isInteger(i.fantasma || 0));
    const marcas = ticks(0, max).filter((v) => !enteros || Number.isInteger(v));
    const rejilla = marcas.map((v) => `<line class="rej" x1="${pl}" x2="${ANCHO - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="eje" x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join("");
    const cuerpos = items.map((i, k) => {
      const x = pl + k * hueco + (hueco - ancho) / 2;
      const v1 = i.valor || 0, v2 = i.valor2 || 0;
      let s = "";
      if (i.fantasma) s += `<rect class="fantasma" x="${x}" y="${Y(i.fantasma)}" width="${ancho}" height="${Y(0) - Y(i.fantasma)}" rx="4"/>`;
      if (v1) s += `<rect class="barra" x="${x}" y="${Y(v1)}" width="${ancho}" height="${Y(0) - Y(v1)}" rx="4"/>`;
      if (v2) s += `<rect class="barra b2" x="${x}" y="${Y(v1 + v2)}" width="${ancho}" height="${Y(v1) - Y(v1 + v2)}" rx="4"/>`;
      s += `<rect class="toque" x="${pl + k * hueco}" y="${pt}" width="${hueco}" height="${H - pt - pb}" data-tip="${esc(i.tip || `${i.etiqueta}: ${fmt(v1 + v2)}`)}"/>`;
      if (k % cada === 0) s += `<text class="eje" x="${x + ancho / 2}" y="${H - 6}" text-anchor="middle">${esc(i.etiqueta)}</text>`;
      return s;
    }).join("");
    return `<div class="grafico"><svg viewBox="0 0 ${ANCHO} ${H}" role="img" aria-label="${esc(op.aria || "Gráfico de barras")}">${rejilla}${cuerpos}</svg><div class="tip" hidden></div></div>`;
  }
  const tarjeta = (titulo, valor, sub) => `<div class="kpi"><span>${titulo}</span><b>${valor}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  const bloqueGrafico = (titulo, contenido, nota) => `<section class="panel-graf"><h3>${titulo}</h3>${contenido}${nota ? `<p class="nota-graf">${nota}</p>` : ""}</section>`;
  const leyendaLineas = (items) => `<div class="leyenda-lineas">${items.map(([cls, t]) => `<span><i class="${cls}"></i>${t}</span>`).join("")}</div>`;

  /* ------------------------------------------------------- Cabecera común */
  const PESTANAS_EST = [["resumen", "Resumen"], ["fuerza", "Fuerza"], ["cardio", "Cardio"], ["recuperacion", "Recuperación"]];
  function cabeceraEst(sec) {
    const per = periodoActual();
    const opSem = Array.from({ length: N }, (_, i) => `<option value="${i + 1}" ${per.tipo === "semana" && per.semana === i + 1 ? "selected" : ""}>Semana ${i + 1}</option>`).join("");
    return `<div class="segmentado est-secciones">${PESTANAS_EST.map(([v, t]) => `<button data-action="ir-est" data-v="${v}" aria-pressed="${sec === v}">${t}</button>`).join("")}</div>
      <div class="filtros">
        <div class="segmentado">${PERIODOS.map(([v, t]) => `<button data-action="periodo" data-v="${v}" aria-pressed="${per.tipo === v}">${t}</button>`).join("")}</div>
        <select class="dia sel-semana" data-action="periodo-semana" aria-label="Semana concreta"><option value="">Semana…</option>${opSem}</select>
      </div>`;
  }

  /* --------------------------------------------------------- A. Resumen */
  function vistaEstResumen() {
    const rg = rangoPeriodo(periodoActual());
    const regs = registrosEn(rg), prevRegs = registrosEn(rg.prev);
    const ad = adherencia(rg), adPrev = rg.prev ? adherencia(rg.prev) : null;
    const pAd = pct(ad.comp, ad.prog);
    const minutos = regs.filter((r) => r.duracion).reduce((a, r) => a + r.duracion, 0);
    const conDur = regs.filter((r) => r.duracion).length;
    const minPrev = prevRegs.filter((r) => r.duracion).reduce((a, r) => a + r.duracion, 0);
    // Solo se compara si el periodo anterior tiene datos: comparar con un periodo vacío engaña
    const hayPrev = rg.prev && prevRegs.length > 0;
    const compara = (a, b, u) => (hayPrev && b != null ? `${signo(a - b)}${u ? " " + u : ""} frente a ${rg.prev.texto}` : rg.prev ? `Sin datos en ${rg.prev.texto} para comparar` : "");

    const anilloPrincipal = ad.prog
      ? anillo("adherencia", ad.comp / ad.prog, `${ad.comp}<span> de ${ad.prog}</span>`, `${pAd} %`, 150)
      : anillo("adherencia", null, "—", SIN_DATOS, 150);
    const leyendaAd = ad.prog
      ? `<p class="leyenda-anillo">Sesiones prioritarias completadas de las programadas en el periodo.${adPrev && adPrev.prog && hayPrev ? ` Antes: ${pct(adPrev.comp, adPrev.prog)} % en ${rg.prev.texto}.` : ""}</p>`
      : `<p class="leyenda-anillo">Aún no hay sesiones prioritarias programadas en este periodo.</p>`;
    const donaEstado = dona([
      { etiqueta: "Completas", valor: ad.comp, tono: "t1" },
      { etiqueta: "Parciales", valor: ad.parc, tono: "t3" },
      { etiqueta: "No realizadas", valor: ad.no, tono: "t5" },
    ], String(ad.prog), "previstas");

    const semanas = Array.from({ length: N }, (_, i) => i + 1).map((w) => {
      const a = adherenciaSemana(w), actual = w === semanaActual();
      return `<div class="mini ${actual ? "actual" : ""}">${a.prog ? anillo(`sem-${w}`, a.comp / a.prog, `${a.comp}/${a.prog}`, "", 64) : anillo(`sem-${w}`, null, "—", "", 64)}<span>S${w}</span></div>`;
    }).join("");
    const stB = estadisticas(Array.from({ length: semanaActual() }, (_, i) => i + 1));
    const adB = adherencia(rangoPeriodo({ tipo: "bloque" }));

    return {
      titulo: "Estadísticas", sub: rg.etiqueta,
      html: cabeceraEst("resumen") + `
        <section class="panel-graf centro">${anilloPrincipal}${leyendaAd}</section>
        <div class="kpis">
          ${tarjeta("Sesiones", regs.length || "0", compara(regs.length, rg.prev ? prevRegs.length : null))}
          ${tarjeta("Minutos", conDur ? fmt(minutos) : "—", conDur ? `${conDur} de ${regs.length} sesiones con duración${hayPrev && prevRegs.some((r) => r.duracion) ? `. ${signo(minutos - minPrev)} min frente a ${rg.prev.texto}` : ""}` : SIN_DATOS)}
        </div>
        ${bloqueGrafico("Estado de las sesiones prioritarias", donaEstado || `<div class="sin-datos">${SIN_DATOS}</div>`, "Las parciales se cuentan aparte: no suman a la adherencia ni se consideran no realizadas.")}
        ${bloqueGrafico(`Bloque actual: «${esc(PLAN.bloque.nombre)}»`, `<div class="minis">${semanas}</div>`,
          `Semana ${semanaActual()} de ${N}. Prioritarias: ${adB.comp} completas, ${adB.parc} parciales y ${adB.no} sin hacer de ${adB.prog} previstas hasta hoy. ${stB.records} récord${stB.records === 1 ? "" : "s"}.`)}`,
    };
  }

  /* ----------------------------------------------------------- B. Fuerza */
  // Sesiones válidas de un ejercicio (solo su propio id: nunca se mezclan alternativas)
  function sesionesEjercicio(exId, rg) {
    const corp = CORPORAL.has(exId);
    return S.registros
      .filter((r) => r.ejercicios && r.ejercicios[exId] && (!rg || (r.fecha >= rg.desde && r.fecha <= rg.hasta)))
      .sort((a, b) => (a.fecha === b.fecha ? (a.creado < b.creado ? -1 : 1) : a.fecha < b.fecha ? -1 : 1))
      .map((r) => {
        const e = r.ejercicios[exId];
        const ss = e.series.filter((s) => num(s.reps) > 0 && (corp ? num(s.kg) != null : num(s.kg) > 0));
        if (!ss.length) return null;
        const mejor = ss.reduce((m, s) => (!m || num(s.kg) > num(m.kg) || (num(s.kg) === num(m.kg) && num(s.reps) > num(m.reps)) ? s : m), null);
        const validas1rm = corp ? [] : ss.filter((s) => num(s.reps) <= 10);
        return {
          r, fecha: r.fecha, rir: e.rir, mejor, series: ss.length,
          carga: num(mejor.kg), reps: num(mejor.reps),
          volumen: corp ? ss.reduce((a, s) => a + num(s.reps), 0) : ss.reduce((a, s) => a + num(s.kg) * num(s.reps), 0),
          e1rm: validas1rm.length ? Math.max(...validas1rm.map((s) => e1rm(s.kg, s.reps))) : null,
          records: ss.filter((s) => s.pr).length,
        };
      })
      .filter(Boolean);
  }
  function catalogoEjercicios() {
    const grupos = [], vistos = new Set();
    PLAN.fuerza.forEach((s) => {
      const items = [];
      s.ejercicios.forEach((e) => {
        [{ id: e.id, nombre: e.nombre }].concat((e.alternativas || []).map((a) => ({ id: a.id, nombre: `${a.nombre} (alternativa)` }))).forEach((x) => {
          if (vistos.has(x.id)) return; vistos.add(x.id); items.push(x);
        });
      });
      grupos.push({ nombre: s.nombre, items });
    });
    const otros = [];
    S.registros.forEach((r) => Object.entries(r.ejercicios || {}).forEach(([id, e]) => { if (!vistos.has(id)) { vistos.add(id); otros.push({ id, nombre: e.nombre }); } }));
    if (otros.length) grupos.push({ nombre: "De planes anteriores", items: otros });
    return grupos;
  }
  function vistaEstFuerza(exSel) {
    const rg = rangoPeriodo(periodoActual());
    const grupos = catalogoEjercicios();
    const conDatos = (id) => sesionesEjercicio(id).length > 0;
    const exId = exSel || S.ui.ejercicioEst || (grupos.flatMap((g) => g.items).find((x) => conDatos(x.id)) || grupos[0].items[0]).id;
    S.ui.ejercicioEst = exId;
    const nombre = (grupos.flatMap((g) => g.items).find((x) => x.id === exId) || { nombre: exId }).nombre.replace(" (alternativa)", "");
    const corp = CORPORAL.has(exId), manc = MANCUERNAS.has(exId);
    const selector = `<select class="input sel-ejercicio" data-action="elegir-ejercicio-est" aria-label="Ejercicio">${grupos.map((g) =>
      `<optgroup label="${esc(g.nombre)}">${g.items.map((x) => `<option value="${x.id}" ${x.id === exId ? "selected" : ""}>${esc(x.nombre)}${conDatos(x.id) ? "" : " (sin datos)"}</option>`).join("")}</optgroup>`).join("")}</select>`;
    const ses = sesionesEjercicio(exId, rg), todas = sesionesEjercicio(exId);
    const ud = corp ? "" : " kg";
    const carga = (v) => (corp ? fmtCarga(v, true) : `${fmt(v)} kg`);
    const tipSes = (s) => `${fechaCorta(s.fecha)}: ${formatoSerie(s.mejor)}${s.rir != null ? `, RIR ${s.rir >= 4 ? "4+" : s.rir}` : ""}${s.records ? ", récord" : ""}`;

    if (!todas.length) {
      return { titulo: "Estadísticas", sub: rg.etiqueta, html: cabeceraEst("fuerza") + selector + `<div class="sin-datos grande">Todavía no hay series con peso y repeticiones de ${esc(nombre.toLowerCase())}.</div>` };
    }
    // Mejor serie y récords: en el periodo; comparaciones: respecto al historial
    const mejorPeriodo = ses.reduce((m, s) => (!m || s.carga > m.carga || (s.carga === m.carga && s.reps > m.reps) ? s : m), null);
    const e1 = ses.filter((s) => s.e1rm);
    const ultima = todas[todas.length - 1], anterior = todas[todas.length - 2];
    const hace4 = todas.slice().reverse().find((s) => diasEntre(s.fecha, ultima.fecha) >= 28);
    const seriesSemana = {};
    ses.forEach((s) => { const k = lunesDe(s.fecha); seriesSemana[k] = (seriesSemana[k] || 0) + s.series; });
    const sem = Object.keys(seriesSemana).sort();
    const recordsP = ses.reduce((a, s) => a + s.records, 0);

    const comp = (a, b, f) => (b ? `${f(a, b)}` : "");
    const html = `
      ${selector}
      ${manc ? `<p class="nota-graf" style="margin:8px 4px 0">Peso de una mancuerna.</p>` : ""}
      ${corp ? `<p class="nota-graf" style="margin:8px 4px 0">Por debajo de cero, asistencia; por encima, lastre. Sin 1RM estimado: haría falta el peso corporal.</p>` : ""}
      <div class="kpis">
        ${tarjeta("Mejor serie", mejorPeriodo ? formatoSerie(mejorPeriodo.mejor) : "—", mejorPeriodo ? fechaCorta(mejorPeriodo.fecha) : SIN_DATOS)}
        ${corp ? tarjeta("Récords", recordsP || "0", "en el periodo") : tarjeta("1RM estimado", e1.length ? `${fmt(Math.round(Math.max(...e1.map((s) => s.e1rm)) * 2) / 2)} kg` : "—", e1.length ? "Estimación (Epley), no medición" : "Sin series de 1–10 repeticiones")}
        ${tarjeta("Series", ses.reduce((a, s) => a + s.series, 0) || "0", `en ${ses.length} ${ses.length === 1 ? "sesión" : "sesiones"}`)}
        ${corp ? "" : tarjeta("Récords", recordsP || "0", "en el periodo")}
      </div>
      <section class="panel-graf">
        <h3>Comparación</h3>
        <div class="comparas">
          <div><span>Frente a la sesión anterior</span><b>${anterior ? `${signo(ultima.carga - anterior.carga, true)}${ud}` : "—"}</b><small>${anterior ? `carga · ${signo(ultima.reps - anterior.reps)} reps · ${signo(ultima.volumen - anterior.volumen)} ${corp ? "reps totales" : "kg de volumen"}`.replace(/ · /g, ", ") : "Primera sesión registrada"}</small></div>
          <div><span>Frente a hace 4 semanas</span><b>${hace4 ? `${signo(ultima.carga - hace4.carga, true)}${ud}` : "—"}</b><small>${hace4 ? `${carga(hace4.carga)} el ${fechaCorta(hace4.fecha)}` : "Aún no hay sesiones de hace 4 semanas"}</small></div>
        </div>
      </section>
      ${bloqueGrafico(corp ? "Asistencia y lastre" : "Carga máxima por sesión", lineas([{ puntos: ses.map((s) => ({ x: s.fecha, y: s.carga, tip: tipSes(s) })) }], { cero: corp, fmtY: corp ? (v) => (v > 0 ? `+${fmt(Math.round(v))}` : fmt(Math.round(v))) : null, aria: "Evolución de la carga" }), "Toca un punto para ver la sesión.")}
      ${bloqueGrafico("Repeticiones de la mejor serie", lineas([{ puntos: ses.map((s) => ({ x: s.fecha, y: s.reps, tip: tipSes(s) })) }], { aria: "Evolución de las repeticiones" }))}
      ${corp ? "" : bloqueGrafico("1RM estimado", lineas([{ puntos: e1.map((s) => ({ x: s.fecha, y: Math.round(s.e1rm * 2) / 2, tip: `${fechaCorta(s.fecha)}: ${fmt(Math.round(s.e1rm * 2) / 2)} kg estimados` })), estilo: "discontinua" }], { vacio: "Hacen falta al menos dos sesiones con series de 1 a 10 repeticiones." }), "Estimación con la fórmula de Epley a partir de series de 1 a 10 repeticiones. No es una medición real.")}
      ${bloqueGrafico(corp ? "Repeticiones totales por sesión" : "Volumen por sesión (kg)", barras(ses.map((s) => ({ etiqueta: fechaMini(s.fecha), valor: Math.round(s.volumen), tip: `${fechaCorta(s.fecha)}: ${fmt(Math.round(s.volumen))} ${corp ? "repeticiones" : "kg"} en ${s.series} series` }))), corp ? "" : `Series × repeticiones × carga${manc ? " (peso de una mancuerna)" : ""}.`)}
      ${bloqueGrafico("Series por semana", barras(sem.map((k) => ({ etiqueta: fechaMini(k), valor: seriesSemana[k], tip: `Semana del ${fechaCorta(k)}: ${seriesSemana[k]} series` }))))}
      <section class="panel-graf"><h3>Historial completo</h3>
        <div class="grupo plano">${todas.slice().reverse().map((s) => `<a class="celda sin-icono" href="#/registro/${s.r.id}"><span class="txt"><b>${fechaCorta(s.fecha)}</b><small>${s.r.ejercicios[exId].series.filter((x) => num(x.reps)).map((x) => formatoSerie(x) + (x.pr ? " (récord)" : "")).join("  ")}${s.rir != null ? `. RIR ${s.rir >= 4 ? "4+" : s.rir}` : ""}</small></span><span class="dcha">${CHEV}</span></a>`).join("")}</div>
      </section>`;
    return { titulo: "Estadísticas", sub: `${rg.etiqueta}. ${nombre}`, html: cabeceraEst("fuerza") + html };
  }

  /* ----------------------------------------------------------- C. Cardio */
  function vistaEstCardio() {
    const rg = rangoPeriodo(periodoActual());
    const regs = registrosEn(rg).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    const nat = regs.filter((r) => r.tipo === "natacion"), car = regs.filter((r) => r.tipo === "carrera");
    const natM = nat.filter((r) => r.natacion && r.natacion.metros);
    const carM = car.filter((r) => r.carrera && (r.carrera.troteMin != null || r.carrera.andarMin != null));
    const porSemana = (lista, f) => { const o = {}; lista.forEach((r) => { const k = lunesDe(r.fecha); o[k] = (o[k] || 0) + f(r); }); return Object.keys(o).sort().map((k) => [k, o[k]]); };
    const faltan = (total, con, que) => (total > con ? `${total - con} ${total - con === 1 ? "sesión" : "sesiones"} sin ${que} anotad${que === "metros" ? "os" : "a"}.` : "");

    const metrosSem = porSemana(natM, (r) => r.natacion.metros);
    const natacion = `
      <h2 class="cab-grupo">Natación</h2>
      <div class="kpis">
        ${tarjeta("Sesiones", nat.length || "0", "")}
        ${tarjeta("Metros", natM.length ? fmt(natM.reduce((a, r) => a + r.natacion.metros, 0)) : "—", natM.length ? `en ${natM.length} ${natM.length === 1 ? "sesión" : "sesiones"}` : SIN_DATOS)}
        ${tarjeta("Tiempo", nat.some((r) => r.duracion) ? `${fmt(nat.reduce((a, r) => a + (r.duracion || 0), 0))} min` : "—", nat.some((r) => r.duracion) ? "" : SIN_DATOS)}
      </div>
      ${bloqueGrafico("Metros por sesión", barras(natM.map((r) => ({ etiqueta: fechaMini(r.fecha), valor: r.natacion.metros, tip: `${fechaCorta(r.fecha)}: ${r.natacion.metros} m${r.duracion ? ` en ${r.duracion} min` : ""}` })), { vacio: "Anota los metros al cerrar la natación para ver esta gráfica." }), faltan(nat.length, natM.length, "metros"))}
      ${bloqueGrafico("Distancia semanal", barras(metrosSem.map(([k, v]) => ({ etiqueta: fechaMini(k), valor: v, tip: `Semana del ${fechaCorta(k)}: ${v} m` }))))}
      ${bloqueGrafico("Evolución de la distancia", lineas([{ puntos: natM.map((r) => ({ x: r.fecha, y: r.natacion.metros, tip: `${fechaCorta(r.fecha)}: ${r.natacion.metros} m` })) }], { vacio: "Hacen falta al menos dos sesiones con metros anotados." }))}
      ${nat.some((r) => r.duracion) ? bloqueGrafico("Tiempo por sesión (min)", barras(nat.filter((r) => r.duracion).map((r) => ({ etiqueta: fechaMini(r.fecha), valor: r.duracion, tip: `${fechaCorta(r.fecha)}: ${r.duracion} min` })))) : ""}`;

    const total = (r) => r.duracion || (r.carrera ? (r.carrera.troteMin || 0) + (r.carrera.andarMin || 0) : 0);
    const semanasCar = {};
    carM.forEach((r) => { if (r.bloque === PLAN.bloque.id) semanasCar[r.semana] = (semanasCar[r.semana] || 0) + (r.carrera.troteMin || 0); });
    const progresion = Object.keys(semanasCar).map(Number).sort((a, b) => a - b).map((w) => {
      const c = PLAN.carrera.semanas[w - 1];
      return { etiqueta: `S${w}`, valor: Math.round(semanasCar[w] * 10) / 10, fantasma: c ? c.trote * c.repeticiones : 0, tip: `Semana ${w}: ${fmt(Math.round(semanasCar[w] * 10) / 10)} min trotando${c ? ` de ${c.trote * c.repeticiones} previstos` : ""}` };
    });
    const carrera = `
      <h2 class="cab-grupo">Carrera</h2>
      <div class="kpis">
        ${tarjeta("Sesiones", car.length || "0", "")}
        ${tarjeta("Minutos", car.some(total) ? fmt(Math.round(car.reduce((a, r) => a + total(r), 0))) : "—", car.some(total) ? "" : SIN_DATOS)}
        ${tarjeta("Trotando", carM.length ? `${fmt(Math.round(carM.reduce((a, r) => a + (r.carrera.troteMin || 0), 0) * 10) / 10)} min` : "—", carM.length ? "" : SIN_DATOS)}
      </div>
      ${bloqueGrafico("Trote y caminata por sesión (min)", barras(carM.map((r) => ({ etiqueta: fechaMini(r.fecha), valor: r.carrera.troteMin || 0, valor2: r.carrera.andarMin || 0, tip: `${fechaCorta(r.fecha)}: ${fmt(r.carrera.troteMin || 0)} trotando, ${fmt(r.carrera.andarMin || 0)} caminando${r.carrera.distanciaKm ? `, ${fmt(r.carrera.distanciaKm)} km` : ""}` })), { vacio: "Usa el temporizador o anota los minutos al cerrar la carrera." }) + leyendaLineas([["b1", "Trotando"], ["b2", "Caminando"]]), faltan(car.length, carM.length, "minutos"))}
      ${bloqueGrafico("Duración por sesión", lineas([{ puntos: car.filter(total).map((r) => ({ x: r.fecha, y: total(r), tip: `${fechaCorta(r.fecha)}: ${fmt(total(r))} min` })) }], { vacio: "Hacen falta al menos dos carreras con duración." }))}
      ${bloqueGrafico("Progresión semanal: trote realizado y previsto", barras(progresion, { vacio: SIN_DATOS }) + leyendaLineas([["b1", "Realizado"], ["fantasma", "Previsto en el plan"]]))}`;
    return { titulo: "Estadísticas", sub: rg.etiqueta, html: cabeceraEst("cardio") + natacion + carrera + `<p class="pie-grupo">No se calculan distancias ni ritmos que no hayas anotado.</p>` };
  }

  /* ----------------------------------------------- D. Recuperación y sensaciones */
  function vistaEstRecuperacion() {
    const rg = rangoPeriodo(periodoActual());
    const regs = registrosEn(rg);
    const rirs = [];
    regs.forEach((r) => Object.values(r.ejercicios || {}).forEach((e) => { if (e.rir != null) rirs.push({ fecha: r.fecha, v: e.rir }); }));
    const en = regs.filter((r) => r.energia), es = regs.filter((r) => r.esfuerzo);
    // Sueño: semanas del bloque actual cuyo lunes cae en el periodo
    const suenos = [];
    for (let w = 1; w <= N; w++) {
      const ini = sumarDias(S.inicio, (w - 1) * 7), s = S.semanal[claveAgenda(w)];
      if (s && (s.suenoHoras || s.suenoCalidad) && ini <= rg.hasta && sumarDias(ini, 6) >= rg.desde) suenos.push({ w, ini, ...s });
    }
    const mol = regs.filter((r) => r.molestia && r.molestia.zona);
    const porSemana = (lista, f) => { const o = {}; lista.forEach((x) => { const k = lunesDe(x.fecha); (o[k] = o[k] || []).push(f(x)); }); return Object.keys(o).sort().map((k) => ({ k, vals: o[k] })); };
    const media1 = (xs) => Math.round(media(xs) * 10) / 10;
    const kpiMedia = (t, lista, sufijo) => tarjeta(t, lista.length ? fmt(media1(lista)) + (sufijo || "") : "—", lista.length ? `${lista.length} registro${lista.length === 1 ? "" : "s"}` : SIN_DATOS);

    const semEn = porSemana(en, (r) => r.energia), semEs = porSemana(es, (r) => r.esfuerzo), semRir = porSemana(rirs, (x) => x.v);
    const horas = suenos.filter((s) => s.suenoHoras), calidad = suenos.filter((s) => s.suenoCalidad);
    const zonas = {};
    mol.forEach((r) => { const z = r.molestia.zona; (zonas[z] = zonas[z] || []).push(r.molestia.intensidad || null); });
    const zonasOrden = Object.entries(zonas).sort((a, b) => b[1].length - a[1].length);
    const donaZonas = dona(zonasOrden.map(([z, l], i) => ({ etiqueta: `${z}${l.some(Boolean) ? `, intensidad media ${fmt(media1(l.filter(Boolean)))}` : ""}`, valor: l.length, tono: TONOS[Math.min(i, TONOS.length - 1)] })), String(mol.length), mol.length === 1 ? "registro" : "registros");
    const molSem = porSemana(mol, (r) => r.molestia.intensidad || 0);

    const html = `
      <div class="kpis">
        ${kpiMedia("RIR medio", rirs.map((x) => x.v))}
        ${kpiMedia("Energía", en.map((r) => r.energia), "/5")}
        ${kpiMedia("Esfuerzo", es.map((r) => r.esfuerzo), "/5")}
        ${tarjeta("Sueño", horas.length ? `${fmt(media1(horas.map((s) => s.suenoHoras)))} h` : "—", horas.length ? `${horas.length} semana${horas.length === 1 ? "" : "s"} anotada${horas.length === 1 ? "" : "s"}` : SIN_DATOS)}
        ${tarjeta("Calidad del sueño", calidad.length ? `${fmt(media1(calidad.map((s) => s.suenoCalidad)))}/5` : "—", calidad.length ? `${calidad.length} semana${calidad.length === 1 ? "" : "s"}` : SIN_DATOS)}
        ${tarjeta("Molestias", mol.length || "0", `en ${regs.length} ${regs.length === 1 ? "sesión" : "sesiones"}`)}
      </div>
      ${bloqueGrafico("Energía y esfuerzo (media semanal)", lineas([
        { puntos: semEn.map((s) => ({ x: s.k, y: media1(s.vals), tip: `Semana del ${fechaCorta(s.k)}: energía ${fmt(media1(s.vals))} (${s.vals.length} registros)` })) },
        { puntos: semEs.map((s) => ({ x: s.k, y: media1(s.vals), tip: `Semana del ${fechaCorta(s.k)}: esfuerzo ${fmt(media1(s.vals))} (${s.vals.length} registros)` })), estilo: "discontinua" },
      ], { min: 1, max: 5, vacio: "Hacen falta al menos dos semanas con energía o esfuerzo anotados." }) + leyendaLineas([["l1", "Energía"], ["l2", "Esfuerzo"]]))}
      ${bloqueGrafico("RIR medio por semana", lineas([{ puntos: semRir.map((s) => ({ x: s.k, y: media1(s.vals), tip: `Semana del ${fechaCorta(s.k)}: RIR ${fmt(media1(s.vals))} (${s.vals.length} registros)` })) }], { min: 0, max: 4, vacio: "Hacen falta al menos dos semanas con RIR anotado." }), "Cada punto es la media de los RIR anotados esa semana; toca para ver cuántos.")}
      ${bloqueGrafico("Horas de sueño por semana", barras(horas.map((s) => ({ etiqueta: `S${s.w}`, valor: s.suenoHoras, tip: `Semana ${s.w}: ${fmt(s.suenoHoras)} h de media` })), { vacio: "Anota el sueño en el resumen semanal para ver esta gráfica." }))}
      ${calidad.length >= 2 ? bloqueGrafico("Calidad del sueño", lineas([{ puntos: calidad.map((s) => ({ x: s.ini, y: s.suenoCalidad, tip: `Semana ${s.w}: calidad ${s.suenoCalidad}/5` })) }], { min: 1, max: 5 })) : ""}
      ${bloqueGrafico("Molestias por zona", donaZonas || `<div class="sin-datos">Ninguna molestia registrada en este periodo.</div>`)}
      ${mol.length ? bloqueGrafico("Molestias por semana", barras(molSem.map((s) => ({ etiqueta: fechaMini(s.k), valor: s.vals.length, tip: `Semana del ${fechaCorta(s.k)}: ${s.vals.length} registro${s.vals.length === 1 ? "" : "s"}${s.vals.some(Boolean) ? `, intensidad media ${fmt(media1(s.vals.filter(Boolean)))}` : ""}` })))) : ""}
      <p class="pie-grupo">Las gráficas muestran cómo cambian los datos en el tiempo. Que dos cosas coincidan no significa que una cause la otra.</p>`;
    return { titulo: "Estadísticas", sub: rg.etiqueta, html: cabeceraEst("recuperacion") + html };
  }

  function vistaEstadisticas(sec, extra) {
    if (sec === "fuerza") return vistaEstFuerza(extra);
    if (sec === "cardio") return vistaEstCardio();
    if (sec === "recuperacion") return vistaEstRecuperacion();
    return vistaEstResumen();
  }

  // Detalle al tocar un punto o una barra
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-tip]");
    $app.querySelectorAll(".grafico .tip").forEach((x) => (x.hidden = true));
    if (!t || !t.dataset.tip) return;
    const caja = t.closest(".grafico"), tip = caja && caja.querySelector(".tip");
    if (!tip) return;
    $app.querySelectorAll(".marcado").forEach((x) => x.classList.remove("marcado"));
    t.classList.add("marcado");
    tip.textContent = t.dataset.tip; tip.hidden = false;
    const a = caja.getBoundingClientRect(), b = t.getBoundingClientRect();
    const x = b.left + b.width / 2 - a.left;
    tip.style.left = `${Math.max(8, Math.min(a.width - tip.offsetWidth - 8, x - tip.offsetWidth / 2))}px`;
    tip.style.top = `${Math.max(0, b.top - a.top - tip.offsetHeight - 6)}px`;
  });

  /* ================================================================= RUTAS */
  const REDIRIGIR = { "": "hoy", inicio: "hoy", cardio: "biblioteca", registro: "progreso" };
  let navegaciones = 0;

  function resolver() {
    let partes = (location.hash || "#/hoy").replace(/^#\/?/, "").split("/");
    let [a, b, c] = partes;
    if (REDIRIGIR[a] && !(a === "registro" && b)) a = REDIRIGIR[a];
    if ((a === "fuerza" || a === "micros") && !b) a = "biblioteca";
    switch (a) {
      case "biblioteca": return ["biblioteca", vistaBiblioteca()];
      case "fuerza": return ["biblioteca", c === "fin" ? vistaFinFuerza(b) : vistaFuerza(b)];
      case "micros": return ["biblioteca", vistaMicro(b)];
      case "natacion": return ["biblioteca", vistaNatacion(Number(b))];
      case "carrera": return ["biblioteca", vistaCarrera(Number(b))];
      case "progreso": return ["progreso", vistaProgreso()];
      case "estadisticas": return ["estadisticas", vistaEstadisticas(b, c)];
      case "registro": return ["progreso", vistaDetalle(b)];
      case "ejercicio": return ["progreso", vistaEjercicio(b)];
      case "resumen": if (["semana", "anterior", "bloque"].includes(b)) alcanceResumen = b; return ["progreso", vistaResumen()];
      case "plan-nuevo": return ["progreso", vistaPlanNuevo()];
      case "intervalos": return ["biblioteca", vistaIntervalos(Number(b) || semanaActual())];
      case "ajustes": return ["progreso", vistaAjustes()];
      default: return ["hoy", vistaHoy()];
    }
  }

  let observador;
  function render(mantener) {
    const y = window.scrollY;
    const [tab, v] = resolver();
    document.body.classList.toggle("foco", !!v.foco);
    if (!v.intervalos) document.body.classList.remove("fase-trote", "fase-andar");
    if (v.foco) $app.innerHTML = v.html;
    else {
      const volver = v.volver ? `<button class="nav-btn" data-action="volver" data-href="${v.volver.href}">${ATRAS}<span>${esc(v.volver.label)}</span></button>` : "";
      $app.innerHTML = `
        <header class="barra"><div class="barra-in"><span class="izq">${volver}</span><span class="barra-tit">${esc(v.titulo)}</span><span class="der">${v.derecha || ""}</span></div></header>
        <div class="titulo-grande"><h1>${esc(v.titulo)}</h1>${v.sub ? `<p>${esc(v.sub)}</p>` : ""}</div>
        ${v.html}`;
      const tg = $app.querySelector(".titulo-grande"), barra = $app.querySelector(".barra");
      if (observador) observador.disconnect();
      if ("IntersectionObserver" in window) {
        observador = new IntersectionObserver(([en]) => barra.classList.toggle("plegada", !en.isIntersecting), { rootMargin: "-50px 0px 0px 0px" });
        observador.observe(tg);
      }
    }
    document.querySelectorAll(".tabbar a").forEach((el) => {
      const on = el.dataset.tab === tab;
      el.classList.toggle("activa", on);
      on ? el.setAttribute("aria-current", "page") : el.removeAttribute("aria-current");
    });
    window.scrollTo(0, mantener ? y : 0);
    pintarDescanso();
    if (v.intervalos) pintarIntervalos();
    animarAnillos();
  }
  window.addEventListener("hashchange", () => { navegaciones++; TMP = tmpVacio(); render(false); });

  /* ======================================================== DESCANSO */
  // Sin sonido: al terminar, la píldora se invierte de color y se queda hasta que la cierras.
  // [mínimo, máximo] en segundos. Hasta el mínimo: cuenta atrás. Después: «Puedes seguir»
  // con el tiempo acumulado hasta el máximo. Nunca obliga a empezar.
  function iniciarDescanso(rango) {
    if (!S.ui.temporizador) return;
    const [min, max] = rango;
    S.ui.descanso = { inicio: Date.now(), min, max };
    guardar(); pintarDescanso(true);
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  function pintarDescanso(forzar) {
    const el = document.getElementById("descanso");
    const d = S.ui.descanso;
    if (!d || !d.inicio) { el.hidden = true; el.classList.remove("listo"); el.dataset.fase = ""; return; }
    const t = (Date.now() - d.inicio) / 1000;
    if (t > d.max + 120) { S.ui.descanso = null; guardar(); el.hidden = true; el.classList.remove("listo"); el.dataset.fase = ""; return; }
    el.hidden = false;
    const fase = t < d.min ? "cuenta" : t < d.max ? "extra" : "max";
    if (forzar || el.dataset.fase !== fase) {
      el.dataset.fase = fase;
      el.classList.toggle("listo", fase !== "cuenta");
      el.innerHTML = fase === "cuenta"
        ? `<span class="t"></span><span class="l">descanso</span><button data-action="descanso-mas">+15 s</button><button data-action="descanso-fin">Saltar</button>`
        : `<span class="t"></span><span class="l">${fase === "extra" ? `puedes seguir (hasta ${mmss(d.max)})` : "descanso completo"}</span><button data-action="descanso-fin">Cerrar</button>`;
    }
    const tt = el.querySelector(".t");
    if (tt) tt.textContent = fase === "cuenta" ? mmss(Math.ceil(d.min - t)) : mmss(Math.min(t, d.max));
  }
  setInterval(() => { if (S.ui.descanso) pintarDescanso(); }, 500);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pintarDescanso(); });

  /* ========================================================= ACCIONES */
  function copiar(txt, mensaje) {
    const plan_b = () => {
      const t = document.createElement("textarea");
      t.value = txt; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select(); t.setSelectionRange(0, txt.length);
      let ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      t.remove(); aviso(ok ? mensaje : "No se pudo copiar automáticamente");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => aviso(mensaje)).catch(plan_b);
    else plan_b();
  }
  function sesionActual() { const id = location.hash.split("/")[2]; return PLAN.fuerza.find((s) => s.id === id); }

  function guardarRegistro(sesionId, extra) {
    const w = semanaActual(), c = CAT[sesionId];
    let fecha = (document.getElementById("fin-fecha") || {}).value || hoyISO();
    if (fecha > hoyISO()) fecha = hoyISO();
    const notasEl = document.getElementById("fin-notas");
    const leer = (idc) => { const el = document.getElementById(idc); const v = el ? num(el.value) : null; return v != null && v >= 0 ? v : null; };
    const datos = {};
    const dur = leer("fin-duracion"); if (dur) datos.duracion = Math.round(dur);
    if (sesionId === "natacion") { const m = leer("fin-metros"); if (m) datos.natacion = { metros: Math.round(m) }; }
    if (sesionId === "carrera") {
      const t = leer("fin-trote"), a = leer("fin-andar"), km = leer("fin-km");
      const u = S.ui.ultimoIntervalo && S.ui.ultimoIntervalo.fecha === hoyISO();
      if (t != null || a != null || km) datos.carrera = { troteMin: t, andarMin: a, distanciaKm: km || null, temporizador: !!u };
      delete S.ui.ultimoIntervalo;
    }
    const reg = Object.assign({
      id: uid(), bloque: PLAN.bloque.id, semana: w, sesion: sesionId, tipo: c.tipo, nombre: c.nombre,
      fecha, notas: notasEl ? notasEl.value.trim() : "", creado: new Date().toISOString(),
      energia: TMP.energia, esfuerzo: TMP.esfuerzo,
      molestia: TMP.molestia && TMP.molestia.zona ? TMP.molestia : null,
    }, datos, extra || {});
    S.registros.push(reg); guardar();
    return reg;
  }

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-action]");
    if (!el || el.tagName === "SELECT" || (el.tagName === "INPUT" && el.type !== "checkbox")) return;
    if (el.tagName === "INPUT") return; // los switches se gestionan en "change"
    const a = el.dataset.action;
    const ses = sesionActual();
    const w = semanaActual();
    const b = ses ? S.borradores[ses.id] : null;
    const e = ses && b ? ses.ejercicios[b.pos.ex] : null;
    const d = e ? b.ej[e.id] : null;

    switch (a) {
      case "volver":
        if (navegaciones > 0) history.back(); else location.hash = el.dataset.href;
        break;
      case "cerrar-foco":
        if (navegaciones > 0) history.back(); else location.hash = "#/hoy";
        break;
      case "ir": location.hash = el.dataset.href; break;
      case "ir-est": location.replace(`#/estadisticas/${el.dataset.v}${el.dataset.v === "fuerza" && S.ui.ejercicioEst ? "/" + S.ui.ejercicioEst : ""}`); break;
      case "periodo": S.ui.periodo = { tipo: el.dataset.v }; guardar(); render(true); break;
      case "cambiar-micro": location.replace(el.dataset.href); break;

      case "ir-ej": {
        const i = Number(el.dataset.i);
        if (i < 0 || i >= ses.ejercicios.length) break;
        b.pos.ex = i;
        const dx = b.ej[ses.ejercicios[i].id];
        const libre = dx.series.findIndex((s) => !s.ok);
        b.pos.serie = libre === -1 ? 0 : libre;
        guardar(); render(false); break;
      }
      case "sel-serie": b.pos.serie = Number(el.dataset.i); guardar(); render(true); break;
      case "paso": {
        const campo = el.dataset.campo, dir = Number(el.dataset.d);
        const si = Math.min(b.pos.serie, d.series.length - 1);
        const ef = efectivo(e, d);
        const actual = num(valorSerie(e, d, si, campo, ultimaVez(ef.id)).v) || 0;
        const paso = campo === "kg" ? ef.paso : 1;
        if (ef.corp && campo === "kg") {
          // En peso corporal el botón suma o resta kilos de lastre o de asistencia según el modo
          const modo = d.modo || (actual > 0 ? "lastre" : "asistencia");
          const abs = Math.max(0, Math.round((Math.abs(actual) + dir * paso) * 100) / 100);
          d.series[si].kg = String(modo === "asistencia" ? -abs : abs);
        } else d.series[si][campo] = String(Math.max(0, Math.round((actual + dir * paso) * 100) / 100));
        guardar(); render(true); break;
      }
      case "serie-hecha": {
        const ef = efectivo(e, d);
        const si = Math.min(b.pos.serie, d.series.length - 1), ult = ultimaVez(ef.id);
        ["kg", "reps"].forEach((c) => { if (d.series[si][c] === "") d.series[si][c] = String(num(valorSerie(e, d, si, c, ult).v) ?? ""); });
        if (ef.corp) {
          // El signo sigue siempre al modo elegido: asistencia (−) o lastre (+)
          const modo = d.modo || ((num(d.series[si].kg) || 0) > 0 ? "lastre" : "asistencia");
          const k = Math.abs(num(d.series[si].kg) || 0);
          d.series[si].kg = String(modo === "asistencia" ? -k : k);
          d.series[si].corp = true;
        } else delete d.series[si].corp;
        d.series[si].ok = true;
        // ¿Récord? Comparado con todo el historial y con las series ya hechas hoy
        const otras = d.series.filter((x, i) => i !== si && x.ok);
        d.series[si].pr = esRecord(ef.id, d.series[si], otras);
        if (d.series[si].pr) { otras.forEach((x) => (x.pr = false)); aviso(`Récord en ${ef.nombre.toLowerCase()}`); }
        if (!b.empezada) b.empezada = Date.now();
        const libre = d.series.findIndex((s) => !s.ok);
        if (libre !== -1) b.pos.serie = libre;
        guardar();
        iniciarDescanso(rangoDescanso(e.descanso || (e.principal ? DESCANSO.principal : DESCANSO.accesorio)));
        render(true); break;
      }
      case "deshacer-serie": { const x = d.series[Math.min(b.pos.serie, d.series.length - 1)]; x.ok = false; x.pr = false; guardar(); render(true); break; }
      case "ver-alt": b.verAlt = b.verAlt === e.id ? null : e.id; guardar(); render(true); break;
      case "ver-salto": { const ef = efectivo(e, d); b.verSalto = b.verSalto === ef.id ? null : ef.id; guardar(); render(true); break; }
      case "elegir-salto": {
        const ef = efectivo(e, d), v = Number(el.dataset.v);
        if (v) S.saltos[ef.id] = v; else delete S.saltos[ef.id];
        b.verSalto = null; guardar(); render(true);
        aviso(v ? `Salto de ${fmt(v)} kg en ${ef.nombre.toLowerCase()}` : "Salto del plan");
        break;
      }
      case "elegir-alt": {
        const nuevo = el.dataset.alt || null;
        if ((d.alt || null) !== nuevo) {
          d.alt = nuevo;
          d.series.forEach((x) => { if (!x.ok) { x.kg = ""; x.reps = ""; } });
        }
        b.verAlt = null; guardar(); render(true); break;
      }
      case "mas-serie": {
        const u = d.series[d.series.length - 1];
        d.series.push({ kg: "", reps: "", ok: false });
        b.pos.serie = d.series.length - 1;
        if (u && u.kg) d.series[b.pos.serie].kg = "";
        guardar(); render(true); break;
      }
      case "menos-serie": d.series.pop(); b.pos.serie = Math.min(b.pos.serie, d.series.length - 1); guardar(); render(true); break;
      case "ver-nota": { const t = $app.querySelector('textarea[data-campo="nota"]'); t.hidden = !t.hidden; if (!t.hidden) t.focus(); break; }
      case "toggle-local": el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") !== "true"); break;
      case "valor": {
        const campo = el.dataset.campo, v = Number(el.dataset.v);
        const destino = ses && b && location.hash.endsWith("/fin") ? b : TMP;
        let nuevo;
        if (campo === "sueno-calidad") {
          const k = claveAgenda(semanasDe(alcanceResumen)[0]); S.semanal[k] = S.semanal[k] || {};
          nuevo = S.semanal[k].suenoCalidad = S.semanal[k].suenoCalidad === v ? null : v; guardar();
          const t = document.getElementById("resumen-txt"); if (t) t.textContent = textoResumen(alcanceResumen);
          el.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === el && nuevo === v));
          break;
        }
        if (campo === "molestia") { destino.molestia = destino.molestia || {}; nuevo = destino.molestia.intensidad = destino.molestia.intensidad === v ? null : v; }
        else nuevo = destino[campo] = destino[campo] === v ? null : v;
        if (destino === b) guardar();
        el.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === el && nuevo === v));
        break;
      }
      case "rir": { const v = Number(el.dataset.v); d.rir = d.rir === v ? null : v; guardar(); render(true); break; }
      case "modo-corp": {
        const nuevoModo = el.dataset.v, si = Math.min(b.pos.serie, d.series.length - 1);
        d.modo = nuevoModo;
        d.series.forEach((x) => { if (!x.ok && x.kg !== "") { const k = Math.abs(num(x.kg) || 0); x.kg = String(nuevoModo === "asistencia" ? -k : k); } });
        guardar(); render(true); break;
      }

      case "guardar-fuerza": {
        const s = PLAN.fuerza.find((x) => x.id === el.dataset.id), bo = S.borradores[s.id];
        const ejercicios = {};
        s.ejercicios.forEach((x) => {
          const dx = bo.ej[x.id]; if (!dx) return;
          const ef = efectivo(x, dx);
          // Solo series hechas o completas (peso y repeticiones), nunca a medias
          const series = dx.series.filter((q) => q.ok || (q.kg !== "" && q.reps !== "")).map((q) => (ef.corp ? { ...q, corp: true } : q));
          if (series.length || dx.nota) ejercicios[ef.id] = Object.assign(
            { nombre: ef.nombre, series, nota: dx.nota, rir: dx.rir != null ? dx.rir : null, previstas: seriesPlan(x, semanaActual()) },
            ef.alt ? { sustituye: x.id, original: x.nombre } : {});
        });
        TMP = { energia: bo.energia || null, esfuerzo: bo.esfuerzo || null, molestia: bo.molestia || null };
        const durTxt = (document.getElementById("fin-duracion") || {}).value;
        const dur = durTxt ? Math.round(num(durTxt)) : null;
        const previsto = s.ejercicios.map((x) => ({ id: x.id, nombre: x.nombre, series: seriesPlan(x, semanaActual()), alts: (x.alternativas || []).map((a) => a.id) }));
        guardarRegistro(s.id, { ejercicios, previsto, notas: (bo.notas || "").trim(), duracion: dur && dur > 0 && dur < 240 ? dur : null });
        delete S.borradores[s.id]; S.ui.descanso = null; guardar();
        aviso(`${s.nombre} guardada`); location.hash = "#/hoy"; break;
      }
      case "guardar-simple": {
        const id = el.dataset.id, sel = Number(location.hash.split("/")[2]) || undefined;
        guardarRegistro(id, sel ? { variante: sel } : {});
        aviso(`${nombreLargo(id)} guardada`); location.hash = "#/hoy"; break;
      }
      case "descartar": {
        // Estilo iPhone: se hace al momento y se puede deshacer durante unos segundos
        const id = el.dataset.id, copia = S.borradores[id];
        delete S.borradores[id]; S.ui.descanso = null; guardar(); location.hash = "#/hoy";
        aviso("Sesión descartada", () => { S.borradores[id] = copia; guardar(); render(true); });
        break;
      }
      case "borrar-registro": {
        const i = S.registros.findIndex((r) => r.id === el.dataset.id);
        if (i === -1) break;
        const [quitado] = S.registros.splice(i, 1);
        guardar(); location.hash = "#/progreso";
        aviso("Sesión borrada", () => { S.registros.splice(i, 0, quitado); guardar(); render(true); });
        break;
      }
      case "deshacer": {
        const fn = accionDeshacer; accionDeshacer = null;
        document.getElementById("toast").hidden = true;
        if (fn) { fn(); aviso("Recuperada"); }
        break;
      }
      case "cerrar-novedades": {
        S.versionVista = APP_VERSION; guardar();
        const capa = document.querySelector(".hoja-capa"); if (capa) capa.remove();
        break;
      }
      case "calendario": exportarCalendario(); break;

      case "salir-intervalos": guardarIntervalo(); INT = null; document.body.classList.remove("fase-trote", "fase-andar"); location.hash = "#/carrera"; break;
      case "pausa-intervalos":
        if (!INT) break;
        if (INT.pausado) { INT.pausa += Date.now() - INT.pausado; INT.pausado = null; } else INT.pausado = Date.now();
        pintarIntervalos(); break;

      case "abrir-chatgpt": {
        const txt = textoResumen(alcanceResumen);
        copiar(txt, "Resumen copiado: pégalo en tu conversación");
        S.revisadas[alcanceResumen === "bloque" ? `${PLAN.bloque.id}:bloque` : claveAgenda(semanasDe(alcanceResumen)[0])] = true; guardar();
        window.open("https://chatgpt.com/", "_blank");
        break;
      }
      case "copiar-para-chatgpt": copiar(`${INSTRUCCIONES_CHATGPT}\n\n\`\`\`json\n${textoPlan(PLAN)}\n\`\`\``, "Copiado: pégalo en ChatGPT"); break;
      case "revisar-plan": {
        const texto = (document.getElementById("plan-pegado") || {}).value || "";
        try {
          const plan = leerPlanPegado(texto);
          const errores = validarPlan(plan);
          PROPUESTA = { texto, plan, errores, cambios: errores.length ? [] : compararPlanes(PLAN, plan) };
        } catch (err) { PROPUESTA = { texto, plan: null, errores: [err.message], cambios: [] }; }
        render(true); break;
      }
      case "cancelar-plan": PROPUESTA = null; render(false); break;
      case "aplicar-plan": {
        if (!PROPUESTA || !PROPUESTA.plan || PROPUESTA.errores.length) break;
        S.planAnterior = JSON.parse(JSON.stringify(PLAN));
        S.planPropio = PROPUESTA.plan; S.planFecha = hoyISO();
        // Si el bloque es nuevo, empieza el lunes próximo (editable en Ajustes)
        if (PROPUESTA.plan.bloque.id !== PLAN.bloque.id) { S.inicio = inicioPorDefecto(); S.semanaManual = null; S.borradores = {}; }
        guardar(); PROPUESTA = null;
        sessionStorage.setItem("mva-aviso", "Plan actualizado");
        location.hash = "#/hoy"; location.reload(); break;
      }
      case "restaurar-plan": {
        if (!S.planAnterior) break;
        const actual = JSON.parse(JSON.stringify(PLAN));
        S.planPropio = S.planAnterior; S.planAnterior = actual; S.planFecha = hoyISO();
        guardar(); sessionStorage.setItem("mva-aviso", "Plan anterior restaurado"); location.reload(); break;
      }
      case "usar-fichero": {
        S.planAnterior = JSON.parse(JSON.stringify(PLAN)); delete S.planPropio; delete S.planFecha;
        guardar(); sessionStorage.setItem("mva-aviso", "Usando el plan del fichero"); location.reload(); break;
      }

      case "descanso-mas": S.ui.descanso.min += 15; S.ui.descanso.max = Math.max(S.ui.descanso.max, S.ui.descanso.min); guardar(); pintarDescanso(true); break;
      case "descanso-fin": S.ui.descanso = null; guardar(); pintarDescanso(); break;

      case "alcance": alcanceResumen = el.dataset.v; location.replace(`#/resumen/${el.dataset.v}`); break;
      case "copiar-resumen": copiar(textoResumen(alcanceResumen), "Resumen copiado"); break;
      case "compartir-resumen": navigator.share({ text: textoResumen(alcanceResumen) }).catch(() => {}); break;

      case "semana-manual":
        S.semanaManual = el.dataset.v === "auto" ? null : Number(el.dataset.v);
        guardar(); render(true); aviso(S.semanaManual ? `Semana ${S.semanaManual} fijada` : "Semana automática"); break;
      case "exportar": exportar(); break;
      case "importar": document.getElementById("fichero-importar").click(); break;
      case "borrar-todo":
        if (confirm("¿Borrar TODOS los datos? Exporta antes una copia si quieres conservarlos.")) {
          S = vacio(); S.inicio = inicioPorDefecto(); guardar(); aviso("Datos borrados"); location.hash = "#/hoy";
        }
        break;
    }
  });

  document.addEventListener("input", (ev) => {
    const el = ev.target, campo = el.dataset.campo;
    if (!campo) return;
    const ses = sesionActual(); if (!ses) return;
    const b = S.borradores[ses.id]; if (!b) return;
    if (campo === "notas-sesion") b.notas = el.value;
    else {
      const e = ses.ejercicios[b.pos.ex], d = b.ej[e.id];
      if (campo === "nota") d.nota = el.value;
      else {
        const si = Math.min(b.pos.serie, d.series.length - 1);
        const ef = efectivo(e, d);
        if (ef.corp && campo === "kg" && el.value.trim() !== "") {
          const abs = Math.abs(num(el.value) || 0);
          d.series[si].kg = String((d.modo || "asistencia") === "asistencia" ? -abs : abs);
        } else d.series[si][campo] = el.value.trim() === "" ? "" : String(num(el.value) ?? "");
        el.classList.remove("sugerido");
      }
    }
    guardar();
  });

  document.addEventListener("change", (ev) => {
    const el = ev.target, a = el.dataset.action;
    if (a === "cambiar-dia") {
      const k = claveAgenda(semanaActual());
      S.agenda[k] = S.agenda[k] || {}; S.agenda[k][el.dataset.sesion] = Number(el.value);
      guardar(); render(true);
    } else if (a === "cambiar-inicio" && el.value) {
      S.inicio = el.value; guardar(); render(true); aviso("Fecha de inicio actualizada");
    } else if (a === "cambiar-fecha-registro" && el.value) {
      const r = S.registros.find((x) => x.id === el.dataset.id); if (r) { r.fecha = el.value; guardar(); aviso("Fecha cambiada"); }
    } else if (a === "periodo-semana") {
      S.ui.periodo = el.value ? { tipo: "semana", semana: Number(el.value) } : { tipo: "28" }; guardar(); render(true);
    } else if (a === "elegir-ejercicio-est") {
      S.ui.ejercicioEst = el.value; guardar(); location.replace(`#/estadisticas/fuerza/${el.value}`);
    } else if (a === "molestia-zona") {
      const ses = sesionActual(), b = ses ? S.borradores[ses.id] : null;
      const destino = b && location.hash.endsWith("/fin") ? b : TMP;
      destino.molestia = el.value ? { zona: el.value, intensidad: (destino.molestia && destino.molestia.intensidad) || null } : null;
      if (destino === b) guardar();
      const caja = el.parentElement.querySelector(".escala-molestia");
      if (caja) caja.hidden = !el.value;
    } else if (a === "sueno") {
      const k = el.dataset.clave; S.semanal[k] = S.semanal[k] || {};
      S.semanal[k].suenoHoras = el.value ? Number(el.value) : null; guardar(); render(true);
    } else if (a === "ui-toggle") {
      S.ui[el.dataset.campo] = el.checked; if (el.dataset.campo === "temporizador" && !el.checked) S.ui.descanso = null; guardar(); pintarDescanso();
    } else if (el.id === "fichero-importar" && el.files[0]) { importar(el.files[0]); el.value = ""; }
  });

  document.addEventListener("toggle", (ev) => {
    const el = ev.target;
    if (el.matches && el.matches("details.desplegable")) { S.ui.abiertos[el.dataset.grupo] = el.open; guardar(); }
  }, true);

  /* ---------------------------------------------------- Exportar / importar */
  async function exportar() {
    const datos = JSON.stringify({ app: "mi-vuelta-a-entrenar", version: 2, exportado: new Date().toISOString(), datos: S }, null, 2);
    const nombre = `mi-vuelta-a-entrenar-${hoyISO()}.json`;
    const fichero = new File([datos], nombre, { type: "application/json" });
    const marcar = () => { S.ultimaCopia = hoyISO(); guardar(); };
    try {
      if (navigator.canShare && navigator.canShare({ files: [fichero] })) { await navigator.share({ files: [fichero], title: "Copia de Mi vuelta a entrenar" }); marcar(); render(true); return; }
    } catch (e) { if (e.name === "AbortError") return; }
    const url = URL.createObjectURL(fichero), a = document.createElement("a");
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    marcar(); aviso("Copia exportada"); render(true);
  }
  function importar(file) {
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const obj = JSON.parse(lector.result), datos = obj.datos || obj;
        if (!Array.isArray(datos.registros)) throw new Error("formato");
        if (!confirm(`La copia tiene ${datos.registros.length} sesiones. ¿Reemplazar los datos actuales?`)) return;
        S = Object.assign(vacio(), datos); S.ui = Object.assign(uiPorDefecto(), datos.ui || {});
        guardar(); aviso("Copia importada"); location.hash = "#/progreso"; render(false);
      } catch (e) { aviso("El fichero no es una copia válida de la app"); }
    };
    lector.readAsText(file);
  }

  /* -------------------------------------------------------------- Arranque */
  render(false);
  hojaNovedades();
  const pendiente = sessionStorage.getItem("mva-aviso");
  if (pendiente) { sessionStorage.removeItem("mva-aviso"); aviso(pendiente); }
  if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  window.__mva = { get estado() { return S; }, get plan() { return PLAN; }, estadoPrograma, calcularAhora, textoResumen, validarPlan, INSTRUCCIONES_CHATGPT };
})();
