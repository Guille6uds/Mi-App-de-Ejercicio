/* =====================================================================
   Mi vuelta a entrenar — v2
   Contenido del plan: plan.js (window.PLAN)
   Datos personales: localStorage del iPhone (exportables).
   ===================================================================== */
(function () {
  "use strict";

  const PLAN = window.PLAN;
  const $app = document.getElementById("app");
  if (!PLAN || !PLAN.bloque || !Array.isArray(PLAN.fuerza)) {
    $app.innerHTML =
      '<div class="titulo-grande" style="padding-top:60px"><h1>No se pudo leer el plan</h1>' +
      '<p>Hay un error en plan.js (suele ser una coma o una comilla). Tus datos siguen guardados. ' +
      "Restaura la versión anterior del fichero en GitHub (History) y vuelve a abrir la app.</p></div>";
    return;
  }

  const CLAVE = "mva-datos-v1"; // misma clave que la v1: el historial se conserva
  const DIAS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const DIAS_LARGO = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const N = PLAN.bloque.semanas;
  const HUECOS = PLAN.huecos || [];
  const DESCANSO = PLAN.descanso || { principal: 120, accesorio: 75 };

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
  const vacio = () => ({ v: 2, inicio: null, semanaManual: null, agenda: {}, registros: [], borradores: {}, ui: uiPorDefecto() });
  let S = cargar();

  function cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      const d = crudo ? Object.assign(vacio(), JSON.parse(crudo)) : vacio();
      d.ui = Object.assign(uiPorDefecto(), d.ui || {});
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
  const formatoSerie = (s) => (s.kg ? `${fmt(s.kg)}×${s.reps || "?"}` : s.reps ? `${s.reps} reps` : "hecha");

  function ultimaVez(exId) {
    const r = S.registros
      .filter((x) => x.ejercicios && x.ejercicios[exId] && x.ejercicios[exId].series.some((s) => s.kg || s.reps))
      .sort(ordenFecha)[0];
    return r ? { fecha: r.fecha, series: r.ejercicios[exId].series.filter((s) => s.kg || s.reps) } : null;
  }

  // Doble progresión: si la última vez llegaste al máximo del rango en todas las series → sube «paso».
  function sugerencia(e, w) {
    if (!S.ui.sugerencias) return null;
    const u = ultimaVez(e.id), tope = maxRango(e.reps);
    if (!u || !tope) return null;
    const conPeso = u.series.filter((s) => num(s.kg) != null && num(s.reps) != null);
    if (conPeso.length < Math.min(seriesPlan(e, w), 2)) return null;
    if (!conPeso.every((s) => num(s.reps) >= tope)) return null;
    const base = Math.max(...conPeso.map((s) => num(s.kg)));
    return { kg: base + (e.paso || 2.5), tope };
  }

  /* ------------------------------------------------------------ Utilidades */
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CHEV = '<svg class="chev" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5 6.5 6.5 1.5 11.5"/></svg>';
  const FLECHA = '<svg class="flecha" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 5 7 9.5 11.5 5"/></svg>';
  const ATRAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const ENGRANAJE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/></svg>';

  let tAviso;
  function aviso(texto) {
    const t = document.getElementById("toast");
    t.textContent = texto; t.hidden = false;
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    clearTimeout(tAviso); tAviso = setTimeout(() => (t.hidden = true), 2400);
  }

  function escala(campo, valor, izq, der) {
    return `<div class="escala" role="group">${[1, 2, 3, 4, 5].map((n) =>
      `<button data-action="valor" data-campo="${campo}" data-v="${n}" aria-pressed="${valor === n}">${n}</button>`).join("")}</div>
      <div class="escala-txt"><span>${izq}</span><span>${der}</span></div>`;
  }

  // Formulario de cierre común (micro, natación, carrera). Valores temporales en TMP.
  let TMP = { energia: null, esfuerzo: null };
  function formCierre(id, boton) {
    return `
      <h2 class="cab-grupo">Al terminar</h2>
      <div class="grupo">
        <label class="campo-form"><span>Fecha</span><input class="input" type="date" id="fin-fecha" value="${hoyISO()}" max="${hoyISO()}"></label>
        <div class="campo-form"><span>Energía</span>${escala("energia", TMP.energia, "Sin fuerzas", "A tope")}</div>
        <div class="campo-form"><span>Esfuerzo</span>${escala("esfuerzo", TMP.esfuerzo, "Muy suave", "Al límite")}</div>
        <label class="campo-form"><span>Notas</span><textarea id="fin-notas" placeholder="Sensaciones, molestias, qué cambiarías…"></textarea></label>
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
        ${final}`,
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
    if (!b) b = S.borradores[sesion.id] = { notas: "", ej: {}, pos: { ex: 0, serie: 0 } };
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
    if (prev) return { v: prev[campo], sugerido: true };
    if (ult && ult.series[Math.min(i, ult.series.length - 1)]) {
      const u = ult.series[Math.min(i, ult.series.length - 1)][campo];
      if (u) return { v: u, sugerido: true };
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
    let si = Math.min(b.pos.serie, d.series.length - 1);
    const ult = ultimaVez(e.id);
    const sug = sugerencia(e, w);
    const todas = d.series.every((s) => s.ok);
    const ultimo = ix === sesion.ejercicios.length - 1;

    const tira = sesion.ejercicios.map((x, i) => {
      const dx = b.ej[x.id], ok = dx.series.filter((s) => s.ok).length;
      const cls = i === ix ? "actual" : ok === dx.series.length ? "hecho" : ok ? "parcial" : "";
      return `<button class="${cls}" data-action="ir-ej" data-i="${i}" aria-label="${esc(x.nombre)}"><i></i></button>`;
    }).join("");

    const chips = d.series.map((s, i) =>
      `<button class="chip ${s.ok ? "ok" : ""} ${i === si ? "sel" : ""}" data-action="sel-serie" data-i="${i}">${s.ok ? formatoSerie(s) : `Serie ${i + 1}`}</button>`).join("") +
      `<button class="chip mas" data-action="mas-serie" aria-label="Añadir serie">+ Serie</button>`;

    const kg = valorSerie(e, d, si, "kg", ult), reps = valorSerie(e, d, si, "reps", ult);
    const s = d.series[si];

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
        <h1>${esc(e.nombre)}</h1>
        <p class="pauta">${seriesPlan(e, w)} × ${esc(e.reps)}</p>
        ${ult ? `<p class="info">Última vez, ${fechaCorta(ult.fecha)}: ${ult.series.map(formatoSerie).join("  ")}</p>` : `<p class="info">Primera vez: elige una carga cómoda y deja 2–3 repeticiones en recámara.</p>`}
        ${e.nota ? `<p class="info">${esc(e.nota)}</p>` : ""}
        ${sug ? `<p class="sugerencia">Completaste ${sug.tope} repeticiones en todas las series. Prueba con ${fmt(sug.kg)} kg.</p>` : ""}
      </section>

      <div class="series-chips">${chips}</div>

      <section class="panel">
        <div class="titulo-serie"><b>Serie ${si + 1}</b><small>${s.ok ? "Hecha" : kg.sugerido && kg.v ? "Como la última vez" : ""}</small></div>
        <div class="steppers">
          <div class="stepper">
            <input inputmode="decimal" data-campo="kg" value="${esc(fmt(kg.v))}" class="${kg.sugerido ? "sugerido" : ""}" placeholder="0" aria-label="Kilos">
            <div class="unidad">kg</div>
            <div class="mm"><button data-action="paso" data-campo="kg" data-d="-1" aria-label="Menos peso">−</button><button data-action="paso" data-campo="kg" data-d="1" aria-label="Más peso">+</button></div>
          </div>
          <div class="stepper">
            <input inputmode="numeric" data-campo="reps" value="${esc(reps.v)}" class="${reps.sugerido ? "sugerido" : ""}" placeholder="0" aria-label="Repeticiones">
            <div class="unidad">repeticiones</div>
            <div class="mm"><button data-action="paso" data-campo="reps" data-d="-1" aria-label="Una repetición menos">−</button><button data-action="paso" data-campo="reps" data-d="1" aria-label="Una repetición más">+</button></div>
          </div>
        </div>
        ${s.ok
          ? `<button class="btn sec" data-action="deshacer-serie">Desmarcar serie</button>`
          : `<button class="btn" data-action="serie-hecha">Serie hecha</button>`}
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
      return `<div class="celda sin-icono"><span class="txt"><b>${esc(e.nombre)}</b><small>${ok.length ? ok.map(formatoSerie).join("  ") : "Sin series marcadas"}</small></span><span class="dcha">${ok.length}/${d.series.length}</span></div>`;
    }).join("");
    const r = hechoEnSemana(w, id);
    return {
      titulo: `Terminar ${sesion.nombre}`,
      volver: { href: `#/fuerza/${id}`, label: "Sesión" },
      html: `
        ${r ? `<p class="pie-grupo" style="margin:0 16px 12px">Ya registraste ${esc(sesion.nombre)} esta semana (${fechaCorta(r.fecha)}). Esta se guardará como otra sesión.</p>` : ""}
        <div class="grupo">${filas}</div>
        <h2 class="cab-grupo">Cómo ha ido</h2>
        <div class="grupo">
          <label class="campo-form"><span>Fecha</span><input class="input" type="date" id="fin-fecha" value="${hoyISO()}" max="${hoyISO()}"></label>
          <div class="campo-form"><span>Energía</span>${escala("energia", b.energia || null, "Sin fuerzas", "A tope")}</div>
          <div class="campo-form"><span>Esfuerzo</span>${escala("esfuerzo", b.esfuerzo || null, "Muy suave", "Al límite")}</div>
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
          <p class="pie-grupo">Unos ${(c.trote + c.andar) * c.repeticiones} minutos. Si no puedes hablar mientras trotas, baja el ritmo.</p>` : "") +
        (r && sel === w ? `<p class="pie-grupo">Hecha esta semana, ${fechaCorta(r.fecha)}.</p>` : "") +
        formCierre("carrera", "Marcar carrera como hecha"),
    };
  }

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
        <h2 class="cab-grupo">Semanas del bloque</h2>
        <div class="grupo">${semanas}</div>
        <p class="pie-grupo">Cada punto es una sesión prioritaria: fuerza A, natación y fuerza B.</p>
        <div class="espacio"></div>
        <details class="desplegable" data-grupo="ejercicios" ${S.ui.abiertos.ejercicios ? "open" : ""}>
        <summary><b>Evolución por ejercicio</b><small>${PLAN.fuerza.flatMap((s) => s.ejercicios).filter((e) => ultimaVez(e.id)).length} con datos</small>${FLECHA}</summary>
        <div class="contenido">${PLAN.fuerza.flatMap((s) => s.ejercicios).filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i).map((e) => {
          const u = ultimaVez(e.id);
          return `<a class="celda sin-icono" href="#/ejercicio/${e.id}"><span class="txt"><b>${esc(e.nombre)}</b><small>${u ? `Última: ${u.series.map(formatoSerie).join("  ")}` : "Sin registros"}</small></span><span class="dcha">${CHEV}</span></a>`;
        }).join("")}</div></details>
        <h2 class="cab-grupo">Historial</h2>
        <div class="grupo">${lista}</div>`,
    };
  }

  function vistaEjercicio(exId) {
    let ej = null;
    PLAN.fuerza.forEach((s) => s.ejercicios.forEach((e) => { if (e.id === exId) ej = e; }));
    if (!ej) return vistaNoEncontrada();
    const regs = S.registros.filter((r) => r.ejercicios && r.ejercicios[exId] && r.ejercicios[exId].series.some((s) => s.kg || s.reps))
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    const puntos = regs.map((r) => ({ fecha: r.fecha, kg: Math.max(0, ...r.ejercicios[exId].series.map((s) => num(s.kg) || 0)) })).filter((p) => p.kg > 0);
    let grafico = "";
    if (puntos.length >= 2) {
      const W = 320, H = 90, min = Math.min(...puntos.map((p) => p.kg)), max = Math.max(...puntos.map((p) => p.kg));
      const rango = max - min || 1;
      const xy = puntos.map((p, i) => [12 + (i * (W - 24)) / (puntos.length - 1), H - 14 - ((p.kg - min) / rango) * (H - 30)]);
      grafico = `<div class="grupo" style="padding:14px 16px 8px">
        <div style="display:flex;justify-content:space-between;color:var(--gris);font-size:13px"><span>Peso máximo por sesión</span><span>${fmt(min)}–${fmt(max)} kg</span></div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;margin-top:6px" aria-hidden="true">
          <polyline points="${xy.map((p) => p.join(",")).join(" ")}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
          ${xy.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === xy.length - 1 ? 4 : 2.5}" fill="currentColor"/>`).join("")}
        </svg></div><div class="espacio"></div>`;
    }
    return {
      titulo: ej.nombre,
      sub: `${ej.reps} repeticiones`,
      volver: { href: "#/progreso", label: "Progreso" },
      html: grafico + (regs.length
        ? `<div class="grupo">${regs.slice().reverse().map((r) => `<a class="celda sin-icono" href="#/registro/${r.id}"><span class="txt"><b>${fechaCorta(r.fecha)}</b><small>${r.ejercicios[exId].series.filter((s) => s.kg || s.reps).map(formatoSerie).join("  ")}</small></span><span class="dcha">${CHEV}</span></a>`).join("")}</div>`
        : `<div class="grupo"><p class="vacio">Cuando registres este ejercicio verás aquí su evolución.</p></div>`),
    };
  }

  function vistaDetalle(id) {
    const r = S.registros.find((x) => x.id === id);
    if (!r) return vistaNoEncontrada();
    const ej = r.ejercicios ? Object.values(r.ejercicios).map((e) => `
      <div class="campo-form"><span style="color:var(--tinta);font-weight:500">${esc(e.nombre)}</span>
        <table class="tabla"><tbody>${e.series.map((s, i) => `<tr><td>Serie ${i + 1}</td><td>${esc(formatoSerie(s))}</td></tr>`).join("")}</tbody></table>
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
  function textoResumen(alcance) {
    const w = semanaActual();
    const semanas = alcance === "bloque" ? Array.from({ length: w }, (_, i) => i + 1) : alcance === "anterior" ? [Math.max(1, w - 1)] : [w];
    const L = [];
    L.push(`Resumen de entrenamiento: «${PLAN.bloque.nombre}» (${N} semanas, inicio ${fechaLarga(S.inicio)}).`);
    L.push(`Objetivo semanal: Fuerza A, Fuerza B y natación prioritarias; carrera opcional; micros como extra. Criterio: ${PLAN.intensidad}`);
    semanas.forEach((n) => {
      const info = PLAN.semanas.find((s) => s.n === n) || {};
      const regs = registrosSemana(n).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      const pr = prioritarias();
      const hechas = pr.filter((p) => regs.some((r) => r.sesion === p.sesion));
      L.push("");
      L.push(`SEMANA ${n} (${info.titulo || ""}): ${hechas.length} de ${pr.length} prioritarias.`);
      const falta = pr.filter((p) => !hechas.includes(p)).map((p) => nombreLargo(p.sesion));
      if (falta.length) L.push(`Sin hacer: ${falta.join(", ")}.`);
      if (!regs.length) L.push("No hay sesiones registradas.");
      regs.forEach((r) => {
        const extra = [r.energia ? `energía ${r.energia}/5` : "", r.esfuerzo ? `esfuerzo ${r.esfuerzo}/5` : "", r.duracion ? `${r.duracion} min` : ""].filter(Boolean).join(", ");
        L.push(`- ${mayus(fechaCorta(r.fecha))}: ${nombreLargo(r.sesion) || r.nombre}${extra ? ` (${extra})` : ""}`);
        if (r.ejercicios) Object.values(r.ejercicios).forEach((e) => {
          const series = e.series.map(formatoSerie).join(", ");
          L.push(`    ${e.nombre}: ${[series, e.nota ? `nota: ${e.nota}` : ""].filter(Boolean).join(". ")}`);
        });
        if (r.notas) L.push(`    Notas: ${r.notas}`);
      });
    });
    L.push("");
    L.push("¿Qué ajustarías en volumen, cargas o ejercicios para la próxima semana?");
    return L.join("\n");
  }
  function vistaResumen() {
    const opciones = [["semana", "Esta semana"], ["anterior", "Anterior"], ["bloque", "Todo el bloque"]];
    return {
      titulo: "Resumen",
      sub: "Cópialo o compártelo directamente con ChatGPT.",
      volver: { href: "#/progreso", label: "Progreso" },
      html: `
        <div class="segmentado">${opciones.map(([v, t]) => `<button data-action="alcance" data-v="${v}" aria-pressed="${alcanceResumen === v}">${t}</button>`).join("")}</div>
        <div class="espacio"></div>
        <div class="grupo"><pre class="resumen-txt" id="resumen-txt">${esc(textoResumen(alcanceResumen))}</pre></div>
        <div class="espacio"></div>
        <button class="btn" data-action="copiar-resumen">Copiar</button>
        ${navigator.share ? `<button class="btn sec" data-action="compartir-resumen">Compartir…</button>` : ""}`,
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

        <h2 class="cab-grupo">Copia de seguridad</h2>
        <div class="grupo">
          <button class="celda boton sin-icono" data-action="exportar"><span class="txt"><b>Exportar datos</b></span><span class="dcha">${CHEV}</span></button>
          <button class="celda boton sin-icono" data-action="importar"><span class="txt"><b>Importar copia</b></span><span class="dcha">${CHEV}</span></button>
        </div>
        <input type="file" id="fichero-importar" accept="application/json,.json" hidden>
        <p class="pie-grupo">Tus datos solo están en este iPhone. Exporta una copia de vez en cuando a Archivos o iCloud Drive.${S.ultimaCopia ? ` Última copia: ${fechaCorta(S.ultimaCopia)}.` : ""}</p>

        <div class="espacio"></div>
        <div class="grupo"><button class="celda boton peligro sin-icono" data-action="borrar-todo">Borrar todos los datos</button></div>
        <p class="pie-grupo" style="text-align:center;margin-top:18px">Plan «${esc(PLAN.bloque.nombre)}». ${S.registros.length} sesiones guardadas. Versión 2.</p>`,
    };
  }

  function vistaNoEncontrada() {
    return { titulo: "No encontrado", volver: { href: "#/hoy", label: "Hoy" }, html: `<p class="vacio">Esto ya no existe en el plan actual.</p>` };
  }

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
      case "registro": return ["progreso", vistaDetalle(b)];
      case "ejercicio": return ["progreso", vistaEjercicio(b)];
      case "resumen": return ["progreso", vistaResumen()];
      case "ajustes": return ["progreso", vistaAjustes()];
      default: return ["hoy", vistaHoy()];
    }
  }

  let observador;
  function render(mantener) {
    const y = window.scrollY;
    const [tab, v] = resolver();
    document.body.classList.toggle("foco", !!v.foco);
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
  }
  window.addEventListener("hashchange", () => { navegaciones++; TMP = { energia: null, esfuerzo: null }; render(false); });

  /* ======================================================== DESCANSO */
  let audio;
  function prepararAudio() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch (e) {}
  }
  function pitido() {
    if (!audio) return;
    [0, 0.22].forEach((t) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; o.type = "sine";
      g.gain.setValueAtTime(0.0001, audio.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.18);
      o.connect(g).connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.2);
    });
    if (navigator.vibrate) navigator.vibrate([60, 80, 60]);
  }
  function iniciarDescanso(seg) {
    if (!S.ui.temporizador) return;
    S.ui.descanso = { fin: Date.now() + seg * 1000, avisado: false };
    guardar(); pintarDescanso();
  }
  function pintarDescanso() {
    const el = document.getElementById("descanso");
    const d = S.ui.descanso;
    if (!d) { el.hidden = true; return; }
    const resta = Math.round((d.fin - Date.now()) / 1000);
    if (resta <= -4) { S.ui.descanso = null; guardar(); el.hidden = true; return; }
    el.hidden = false;
    if (resta <= 0) {
      el.innerHTML = `<span class="t">Listo</span><span class="l">a por la siguiente</span><button data-action="descanso-fin">Cerrar</button>`;
      if (!d.avisado) { d.avisado = true; guardar(); if (document.visibilityState === "visible") pitido(); }
      return;
    }
    const txt = `${Math.floor(resta / 60)}:${pad(resta % 60)}`;
    const t = el.querySelector(".t");
    if (t && el.dataset.modo === "cuenta") t.textContent = txt;
    else {
      el.dataset.modo = "cuenta";
      el.innerHTML = `<span class="t">${txt}</span><span class="l">descanso</span><button data-action="descanso-mas">+15 s</button><button data-action="descanso-fin">Saltar</button>`;
    }
    if (resta <= 0) el.dataset.modo = "";
  }
  setInterval(() => { if (S.ui.descanso) { const el = document.getElementById("descanso"); if (Math.round((S.ui.descanso.fin - Date.now()) / 1000) <= 0) el.dataset.modo = ""; pintarDescanso(); } }, 500);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pintarDescanso(); });

  /* ========================================================= ACCIONES */
  function sesionActual() { const id = location.hash.split("/")[2]; return PLAN.fuerza.find((s) => s.id === id); }

  function guardarRegistro(sesionId, extra) {
    const w = semanaActual(), c = CAT[sesionId];
    let fecha = (document.getElementById("fin-fecha") || {}).value || hoyISO();
    if (fecha > hoyISO()) fecha = hoyISO();
    const notasEl = document.getElementById("fin-notas");
    const reg = Object.assign({
      id: uid(), bloque: PLAN.bloque.id, semana: w, sesion: sesionId, tipo: c.tipo, nombre: c.nombre,
      fecha, notas: notasEl ? notasEl.value.trim() : "", creado: new Date().toISOString(),
      energia: TMP.energia, esfuerzo: TMP.esfuerzo,
    }, extra || {});
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
        const actual = num(valorSerie(e, d, si, campo, ultimaVez(e.id)).v) || 0;
        const paso = campo === "kg" ? e.paso || 2.5 : 1;
        d.series[si][campo] = String(Math.max(0, Math.round((actual + dir * paso) * 100) / 100));
        guardar(); render(true); break;
      }
      case "serie-hecha": {
        prepararAudio();
        const si = Math.min(b.pos.serie, d.series.length - 1), ult = ultimaVez(e.id);
        ["kg", "reps"].forEach((c) => { if (d.series[si][c] === "") d.series[si][c] = String(num(valorSerie(e, d, si, c, ult).v) ?? ""); });
        d.series[si].ok = true;
        if (!b.empezada) b.empezada = Date.now();
        const libre = d.series.findIndex((s) => !s.ok);
        if (libre !== -1) b.pos.serie = libre;
        guardar();
        iniciarDescanso(e.descanso || (e.principal ? DESCANSO.principal : DESCANSO.accesorio));
        render(true); break;
      }
      case "deshacer-serie": d.series[Math.min(b.pos.serie, d.series.length - 1)].ok = false; guardar(); render(true); break;
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
        if (ses && b && location.hash.endsWith("/fin")) { b[campo] = b[campo] === v ? null : v; guardar(); }
        else TMP[campo] = TMP[campo] === v ? null : v;
        el.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === el && (ses && b && location.hash.endsWith("/fin") ? b[campo] : TMP[campo]) === v));
        break;
      }

      case "guardar-fuerza": {
        const s = PLAN.fuerza.find((x) => x.id === el.dataset.id), bo = S.borradores[s.id];
        const ejercicios = {};
        s.ejercicios.forEach((x) => {
          const dx = bo.ej[x.id]; if (!dx) return;
          const series = dx.series.filter((q) => q.ok || q.kg || q.reps);
          if (series.length || dx.nota) ejercicios[x.id] = { nombre: x.nombre, series, nota: dx.nota };
        });
        TMP = { energia: bo.energia || null, esfuerzo: bo.esfuerzo || null };
        const dur = bo.empezada ? Math.round((Date.now() - bo.empezada) / 60000) : null;
        guardarRegistro(s.id, { ejercicios, notas: (bo.notas || "").trim(), duracion: dur && dur > 0 && dur < 240 ? dur : null });
        delete S.borradores[s.id]; S.ui.descanso = null; guardar();
        aviso(`${s.nombre} guardada`); location.hash = "#/hoy"; break;
      }
      case "guardar-simple": {
        const id = el.dataset.id, sel = Number(location.hash.split("/")[2]) || undefined;
        guardarRegistro(id, sel ? { variante: sel } : {});
        aviso(`${nombreLargo(id)} guardada`); location.hash = "#/hoy"; break;
      }
      case "descartar":
        if (confirm("¿Descartar todo lo anotado en esta sesión?")) { delete S.borradores[el.dataset.id]; S.ui.descanso = null; guardar(); location.hash = "#/hoy"; }
        break;
      case "borrar-registro":
        if (confirm("¿Borrar esta sesión del historial?")) { S.registros = S.registros.filter((r) => r.id !== el.dataset.id); guardar(); aviso("Sesión borrada"); location.hash = "#/progreso"; }
        break;

      case "descanso-mas": S.ui.descanso.fin += 15000; guardar(); pintarDescanso(); break;
      case "descanso-fin": S.ui.descanso = null; guardar(); pintarDescanso(); break;

      case "alcance": alcanceResumen = el.dataset.v; render(true); break;
      case "copiar-resumen": {
        const txt = textoResumen(alcanceResumen);
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
          .then(() => aviso("Resumen copiado"))
          .catch(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById("resumen-txt")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); aviso("Texto seleccionado: pulsa Copiar"); });
        break;
      }
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
        d.series[si][campo] = el.value.trim() === "" ? "" : String(num(el.value) ?? "");
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
  if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  window.__mva = { get estado() { return S; }, estadoPrograma, calcularAhora, textoResumen };
})();
