// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.0625; // 1/16 celda/frame -> alinea cada 16 frames
const GHOST_SPEED = 0.05;    // 1/20 celda/frame -> alinea cada 20 frames

// Salida escalonada de la pen: frames de espera por personalidad (60 fps).
const EXIT_DELAYS = { hunter: 0, ambusher: 120, flanker: 240, shy: 360 };
// Celda de la puerta hacia la que greedy-sale de la pen.
const DOOR_TARGET = { x: 13, y: 12 };
// Esquina inferior izquierda: retirada del fantasma timido.
const SHY_CORNER = { x: 1, y: 29 };

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      inPen: true,
      exitTimer: EXIT_DELAYS[ g.kind ] || 0,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman:   bloqueado por pared (1) y puerta (3)
//   ghost:    bloqueado solo por pared (1) — solo aplica dentro de la pen
//   ghostOut: bloqueado por pared (1) y puerta (3): fuera de la pen no re-entra
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 ) return actor !== 'ghost';
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;
  // Dentro de la pen la puerta es transitable; fuera, no (sentido unico).
  const actor = g.inPen ? 'ghost' : 'ghostOut';

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, actor )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Celda objetivo segun estado/personalidad (solo se compara distancia).
  let target = null;
  if ( g.inPen ) {
    target = DOOR_TARGET; // salir de la caseta por la puerta
  } else if ( g.kind === 'hunter' ) {
    target = { x: Math.round( p.x ), y: Math.round( p.y ) };
  } else if ( g.kind === 'ambusher' ) {
    // Emboscada: 4 celdas por delante de Pac-Man segun su direccion.
    // Puede caer fuera del tablero o en muro: solo se compara distancia.
    const pd = DIRS[ p.dir ];
    target = { x: Math.round( p.x ) + pd.x * 4, y: Math.round( p.y ) + pd.y * 4 };
  } else if ( g.kind === 'flanker' ) {
    // Flanqueo: reflejo del rojo respecto al punto 2 celdas delante de Pac-Man.
    // target = 2·punto − celdaDelRojo. Solo se compara distancia.
    const pd = DIRS[ p.dir ];
    const px = Math.round( p.x ) + pd.x * 2;
    const py = Math.round( p.y ) + pd.y * 2;
    const red = game.ghosts.find( ( gh ) => gh.kind === 'hunter' );
    if ( red ) {
      target = { x: 2 * px - Math.round( red.x ), y: 2 * py - Math.round( red.y ) };
    }
  } else if ( g.kind === 'shy' ) {
    // Timido: persigue de lejos; si Pac-Man esta a <= 8 celdas, se retira
    // a su esquina (abajo-izquierda).
    const px = Math.round( p.x );
    const py = Math.round( p.y );
    const dist = Math.abs( g.x - px ) + Math.abs( g.y - py );
    target = dist > 8 ? { x: px, y: py } : SHY_CORNER;
  }

  if ( target ) {
    let best = choices[ 0 ];
    let bestDist = Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const nx = g.x + d.x;
      const ny = g.y + d.y;
      const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
      if ( dist < bestDist ) {
        bestDist = dist;
        best = dir;
      }
    }
    g.dir = best;
  } else {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
  }
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  // Congelado en su celda esperando su turno de salida escalonada.
  if ( g.inPen && g.exitTimer > 0 ) {
    g.exitTimer--;
    return;
  }

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    // En cuanto cruza la puerta hacia fuera (fila <= 11) ya no puede re-entrar.
    if ( g.inPen && g.y <= 11 ) g.inPen = false;
    decideGhost( game, g );
    const actor = g.inPen ? 'ghost' : 'ghostOut';
    if ( !canMove( grid, g.x, g.y, g.dir, actor ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.inPen = true;
    g.exitTimer = EXIT_DELAYS[ g.kind ] || 0;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
