# SPEC 02 — Reducción de velocidad de Pac-Man y fantasmas

> **Estado:** Approved
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-28
> **Objetivo:** Reducir a la mitad la velocidad de Pac-Man y de los fantasmas manteniendo su proporción actual, para que sea más fácil de manejar y obsérvese el comportamiento de cada personalidad.

## Por qué existe esta spec

Con `PACMAN_SPEED = 0.125` (cada 8 frames una celda) y `GHOST_SPEED = 0.1` (cada 10 frames), la partida va demasiado rápida para apreciar las personalidades que introduce la SPEC 01: el emboscador y el flanqueador solo se distinguen si hay tiempo de mirar la ruta. Bajar ambas velocidades a la mitad da ese margen de reacción sin tocar la lógica.

## Alcance

**Dentro:**

- Cambiar en `src/js/game.js`: `PACMAN_SPEED` de `0.125` a `0.0625` (1/16 celda/frame).
- Cambiar en `src/js/game.js`: `GHOST_SPEED` de `0.1` a `0.05` (1/20 celda/frame).
- Actualizar los comentarios de ambas constantes con el nuevo periodo de realineado (16 y 20 frames).
- Ningún otro archivo ni valor cambia.

**Fuera (para specs futuras):**

- Velocidades diferenciadas por personalidad (ya quedó fuera en SPEC 01).
- Selector de dificultad (presets lento/normal/rápido).
- Movimiento por tiempo real (`dt`) en vez de por frames: refactorización mayor.
- Ajuste de `EXIT_DELAYS` (salida de la caseta).
- Ciclos scatter/persecución, power pellets y demás mecánicas pendientes.

## Modelo de datos

Esta spec no introduce ninguna estructura de datos nueva. Solo cambia dos constantes numéricas:

```js
// game.js
const PACMAN_SPEED = 0.0625; // 1/16 celda/frame -> alinea cada 16 frames
const GHOST_SPEED = 0.05;    // 1/20 celda/frame -> alinea cada 20 frames
```

La crucial es que ambas sigan siendo de la forma `1/N`: el movimiento acumula posición por frame y solo se engancha a la rejilla cuando la posición es casi entera (`aligned()`, tolerancia `1e-3`). Con `1/16` y `1/20` la posición vuelve a ser entera exactamente cada 16 y 20 frames de dirección constante, igual que hoy.

## Plan de implementación

1. **`game.js` — nuevas constantes.** Cambia `PACMAN_SPEED` a `0.0625` y `GHOST_SPEED` a `0.05`, con comentarios actualizados. No toca nada más (los `speed` de los objetos se leen de estas constantes en `createGame`, así que el cambio es transitivo). Prueba manual: abrir `src/index.html` y comprobar que Pac-Man y los fantasmas se mueven visiblemente el doble de lento y la partida sigue completa.

## Criterios de aceptación

- [ ] Al abrir `src/index.html` la consola no tiene errores.
- [ ] `PACMAN_SPEED` es `0.0625` y `GHOST_SPEED` es `0.05`; no existe ningún otro valor de velocidad en el código.
- [ ] Pac-Man recorre una celda en 16 frames (~0,27 s a 60 fps).
- [ ] Cada fantasma recorre una celda en 20 frames (~0,33 s a 60 fps); los cuatro a la misma velocidad.
- [ ] La proporción fantasma/Pac-Man sigue siendo 0,8 como antes del cambio.
- [ ] Pac-Man gira justo en la celda de los cruces y se detiene pegado al muro al chocar, sin desbordar la celda.
- [ ] Tras varios cambios de dirección, los fantasmas siguen alineados a la rejilla y no se atascan en un cruce.
- [ ] La salida escalonada de la caseta sigue produciéndose a los 2/4/6 s (`EXIT_DELAYS` intacto).
- [ ] Partida completa sin regresión: dots a 10 puntos, perder vida al contacto, GANASTE/PERDISTE y reinicio funcionan igual que hoy.

## Decisiones

- **Sí:** mantener el formato `1/N` para las velocidades. Es lo que garantiza el alineado a rejilla que `aligned()` y toda la lógica de cruces asumen; el doble error flotante de 20 sumas de `0.05` (~1e-16) queda muy por debajo de la tolerancia `1e-3`.
- **Sí:** la mitad exacta en ambos (0.0625 y 0.05), en vez de frenar solo a los fantasmas. El objetivo es ver el comportamiento; la proporción 0,8 entre fantasma y Pac-Man se conserva y el equilibrio del juego no cambia.
- **No:** `1/12.5` o valores arbitrarios. Romperían el alineado a rejilla y podrían atascar fantasmas en los cruces.
- **No:** reducir `EXIT_DELAYS` proporcionalmente. Son congelaciones en frames, no velocidad de movimiento; con el juego más lento la salida del resto de fantasmas se siente relativamente más rápida, no más larga.
- **No:** selector de dificultad ni velocidad por personalidad. Cada uno, si aterriza, va en su propia spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Al frenar la mitad, el juego se vuelve demasiado fácil o "relleno" | La reversión es cambiar dos constantes. Si molesta, se sube a 1/12 y 1/15 (misma proporción 0,8) en una revisión de esta spec. |
| Monitor de refresco alto (>60 Hz) sigue acelerando el juego | Aceptado: todo el juego va por frames (`rAF`), es el estándar del repo y su causa raíz está fuera del alcance. |
| Fantasmas toman decisiones en cruce menos a menudo (cada 20 frames) | Es el comportamiento deseado (más tiempo de observación), no un defecto; la decisión solo ocurre en celdas alineadas y eso sigue pasando. |

## Lo que **no** está en esta spec

- Velocidad por personalidad.
- Selector de dificultad.
- Movimiento por tiempo real (`dt`).
- Ajuste de `EXIT_DELAYS`.

Cada uno, si aterriza, va en su propia spec.
