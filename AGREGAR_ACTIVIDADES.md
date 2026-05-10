# Cómo agregar actividades futuras sin rehacer el proyecto

La plataforma está preparada para crecer con una estructura simple:

```txt
index.html
activities-manifest.json
word-bank-esl-english.json
activity-bank-helper.js
NuevaActividad.html
```

## 1. Crear o subir el archivo de la nueva actividad

Ejemplo:

```txt
Spelling Game.html
```

Ese archivo puede ser un juego completamente independiente. Para que tenga botón de regreso al inicio, agrega un botón Home que apunte a:

```txt
index.html
```

## 2. Registrar la actividad en `activities-manifest.json`

Agrega una entrada nueva dentro de `activities`:

```json
{
  "id": "spelling-game",
  "title": "Spelling Game",
  "file": "Spelling Game.html",
  "bankType": "words",
  "usesTranslation": false,
  "enabled": true
}
```

El menú inicio lee este archivo automáticamente. No tienes que editar el diseño del menú.

## 3. Registrar la actividad en `word-bank-esl-english.json`

Dentro de `activities`, agrega una sección con el mismo `id`:

```json
"spelling-game": {
  "title": "Spelling Game",
  "file": "Spelling Game.html",
  "bankType": "words",
  "usesTranslation": false,
  "entryFormat": "word",
  "levels": {
    "Inglés I": {
      "Animals": ["dog", "cat", "bird"]
    },
    "Inglés II": {},
    "Inglés III": {},
    "Inglés IV": {}
  }
}
```

## 4. Si la actividad usa traducciones

Usa este formato:

```json
"quiz-translation": {
  "title": "Quiz Translation",
  "file": "Quiz Translation.html",
  "bankType": "pairs",
  "usesTranslation": true,
  "entryFormat": "word_translation",
  "levels": {
    "Inglés I": {
      "Animals": [
        { "word": "dog", "translation": "perro" },
        { "word": "cat", "translation": "gato" }
      ]
    },
    "Inglés II": {},
    "Inglés III": {},
    "Inglés IV": {}
  }
}
```

## 5. Regla importante

El `id` debe ser igual en estos dos archivos:

```txt
activities-manifest.json → id
word-bank-esl-english.json → activities → id
```

Ejemplo correcto:

```txt
id: spelling-game
activities.spelling-game
```

## 6. Qué significa `bankType`

```txt
words = solo palabras
pairs = palabra + traducción
```

Usa `words` para juegos como sopa de letras, ahorcado o anagramas.
Usa `pairs` para juegos de traducción, memoria, flashcards o emparejar palabras.

## 7. Flujo para GitHub

1. Subes el nuevo HTML de la actividad.
2. Editas `activities-manifest.json`.
3. Editas `word-bank-esl-english.json`.
4. Haces Commit changes.
5. La tarjeta aparece automáticamente en el menú.

No necesitas rehacer el proyecto.
