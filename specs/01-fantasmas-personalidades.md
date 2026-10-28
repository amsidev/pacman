# SPEC 01 — Cuatro fantasmas con personalidades propias

> **Estado:** Implemented
> **Depende de:** ninguna
> **Fecha:** 2026-10-27
> **Objetivo:** Reemplazar los 2 fantasmas actuales por 4 con personalidades clásicas del arcade (agresiva, emboscadora, flanqueadora y tímida) y una salida escalonada de la caseta.

## Alcance

**Dentro:**

- Cuatro fantasmas con 4 `kind` distintos en `maze.js` → `GHOST_STARTS`.
- Personalidad `hunter` (rojo, ya existe): persigue greedy la celda de Pac-Man. Es el agresivo.
- Personalidad `ambusher` (rosa): embosca apuntando 4 celdas por delante de Pac-Man según su dirección.
- Personalidad `flanker` (cian): flanquea cruzando el vector desde el rojo hacia 2 celdas delante de Pac-Man.
- Personalidad `shy` (naranja): persigue si está a más de 8 celdas; si está cerca, se retira a su esquina (abajo-izquierda).
- Selector greedy común: cada personalidad solo define una **celda objetivo**; la elección de dirección minimiza distancia Manhattan (sin marcha atrás salvo callejón, como hoy).
- Salida escalonada de la pen por contadores de frames: rojo 0, rosa 120, cian 240, naranja 360 (2/4/6 s a 60 fps).
- La puerta de la caseta es de un solo sentido para fantasmas: una vez fuera, la puerta les bloquea (no re-entran).
- Color vinculado a la personalidad (`kind`) en `render.js`: rojo/rosa/cian/naranja.

**Fuera (para specs futuras):**

- Power pellets, modo asustadizo y comer fantasmas (no existen aún en el MVP).
- Ciclos globales scatter/persecución.
- Velocidades diferenciadas por personalidad.
- Colisión entre fantasmas (siguen pudiendo superponerse, como hoy).
- Dificultad progresiva por nivel.

## Modelo de datos

```js
// maze.js — de 2 a 4 entradas
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'hunter'   }, // rojo, sale primero (col de la puerta izquierda)
  { x: 14, y: 14, kind: 'ambusher' }, // rosa (col de la puerta derecha)
  { x: 12, y: 14, kind: 'flanker'  }, // cian
  { x: 15, y: 14, kind: 'shy'      }, // naranja
];

// game.js — fantasma extendido
const EXIT_DELAYS  = { hunter: 0, ambusher: 120, flanker: 240, shy: 360 }; // frames
const DOOR_TARGET  = { x: 13, y: 12 }; // celda de la puerta para salir de la pen
const SHY_CORNER   = { x: 1, y: 29 };  // esquina inferior izquierda del naranja

// Fantasma:
// { x, y, dir, speed, kind, inPen: true, exitTimer: EXIT_DELAYS[kind] }
```

La pen interior (filas 13–15, cols 11–16) aloja los 4 puntos de inicio. Los objetivos del emboscador y del flanqueador pueden caer fuera del tablero o dentro de muros: solo se usan para comparar distancias, nunca como posición.

## Plan de implementación

1. **`maze.js` + `render.js` — los 4 en escena.** Extiende `GHOST_STARTS` a 4 entradas con los 4 `kind`; sustituye el array `GHOST_COLORS` por un mapa `GHOST_COLORS_BY_KIND` con fallback rojo, y `draw` usa el color por `g.kind`. Prueba manual: se ven 4 fantasmas con los colores correctos; los 3 nuevos se mueven con el fallback aleatorio de hoy. Sistema funcional.
2. **`game.js` — salida escalonada.** Añade `inPen` y `exitTimer` al fantasma (`createGame`), `EXIT_DELAYS`, `DOOR_TARGET`; congelado mientras `exitTimer > 0`; después greedy hacia `DOOR_TARGET` hasta salir (fila ≤ 11); `isWall` pasa a bloquear la puerta (3) para fantasmas fuera de la pen; `resetPositions` reinicia `inPen`/`exitTimer`. Prueba: el rojo sale al instante, el resto a los 2/4/6 s, nadie re-entra.
3. **`game.js` — `ambusher`.** Selector greedy común alimentado por celda objetivo; el target del rosa = celda 4 delante de Pac-Man.
4. **`game.js` — `flanker`.** El target del cian = `2·punto − celdaDelRojo`, con punto = 2 celdas delante de Pac-Man.
5. **`game.js` — `shy`.** Si la distancia Manhattan del naranja a Pac-Man es mayor que 8, target = celda de Pac-Man; si no, target = `SHY_CORNER`.

## Criterios de aceptación

- [x] Abriendo `src/index.html` sin consola sucia se ven 4 fantasmas: rojo, rosa, cian y naranja.
- [x] El color depende de la personalidad (rojo=agresivo, rosa=emboscador, cian=flanqueador, naranja=tímido) y no del orden dentro de `GHOST_STARTS`.
- [x] El rojo abandona la caseta en cuanto empieza la partida.
- [x] El rosa, el cian y el naranja permanecen parados en su celda 2/4/6 s respectivamente y luego salen por la puerta solos, uno tras otro.
- [x] Tras perder una vida, los 4 vuelven a la caseta y repiten la salida escalonada.
- [x] Ningún fantasma fuera de la caseta puede re-entrar por la puerta.
- [x] El rojo elige en cada cruce la dirección que más reduce la distancia a la celda de Pac-Man (sin U-turn salvo callejón).
- [x] Si Pac-Man avanza en línea recta, el rosa toma rutas que lo sitúan por delante de Pac-Man, a diferencia del rojo.
- [x] El cian entra a interceptar por un corredor distinto al que usa el rojo en la misma situación.
- [x] Acercándose al naranja a ≤ 8 celdas se retira hacia la esquina inferior izquierda; alejándose a > 8 vuelve a perseguir.
- [x] Los 4 mantienen la misma velocidad (`GHOST_SPEED`, 0.1 celdas/frame).
- [x] Partida completa sin regresión: perder vida al contacto, comer dots a 10 puntos, GANASTE/PERDISTE y reinicio funcionan igual que hoy.

## Decisiones

- **Sí:** los 4 clásicos del arcade. La firma matemática de cada target produce rutas distinguibles sin añadir ninguna mecánica global nueva. "Perseguir agresivamente" ya queda cubierto por el rojo existente.
- **Sí:** selector greedy común (el existente) alimentado por una celda objetivo por personalidad, en vez de 4 IAs paralelas. Menos código nuevo, más verificable.
- **Sí:** salida escalonada con contadores de frames por fantasma, en lugar de salida libre. Sin ella los 4 pueden salir amontonados y llegar sincronizados a Pac-Man.
- **Sí:** puerta de la caseta con sentido único para fantasmas. Sin esto, un objetivo imposible de rosa/cian dentro de la pen puede meterlos en la caseta y atascarlos ahí.
- **Sí:** color por `kind`, aunque se reordene `GHOST_STARTS`.
- **No:** mantener `random` como personalidad. El azar queda solo como fallback y defensa ante un `kind` desconocido.
- **No:** ciclos scatter/chase. Mecánica global que va en su propia spec.
- **No:** velocidades diferenciadas. La personalidad debe notarse por la ruta, no por el pedal.
- **No:** comer fantasmas/asustadizos. Requiere power pellets, que no existen en el MVP.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Target fuera del tablero (rosa/cian) | Solo se compara distancia; nunca se dibuja ni se viaja a él. |
| `rAF` a más de 60 fps acelera las salidas | Aceptado: todo el juego va por frames (`PACMAN_SPEED`/`GHOST_SPEED`), es el estándar del repo. |
| `kind` desconocido en el futuro | Fallback aleatorio conservado en `decideGhost`. |

## Lo que **no** está en esta spec

- Power pellets, asustadizo y comer fantasmas.
- Ciclos scatter/persecución.
- Velocidades por personalidad.
- Colisión fantasma-fantasma.
- Niveles o dificultad progresiva.

Cada uno, si aterriza, va en su propia spec.
