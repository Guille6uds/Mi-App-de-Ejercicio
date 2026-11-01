/* =====================================================================
   Mi vuelta a entrenar — lógica de la app
   - El contenido del plan vive en plan.js (window.PLAN).
   - Los datos personales (registros, borradores, ajustes) se guardan
     en el propio iPhone (localStorage) y se pueden exportar/importar.
   ===================================================================== */
(function () {
  "use strict";

  const PLAN = window.PLAN;
  if (!PLAN || !PLAN.bloque || !Array.isArray(PLAN.fuerza)) {
    document.getElementById("app").innerHTML =
      '<div class="card" style="margin-top:24px"><h1 style="font-size:1.2rem">No se pudo leer el plan</h1>' +
      '<p class="sub" style="margin-top:8px">Hay un error en plan.js (suele ser una coma o comilla). Tus datos siguen guardados. ' +
      'Restaura la versión anterior del fichero en GitHub (History) y vuelve a abrir la app.</p></div>';
    return;
  }
  const CLAVE = "mva-datos-v1";
  const DIAS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const DIAS_LARGO = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const N_SEMANAS = PLAN.bloque.semanas;
  const $app = document.getElementById("app");

  /* -------------------------------------------------------- Fechas */
  const pad = (n) => String(n).padStart(2, "0");
  const aISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const deISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
  const hoyISO = () => aISO(new Date());
  const diasEntre = (a, b) => Math.round((deISO(b) - deISO(a)) / 86400000);
  const diaSemana = (iso) => ((deISO(iso).getDay() + 6) % 7) + 1; // 1 = lunes
  const sumarDias = (iso, n) => { const d = deISO(iso); d.setDate(d.getDate() + n); return aISO(d); };
  const fechaCorta = (iso) => { const d = deISO(iso); return `${DIAS[diaSemana(iso)].toLowerCase()} ${d.getDate()} ${MESES[d.getMonth()]}`; };
  const fechaLarga = (iso) => { const d = deISO(iso); return `${DIAS_LARGO[diaSemana(iso)]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };

  function inicioPorDefecto() {
    const hoy = hoyISO();
    const dia = diaSemana(hoy);
    // Fin de semana: empezar el lunes siguiente. Entre semana: el lunes de esta semana.
    return dia >= 6 ? sumarDias(hoy, 8 - dia) : sumarDias(hoy, 1 - dia);
  }

  /* -------------------------------------------------------- Datos */
  const vacio = () => ({ v: 1, inicio: null, semanaManual: null, agenda: {}, registros: [], borradores: {} });
  let S = cargar();

  function cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return vacio();
      return Object.assign(vacio(), JSON.parse(crudo));
    } catch (e) {
      console.error("No se pudieron leer los datos", e);
      return vacio();
    }
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(S)); }
    catch (e) { aviso("No se pudo guardar. Exporta una copia desde Registro → Ajustes."); }
  }
  if (!S.inicio) { S.inicio = inicioPorDefecto(); guardar(); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* -------------------------------------------------------- Programa */
  function estadoPrograma() {
    const d = diasEntre(S.inicio, hoyISO());
    const auto = Math.floor(d / 7) + 1;
    const semana = S.semanaManual || Math.min(Math.max(auto, 1), N_SEMANAS);
    return {
      semana,
      antesDeEmpezar: !S.semanaManual && d < 0,
      terminado: !S.semanaManual && auto > N_SEMANAS,
      manual: !!S.semanaManual,
    };
  }

  const CATALOGO = {};
  PLAN.fuerza.forEach((s) => (CATALOGO[s.id] = { id: s.id, nombre: s.nombre, duracion: s.duracion, tipo: "fuerza", href: `#/fuerza/${s.id}` }));
  PLAN.micros.forEach((s) => (CATALOGO[s.id] = { id: s.id, nombre: `Micro ${s.nombre.toLowerCase()}`, duracion: s.duracion, tipo: "micro", href: `#/micros/${s.id}` }));
  CATALOGO.natacion = { id: "natacion", nombre: PLAN.natacion.nombre, duracion: PLAN.natacion.duracion, tipo: "natacion", href: "#/natacion" };
  CATALOGO.carrera = { id: "carrera", nombre: PLAN.carrera.nombre, duracion: PLAN.carrera.duracion, tipo: "carrera", href: "#/carrera" };

  const registrosSemana = (w) => S.registros.filter((r) => r.bloque === PLAN.bloque.id && r.semana === w);
  const hechoEnSemana = (w, id) => registrosSemana(w).filter((r) => r.sesion === id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
  const claveAgenda = (w) => `${PLAN.bloque.id}:${w}`;
  function diaPrevisto(w, item) {
    const a = S.agenda[claveAgenda(w)];
    return (a && a[item.sesion]) || item.dia;
  }

  function ultimaVez(exId, excluirId) {
    const lista = S.registros
      .filter((r) => r.id !== excluirId && r.ejercicios && r.ejercicios[exId] && r.ejercicios[exId].series.some((s) => s.kg || s.reps))
      .sort((a, b) => (a.fecha === b.fecha ? (a.creado < b.creado ? 1 : -1) : a.fecha < b.fecha ? 1 : -1));
    if (!lista.length) return null;
    return { fecha: lista[0].fecha, series: lista[0].ejercicios[exId].series };
  }
  const formatoSerie = (s) => (s.kg ? `${s.kg}${s.reps ? "×" + s.reps : " kg"}` : `${s.reps} reps`);

  /* -------------------------------------------------------- Utilidades UI */
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ICONO_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  let timerAviso;
  function aviso(texto) {
    const t = document.getElementById("toast");
    t.textContent = texto;
    t.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => (t.hidden = true), 2600);
  }
  const cabecera = (titulo, volver) =>
    `<header class="top">${volver ? `<a class="back" href="${volver}" aria-label="Volver">‹</a>` : ""}<h1>${esc(titulo)}</h1></header>`;

  function formFinal(id, textoBoton) {
    return `
      <section class="card form-fin" style="margin-top:14px">
        <label>Fecha en que lo hiciste
          <input class="input" type="date" id="fin-fecha" value="${hoyISO()}" max="${hoyISO()}">
        </label>
        <label>Notas (opcional)
          <textarea id="fin-notas" placeholder="Sensaciones, molestias, qué cambiarías…"></textarea>
        </label>
        <button class="btn" data-action="guardar-simple" data-id="${esc(id)}">${esc(textoBoton)}</button>
      </section>`;
  }

  /* ======================================================== VISTAS */

  /* ---------- Inicio */
  function vistaInicio() {
    const P = estadoPrograma();
    const w = P.semana;
    const info = PLAN.semanas.find((s) => s.n === w) || { titulo: "", texto: "" };
    const items = PLAN.semana_tipo.slice().sort((a, b) => diaPrevisto(w, a) - diaPrevisto(w, b));
    const prioritarias = PLAN.semana_tipo.filter((i) => i.prioritaria);
    const hechasP = prioritarias.filter((i) => hechoEnSemana(w, i.sesion)).length;
    const pct = prioritarias.length ? Math.round((hechasP / prioritarias.length) * 100) : 0;
    const micros = registrosSemana(w).filter((r) => r.tipo === "micro").length;

    const pista = Array.from({ length: N_SEMANAS }, (_, i) => `<i class="${i + 1 < w ? "hecha" : i + 1 === w ? "actual" : ""}"></i>`).join("");

    let avisoHtml = "";
    if (P.antesDeEmpezar) {
      avisoHtml = `<div class="aviso">El programa empieza el <b>${fechaLarga(S.inicio)}</b>. Si quieres empezar antes, cambia la fecha:
        <input class="input" type="date" data-action="cambiar-inicio" value="${S.inicio}"></div>`;
    } else if (P.terminado) {
      avisoHtml = `<div class="aviso"><b>Has completado las ${N_SEMANAS} semanas del bloque.</b> Revisa el registro con ChatGPT, actualiza plan.js y pon la fecha de inicio del nuevo bloque en Ajustes.</div>`;
    }

    const filas = items.map((it) => {
      const c = CATALOGO[it.sesion];
      if (!c) return "";
      const r = hechoEnSemana(w, it.sesion);
      const estado = r
        ? `<span class="estado hecha">Hecha el ${fechaCorta(r.fecha)}</span>`
        : it.prioritaria
        ? `<span class="estado pendiente">Pendiente</span>`
        : `<span class="estado opcional">Opcional</span>`;
      const opciones = [1, 2, 3, 4, 5, 6, 7].map((d) => `<option value="${d}" ${d === diaPrevisto(w, it) ? "selected" : ""}>${DIAS[d]}</option>`).join("");
      return `<div class="fila">
          <a class="nombre" href="${c.href}"><strong>${esc(c.nombre)}</strong><small>${esc(c.duracion)}</small></a>
          <div class="lado">${estado}
            <select class="dia" data-action="cambiar-dia" data-sesion="${esc(it.sesion)}" aria-label="Día previsto para ${esc(c.nombre)}">${opciones}</select>
          </div>
        </div>`;
    }).join("");

    const fuerzaA = PLAN.fuerza[0], fuerzaB = PLAN.fuerza[1];
    return `
      <section class="hero">
        <p class="marca">Mi vuelta a entrenar</p>
        <div class="semana"><b>${w}</b><span>semana de ${N_SEMANAS}${P.manual ? " (fijada a mano)" : ""}</span></div>
        <p class="enfoque">${esc(info.titulo)}</p>
        <p class="enfoque-texto">${esc(info.texto)}</p>
        <div class="pista" style="--n:${N_SEMANAS}">${pista}</div>
      </section>
      ${avisoHtml}

      <h2 class="seccion">Esta semana</h2>
      <section class="card">
        <div class="progreso-cabecera"><b>Prioritarias</b><span>${hechasP} de ${prioritarias.length}</span></div>
        <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
        <p class="sub" style="font-size:.86rem">${hechasP === prioritarias.length && prioritarias.length ? "Semana cumplida. Lo que hagas ahora es extra." : "Los días son orientativos: cámbialos o haz la sesión cuando puedas."}</p>
        <div style="margin-top:6px">${filas}</div>
        ${micros ? `<p class="sub" style="margin-top:8px;font-size:.88rem">Microentrenamientos esta semana: <b>${micros}</b></p>` : ""}
      </section>

      <h2 class="seccion">Empezar</h2>
      <div class="rejilla">
        ${fuerzaA ? `<a class="acceso principal" href="#/fuerza/${fuerzaA.id}"><strong>${esc(fuerzaA.nombre)}</strong><small>${esc(fuerzaA.duracion)}</small></a>` : ""}
        ${fuerzaB ? `<a class="acceso principal" href="#/fuerza/${fuerzaB.id}"><strong>${esc(fuerzaB.nombre)}</strong><small>${esc(fuerzaB.duracion)}</small></a>` : ""}
        <a class="acceso" href="#/natacion"><strong>Natación</strong><small>Semana ${w} en el agua</small></a>
        <a class="acceso" href="#/carrera"><strong>Carrera</strong><small>${(() => { const c = PLAN.carrera.semanas[w - 1]; return c ? `${c.trote}′ trote + ${c.andar}′ andar × ${c.repeticiones}` : ""; })()}</small></a>
      </div>

      <h2 class="seccion">Si tienes un hueco</h2>
      <div class="rejilla">
        ${PLAN.micros.map((m) => `<a class="acceso" href="#/micros/${m.id}"><strong>${esc(m.nombre)}</strong><small>${esc(m.duracion)}</small></a>`).join("")}
        <a class="acceso" href="#/micros"><strong>Ver todos</strong><small>Biblioteca completa</small></a>
      </div>`;
  }

  /* ---------- Fuerza: lista */
  function vistaFuerzaLista() {
    const w = estadoPrograma().semana;
    return cabecera("Fuerza") +
      `<p class="sub" style="margin:-6px 2px 14px">${esc(PLAN.intensidad)}</p>` +
      PLAN.fuerza.map((s) => {
        const r = hechoEnSemana(w, s.id);
        const borrador = S.borradores[s.id];
        return `<a class="card micro" href="#/fuerza/${s.id}">
          <div class="meta"><strong>${esc(s.nombre)}</strong><span class="duracion">${esc(s.duracion)}</span></div>
          <p>${r ? `Hecha esta semana el ${fechaCorta(r.fecha)}` : borrador ? "Tienes una sesión a medias" : `Semana ${w}`}</p>
          <ul>${s.ejercicios.map((e) => `<li><span>${esc(e.nombre)}</span><span>${e.series[w - 1] || e.series[e.series.length - 1]} × ${esc(e.reps)}</span></li>`).join("")}</ul>
        </a>`;
      }).join("");
  }

  /* ---------- Fuerza: sesión */
  function borradorPara(sesion, w) {
    let b = S.borradores[sesion.id];
    if (!b) { b = { inicio: hoyISO(), notas: "", ej: {} }; S.borradores[sesion.id] = b; }
    sesion.ejercicios.forEach((e) => {
      if (!b.ej[e.id]) {
        const n = e.series[w - 1] || e.series[e.series.length - 1] || 2;
        b.ej[e.id] = { nota: "", series: Array.from({ length: n }, () => ({ kg: "", reps: "", ok: false })) };
      }
    });
    return b;
  }

  function htmlEjercicio(sesionId, e, w, b) {
    const d = b.ej[e.id];
    const ult = ultimaVez(e.id);
    const completo = d.series.length && d.series.every((s) => s.ok);
    const series = d.series.map((s, i) => {
      const ph = ult && ult.series[i] && ult.series[i].kg ? ult.series[i].kg : "";
      return `<div class="serie">
        <span class="num">${i + 1}</span>
        <label class="campo"><input inputmode="decimal" enterkeyhint="next" data-campo="kg" data-ex="${e.id}" data-i="${i}" value="${esc(s.kg)}" placeholder="${esc(ph)}" aria-label="Peso serie ${i + 1}"><em>kg</em></label>
        <label class="campo"><input inputmode="numeric" enterkeyhint="next" data-campo="reps" data-ex="${e.id}" data-i="${i}" value="${esc(s.reps)}" placeholder="${esc(e.reps.split(" ")[0])}" aria-label="Repeticiones serie ${i + 1}"><em>reps</em></label>
        <button class="check" data-action="serie-ok" data-ex="${e.id}" data-i="${i}" aria-pressed="${s.ok}" aria-label="Serie ${i + 1} hecha">${ICONO_CHECK}</button>
      </div>`;
    }).join("");
    return `<article class="card ejercicio ${completo ? "completo" : ""}" id="ej-${e.id}">
      <div class="cab"><strong>${esc(e.nombre)}</strong><span class="pauta">${e.series[w - 1] || e.series[e.series.length - 1]} × ${esc(e.reps)}</span></div>
      ${ult ? `<p class="ultima">Última vez (${fechaCorta(ult.fecha)}): ${ult.series.filter((s) => s.kg || s.reps).map(formatoSerie).join(", ")}</p>` : ""}
      ${e.nota ? `<p class="nota-plan">${esc(e.nota)}</p>` : ""}
      <div class="series">${series}</div>
      <div class="acciones-ej">
        <span>
          <button class="txt-btn" data-action="mas-serie" data-ex="${e.id}">+ Serie</button>
          ${d.series.length > 1 ? `<button class="txt-btn" data-action="menos-serie" data-ex="${e.id}" style="margin-left:10px">− Serie</button>` : ""}
        </span>
        <button class="txt-btn" data-action="ver-nota" data-ex="${e.id}">${d.nota ? "Nota ✓" : "Añadir nota"}</button>
      </div>
      <textarea class="nota-ej" data-campo="nota" data-ex="${e.id}" placeholder="Observaciones del ejercicio" ${d.nota ? "" : "hidden"}>${esc(d.nota)}</textarea>
    </article>`;
  }

  function vistaFuerza(id) {
    const sesion = PLAN.fuerza.find((s) => s.id === id);
    if (!sesion) return vistaNoEncontrada();
    const w = estadoPrograma().semana;
    const b = borradorPara(sesion, w);
    guardar();
    const r = hechoEnSemana(w, id);
    return cabecera(sesion.nombre, "#/fuerza") +
      `<p class="sub" style="margin:-6px 2px 14px">Semana ${w}. ${esc(PLAN.intensidad)}</p>` +
      (r ? `<div class="hecho-banner">Ya la registraste esta semana el ${fechaCorta(r.fecha)}. Si la repites, se guardará como otra sesión.</div>` : "") +
      sesion.ejercicios.map((e) => htmlEjercicio(id, e, w, b)).join("") +
      `<section class="card form-fin" style="margin-top:14px">
        <label>Fecha en que la hiciste
          <input class="input" type="date" id="fin-fecha" value="${hoyISO()}" max="${hoyISO()}">
        </label>
        <label>Notas de la sesión
          <textarea data-campo="notas-sesion" placeholder="Energía, sueño, molestias…">${esc(b.notas)}</textarea>
        </label>
        <button class="btn" data-action="guardar-fuerza" data-id="${id}">Guardar sesión</button>
        <button class="txt-btn peligro" data-action="descartar" data-id="${id}">Vaciar lo anotado</button>
      </section>`;
  }

  /* ---------- Micros */
  function vistaMicrosLista() {
    return cabecera("Microentrenamientos") +
      `<p class="sub" style="margin:-6px 2px 14px">Para huecos de 20–30 minutos. Son extra: no cuentan como sesiones obligatorias.</p>` +
      PLAN.micros.map((m) => {
        const veces = S.registros.filter((r) => r.sesion === m.id).length;
        return `<a class="card micro" href="#/micros/${m.id}">
          <div class="meta"><strong>${esc(m.nombre)}</strong><span class="duracion">${esc(m.duracion)}</span></div>
          <p>${esc(m.objetivo)}</p>
          <ul>${m.ejercicios.map((e) => `<li><span>${esc(e.nombre)}</span><span>${esc(e.pauta)}</span></li>`).join("")}</ul>
          ${veces ? `<p class="veces">Hecho ${veces} ${veces === 1 ? "vez" : "veces"}</p>` : ""}
        </a>`;
      }).join("");
  }

  function vistaMicro(id) {
    const m = PLAN.micros.find((x) => x.id === id);
    if (!m) return vistaNoEncontrada();
    return cabecera(m.nombre, "#/micros") +
      `<p class="sub" style="margin:-6px 2px 14px">${esc(m.duracion)}. ${esc(m.objetivo)}.</p>
      <section class="card"><ul class="lista-check">
        ${m.ejercicios.map((e, i) => `<li><span>${esc(e.nombre)}</span><span class="pauta">${esc(e.pauta)}</span>
          <button class="check" data-action="toggle-local" aria-pressed="false" aria-label="${esc(e.nombre)} hecho">${ICONO_CHECK}</button></li>`).join("")}
      </ul></section>` +
      formFinal(m.id, "Marcar como hecho");
  }

  /* ---------- Cardio */
  function vistaCardio() {
    const w = estadoPrograma().semana;
    const n = PLAN.natacion.semanas[w - 1] || [];
    const c = PLAN.carrera.semanas[w - 1];
    const rn = hechoEnSemana(w, "natacion"), rc = hechoEnSemana(w, "carrera");
    return cabecera("Natación y carrera") +
      `<a class="card micro" href="#/natacion">
        <div class="meta"><strong>Natación</strong><span class="duracion">${esc(PLAN.natacion.duracion)}</span></div>
        <p>${rn ? `Hecha esta semana el ${fechaCorta(rn.fecha)}` : `Semana ${w}: ${esc(n.slice(1, 3).join(", "))}`}</p>
      </a>
      <a class="card micro" href="#/carrera">
        <div class="meta"><strong>Carrera suave</strong><span class="duracion">Opcional</span></div>
        <p>${rc ? `Hecha esta semana el ${fechaCorta(rc.fecha)}` : c ? `Semana ${w}: ${c.trote} min trotando + ${c.andar} min andando × ${c.repeticiones}` : ""}</p>
      </a>`;
  }

  function tabsSemanas(base, sel, w) {
    return `<div class="semanas-tabs" role="tablist">${Array.from({ length: N_SEMANAS }, (_, i) => i + 1).map((n) =>
      `<button role="tab" aria-selected="${n === sel}" data-action="ir" data-href="${base}/${n}">S${n}${n === w ? "<small>esta</small>" : "<small>&nbsp;</small>"}</button>`).join("")}</div>`;
  }

  function vistaNatacion(semSel) {
    const w = estadoPrograma().semana;
    const sel = Math.min(Math.max(semSel || w, 1), N_SEMANAS);
    const pasos = PLAN.natacion.semanas[sel - 1] || [];
    const r = hechoEnSemana(w, "natacion");
    return cabecera("Natación", "#/cardio") +
      `<p class="sub" style="margin:-6px 2px 14px">${esc(PLAN.natacion.duracion)}. ${esc(PLAN.natacion.enfoque)}</p>` +
      tabsSemanas("#/natacion", sel, w) +
      (r && sel === w ? `<div class="hecho-banner">Hecha esta semana el ${fechaCorta(r.fecha)}.</div>` : "") +
      `<section class="card"><ol class="pasos">${pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></section>` +
      formFinal("natacion", "Marcar natación como hecha");
  }

  function vistaCarrera(semSel) {
    const w = estadoPrograma().semana;
    const sel = Math.min(Math.max(semSel || w, 1), N_SEMANAS);
    const c = PLAN.carrera.semanas[sel - 1];
    const r = hechoEnSemana(w, "carrera");
    return cabecera("Carrera suave", "#/cardio") +
      `<p class="sub" style="margin:-6px 2px 14px">Opcional, ${esc(PLAN.carrera.duracion)}. ${esc(PLAN.carrera.enfoque)}</p>` +
      tabsSemanas("#/carrera", sel, w) +
      (r && sel === w ? `<div class="hecho-banner">Hecha esta semana el ${fechaCorta(r.fecha)}.</div>` : "") +
      (c ? `<section class="card">
        <div class="intervalo">
          <div><b>${c.trote}′</b><small>trotando</small></div>
          <div><b>${c.andar}′</b><small>andando</small></div>
          <div><b>×${c.repeticiones}</b><small>bloques</small></div>
        </div>
        <p class="sub">Total aproximado: ${(c.trote + c.andar) * c.repeticiones} minutos. Si no puedes hablar mientras trotas, baja el ritmo.</p>
      </section>` : "") +
      formFinal("carrera", "Marcar carrera como hecha");
  }

  /* ---------- Registro */
  function vistaRegistro() {
    const w = estadoPrograma().semana;
    const prioritarias = PLAN.semana_tipo.filter((i) => i.prioritaria);
    const resumen = Array.from({ length: N_SEMANAS }, (_, i) => i + 1).map((n) => {
      const regs = registrosSemana(n);
      const puntos = prioritarias.map((p) => `<i class="${regs.some((r) => r.sesion === p.sesion) ? "on" : ""}"></i>`).join("");
      const extra = [];
      const nc = regs.filter((r) => r.tipo === "carrera").length;
      const nm = regs.filter((r) => r.tipo === "micro").length;
      if (nc) extra.push(`${nc} carrera`);
      if (nm) extra.push(`${nm} micro`);
      return `<div class="resumen-semana ${n === w ? "actual" : ""}"><b>Semana ${n}</b><div class="puntos" aria-label="${regs.filter((r) => prioritarias.some((p) => p.sesion === r.sesion)).length} prioritarias">${puntos}</div><small>${extra.join(", ") || (n > w ? "" : "—")}</small></div>`;
    }).join("");

    const hist = S.registros.slice().sort((a, b) => (a.fecha === b.fecha ? (a.creado < b.creado ? 1 : -1) : a.fecha < b.fecha ? 1 : -1));
    const lista = hist.length
      ? hist.map((r) => {
          const d = deISO(r.fecha);
          return `<a href="#/registro/${r.id}">
            <span class="fecha-chip"><b>${d.getDate()}</b><small>${MESES[d.getMonth()]}</small></span>
            <span><strong>${esc(r.nombre)}</strong><span>${r.notas ? esc(r.notas) : `Semana ${r.semana}${r.bloque !== PLAN.bloque.id ? " (bloque anterior)" : ""}`}</span></span>
          </a>`;
        }).join("")
      : `<p class="vacio">Aún no hay sesiones. Cuando guardes una, aparecerá aquí con su fecha y tus notas.</p>`;

    return cabecera("Registro") +
      `<div class="resumen-semanas">${resumen}</div>
       <p class="sub" style="margin:8px 2px 0;font-size:.84rem">Cada punto es una sesión prioritaria (fuerza A, natación, fuerza B).</p>
       <h2 class="seccion">Historial</h2>
       <section class="card historial">${lista}</section>
       <div style="margin-top:18px"><a class="btn secundario" href="#/ajustes">Ajustes y copia de seguridad</a></div>`;
  }

  function vistaDetalle(id) {
    const r = S.registros.find((x) => x.id === id);
    if (!r) return vistaNoEncontrada();
    const ej = r.ejercicios
      ? Object.entries(r.ejercicios).map(([, e]) => `
        <div style="margin-top:14px"><b>${esc(e.nombre)}</b>
          <table><tbody>${e.series.map((s, i) => `<tr><td>Serie ${i + 1}</td><td>${s.kg || s.reps ? esc(formatoSerie(s)) : s.ok ? "hecha" : "—"}</td></tr>`).join("")}</tbody></table>
          ${e.nota ? `<p class="sub" style="margin-top:6px">${esc(e.nota)}</p>` : ""}
        </div>`).join("")
      : "";
    return cabecera(r.nombre, "#/registro") +
      `<section class="card detalle">
        <dl>
          <dt>Fecha</dt><dd><input class="input" type="date" data-action="cambiar-fecha-registro" data-id="${r.id}" value="${r.fecha}" max="${hoyISO()}"></dd>
          <dt>Semana</dt><dd>${r.semana} de ${N_SEMANAS}${r.variante && r.variante !== r.semana ? ` (contenido de la semana ${r.variante})` : ""}</dd>
          ${r.notas ? `<dt>Notas</dt><dd>${esc(r.notas)}</dd>` : ""}
        </dl>
        ${ej}
      </section>
      <div style="margin-top:16px"><button class="btn peligro" data-action="borrar-registro" data-id="${r.id}">Borrar esta sesión</button></div>`;
  }

  /* ---------- Ajustes */
  function vistaAjustes() {
    const P = estadoPrograma();
    const botones = [["auto", "Auto"], ...Array.from({ length: N_SEMANAS }, (_, i) => [String(i + 1), String(i + 1)])]
      .map(([v, t]) => `<button data-action="semana-manual" data-v="${v}" aria-pressed="${v === "auto" ? !S.semanaManual : S.semanaManual === Number(v)}">${t}</button>`).join("");
    return cabecera("Ajustes", "#/registro") +
      `<section class="card">
        <div class="ajuste"><b>Inicio del bloque</b>
          <p>La semana avanza sola cada 7 días desde esta fecha.</p>
          <input class="input" type="date" data-action="cambiar-inicio" value="${S.inicio}">
        </div>
        <div class="ajuste"><b>Semana actual</b>
          <p>Si una semana se complica y quieres repetirla, fíjala a mano. Ahora estás en la semana ${P.semana}.</p>
          <div class="segmentado" style="grid-template-columns:repeat(${N_SEMANAS + 1},1fr)">${botones}</div>
        </div>
      </section>

      <h2 class="seccion">Copia de seguridad</h2>
      <section class="card">
        <div class="ajuste">
          <p>Tus datos solo están en este iPhone. Exporta una copia de vez en cuando (por ejemplo, a Archivos o iCloud Drive) para no perder el historial.</p>
          <button class="btn" data-action="exportar">Exportar datos</button>
          <button class="btn secundario" data-action="importar">Importar copia</button>
          <input type="file" id="fichero-importar" accept="application/json,.json" hidden>
        </div>
      </section>

      <h2 class="seccion">Zona delicada</h2>
      <section class="card">
        <div class="ajuste"><p>Borra todas las sesiones, borradores y ajustes de este dispositivo.</p>
          <button class="btn peligro" data-action="borrar-todo">Borrar todos los datos</button>
        </div>
      </section>
      <p class="sub" style="text-align:center;margin-top:18px;font-size:.8rem">Plan: ${esc(PLAN.bloque.nombre)} (${esc(PLAN.bloque.id)}). ${S.registros.length} sesiones guardadas.</p>`;
  }

  function vistaNoEncontrada() {
    return cabecera("No encontrado", "#/inicio") + `<p class="vacio">Esta sesión ya no existe en el plan actual.</p>`;
  }

  /* ======================================================== RUTAS */
  function ruta() {
    const partes = (location.hash || "#/inicio").replace(/^#\/?/, "").split("/");
    const [a, b] = partes;
    let html, tab = a;
    switch (a) {
      case "fuerza": html = b ? vistaFuerza(b) : vistaFuerzaLista(); break;
      case "micros": html = b ? vistaMicro(b) : vistaMicrosLista(); break;
      case "cardio": html = vistaCardio(); break;
      case "natacion": html = vistaNatacion(Number(b)); tab = "cardio"; break;
      case "carrera": html = vistaCarrera(Number(b)); tab = "cardio"; break;
      case "registro": html = b ? vistaDetalle(b) : vistaRegistro(); break;
      case "ajustes": html = vistaAjustes(); tab = "registro"; break;
      default: html = vistaInicio(); tab = "inicio";
    }
    $app.innerHTML = html;
    document.querySelectorAll(".tabbar a").forEach((el) => {
      el.classList.toggle("activa", el.dataset.tab === tab);
      if (el.dataset.tab === tab) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
    });
  }
  function render(mantenerScroll) {
    const y = window.scrollY;
    ruta();
    window.scrollTo(0, mantenerScroll ? y : 0);
  }
  window.addEventListener("hashchange", () => render(false));

  /* ======================================================== ACCIONES */
  function guardarRegistro(sesionId, extra) {
    const w = estadoPrograma().semana;
    const c = CATALOGO[sesionId];
    const fecha = (document.getElementById("fin-fecha") || {}).value || hoyISO();
    const notasEl = document.getElementById("fin-notas");
    const reg = Object.assign({
      id: uid(), bloque: PLAN.bloque.id, semana: w, sesion: sesionId, tipo: c.tipo, nombre: c.nombre,
      fecha: fecha > hoyISO() ? hoyISO() : fecha, notas: notasEl ? notasEl.value.trim() : "", creado: new Date().toISOString(),
    }, extra || {});
    S.registros.push(reg);
    guardar();
    return reg;
  }

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-action]");
    if (!el || el.tagName === "SELECT" || el.tagName === "INPUT") return;
    const a = el.dataset.action;
    const ex = el.dataset.ex, i = Number(el.dataset.i);
    const sesionId = (location.hash.split("/")[2] || "");
    const b = S.borradores[sesionId];

    switch (a) {
      case "serie-ok": {
        const s = b.ej[ex].series[i];
        s.ok = !s.ok;
        el.setAttribute("aria-pressed", s.ok);
        const card = document.getElementById("ej-" + ex);
        card.classList.toggle("completo", b.ej[ex].series.every((x) => x.ok));
        guardar();
        if (s.ok && navigator.vibrate) navigator.vibrate(15);
        break;
      }
      case "mas-serie": {
        const ult = b.ej[ex].series[b.ej[ex].series.length - 1];
        b.ej[ex].series.push({ kg: ult ? ult.kg : "", reps: "", ok: false });
        guardar(); render(true); break;
      }
      case "menos-serie": b.ej[ex].series.pop(); guardar(); render(true); break;
      case "ver-nota": {
        const t = document.querySelector(`textarea[data-ex="${ex}"]`);
        t.hidden = !t.hidden; if (!t.hidden) t.focus(); break;
      }
      case "toggle-local": el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") !== "true"); break;
      case "ir": location.hash = el.dataset.href; break;

      case "guardar-fuerza": {
        const sesion = PLAN.fuerza.find((s) => s.id === el.dataset.id);
        const bor = S.borradores[sesion.id];
        const ejercicios = {};
        sesion.ejercicios.forEach((e) => {
          const d = bor.ej[e.id];
          if (!d) return;
          const series = d.series.filter((s) => s.kg || s.reps || s.ok);
          if (series.length || d.nota) ejercicios[e.id] = { nombre: e.nombre, series, nota: d.nota };
        });
        const reg = guardarRegistro(sesion.id, { ejercicios });
        reg.notas = (bor.notas || "").trim();
        delete S.borradores[sesion.id];
        guardar();
        aviso(`${sesion.nombre} guardada`);
        location.hash = "#/inicio";
        break;
      }
      case "guardar-simple": {
        const id = el.dataset.id;
        const sel = Number(location.hash.split("/")[2]) || undefined;
        guardarRegistro(id, sel ? { variante: sel } : {});
        aviso(`${CATALOGO[id].nombre} guardada`);
        location.hash = "#/inicio";
        break;
      }
      case "descartar":
        if (confirm("¿Vaciar todo lo anotado en esta sesión?")) { delete S.borradores[el.dataset.id]; guardar(); render(false); }
        break;
      case "borrar-registro":
        if (confirm("¿Borrar esta sesión del historial?")) {
          S.registros = S.registros.filter((r) => r.id !== el.dataset.id);
          guardar(); aviso("Sesión borrada"); location.hash = "#/registro";
        }
        break;
      case "semana-manual":
        S.semanaManual = el.dataset.v === "auto" ? null : Number(el.dataset.v);
        guardar(); render(true); aviso(S.semanaManual ? `Semana ${S.semanaManual} fijada` : "Semana automática");
        break;
      case "exportar": exportar(); break;
      case "importar": document.getElementById("fichero-importar").click(); break;
      case "borrar-todo":
        if (confirm("¿Borrar TODOS los datos? Exporta antes una copia si quieres conservarlos.")) {
          S = vacio(); S.inicio = inicioPorDefecto(); guardar(); aviso("Datos borrados"); location.hash = "#/inicio";
        }
        break;
    }
  });

  document.addEventListener("input", (ev) => {
    const el = ev.target;
    const campo = el.dataset.campo;
    if (!campo) return;
    const sesionId = location.hash.split("/")[2];
    const b = S.borradores[sesionId];
    if (!b) return;
    if (campo === "notas-sesion") b.notas = el.value;
    else if (campo === "nota") b.ej[el.dataset.ex].nota = el.value;
    else b.ej[el.dataset.ex].series[Number(el.dataset.i)][campo] = el.value.replace(",", ".").trim() === "" ? "" : el.value.trim();
    guardar();
  });

  document.addEventListener("change", (ev) => {
    const el = ev.target;
    const a = el.dataset.action;
    if (a === "cambiar-dia") {
      const k = claveAgenda(estadoPrograma().semana);
      S.agenda[k] = S.agenda[k] || {};
      S.agenda[k][el.dataset.sesion] = Number(el.value);
      guardar(); render(true);
    } else if (a === "cambiar-inicio" && el.value) {
      S.inicio = el.value; guardar(); render(true); aviso("Fecha de inicio actualizada");
    } else if (a === "cambiar-fecha-registro" && el.value) {
      const r = S.registros.find((x) => x.id === el.dataset.id);
      if (r) { r.fecha = el.value; guardar(); aviso("Fecha cambiada"); }
    } else if (el.id === "fichero-importar" && el.files[0]) {
      importar(el.files[0]); el.value = "";
    }
  });

  /* ---------- Exportar / importar */
  async function exportar() {
    const datos = JSON.stringify({ app: "mi-vuelta-a-entrenar", exportado: new Date().toISOString(), datos: S }, null, 2);
    const nombre = `mi-vuelta-a-entrenar-${hoyISO()}.json`;
    const fichero = new File([datos], nombre, { type: "application/json" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [fichero] })) {
        await navigator.share({ files: [fichero], title: "Copia de Mi vuelta a entrenar" });
        return;
      }
    } catch (e) { if (e.name === "AbortError") return; }
    const url = URL.createObjectURL(fichero);
    const a = document.createElement("a");
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    aviso("Copia exportada");
  }

  function importar(file) {
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const obj = JSON.parse(lector.result);
        const datos = obj.datos || obj;
        if (!Array.isArray(datos.registros)) throw new Error("formato");
        if (!confirm(`La copia tiene ${datos.registros.length} sesiones. ¿Reemplazar los datos actuales?`)) return;
        S = Object.assign(vacio(), datos);
        guardar(); aviso("Copia importada"); location.hash = "#/registro"; render(false);
      } catch (e) {
        aviso("El fichero no es una copia válida de la app");
      }
    };
    lector.readAsText(file);
  }

  /* ---------- Arranque */
  render(false);

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW", e)));
  }

  // Para depurar desde la consola
  window.__mva = { get estado() { return S; }, estadoPrograma };
})();
