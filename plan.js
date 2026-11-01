/* =====================================================================
   PLAN DE ENTRENAMIENTO — «Mi vuelta a entrenar»
   ---------------------------------------------------------------------
   Este es el ÚNICO fichero que hay que tocar para cambiar la planificación.
   Puedes pegarlo entero en ChatGPT y pedirle cambios con esta instrucción:

     «Modifica este plan.js manteniendo exactamente la misma estructura.
      No cambies los "id" de los ejercicios que se mantengan (sirven para
      enlazar el historial de pesos). Usa ids nuevos solo para ejercicios
      nuevos. Devuélveme el fichero completo.»

   Reglas:
   - "id": texto corto sin espacios ni tildes. No reutilizar ids para
     ejercicios distintos.
   - "series": array de 4 valores, uno por semana (semana 1, 2, 3, 4).
     Indica cuántas filas de registro aparecen esa semana.
   - "reps": texto libre que se muestra tal cual.
   - Para un bloque nuevo: cambia "bloque", ajusta las semanas y, en la app,
     pon la nueva fecha de inicio en Registro → Ajustes.
   ===================================================================== */

window.PLAN = {
  bloque: {
    id: "bloque-1",
    nombre: "Primer mes",
    semanas: 4,
  },

  /* Enfoque de cada semana (se muestra en Inicio) */
  semanas: [
    { n: 1, titulo: "Adaptación", texto: "Dos series por ejercicio y cargas cómodas. Volver a sentir los movimientos." },
    { n: 2, titulo: "Volumen", texto: "Si te recuperas bien, sube al volumen previsto (3 series donde toque)." },
    { n: 3, titulo: "Progresión", texto: "Intenta sumar una repetición o algo de carga cuando la técnica lo permita." },
    { n: 4, titulo: "Consolidación", texto: "Mantén cargas, cuida la técnica y valora sensaciones para el siguiente bloque." },
  ],

  intensidad: "Deja 2–3 repeticiones en recámara (RIR 2–3) en la mayoría de series. Nada de entrenar al fallo.",

  /* Objetivo semanal. "prioritaria: true" cuenta para la barra de progreso. */
  semana_tipo: [
    { sesion: "fuerza-a", dia: 1, prioritaria: true },   // 1 = lunes … 7 = domingo
    { sesion: "natacion", dia: 3, prioritaria: true },
    { sesion: "carrera",  dia: 5, prioritaria: false },
    { sesion: "fuerza-b", dia: 6, prioritaria: true },
  ],

  /* ------------------------------------------------------------- FUERZA */
  fuerza: [
    {
      id: "fuerza-a",
      nombre: "Fuerza A",
      duracion: "55–60 min",
      ejercicios: [
        { id: "sentadilla-trasera", nombre: "Sentadilla trasera", series: [2, 3, 3, 3], reps: "6–8" },
        { id: "press-banca", nombre: "Press banca", series: [2, 3, 3, 3], reps: "6–10" },
        { id: "remo-mancuerna-keiser", nombre: "Remo con mancuerna o Keiser", series: [2, 3, 3, 3], reps: "8–12" },
        { id: "peso-muerto-rumano", nombre: "Peso muerto rumano", series: [2, 2, 2, 2], reps: "8–10" },
        { id: "elevaciones-laterales", nombre: "Elevaciones laterales", series: [2, 2, 2, 2], reps: "12–15" },
      ],
    },
    {
      id: "fuerza-b",
      nombre: "Fuerza B",
      duracion: "55–60 min",
      ejercicios: [
        { id: "press-militar", nombre: "Press militar", series: [2, 3, 3, 3], reps: "6–10" },
        { id: "dominadas-jalon", nombre: "Dominadas o jalón", series: [2, 3, 3, 3], reps: "6–10" },
        { id: "hip-thrust", nombre: "Hip thrust o puente de glúteos", series: [3, 3, 3, 3], reps: "8–12", nota: "Se mantiene aquí para no repetir una segunda bisagra pesada (el peso muerto rumano ya está en A)." },
        { id: "sentadilla-bulgara", nombre: "Sentadilla búlgara", series: [2, 2, 2, 2], reps: "8–10 por pierna" },
        { id: "press-inclinado-mancuernas", nombre: "Press inclinado con mancuernas", series: [2, 2, 2, 2], reps: "8–12" },
        { id: "curl-biceps", nombre: "Curl de bíceps", series: [2, 2, 2, 2], reps: "10–15" },
        { id: "extension-triceps", nombre: "Extensión de tríceps", series: [2, 2, 2, 2], reps: "10–15" },
      ],
    },
  ],

  /* ---------------------------------------------------- MICROENTRENAMIENTOS */
  micros: [
    {
      id: "micro-superior",
      nombre: "Tren superior",
      duracion: "25–30 min",
      objetivo: "Volumen extra de empuje, tirón y hombro",
      ejercicios: [
        { id: "press-inclinado-mancuernas", nombre: "Press inclinado con mancuernas", pauta: "3 × 10" },
        { id: "remo-keiser", nombre: "Remo Keiser", pauta: "3 × 12" },
        { id: "elevaciones-laterales", nombre: "Elevaciones laterales", pauta: "3 × 15" },
        { id: "curl-biceps", nombre: "Curl de bíceps", pauta: "2 × 12" },
      ],
    },
    {
      id: "micro-inferior",
      nombre: "Tren inferior",
      duracion: "25–30 min",
      objetivo: "Piernas y cadena posterior sin cargas máximas",
      ejercicios: [
        { id: "sentadilla-goblet", nombre: "Sentadilla goblet", pauta: "3 × 12" },
        { id: "pmr-mancuernas", nombre: "Peso muerto rumano con mancuernas", pauta: "3 × 10" },
        { id: "zancadas", nombre: "Zancadas", pauta: "2 × 10 por pierna" },
        { id: "gemelos", nombre: "Gemelos", pauta: "2 × 15" },
      ],
    },
    {
      id: "micro-atletico",
      nombre: "Atlético",
      duracion: "20–25 min",
      objetivo: "Agilidad, coordinación y core",
      ejercicios: [
        { id: "movilidad-dinamica", nombre: "Movilidad dinámica", pauta: "4 min" },
        { id: "saltos-suaves", nombre: "Saltos suaves", pauta: "3 × 5" },
        { id: "desplazamientos-laterales", nombre: "Desplazamientos laterales", pauta: "3 × 20 s" },
        { id: "farmer-carry", nombre: "Farmer carry", pauta: "3 × 30 m" },
        { id: "core", nombre: "Trabajo de core", pauta: "3 series" },
      ],
    },
  ],

  /* ------------------------------------------------------------ NATACIÓN */
  natacion: {
    id: "natacion",
    nombre: "Natación",
    duracion: "30–40 min",
    enfoque: "Técnica, respiración y confianza en el agua. No es un entrenamiento de velocidad.",
    semanas: [
      ["5 min de adaptación", "4 × 25 m suaves", "4 × 25 m respiración y coordinación", "5 min suaves", "Descansos de 30–45 s cuando hagan falta"],
      ["5 min de calentamiento", "6 × 25 m suaves", "4 × 25 m respiración lateral", "4 × 25 m suaves"],
      ["5 min de calentamiento", "4 × 50 m suaves", "4 × 25 m de técnica", "5 min suaves"],
      ["5 min de calentamiento", "Hasta 6 × 50 m suaves si la técnica se mantiene", "4 × 25 m suaves"],
    ],
  },

  /* ------------------------------------------------------------- CARRERA */
  carrera: {
    id: "carrera",
    nombre: "Carrera suave",
    duracion: "20–30 min",
    opcional: true,
    enfoque: "Ritmo en el que puedas hablar. Cinta o exterior. Sin objetivos de distancia ni ritmo.",
    semanas: [
      { trote: 1, andar: 2, repeticiones: 8 },
      { trote: 2, andar: 2, repeticiones: 7 },
      { trote: 3, andar: 1, repeticiones: 7 },
      { trote: 5, andar: 1, repeticiones: 4 },
    ],
  },
};
