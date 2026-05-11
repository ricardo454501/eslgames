# ESL English

Plataforma de actividades ESL lista para GitHub Pages.

## Archivos principales

```txt
index.html                       Menú inicio automático
activities-manifest.json          Lista de actividades del menú
word-bank-esl-english.json        Banco completo de palabras por actividad y nivel
activity-bank-helper.js           Helper para integrar actividades futuras
AGREGAR_ACTIVIDADES.md            Guía para agregar nuevas actividades
FORMATO_WORD_BANK.md              Formato para cargar palabras
```

## Cómo funciona

Cada actividad es independiente, pero todas pueden compartir el mismo archivo central:

```txt
word-bank-esl-english.json
```

El banco no mezcla las palabras, porque está separado así:

```txt
Actividad → Nivel → Categoría → Palabras
```

Ejemplo:

```txt
activities.wordsearch.levels["Inglés I"].Animals
activities.flashcards.levels["Inglés I"].Animals
```

Aunque ambas categorías se llamen `Animals`, son independientes porque pertenecen a actividades distintas.

## Agregar nuevas actividades

Lee:

```txt
AGREGAR_ACTIVIDADES.md
```

Resumen:

1. Sube el HTML de la nueva actividad.
2. Agrega la actividad en `activities-manifest.json`.
3. Agrega su banco en `word-bank-esl-english.json`.
4. Haz Commit changes en GitHub.

El menú se actualiza automáticamente.

## Subir a GitHub Pages

1. Crea un repositorio.
2. Sube todos los archivos de este ZIP.
3. Ve a Settings → Pages.
4. En Source selecciona `Deploy from a branch`.
5. Selecciona `main` y `/root`.
6. Guarda.

Tu página iniciará desde:

```txt
index.html
```


## Botón Volver a la actividad

Cuando un estudiante entra a una actividad y toca la casita por accidente, el menú de inicio muestra un botón flotante **Volver a la actividad**. Este botón usa el historial del navegador para regresar al juego anterior y, cuando el navegador conserva la página en memoria, mantiene el avance tal como estaba.

La casita de cada juego está ubicada en la esquina inferior derecha para no tapar títulos ni controles superiores.
