import * as THREE from 'three';
import { registerSW } from 'virtual:pwa-register';
import './style.css';

const game = document.querySelector('#game');
const menu = document.querySelector('#menu');
const deployButton = document.querySelector('#deploy');
const classesButton = document.querySelector('#classes');
const installButton = document.querySelector('#install-app');
const classesBackButton = document.querySelector('#classes-back');
const mainMenu = document.querySelector('#main-menu');
const classesMenu = document.querySelector('#classes-menu');
const classMessage = document.querySelector('#class-message');
const scoreElement = document.querySelector('#score');
const crosshair = document.querySelector('#crosshair');
const hitMarker = document.querySelector('#hit-marker');
const playerHealthFill = document.querySelector('#player-health-fill');
const playerHealthValue = document.querySelector('#player-health-value');
const damageFlash = document.querySelector('#damage-flash');
const defeatMessage = document.querySelector('#defeat-message');
const moveStick = document.querySelector('#move-stick');
const lookStick = document.querySelector('#look-stick');
const mobileFireButton = document.querySelector('#mobile-fire');
const mobileExitButton = document.querySelector('#mobile-exit');
let installPrompt = null;

registerSW({ immediate: true });

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.018);

const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.05, 250);
camera.position.set(0, 1.72, 12);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
game.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x8edbe2, 0x101411, 1.4));
const sun = new THREE.DirectionalLight(0xdffff6, 2.5);
sun.position.set(-8, 18, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
scene.add(sun);

const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.72, metalness: 0.08 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 90), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(70, 35, 0x4ce8e0, 0x26363a);
grid.position.y = 0.012;
grid.material.opacity = 0.25;
grid.material.transparent = true;
scene.add(grid);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x11191d, roughness: 0.55, metalness: 0.6 });
const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xc8ff36, emissive: 0x638800, emissiveIntensity: 2 });

function addBlock(x, z, width, height, depth) {
  const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMaterial);
  block.position.set(x, height / 2, z);
  block.castShadow = true;
  block.receiveShadow = true;
  scene.add(block);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.05, depth + 0.04), trimMaterial);
  trim.position.set(x, height + 0.025, z);
  scene.add(trim);
}

addBlock(-12, -5, 5, 2.2, 2.5);
addBlock(12, -12, 4, 4.2, 3);
addBlock(-15, -24, 7, 6, 3);
addBlock(8, -30, 10, 2.8, 2.5);
addBlock(0, -42, 38, 8, 2);

for (const side of [-1, 1]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 8, 88), wallMaterial);
  wall.position.set(side * 25, 4, -5);
  wall.receiveShadow = true;
  scene.add(wall);

  for (let z = 28; z > -48; z -= 8) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 4.5), trimMaterial);
    strip.position.set(side * 24.48, 2.7, z);
    scene.add(strip);
  }
}

const cyanLight = new THREE.PointLight(0x4ce8e0, 24, 22, 2);
cyanLight.position.set(-12, 5, -16);
scene.add(cyanLight);
const acidLight = new THREE.PointLight(0xc8ff36, 18, 18, 2);
acidLight.position.set(12, 4, -32);
scene.add(acidLight);

const targetBodyGeometry = new THREE.BoxGeometry(1.15, 1.3, 0.75);
const targetHeadGeometry = new THREE.SphereGeometry(0.4, 18, 14);
const targetFaceGeometry = new THREE.BoxGeometry(0.54, 0.22, 0.04);
const MAX_TARGET_HEALTH = 1000;
const TARGET_RESPAWN_DELAY = 4000;
const targets = [];
const targetPositions = [
  [-8, 2.4, -9], [7, 3.8, -14], [0, 2.2, -20], [-14, 7, -27],
  [13, 4.5, -34], [-5, 3.2, -38], [5, 7.5, -43], [18, 3, -18]
];

function createTarget(position, index) {
  const group = new THREE.Group();
  const bodyColor = index % 2 === 0 ? 0x246bce : 0xd83742;
  const body = new THREE.Mesh(targetBodyGeometry, new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.48,
    metalness: 0.28
  }));
  body.position.y = 0.65;
  body.castShadow = true;
  const head = new THREE.Mesh(targetHeadGeometry, new THREE.MeshStandardMaterial({
    color: 0xd2a679,
    roughness: 0.82,
    metalness: 0
  }));
  head.position.y = 1.62;
  head.castShadow = true;
  const face = new THREE.Mesh(targetFaceGeometry, new THREE.MeshBasicMaterial({ color: 0x172126 }));
  face.position.set(0, 1.65, 0.385);
  group.add(body, head, face);

  const healthCanvas = document.createElement('canvas');
  healthCanvas.width = 256;
  healthCanvas.height = 40;
  const healthTexture = new THREE.CanvasTexture(healthCanvas);
  healthTexture.colorSpace = THREE.SRGBColorSpace;
  const healthBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: healthTexture, transparent: true, depthTest: true }));
  healthBar.scale.set(2.25, 0.35, 1);
  healthBar.visible = false;
  scene.add(healthBar);

  group.position.set(position[0], 0, position[2]);
  group.userData.isTarget = true;
  group.userData.baseX = position[0];
  group.userData.baseZ = position[2];
  group.userData.phase = index * 0.83;
  group.userData.patrolRadius = 1.4 + (index % 3) * 0.65;
  group.userData.fireCooldown = 1.2 + index * 0.45;
  group.userData.health = MAX_TARGET_HEALTH;
  group.userData.healthBar = healthBar;
  group.userData.healthCanvas = healthCanvas;
  group.userData.healthTexture = healthTexture;
  scene.add(group);
  targets.push(group);
  updateTargetHealthBar(group);
}

function updateTargetHealthBar(target) {
  const { healthCanvas, healthTexture, health } = target.userData;
  const context = healthCanvas.getContext('2d');
  const ratio = health / MAX_TARGET_HEALTH;
  context.clearRect(0, 0, healthCanvas.width, healthCanvas.height);
  context.fillStyle = 'rgba(3, 6, 10, 0.88)';
  context.fillRect(0, 0, 256, 40);
  context.fillStyle = ratio > 0.5 ? '#c8ff36' : ratio > 0.25 ? '#ffd43b' : '#ff4d37';
  context.fillRect(5, 5, 246 * ratio, 30);
  context.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, 253, 37);
  healthTexture.needsUpdate = true;
}

targetPositions.forEach(createTarget);

const weapon = new THREE.Group();
const weaponBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.22, 0.2, 0.7),
  new THREE.MeshStandardMaterial({ color: 0x222b2e, metalness: 0.9, roughness: 0.25 })
);
weaponBody.position.z = -0.25;
const weaponRail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.78), trimMaterial);
weaponRail.position.set(0, 0.12, -0.25);
const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.26, 8), wallMaterial);
muzzle.rotation.x = Math.PI / 2;
muzzle.position.z = -0.72;
weapon.add(weaponBody, weaponRail, muzzle);

const sniperParts = new THREE.Group();
const sniperBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.95, 10), wallMaterial);
sniperBarrel.rotation.x = Math.PI / 2;
sniperBarrel.position.set(0, 0.01, -0.92);
const sniperScope = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.38, 12), wallMaterial);
sniperScope.rotation.x = Math.PI / 2;
sniperScope.position.set(0, 0.19, -0.25);
const scopeLens = new THREE.Mesh(
  new THREE.CircleGeometry(0.06, 16),
  new THREE.MeshBasicMaterial({ color: 0x4ce8e0 })
);
scopeLens.position.set(0, 0.19, -0.445);
sniperParts.add(sniperBarrel, sniperScope, scopeLens);
weapon.add(sniperParts);

const knife = new THREE.Group();
const knifeHandle = new THREE.Mesh(
  new THREE.BoxGeometry(0.13, 0.12, 0.34),
  new THREE.MeshStandardMaterial({ color: 0x14191b, metalness: 0.55, roughness: 0.5 })
);
knifeHandle.position.z = -0.13;
const knifeGuard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.08), trimMaterial);
knifeGuard.position.z = -0.34;
const knifeBlade = new THREE.Mesh(
  new THREE.CylinderGeometry(0, 0.11, 0.72, 3),
  new THREE.MeshStandardMaterial({ color: 0xd9f4f1, metalness: 0.95, roughness: 0.12 })
);
knifeBlade.rotation.x = Math.PI / 2;
knifeBlade.position.z = -0.72;
knife.add(knifeHandle, knifeGuard, knifeBlade);
knife.rotation.z = -0.2;
knife.visible = false;
weapon.add(knife);

const ak47 = new THREE.Group();
const akMetalMaterial = new THREE.MeshStandardMaterial({ color: 0x171b1c, metalness: 0.88, roughness: 0.3 });
const akWoodMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4527, metalness: 0.08, roughness: 0.72 });
const akReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.64), akMetalMaterial);
akReceiver.position.z = -0.3;
const akStock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.38), akWoodMaterial);
akStock.position.set(0, -0.01, 0.2);
const akHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.16, 0.42), akWoodMaterial);
akHandguard.position.set(0, -0.015, -0.78);
const akBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.72, 10), akMetalMaterial);
akBarrel.rotation.x = Math.PI / 2;
akBarrel.position.z = -1.28;
const akMagazine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.2), akMetalMaterial);
akMagazine.position.set(0, -0.24, -0.35);
akMagazine.rotation.x = -0.24;
const akMuzzleFlash = new THREE.Mesh(
  new THREE.ConeGeometry(0.1, 0.3, 8),
  new THREE.MeshBasicMaterial({ color: 0xffd43b })
);
akMuzzleFlash.rotation.x = -Math.PI / 2;
akMuzzleFlash.position.z = -1.72;
akMuzzleFlash.visible = false;
ak47.add(akReceiver, akStock, akHandguard, akBarrel, akMagazine, akMuzzleFlash);
ak47.visible = false;
weapon.add(ak47);
weapon.position.set(0.35, -0.3, -0.55);
weapon.rotation.set(-0.08, -0.05, 0);
camera.add(weapon);
scene.add(camera);

const keys = new Set();
const velocity = new THREE.Vector3();
const moveDirection = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const timer = new THREE.Timer();
const SCORE_STORAGE_KEY = 'hypershot-score';
const OWNED_CLASSES_STORAGE_KEY = 'hypershot-owned-classes';
const SELECTED_CLASS_STORAGE_KEY = 'hypershot-selected-class';
const CLASS_NAMES = new Set(['spy', 'soldier', 'sniper']);
let yaw = 0;
let pitch = 0;
let score = loadStoredScore();
let shotKick = 0;
let walkTime = 0;
const ownedClasses = loadOwnedClasses();
let selectedClass = loadSelectedClass();
const classDamage = { spy: 1000, soldier: 3, sniper: 100 };
const SPY_MELEE_RANGE = 2.75;
const SOLDIER_FIRE_INTERVAL = 0.075;
const MAX_PLAYER_HEALTH = 1000;
const ENEMY_DAMAGE = 100;
const projectileGeometry = new THREE.SphereGeometry(0.12, 10, 8);
const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff4d37 });
const enemyProjectiles = [];
const touchMove = new THREE.Vector2();
const touchLook = new THREE.Vector2();
const isTouchDevice = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
let playerHealth = MAX_PLAYER_HEALTH;
let isDefeated = false;
let mobilePlaying = false;
let isFiring = false;
let automaticFireCooldown = 0;
let muzzleFlashTime = 0;

function loadStoredScore() {
  try {
    const storedScore = Number.parseInt(localStorage.getItem(SCORE_STORAGE_KEY), 10);
    return Number.isFinite(storedScore) && storedScore >= 0 ? storedScore : 0;
  } catch {
    return 0;
  }
}

function loadOwnedClasses() {
  try {
    const storedClasses = JSON.parse(localStorage.getItem(OWNED_CLASSES_STORAGE_KEY));
    const validClasses = Array.isArray(storedClasses) ? storedClasses.filter((className) => CLASS_NAMES.has(className)) : [];
    return new Set(['sniper', ...validClasses]);
  } catch {
    return new Set(['sniper']);
  }
}

function loadSelectedClass() {
  try {
    const storedClass = localStorage.getItem(SELECTED_CLASS_STORAGE_KEY);
    return ownedClasses.has(storedClass) ? storedClass : 'sniper';
  } catch {
    return 'sniper';
  }
}

function saveClassProgress() {
  try {
    localStorage.setItem(OWNED_CLASSES_STORAGE_KEY, JSON.stringify([...ownedClasses]));
    localStorage.setItem(SELECTED_CLASS_STORAGE_KEY, selectedClass);
  } catch {
    // Class selection remains available when storage is unavailable.
  }
}

function updateWeaponForClass() {
  const isSpy = selectedClass === 'spy';
  const isSniper = selectedClass === 'sniper';
  weaponBody.visible = isSniper;
  weaponRail.visible = isSniper;
  muzzle.visible = isSniper;
  sniperParts.visible = selectedClass === 'sniper';
  knife.visible = isSpy;
  ak47.visible = selectedClass === 'soldier';
  isFiring = false;
}

function updateScore(amount) {
  score = amount;
  scoreElement.textContent = String(score).padStart(4, '0');
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, String(score));
  } catch {
    // The game still works when storage is unavailable.
  }
}

updateScore(score);
menu.querySelectorAll('.class-option').forEach((option) => {
  const className = option.dataset.class;
  const isOwned = ownedClasses.has(className);
  const isSelected = className === selectedClass;
  option.classList.toggle('locked', !isOwned);
  option.classList.toggle('selected', isSelected);
  option.setAttribute('aria-pressed', String(isSelected));
  option.querySelector('.class-price').textContent = isOwned ? 'OWNED' : `${option.dataset.price} PTS`;
});
classMessage.textContent = `${selectedClass.toUpperCase()} EQUIPPED`;
updateWeaponForClass();

function updatePlayerHealth(amount) {
  playerHealth = THREE.MathUtils.clamp(amount, 0, MAX_PLAYER_HEALTH);
  const ratio = playerHealth / MAX_PLAYER_HEALTH;
  playerHealthValue.textContent = String(playerHealth);
  playerHealthFill.style.width = `${ratio * 100}%`;
  playerHealthFill.style.background = ratio > 0.5 ? 'var(--acid)' : ratio > 0.25 ? '#ffd43b' : 'var(--coral)';
}

function clearEnemyProjectiles() {
  enemyProjectiles.forEach((projectile) => scene.remove(projectile));
  enemyProjectiles.length = 0;
}

function resetRun() {
  isDefeated = false;
  defeatMessage.hidden = true;
  updatePlayerHealth(MAX_PLAYER_HEALTH);
  camera.position.set(0, 1.72, 12);
  velocity.set(0, 0, 0);
  clearEnemyProjectiles();
}

function hasGameControl() {
  return isLocked() || mobilePlaying;
}

function resetTouchInput() {
  touchMove.set(0, 0);
  touchLook.set(0, 0);
  moveStick.querySelector('i').style.transform = 'translate(-50%, -50%)';
  lookStick.querySelector('i').style.transform = 'translate(-50%, -50%)';
  isFiring = false;
}

function setMobilePlaying(active) {
  mobilePlaying = active;
  document.body.classList.toggle('locked', active || isLocked());
  if (!active) resetTouchInput();
}

function defeatPlayer() {
  isDefeated = true;
  defeatMessage.hidden = false;
  classesMenu.hidden = true;
  mainMenu.hidden = false;
  clearEnemyProjectiles();
  setMobilePlaying(false);
  if (document.pointerLockElement) document.exitPointerLock();
}

function damagePlayer() {
  if (isDefeated) return;
  updatePlayerHealth(playerHealth - ENEMY_DAMAGE);
  damageFlash.classList.remove('active');
  void damageFlash.offsetWidth;
  damageFlash.classList.add('active');
  if (playerHealth === 0) defeatPlayer();
}

function isLocked() {
  return document.pointerLockElement === renderer.domElement;
}

function requestControl() {
  if (isTouchDevice) setMobilePlaying(true);
  else renderer.domElement.requestPointerLock();
}

deployButton.addEventListener('click', () => {
  if (isDefeated) resetRun();
  requestControl();
});
classesButton.addEventListener('click', () => {
  mainMenu.hidden = true;
  classesMenu.hidden = false;
});
classesBackButton.addEventListener('click', () => {
  classesMenu.hidden = true;
  mainMenu.hidden = false;
});
menu.querySelectorAll('.class-option').forEach((option) => {
  option.addEventListener('click', () => {
    const className = option.dataset.class;
    const price = Number(option.dataset.price);
    if (!ownedClasses.has(className)) {
      if (score < price) {
        classMessage.textContent = `NEED ${String(price).padStart(4, '0')} POINTS`;
        classMessage.classList.add('error');
        option.classList.remove('denied');
        void option.offsetWidth;
        option.classList.add('denied');
        return;
      }

      updateScore(score - price);
      ownedClasses.add(className);
      option.classList.remove('locked');
      option.querySelector('.class-price').textContent = 'OWNED';
    }

    menu.querySelectorAll('.class-option').forEach((classOption) => {
      const isSelected = classOption === option;
      classOption.classList.toggle('selected', isSelected);
      classOption.setAttribute('aria-pressed', String(isSelected));
    });
    selectedClass = className;
    updateWeaponForClass();
    saveClassProgress();
    classMessage.textContent = `${className.toUpperCase()} EQUIPPED`;
    classMessage.classList.remove('error');
  });
});
renderer.domElement.addEventListener('click', () => {
  if (isTouchDevice) return;
  if (!isLocked()) requestControl();
  else if (selectedClass !== 'soldier') shoot();
});
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (isTouchDevice || event.button !== 0 || !isLocked() || selectedClass !== 'soldier') return;
  isFiring = true;
  automaticFireCooldown = SOLDIER_FIRE_INTERVAL;
  shoot();
});
document.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'mouse') isFiring = false;
});

document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('locked', hasGameControl());
  if (!hasGameControl()) {
    keys.clear();
    velocity.set(0, 0, 0);
    isFiring = false;
    clearEnemyProjectiles();
  }
});

document.addEventListener('mousemove', (event) => {
  if (!isLocked()) return;
  yaw -= event.movementX * 0.0018;
  pitch -= event.movementY * 0.0018;
  pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2.15, Math.PI / 2.15);
  camera.rotation.set(pitch, yaw, 0);
});

function bindVirtualStick(element, output) {
  const knob = element.querySelector('i');
  let activePointer = null;

  function updateStick(event) {
    const bounds = element.getBoundingClientRect();
    const radius = bounds.width * 0.34;
    let offsetX = event.clientX - (bounds.left + bounds.width / 2);
    let offsetY = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(offsetX, offsetY);
    if (distance > radius) {
      offsetX *= radius / distance;
      offsetY *= radius / distance;
    }
    output.set(offsetX / radius, offsetY / radius);
    knob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }

  element.addEventListener('pointerdown', (event) => {
    activePointer = event.pointerId;
    element.setPointerCapture(activePointer);
    updateStick(event);
  });
  element.addEventListener('pointermove', (event) => {
    if (event.pointerId === activePointer) updateStick(event);
  });
  const release = (event) => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    output.set(0, 0);
    knob.style.transform = 'translate(-50%, -50%)';
  };
  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);
}

bindVirtualStick(moveStick, touchMove);
bindVirtualStick(lookStick, touchLook);

mobileFireButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (!mobilePlaying) return;
  mobileFireButton.setPointerCapture(event.pointerId);
  if (selectedClass === 'soldier') {
    isFiring = true;
    automaticFireCooldown = SOLDIER_FIRE_INTERVAL;
  }
  shoot();
});
mobileFireButton.addEventListener('pointerup', () => { isFiring = false; });
mobileFireButton.addEventListener('pointercancel', () => { isFiring = false; });
mobileExitButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  setMobilePlaying(false);
  clearEnemyProjectiles();
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyU') {
    document.exitPointerLock();
    return;
  }
  keys.add(event.code);
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => {
  keys.clear();
  isFiring = false;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetTouchInput();
});

function shoot() {
  shotKick = 1;
  if (selectedClass === 'soldier') muzzleFlashTime = 0.045;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersections = raycaster.intersectObjects(targets, true);
  if (!intersections.length) return;
  if (selectedClass === 'spy' && intersections[0].distance > SPY_MELEE_RANGE) return;

  let target = intersections[0].object;
  while (target.parent && !target.userData.isTarget) target = target.parent;
  if (!target.userData.isTarget || !target.visible) return;

  target.userData.health = Math.max(0, target.userData.health - classDamage[selectedClass]);
  target.userData.healthBar.visible = true;
  updateTargetHealthBar(target);
  hitMarker.classList.remove('active');
  void hitMarker.offsetWidth;
  hitMarker.classList.add('active');

  if (target.userData.health === 0) {
    target.visible = false;
    target.userData.healthBar.visible = false;
    updateScore(score + 10);
    setTimeout(() => {
      target.userData.health = MAX_TARGET_HEALTH;
      updateTargetHealthBar(target);
      target.visible = true;
    }, TARGET_RESPAWN_DELAY);
  }
}

function updateAutomaticFire(delta) {
  muzzleFlashTime = Math.max(0, muzzleFlashTime - delta);
  akMuzzleFlash.visible = selectedClass === 'soldier' && muzzleFlashTime > 0;
  if (selectedClass !== 'soldier' || !isFiring) return;

  automaticFireCooldown -= delta;
  while (automaticFireCooldown <= 0) {
    shoot();
    automaticFireCooldown += SOLDIER_FIRE_INTERVAL;
  }
}

function spawnEnemyProjectile(target) {
  const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
  projectile.position.copy(target.position);
  projectile.position.y += 0.9;
  const direction = camera.position.clone().sub(projectile.position).normalize();
  projectile.userData.velocity = direction.multiplyScalar(15);
  projectile.userData.life = 4;
  scene.add(projectile);
  enemyProjectiles.push(projectile);
}

function updateEnemyProjectiles(delta) {
  for (let index = enemyProjectiles.length - 1; index >= 0; index -= 1) {
    const projectile = enemyProjectiles[index];
    projectile.position.addScaledVector(projectile.userData.velocity, delta);
    projectile.userData.life -= delta;

    if (projectile.position.distanceToSquared(camera.position) < 0.42) {
      scene.remove(projectile);
      enemyProjectiles.splice(index, 1);
      damagePlayer();
      if (isDefeated) return;
    } else if (projectile.userData.life <= 0) {
      scene.remove(projectile);
      enemyProjectiles.splice(index, 1);
    }
  }
}

function updateEnemyBots(delta, elapsed) {
  targets.forEach((target) => {
    const patrolTime = elapsed * (0.35 + target.userData.phase * 0.025) + target.userData.phase;
    target.position.x = target.userData.baseX + Math.sin(patrolTime) * target.userData.patrolRadius;
    target.position.z = target.userData.baseZ + Math.cos(patrolTime * 0.83) * target.userData.patrolRadius;
    target.position.y = 0;
    target.rotation.y = Math.atan2(camera.position.x - target.position.x, camera.position.z - target.position.z);
    target.rotation.x = 0;
    target.userData.healthBar.position.set(target.position.x, target.position.y + 2.35, target.position.z);

    if (!hasGameControl() || !target.visible || isDefeated) return;
    target.userData.fireCooldown -= delta;
    if (target.userData.fireCooldown <= 0) {
      spawnEnemyProjectile(target);
      target.userData.fireCooldown = 5 + Math.random() * 2.5;
    }
  });
}

function updateMovement(delta) {
  const forward = THREE.MathUtils.clamp(Number(keys.has('KeyW')) - Number(keys.has('KeyS')) - touchMove.y, -1, 1);
  const strafe = THREE.MathUtils.clamp(Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + touchMove.x, -1, 1);
  moveDirection.set(strafe, 0, -forward);
  if (moveDirection.lengthSq() > 0) moveDirection.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

  const acceleration = 34;
  velocity.x += moveDirection.x * acceleration * delta;
  velocity.z += moveDirection.z * acceleration * delta;
  const drag = Math.exp(-10 * delta);
  velocity.x *= drag;
  velocity.z *= drag;

  camera.position.x = THREE.MathUtils.clamp(camera.position.x + velocity.x * delta, -23.5, 23.5);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z + velocity.z * delta, -46, 36);

  const speed = Math.hypot(velocity.x, velocity.z);
  if (speed > 0.15) walkTime += delta * (7 + speed * 0.55);
  const bob = Math.sin(walkTime) * Math.min(speed * 0.005, 0.025);
  camera.position.y = 1.72 + Math.abs(Math.sin(walkTime)) * Math.min(speed * 0.004, 0.022);
  weapon.position.x = 0.35 + Math.cos(walkTime * 0.5) * bob;
  weapon.position.y = -0.3 - Math.abs(bob) - shotKick * 0.045;
  weapon.rotation.x = -0.08 + shotKick * 0.12;
  weapon.rotation.z = selectedClass === 'spy' ? -shotKick * 0.55 : 0;

  shotKick = Math.max(0, shotKick - delta * 8);
  const spread = 9 + Math.min(speed * 1.4, 13) + shotKick * 9;
  crosshair.style.setProperty('--spread', `${spread}px`);
}

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const delta = Math.min(timer.getDelta(), 0.05);
  if (mobilePlaying) {
    yaw -= touchLook.x * delta * 2.35;
    pitch -= touchLook.y * delta * 1.8;
    pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2.15, Math.PI / 2.15);
    camera.rotation.set(pitch, yaw, 0);
  }
  if (hasGameControl()) {
    updateMovement(delta);
    updateAutomaticFire(delta);
    updateEnemyProjectiles(delta);
  }

  const elapsed = timer.getElapsed();
  updateEnemyBots(delta, elapsed);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

animate();