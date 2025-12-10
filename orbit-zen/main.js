
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
const STATE = {
  START: 0,
  PLAYING: 1,
  GAMEOVER: 2
};

let currentState = STATE.START;
let score = 0;
let frames = 0;

// Config
const CENTER_X = canvas.width / 2;
const CENTER_Y = canvas.height / 2;
const ORBIT_RADIUS = 120; // The fixed radius where the player orbits
const ORB_SIZE = 8;
const BASE_SPEED = 0.05; // Radians per frame
const MAX_SPEED = 0.12;
const OBSTACLE_SPEED = 2; // Pixels per frame expansion

// Variables
let orb = {
  angle: 0,
  direction: 1, // 1 or -1
  speed: BASE_SPEED,
  color: '#00f3ff'
};

let obstacles = []; // Array of { radius, gapStart, gapSize, color }
let particles = []; // Explosion particles

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hudScreen = document.getElementById('game-hud');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const watchScreen = document.getElementById('watch-screen');

function init() {
  resize();
  // Listeners
  watchScreen.addEventListener('pointerdown', handleInput);
  // Start loop
  requestAnimationFrame(loop);
}

function resize() {
  // Handle high DPI if needed, but for now fixed canvas size is fine for the sim
  // We matched CSS dimensions in the HTML canvas attributes
}


function handleInput(e) {
  e.preventDefault();

  // Haptic/Visual Feedback
  watchScreen.classList.add('pressed');
  setTimeout(() => watchScreen.classList.remove('pressed'), 100);

  if (currentState === STATE.START) {
    startGame();
  } else if (currentState === STATE.PLAYING) {
    orb.direction *= -1;
    // Boost speed slightly on tap for dynamic feel? Or just reverse.
    // Let's just reverse for "Orbit Zen".
    createTapEffect();
  } else if (currentState === STATE.GAMEOVER) {
    resetGame();
  }
}

function startGame() {
  currentState = STATE.PLAYING;
  score = 0;
  frames = 0;
  orb.angle = 0;
  orb.speed = BASE_SPEED;
  obstacles = [];
  particles = [];

  startScreen.classList.add('hidden');
  startScreen.classList.remove('active');
  gameOverScreen.classList.add('hidden');
  gameOverScreen.classList.remove('active');
  hudScreen.classList.remove('hidden');
  updateScore(0);
}

function resetGame() {
  currentState = STATE.START;

  hudScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  gameOverScreen.classList.remove('active');
  startScreen.classList.remove('hidden');
  startScreen.classList.add('active');
}

function gameOver() {
  currentState = STATE.GAMEOVER;
  finalScoreEl.innerText = score;

  hudScreen.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');
  gameOverScreen.classList.add('active');

  // Explosion effect
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: CENTER_X + Math.cos(orb.angle) * ORBIT_RADIUS,
      y: CENTER_Y + Math.sin(orb.angle) * ORBIT_RADIUS,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 1.0,
      color: orb.color
    });
  }
}

function createTapEffect() {
  // Visual flair when changing direction
}

function spawnObstacle() {
  // Difficulty scaling
  const minGap = Math.max(Math.PI / 4, Math.PI / 1.5 - (score * 0.01)); // Gap gets smaller
  const gapSize = minGap;
  const gapStart = Math.random() * Math.PI * 2;

  obstacles.push({
    radius: 0,
    gapStart: gapStart,
    gapSize: gapSize,
    width: 20, // Thickness of the wall
    passed: false,
    color: `hsl(${frames % 360}, 100%, 50%)`
  });
}

function update() {
  if (currentState !== STATE.PLAYING) return;

  frames++;

  // Move Orb
  orb.angle += orb.speed * orb.direction;
  // Normalize angle
  orb.angle = (orb.angle + Math.PI * 2) % (Math.PI * 2);

  // Rotate hue
  orb.color = `hsl(${frames % 360}, 100%, 70%)`;

  // Spawn obstacles
  // Rate increases with score
  const spawnRate = Math.max(60, 150 - score * 2);
  if (frames % spawnRate === 0) {
    spawnObstacle();
  }

  // Update Obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.radius += OBSTACLE_SPEED + (score * 0.005); // Speed up slightly

    // Collision Detection
    // The obstacle is a ring at obs.radius with thickness obs.width
    // Check if ORBIT_RADIUS is within the obstacle's current shell
    const distToOrb = obs.radius - ORBIT_RADIUS;

    // We treat the obstacle as a "wave" that hits the orb
    // Let's say the wall is physically from radius to radius-width
    // Actually, visually expanding outwards looks best if we check when it crosses the orbit line.

    // Check if the WALL (line at obs.radius) is hitting the orb
    // Give it some forgiveness (ORB_SIZE)
    if (Math.abs(distToOrb) < ORB_SIZE + 5 && !obs.passed) {
      // Check angles
      // We need to see if orb.angle is INSIDE the gap
      // Gap is from gapStart to gapStart + gapSize
      // Handle wrapping logic
      let angle = orb.angle;
      let start = obs.gapStart;
      let end = obs.gapStart + obs.gapSize;

      // Normalize all to 0-2PI for comparison
      // The easiest way to check if angle is in arc:
      // Calculate difference between angle and center of gap.
      let mid = start + obs.gapSize / 2;
      let diff = Math.abs(angleDiff(angle, mid));

      if (diff > obs.gapSize / 2) {
        // HIT!
        gameOver();
      }
    }

    if (obs.radius > ORBIT_RADIUS + 20 && !obs.passed) {
      obs.passed = true;
      score++;
      updateScore(score);
    }

    // Remove if off screen
    if (obs.radius > Math.max(canvas.width, canvas.height)) {
      obstacles.splice(i, 1);
    }
  }
}

function angleDiff(a, b) {
  let diff = a - b;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

function updateScore(val) {
  scoreEl.innerText = val;
}

function draw() {
  // Clear
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Trail effect
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Center Core
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Draw Orbit Line (faint)
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, ORBIT_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw Obstacles
  obstacles.forEach(obs => {
    // Draw the "blocked" part.
    // Full circle minus the gap.
    // So we draw from (gapStart + gapSize) TO gapStart
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, obs.radius, obs.gapStart + obs.gapSize, obs.gapStart);
    ctx.strokeStyle = obs.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  });

  if (currentState !== STATE.GAMEOVER) {
    // Draw Orb
    let ox = CENTER_X + Math.cos(orb.angle) * ORBIT_RADIUS;
    let oy = CENTER_Y + Math.sin(orb.angle) * ORBIT_RADIUS;

    ctx.shadowBlur = 15;
    ctx.shadowColor = orb.color;
    ctx.beginPath();
    ctx.arc(ox, oy, ORB_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = orb.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw Particles
  particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.05;
    if (p.life > 0) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      particles.splice(i, 1);
    }
  });
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

init();
