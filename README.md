# Mi vuelta a entrenar (versión 2.1)

App web personal (PWA) de entrenamiento. Sin servidor, sin cuentas, funciona sin conexión.

## Qué hay en la carpeta

| Fichero | Para qué sirve | ¿Lo tocarás? |
|---|---|---|
| `plan.js` | Todo el contenido: sesiones, ejercicios, series, micros, natación, carrera | **Sí, es el único** |
| `index.html`, `app.js`, `styles.css` | La aplicación | No |
| `sw.js` | Funcionamiento sin conexión | No |
| `manifest.webmanifest`, `icons/` | Instalación en el iPhone | No |

Tus datos (sesiones, pesos, notas) **no** están en estos ficheros: se guardan en el iPhone. Actualizar la app nunca borra tu historial.

---

## Publicar en GitHub Pages (una sola vez, ~10 minutos)

1. Crea una cuenta gratuita en [github.com](https://github.com) si no la tienes.
2. Arriba a la derecha: **+ → New repository**.
   - Nombre: `entrenar` (o el que quieras).
   - Marca **Public** (GitHub Pages gratuito requiere repositorio público; nadie verá tus datos, solo el código y el plan).
   - Pulsa **Create repository**.
3. En la página del repositorio vacío, pulsa **uploading an existing file**.
4. Descomprime el zip en tu ordenador y arrastra **el contenido** de la carpeta (no la carpeta en sí): `index.html`, `app.js`, `plan.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `README.md` y la carpeta `icons`. Pulsa **Commit changes**.
5. Ve a **Settings → Pages**. En *Build and deployment*: Source **Deploy from a branch**, Branch **main** y carpeta **/ (root)**. Pulsa **Save**.
6. Espera 1–2 minutos y recarga esa página: aparecerá la dirección, del tipo
   `https://TU-USUARIO.github.io/entrenar/` (ya con HTTPS).

## Instalar en el iPhone

1. Abre esa dirección **en Safari** (no en Chrome ni dentro de otra app).
2. Pulsa el botón **Compartir** (cuadrado con flecha hacia arriba).
3. Baja y elige **Añadir a pantalla de inicio**. Nombre: «Entrenar». Pulsa **Añadir**.
4. Abre la app **desde el icono** al menos una vez con conexión. A partir de ahí funciona sin cobertura.

> Importante: Safari y la app instalada guardan los datos por separado. Registra siempre desde el icono.

## Primer uso

- En Inicio verás la fecha de inicio del programa (por defecto, el lunes). Cámbiala ahí si quieres.
- La semana avanza sola cada 7 días. Si una semana se tuerce y quieres repetirla: **Registro → Ajustes → Semana actual** y fíjala a mano.

## Actualizar a una nueva versión de la app

1. En GitHub, dentro del repositorio: **Add file → Upload files**.
2. Arrastra todos los ficheros nuevos (incluida la carpeta `icons`). GitHub sustituye los que tienen el mismo nombre.
3. **Commit changes**. En 1–2 minutos estará publicada.
4. En el iPhone, abre la app con conexión. Si sigues viendo la versión anterior, ciérrala del todo y vuelve a abrirla.

Tu historial no se toca: vive en el iPhone, no en GitHub.

## Copia de seguridad

**Registro → Ajustes → Exportar datos.** En el iPhone se abre el menú de compartir: guárdala en Archivos / iCloud Drive. Hazlo cada pocas semanas y siempre antes de cambiar de móvil. Para recuperar: **Importar copia**.

---

## Cambiar la planificación desde la app (recomendado)

1. **Progreso → ⚙︎ Ajustes → Copiar para ChatGPT.** Copia las instrucciones de formato y tu plan actual.
2. Pégalo en tu conversación de entrenamiento en ChatGPT y pide los cambios.
3. Copia la respuesta de ChatGPT entera y ve a **Ajustes → Pegar plan nuevo → Revisar cambios**.
4. Si todo está bien, verás la lista de cambios. Pulsa **Aplicar plan**.
   Si hay algún error, la app te dice cuál y no cambia nada.

Para deshacerlo: **Ajustes → Volver al plan anterior**.

## Cambiar la planificación en GitHub (alternativa)

1. Abre `plan.js` en GitHub y copia todo su contenido.
2. Pégalo en ChatGPT junto con la instrucción que hay al principio del propio fichero, y pide los cambios.
3. En GitHub, abre `plan.js` → icono del lápiz (**Edit**), selecciona todo, pega la versión nueva y pulsa **Commit changes**.
4. Espera un minuto y abre la app con conexión. Si no ves el cambio, ciérrala del todo (deslizando hacia arriba en el selector de apps) y ábrela de nuevo.

Reglas para no romper nada:
- Mantén los `id` de los ejercicios que sigan existiendo: así conservas el historial de pesos («Última vez…»).
- `series` lleva 4 números, uno por semana.
- Para un bloque nuevo, cambia `bloque.id` (por ejemplo `"bloque-2"`) y pon la nueva fecha de inicio en Ajustes. El historial anterior se conserva.

Si al abrir la app aparece en blanco tras un cambio, casi siempre es una coma o una comilla que falta en `plan.js`. Vuelve a la versión anterior desde el historial del fichero en GitHub (**History**).
