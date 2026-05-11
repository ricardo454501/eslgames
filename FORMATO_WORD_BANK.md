# FORMATO DEL WORD BANK

El banco completo vive en `word-bank-esl-english.json`.

La estructura correcta es:

```json
{
  "activities": {
    "wordsearch": {
      "usesTranslation": false,
      "levels": {
        "Inglés I": {
          "Animals": ["dog", "cat", "bird"]
        }
      }
    },
    "flashcards": {
      "usesTranslation": true,
      "levels": {
        "Inglés I": {
          "Animals": [
            { "word": "dog", "translation": "perro" },
            { "word": "cat", "translation": "gato" }
          ]
        }
      }
    }
  }
}
```

## Juegos que usan solo palabras
- Anagrama
- Hangman
- Wordsearch

Ejemplo para pegar en el editor:

```txt
Categoría: Food
rice
milk
bread
cheese
```

## Juegos que usan palabra + traducción
- Flashcards
- Memory Game
- Word Match

Ejemplo para pegar en el editor:

```txt
Categoría: Food
rice = arroz
milk = leche
bread = pan
cheese = queso
```

## Independencia por actividad y nivel
`Food` en Wordsearch / Inglés I no afecta a `Food` en Flashcards / Inglés I.
`Food` en Flashcards / Inglés I no afecta a `Food` en Flashcards / Inglés II.

Cada actividad lee solamente su propia sección del JSON.


---

## Actividades futuras

Para una actividad nueva, primero define si usa:

```txt
words = solo palabras
pairs = palabra + traducción
```

Luego registra el mismo `id` en:

```txt
activities-manifest.json
word-bank-esl-english.json
```

Ejemplo de id:

```txt
spelling-game
```

Ese id debe ser igual en ambos lugares.
