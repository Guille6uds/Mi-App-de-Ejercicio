/* =====================================================================
   PLAN DE ENTRENAMIENTO — «Mi vuelta a entrenar»
   ---------------------------------------------------------------------
   Versión acordada con ChatGPT (bloque 1, con notas técnicas e incrementos).
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
   - "reps": texto (p. ej. "6–8"). La app usa el número mayor para
     sugerir subir carga cuando lo completas en todas las series.
   - "principal: true": ejercicio básico (descanso largo).
   - "paso": incremento de kilos de los botones − / + (por defecto 2,5).
   - "barra: true": se hace con barra olímpica (calentamiento desde la barra sola).
   - "implemento: \"mancuernas\"": se registra el peso de UNA mancuerna.
   - "carga: \"corporal\"": peso corporal con lastre (+kg) o asistencia (−kg).
     Menos asistencia o más lastre cuenta como progreso.
   - En "semanas", "progresion: false" desactiva las sugerencias de subir carga.
   - "alternativas": opciones si una máquina está ocupada. Cada una tiene su
     propio "id" y su propio historial.
   Desde la versión 2.1 también puedes cambiar el plan desde la app:
   Progreso → Ajustes → Plan de entrenamiento.
   - Para un bloque nuevo: cambia "bloque", ajusta las semanas y, en la app,
     pon la nueva fecha de inicio en Registro → Ajustes.
   ===================================================================== */

window.PLAN = {
  "bloque": {
    "id": "bloque-1",
    "nombre": "Primer mes",
    "semanas": 4
  },
  "semanas": [
    {
      "n": 1,
      "titulo": "Adaptación",
      "texto": "Dos series por ejercicio cuando corresponda y cargas cómodas. Volver a sentir los movimientos, priorizando técnica y dejando 2–3 repeticiones en recámara."
    },
    {
      "n": 2,
      "titulo": "Volumen",
      "texto": "Subir a tres series en los ejercicios previstos. Mantener una ejecución controlada y valorar la recuperación antes de progresar."
    },
    {
      "n": 3,
      "titulo": "Progresión",
      "texto": "Intentar sumar repeticiones. Aumentar carga únicamente cuando se alcance el máximo del rango en todas las series con al menos 2 RIR en la última."
    },
    {
      "n": 4,
      "titulo": "Consolidación",
      "texto": "Mantener el trabajo previsto y consolidar cargas, técnica y sensaciones. No forzar incrementos de peso.",
      "progresion": false
    }
  ],
  "intensidad": "Deja 2–3 repeticiones en recámara (RIR 2–3) en la mayoría de series. No entrenar al fallo. Para recomendar una subida de carga, completar el máximo del rango en todas las series con técnica correcta y al menos 2 RIR en la última serie.",
  "huecos": [
    {
      "dia": 2,
      "desde": "13:15",
      "hasta": "13:45"
    },
    {
      "dia": 4,
      "desde": "13:15",
      "hasta": "13:45"
    }
  ],
  "descanso": {
    "principal": [
      120,
      180
    ],
    "accesorio": [
      60,
      90
    ]
  },
  "semana_tipo": [
    {
      "sesion": "fuerza-a",
      "dia": 1,
      "hora": "19:00",
      "prioritaria": true
    },
    {
      "sesion": "natacion",
      "dia": 3,
      "hora": "16:30",
      "prioritaria": true
    },
    {
      "sesion": "carrera",
      "dia": 5,
      "hora": "18:00",
      "prioritaria": false
    },
    {
      "sesion": "fuerza-b",
      "dia": 6,
      "hora": "12:30",
      "prioritaria": true
    }
  ],
  "fuerza": [
    {
      "id": "fuerza-a",
      "nombre": "Fuerza A",
      "duracion": "55–60 min",
      "ejercicios": [
        {
          "id": "sentadilla-trasera",
          "nombre": "Sentadilla trasera",
          "series": [
            2,
            3,
            3,
            3
          ],
          "reps": "6–8",
          "principal": true,
          "barra": true,
          "paso": 2.5,
          "nota": "Mantén el apoyo del pie completo, estabiliza el tronco antes de bajar y acompaña la trayectoria de las rodillas con la dirección de los pies.",
          "alternativas": [
            {
              "id": "sentadilla-frontal",
              "nombre": "Sentadilla frontal",
              "paso": 2.5
            },
            {
              "id": "sentadilla-goblet",
              "nombre": "Sentadilla goblet",
              "paso": 2
            }
          ]
        },
        {
          "id": "press-banca",
          "nombre": "Press banca",
          "series": [
            2,
            3,
            3,
            3
          ],
          "reps": "6–10",
          "principal": true,
          "barra": true,
          "paso": 2.5,
          "nota": "Mantén las escápulas estables, los pies apoyados y controla la bajada. Evita perder la posición del hombro.",
          "alternativas": [
            {
              "id": "press-banca-mancuernas",
              "nombre": "Press banca con mancuernas",
              "paso": 2,
              "implemento": "mancuernas"
            },
            {
              "id": "press-pecho-keiser",
              "nombre": "Press de pecho Keiser",
              "paso": 1
            }
          ]
        },
        {
          "id": "remo-mancuerna-keiser",
          "nombre": "Remo con mancuerna o Keiser",
          "series": [
            2,
            3,
            3,
            3
          ],
          "reps": "8–12",
          "principal": true,
          "paso": 2,
          "nota": "Evita compensaciones con el tronco. Controla la fase excéntrica y lleva el codo hacia atrás.",
          "alternativas": [
            {
              "id": "remo-barra",
              "nombre": "Remo con barra",
              "paso": 2.5
            },
            {
              "id": "remo-keiser",
              "nombre": "Remo Keiser",
              "paso": 1
            }
          ]
        },
        {
          "id": "peso-muerto-rumano",
          "nombre": "Peso muerto rumano",
          "series": [
            2,
            2,
            2,
            2
          ],
          "reps": "8–10",
          "principal": true,
          "barra": true,
          "paso": 2.5,
          "nota": "Realiza una bisagra de cadera, mantén una ligera flexión de rodillas y conserva la carga cerca del cuerpo. Detén el descenso antes de perder la posición neutra de la columna.",
          "alternativas": [
            {
              "id": "pmr-mancuernas",
              "nombre": "Peso muerto rumano con mancuernas",
              "paso": 2,
              "implemento": "mancuernas"
            }
          ]
        },
        {
          "id": "elevaciones-laterales",
          "nombre": "Elevaciones laterales",
          "series": [
            2,
            2,
            2,
            2
          ],
          "reps": "12–15",
          "paso": 1,
          "nota": "Mantén una ligera flexión de codos, evita elevar los hombros y controla la bajada.",
          "implemento": "mancuernas"
        }
      ]
    },
    {
      "id": "fuerza-b",
      "nombre": "Fuerza B",
      "duracion": "55–60 min",
      "ejercicios": [
        {
          "id": "press-militar",
          "nombre": "Press militar",
          "series": [
            2,
            3,
            3,
            3
          ],
          "reps": "6–10",
          "principal": true,
          "barra": true,
          "paso": 2.5,
          "nota": "Estabiliza abdomen y glúteos. Evita compensar la extensión del hombro con una hiperextensión lumbar.",
          "alternativas": [
            {
              "id": "press-hombro-mancuernas",
              "nombre": "Press de hombros con mancuernas",
              "paso": 2,
              "implemento": "mancuernas"
            }
          ]
        },
        {
          "id": "dominadas-jalon",
          "nombre": "Dominadas",
          "series": [
            2,
            3,
            3,
            3
          ],
          "reps": "6–10",
          "principal": true,
          "carga": "corporal",
          "paso": 2.5,
          "nota": "Evita impulsarte con las piernas. Controla la fase de bajada y utiliza asistencia si necesitas mantener el rango y la técnica.",
          "alternativas": [
            {
              "id": "jalon-keiser",
              "nombre": "Jalón Keiser",
              "paso": 1
            }
          ]
        },
        {
          "id": "hip-thrust",
          "nombre": "Hip thrust o puente de glúteos",
          "series": [
            3,
            3,
            3,
            3
          ],
          "reps": "8–12",
          "principal": true,
          "paso": 2.5,
          "nota": "Mantén las costillas controladas y termina el movimiento extendiendo la cadera, sin hiperextender la zona lumbar. Se mantiene aquí para no repetir una segunda bisagra pesada."
        },
        {
          "id": "sentadilla-bulgara",
          "nombre": "Sentadilla búlgara",
          "series": [
            2,
            2,
            2,
            2
          ],
          "reps": "8–10 por pierna",
          "paso": 2,
          "nota": "Busca estabilidad, controla el descenso y mantén la rodilla alineada con el pie.",
          "alternativas": [
            {
              "id": "zancadas",
              "nombre": "Zancadas",
              "paso": 2
            }
          ]
        },
        {
          "id": "press-inclinado-mancuernas",
          "nombre": "Press inclinado con mancuernas",
          "series": [
            2,
            2,
            2,
            2
          ],
          "reps": "8–12",
          "paso": 2,
          "nota": "Controla la bajada, evita perder la estabilidad escapular y mantén un recorrido cómodo.",
          "alternativas": [
            {
              "id": "press-inclinado-barra",
              "nombre": "Press inclinado con barra",
              "paso": 2.5
            }
          ],
          "implemento": "mancuernas"
        },
        {
          "id": "curl-biceps",
          "nombre": "Curl de bíceps",
          "series": [
            2,
            2,
            2,
            2
          ],
          "reps": "10–15",
          "paso": 1,
          "nota": "Evita balancear el tronco y controla la extensión del codo.",
          "alternativas": [
            {
              "id": "curl-keiser",
              "nombre": "Curl en polea Keiser",
              "paso": 1
            }
          ]
        },
        {
          "id": "extension-triceps",
          "nombre": "Extensión de tríceps",
          "series": [
            2,
            2,
            2,
            2
          ],
          "reps": "10–15",
          "paso": 1,
          "nota": "Mantén estable el brazo y evita compensar el movimiento con el tronco.",
          "alternativas": [
            {
              "id": "extension-triceps-polea",
              "nombre": "Extensión de tríceps en polea",
              "paso": 1
            }
          ]
        }
      ]
    }
  ],
  "micros": [
    {
      "id": "micro-superior",
      "nombre": "Tren superior",
      "duracion": "25–30 min",
      "objetivo": "Volumen extra de empuje, tirón y hombro",
      "ejercicios": [
        {
          "id": "press-inclinado-mancuernas",
          "nombre": "Press inclinado con mancuernas",
          "pauta": "3 × 10"
        },
        {
          "id": "remo-keiser",
          "nombre": "Remo Keiser",
          "pauta": "3 × 12"
        },
        {
          "id": "elevaciones-laterales",
          "nombre": "Elevaciones laterales",
          "pauta": "3 × 15"
        },
        {
          "id": "curl-biceps",
          "nombre": "Curl de bíceps",
          "pauta": "2 × 12"
        }
      ]
    },
    {
      "id": "micro-inferior",
      "nombre": "Tren inferior",
      "duracion": "25–30 min",
      "objetivo": "Piernas y cadena posterior sin cargas máximas",
      "ejercicios": [
        {
          "id": "sentadilla-goblet",
          "nombre": "Sentadilla goblet",
          "pauta": "3 × 12"
        },
        {
          "id": "pmr-mancuernas",
          "nombre": "Peso muerto rumano con mancuernas",
          "pauta": "3 × 10"
        },
        {
          "id": "zancadas",
          "nombre": "Zancadas",
          "pauta": "2 × 10 por pierna"
        },
        {
          "id": "gemelos",
          "nombre": "Gemelos",
          "pauta": "2 × 15"
        }
      ]
    },
    {
      "id": "micro-atletico",
      "nombre": "Atlético",
      "duracion": "20–25 min",
      "objetivo": "Agilidad, coordinación y core",
      "ejercicios": [
        {
          "id": "movilidad-dinamica",
          "nombre": "Movilidad dinámica",
          "pauta": "4 min"
        },
        {
          "id": "saltos-suaves",
          "nombre": "Saltos suaves",
          "pauta": "3 × 5"
        },
        {
          "id": "desplazamientos-laterales",
          "nombre": "Desplazamientos laterales",
          "pauta": "3 × 20 s"
        },
        {
          "id": "farmer-carry",
          "nombre": "Farmer carry",
          "pauta": "3 × 30 m"
        },
        {
          "id": "core",
          "nombre": "Trabajo de core",
          "pauta": "3 series"
        }
      ]
    }
  ],
  "natacion": {
    "id": "natacion",
    "nombre": "Natación",
    "duracion": "30–40 min",
    "enfoque": "Técnica, respiración y confianza en el agua. No es un entrenamiento de velocidad.",
    "semanas": [
      [
        "5 min de adaptación",
        "4 × 25 m suaves",
        "4 × 25 m respiración y coordinación",
        "5 min suaves",
        "Descansos de 30–45 s cuando hagan falta"
      ],
      [
        "5 min de calentamiento",
        "6 × 25 m suaves",
        "4 × 25 m respiración lateral",
        "4 × 25 m suaves"
      ],
      [
        "5 min de calentamiento",
        "4 × 50 m suaves",
        "4 × 25 m de técnica",
        "5 min suaves"
      ],
      [
        "5 min de calentamiento",
        "Hasta 6 × 50 m suaves si la técnica se mantiene",
        "4 × 25 m suaves"
      ]
    ]
  },
  "carrera": {
    "id": "carrera",
    "nombre": "Carrera suave",
    "duracion": "20–30 min",
    "opcional": true,
    "enfoque": "Ritmo en el que puedas hablar. Cinta o exterior. Sin objetivos de distancia ni ritmo.",
    "semanas": [
      {
        "trote": 1,
        "andar": 2,
        "repeticiones": 8
      },
      {
        "trote": 2,
        "andar": 2,
        "repeticiones": 7
      },
      {
        "trote": 3,
        "andar": 1,
        "repeticiones": 7
      },
      {
        "trote": 5,
        "andar": 1,
        "repeticiones": 4
      }
    ]
  }
};
