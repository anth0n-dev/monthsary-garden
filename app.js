// ============================================================================
// 🌙 OUR STARLIT GARDEN - 4 Gate Trials + 3D Roller Coaster + Night Garden
// ============================================================================

(function () {
  const CFG = window.GARDEN_CONFIG;
  const PHOTOS = CFG.photos || [];

  // --- DOM Elements ---
  const container = document.getElementById('canvas-container');
  const welcomeOverlay = document.getElementById('welcome-overlay');
  const welcomeTitle = document.getElementById('welcome-title');
  const welcomeSubtitle = document.getElementById('welcome-subtitle');
  const enterGardenBtn = document.getElementById('enter-garden-btn');

  const hud = document.getElementById('hud');
  const gateStatusPill = document.getElementById('gate-status-pill');
  const crosshair = document.getElementById('crosshair');
  const interactionPrompt = document.getElementById('interaction-prompt');
  const promptText = document.getElementById('prompt-text');
  const musicIndicator = document.getElementById('music-indicator');
  const gameToast = document.getElementById('game-toast');

  // Gate 3 Phone Keypad Modal DOM
  const phoneModal = document.getElementById('phone-modal');
  const phoneDevice = document.getElementById('phone-device');
  const closePhoneBtn = document.getElementById('close-phone-btn');
  const phoneLockIcon = document.getElementById('phone-lock-icon');
  const phonePromptLabel = document.getElementById('phone-prompt-label');
  const pinDotEls = Array.from(document.querySelectorAll('#pin-dots .pin-dot'));
  const keypadBtns = Array.from(document.querySelectorAll('.keypad-btn[data-digit]'));
  const pinClearBtn = document.getElementById('pin-clear-btn');
  const pinBackBtn = document.getElementById('pin-back-btn');

  // Love Letter Modal DOM
  const letterModal = document.getElementById('letter-modal');
  const closeLetterBtn = document.getElementById('close-letter-btn');
  const letterHeading = document.getElementById('letter-heading');
  const letterBody = document.getElementById('letter-body');
  const letterSignoff = document.getElementById('letter-signoff');
  const letterYourname = document.getElementById('letter-yourname');
  const releaseLanternsBtn = document.getElementById('release-lanterns-btn');

  // Apply Config Texts
  welcomeTitle.textContent = CFG.monthsaryTitle;
  welcomeSubtitle.textContent = CFG.welcomeSubtitle;
  letterHeading.textContent = CFG.loveLetter.heading;
  letterSignoff.textContent = CFG.loveLetter.signOff;
  letterYourname.textContent = CFG.loveLetter.yourName || 'Your Love ❤️';
  releaseLanternsBtn.textContent = CFG.loveLetter.wishButtonText;

  letterBody.innerHTML = '';
  CFG.loveLetter.paragraphs.forEach((p) => {
    const pEl = document.createElement('p');
    pEl.textContent = p;
    letterBody.appendChild(pEl);
  });

  // --- Game, Gate & Roller Coaster State ---
  let isPointerLocked = false;
  let activeModal = null; // 'phone' | 'letter' | null
  let hoveredInteractable = null;

  // Gate Progress: 0..3 = Gates 1..4, 4 = Coaster Unlocked, 5 = Arrived in Garden
  let unlockedGates = 0;
  let enteredPin = '';

  // Roller Coaster State
  let isRidingCoaster = false;
  let coasterProgress = 0;
  const COASTER_DURATION = 13.5; // seconds for the scenic ride

  const SPAWN_Z = 60.5;
  const PLAYER_HEIGHT = 1.65;
  const player = {
    pos: new THREE.Vector3(0, PLAYER_HEIGHT, SPAWN_Z),
    yaw: 0,
    pitch: 0.02,
    speed: 4.5,
    walkBobTimer: 0
  };
  const keys = { w: false, a: false, s: false, d: false, shift: false };

  let toastTimer = null;
  function showGameToast(msg, type = 'normal', duration = 3600) {
    gameToast.textContent = msg;
    gameToast.className = `game-toast ${type}`;
    gameToast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      gameToast.classList.add('hidden');
    }, duration);
  }

  function updateGateHUD() {
    if (unlockedGates >= 5) {
      gateStatusPill.textContent = '🌙 Starlit Garden';
    } else if (unlockedGates === 4) {
      gateStatusPill.textContent = '🎢 Board Roller Coaster!';
    } else {
      gateStatusPill.textContent = `🔒 Gate ${unlockedGates + 1} / 4`;
    }
  }

  // --- Audio (Google Drive MP3 "El Manu - Tahanan" + Sound Effects) ---
  let audioCtx = null;
  let customAudioEl = null;
  let isMusicPlaying = false;

  function ensureAudioCtx() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function initAudio() {
    ensureAudioCtx();
    if (CFG.customSongUrl && CFG.customSongUrl.trim() !== '') {
      if (!customAudioEl) {
        customAudioEl = new Audio(CFG.customSongUrl);
        customAudioEl.loop = true;
        customAudioEl.volume = 0.55;
      }
      customAudioEl.play().then(() => {
        isMusicPlaying = true;
        updateMusicUI();
      }).catch((err) => {
        console.warn('Audio autoplay blocked until interaction:', err);
      });
    }
  }

  function playTone(freq, gainVal, duration, type = 'sine') {
    ensureAudioCtx();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  function playSparkleChime() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => playTone(f, 0.065, 1.2, 'sine'), idx * 85);
    });
  }

  function playCutePlushieSound() {
    [659.25, 880.0, 1046.5, 1318.5].forEach((f, idx) => {
      setTimeout(() => playTone(f, 0.055, 0.35, 'sine'), idx * 70);
    });
  }

  function playErrorBuzzer() {
    [220, 165].forEach((f, idx) => {
      setTimeout(() => playTone(f, 0.08, 0.45, 'triangle'), idx * 160);
    });
  }

  function toggleMusic() {
    if (customAudioEl) {
      if (isMusicPlaying) {
        customAudioEl.pause();
        isMusicPlaying = false;
      } else {
        customAudioEl.play();
        isMusicPlaying = true;
      }
    }
    updateMusicUI();
  }

  function updateMusicUI() {
    musicIndicator.textContent = isMusicPlaying ? '🎵 Tahanan [M]' : '🔇 Muted [M]';
  }

  // --- Three.js Scene Setup (Deep, Dark Night with Glowing Lights!) ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020208);
  scene.fog = new THREE.FogExp2(0x03020c, 0.016);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 180);
  camera.rotation.order = 'YXZ';

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  // --- Deep Night Lighting + Warm Glowing Point Lights ---
  const ambientLight = new THREE.HemisphereLight(0x283266, 0x080612, 0.22);
  scene.add(ambientLight);

  const moonLight = new THREE.DirectionalLight(0x6e85cc, 0.25);
  moonLight.position.set(16, 28, -20);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 2048;
  moonLight.shadow.mapSize.height = 2048;
  const d = 18;
  moonLight.shadow.camera.left = -d;
  moonLight.shadow.camera.right = d;
  moonLight.shadow.camera.top = d;
  moonLight.shadow.camera.bottom = -d;
  scene.add(moonLight);

  // Warm Glowing Garden Point Lights (Creates magical night pools of light!)
  const gazeboLight = new THREE.PointLight(0xffaa44, 2.6, 16, 1.5);
  gazeboLight.position.set(0, 3.2, 0);
  gazeboLight.castShadow = true;
  scene.add(gazeboLight);

  const gardenGlowSpots = [
    [-6.2, 2.6, 4.2, 0xff9ec7, 1.7, 12],
    [6.2, 2.6, 4.2, 0xffcf70, 1.7, 12],
    [-6.2, 2.6, -4.8, 0xffb86c, 1.7, 12],
    [6.2, 2.6, -4.8, 0xff8fb8, 1.7, 12],
    [0, 2.6, -7.2, 0xffd485, 1.6, 11],
    [0, 3.8, 52.0, 0xffb86c, 1.6, 18],
    [0, 3.8, 38.0, 0xff9ec7, 1.6, 18]
  ];
  gardenGlowSpots.forEach(([lx, ly, lz, col, inten, dist]) => {
    const pl = new THREE.PointLight(col, inten, dist, 1.6);
    pl.position.set(lx, ly, lz);
    scene.add(pl);
  });

  // --- Shared Materials (Darker night tones + higher emissive glow) ---
  const interactableMeshes = [];
  const animatedDisplays = [];
  const floatingHearts = [];
  const burstHearts = [];

  const fenceWoodMat = new THREE.MeshStandardMaterial({ color: 0x2b1b15, roughness: 0.85 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x1f120e, roughness: 0.8 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0x9e95b0, roughness: 0.5, metalness: 0.15 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3b3847, roughness: 0.88, metalness: 0.1 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffcf75,
    emissive: 0xff9d2e,
    emissiveIntensity: 0.42,
    roughness: 0.25,
    metalness: 0.8
  });
  const roseGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffb3c6,
    emissive: 0xff5c8a,
    emissiveIntensity: 0.38,
    roughness: 0.28,
    metalness: 0.7
  });
  const polaroidWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xfff5ea,
    emissive: 0x382c22,
    emissiveIntensity: 0.25,
    roughness: 0.4
  });

  function createNightGrassTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#050c0d';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#081617' : '#04090a';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 5);
    }
    // Glowing bioluminescent night specs on grass
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,170,210,0.65)' : 'rgba(255,220,130,0.65)';
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }

  function createHeartMesh(colorHex, scale = 0.16) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.25);
    shape.bezierCurveTo(0, 0.5, -0.5, 0.8, -0.9, 0.4);
    shape.bezierCurveTo(-1.3, 0, -0.9, -0.6, 0, -1.2);
    shape.bezierCurveTo(0.9, -0.6, 1.3, 0, 0.9, 0.4);
    shape.bezierCurveTo(0.5, 0.8, 0, 0.5, 0, 0.25);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05
    });
    geo.center();
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(scale, scale, scale);
    return mesh;
  }

  function spawnHeartBurst(originVec, count = 10) {
    for (let i = 0; i < count; i++) {
      const h = createHeartMesh(i % 2 === 0 ? 0xff6b9d : 0xffd485, 0.09);
      h.position.copy(originVec);
      h.position.x += (Math.random() - 0.5) * 0.8;
      h.position.z += (Math.random() - 0.5) * 0.8;
      scene.add(h);
      burstHearts.push({
        mesh: h,
        velY: 0.9 + Math.random() * 0.7,
        velX: (Math.random() - 0.5) * 0.6,
        velZ: (Math.random() - 0.5) * 0.6,
        life: 1.8
      });
    }
  }

  function createSignBanner(titleText, subText = '') {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 130;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#140d26';
    ctx.fillRect(0, 0, 640, 130);
    ctx.strokeStyle = '#ffd485';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 624, 114);

    ctx.fillStyle = '#ffd485';
    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, 320, subText ? 56 : 75);

    if (subText) {
      ctx.fillStyle = '#ffb8d2';
      ctx.font = '22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(subText, 320, 96);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.56, 0.08),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
  }

  // --- 20m × 20m Garden Ground + Glowing Pathway Lanterns ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20, 32, 32),
    new THREE.MeshStandardMaterial({ map: createNightGrassTexture(), roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x030608, roughness: 1 })
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.04;
  scene.add(outerGround);

  function addSteppingStone(x, z, radius, rotY = 0) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.06, 0.05, 7), stoneMat);
    stone.position.set(x, 0.025, z);
    stone.rotation.y = rotY;
    stone.receiveShadow = true;
    scene.add(stone);
  }

  // Glowing Ground Orbs along the garden paths
  function addGlowingGardenLamp(x, z, colorHex = 0xffd78a) {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.45, 8), darkWoodMat);
    stand.position.set(x, 0.22, z);
    scene.add(stand);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 12),
      new THREE.MeshBasicMaterial({ color: colorHex, toneMapped: false })
    );
    globe.position.set(x, 0.48, z);
    scene.add(globe);
  }

  for (let z = 7.0; z >= 2.6; z -= 0.75) {
    addSteppingStone(Math.sin(z * 2) * 0.12, z, 0.34, z);
  }
  [
    [-1.4, 6.2], [1.4, 6.2],
    [-1.4, 3.8], [1.4, 3.8],
    [-3.2, 2.2], [3.2, 2.2],
    [-3.2, -2.5], [3.2, -2.5],
    [-2.2, -5.5], [2.2, -5.5]
  ].forEach(([lx, lz], idx) => {
    addGlowingGardenLamp(lx, lz, idx % 2 === 0 ? 0xffe299 : 0xff9ec7);
  });

  // --- Build 20m × 20m Perimeter Fence & Glowing Night Hedges ---
  function buildGardenBorder() {
    const half = 9.75;
    const lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd78a, toneMapped: false });
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x071712, roughness: 0.92 });

    for (let i = -9; i <= 9; i += 3) {
      [
        [i, -half],
        [i, half],
        [-half, i],
        [half, i]
      ].forEach(([x, z]) => {
        if (z > 9 && Math.abs(x) < 3.4) return;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), fenceWoodMat);
        post.position.set(x, 0.55, z);
        scene.add(post);

        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), lanternGlowMat);
        cap.position.set(x, 1.16, z);
        scene.add(cap);
      });
    }

    for (let t = -9.2; t <= 9.2; t += 1.4) {
      const bushPositions = [
        [t, -9.6],
        [-9.6, t],
        [9.6, t]
      ];
      if (Math.abs(t) > 3.2) bushPositions.push([t, 9.6]);

      bushPositions.forEach(([bx, bz], i) => {
        const r = 0.55 + Math.abs(Math.sin(bx * bz)) * 0.3;
        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), hedgeMat);
        bush.position.set(bx, r * 0.65, bz);
        scene.add(bush);

        // Glowing fairy flower buds on the dark night hedges
        const bud = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 6, 6),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff8fb8 : 0xffe28a, toneMapped: false })
        );
        bud.position.set(bx + 0.15, r * 1.15, bz + 0.15);
        scene.add(bud);
      });
    }
  }
  buildGardenBorder();

  // ==========================================================================
  // 🌉 4 QUESTION GATES ON THE UPPER SKY BRIDGE (Z = 62m to 31m)
  // ==========================================================================
  const gateBarrierMeshes = [];
  let leftGardenDoorPivot = null;
  let rightGardenDoorPivot = null;
  const stage1Crystals = [];
  const stage2PortalBoxes = [];
  const orbitingPlanets = [];

  function buildTrialBridgeAndGates() {
    // Bridge floor from Z = 30.0 to Z = 62.5
    const bridgeFloor = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.16, 33.0),
      new THREE.MeshStandardMaterial({ color: 0x161224, roughness: 0.85 })
    );
    bridgeFloor.position.set(0, 0.02, 46.5);
    scene.add(bridgeFloor);

    for (let z = 31; z <= 62; z += 3.0) {
      [-3.0, 3.0].forEach((x) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), marbleMat);
        pillar.position.set(x, 0.5, z);
        scene.add(pillar);

        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 8),
          new THREE.MeshBasicMaterial({ color: z % 6 === 0 ? 0xffd485 : 0xff8fb8, toneMapped: false })
        );
        orb.position.set(x, 1.12, z);
        scene.add(orb);
      });
    }

    function createMagicGateArch(zPos, title, subtitle) {
      const arch = new THREE.Group();
      arch.position.set(0, 0, zPos);

      const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.5, 10), marbleMat);
      pL.position.set(-2.8, 1.75, 0);
      arch.add(pL);

      const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.5, 10), marbleMat);
      pR.position.set(2.8, 1.75, 0);
      arch.add(pR);

      const topBar = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.2, 0.3), goldMat);
      topBar.position.set(0, 3.5, 0);
      arch.add(topBar);

      const sign = createSignBanner(title, subtitle);
      sign.position.set(0, 3.45, 0.2);
      arch.add(sign);

      const barrierMat = new THREE.MeshBasicMaterial({
        color: 0xff5c97,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      const barrier = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.3), barrierMat);
      barrier.position.set(0, 1.7, 0);
      arch.add(barrier);

      scene.add(arch);
      return barrier;
    }

    // --- GATE 1 (Z = 54.5): Favorite Color (Blue) ---
    const barrier1 = createMagicGateArch(54.5, 'GATE 1 • My Favorite Color?', 'Click the right glowing crystal');
    gateBarrierMeshes.push(barrier1);

    [
      { name: 'Red', color: 0xff3b5c, x: -2.1, isCorrect: false },
      { name: 'Blue', color: 0x2b88ff, x: -0.7, isCorrect: true },
      { name: 'Green', color: 0x2ce58b, x: 0.7, isCorrect: false },
      { name: 'Purple', color: 0xb14dff, x: 2.1, isCorrect: false }
    ].forEach((opt) => {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.95, 10), marbleMat);
      ped.position.set(opt.x, 0.48, 56.5);
      scene.add(ped);

      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshBasicMaterial({ color: opt.color, toneMapped: false })
      );
      crystal.position.set(opt.x, 1.38, 56.5);
      crystal.userData = {
        type: 'gate1_crystal',
        colorName: opt.name,
        isCorrect: opt.isCorrect,
        prompt: `Pick ${opt.name} Crystal 💎`
      };
      interactableMeshes.push(crystal);
      stage1Crystals.push(crystal);
      scene.add(crystal);
    });

    // --- GATE 2 (Z = 47.5): Dream Destination (Japan) ---
    const barrier2 = createMagicGateArch(47.5, 'GATE 2 • Dream Destination?', 'Walk into or Click the right picture');
    gateBarrierMeshes.push(barrier2);

    function createDestinationPortalCanvas(country, theme) {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 680;
      const ctx = c.getContext('2d');

      if (theme === 'switzerland') {
        const g = ctx.createLinearGradient(0, 0, 0, 680);
        g.addColorStop(0, '#1e487c');
        g.addColorStop(0.55, '#7ec4ef');
        g.addColorStop(1, '#2b6e46');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 680);
        ctx.fillStyle = '#e6f2fa';
        ctx.beginPath();
        ctx.moveTo(0, 440);
        ctx.lineTo(150, 200);
        ctx.lineTo(290, 390);
        ctx.lineTo(390, 170);
        ctx.lineTo(512, 420);
        ctx.lineTo(512, 680);
        ctx.lineTo(0, 680);
        ctx.fill();
        ctx.fillStyle = '#296b45';
        ctx.fillRect(0, 440, 512, 240);
      } else if (theme === 'japan') {
        const g = ctx.createLinearGradient(0, 0, 0, 680);
        g.addColorStop(0, '#2a163d');
        g.addColorStop(0.5, '#b84a79');
        g.addColorStop(1, '#ffb3c6');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 680);
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath();
        ctx.arc(256, 280, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#231942';
        ctx.beginPath();
        ctx.moveTo(20, 520);
        ctx.quadraticCurveTo(180, 420, 225, 290);
        ctx.lineTo(287, 290);
        ctx.quadraticCurveTo(332, 420, 492, 520);
        ctx.lineTo(512, 680);
        ctx.lineTo(0, 680);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(225, 290);
        ctx.lineTo(287, 290);
        ctx.lineTo(308, 345);
        ctx.lineTo(275, 330);
        ctx.lineTo(256, 350);
        ctx.lineTo(235, 330);
        ctx.lineTo(204, 345);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d90429';
        ctx.fillRect(156, 420, 200, 18);
        ctx.fillRect(172, 450, 168, 12);
        ctx.fillRect(190, 430, 16, 140);
        ctx.fillRect(306, 430, 16, 140);
      } else if (theme === 'korea') {
        const g = ctx.createLinearGradient(0, 0, 0, 680);
        g.addColorStop(0, '#121838');
        g.addColorStop(0.6, '#483b78');
        g.addColorStop(1, '#f29e6d');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 680);
        ctx.fillStyle = '#1b142e';
        ctx.beginPath();
        ctx.moveTo(0, 540);
        ctx.quadraticCurveTo(256, 440, 512, 540);
        ctx.lineTo(512, 680);
        ctx.lineTo(0, 680);
        ctx.fill();
        ctx.fillRect(246, 260, 20, 220);
        ctx.fillStyle = '#ffd485';
        ctx.fillRect(222, 275, 68, 28);
        ctx.fillStyle = '#ff6b9d';
        ctx.fillRect(252, 185, 8, 80);
      }

      ctx.fillStyle = 'rgba(18, 12, 34, 0.88)';
      ctx.fillRect(24, 570, 464, 82);
      ctx.strokeStyle = '#ffd485';
      ctx.lineWidth = 4;
      ctx.strokeRect(24, 570, 464, 82);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(country, 256, 623);

      const tex = new THREE.CanvasTexture(c);
      tex.encoding = THREE.sRGBEncoding;
      return tex;
    }

    [
      { country: 'SWITZERLAND 🇨🇭', theme: 'switzerland', x: -1.85, isCorrect: false },
      { country: 'JAPAN 🇯🇵', theme: 'japan', x: 0.0, isCorrect: true },
      { country: 'SOUTH KOREA 🇰🇷', theme: 'korea', x: 1.85, isCorrect: false }
    ].forEach((dest) => {
      const portalGroup = new THREE.Group();
      portalGroup.position.set(dest.x, 1.4, 49.3);

      const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(1.52, 2.15, 0.08), goldMat);
      portalGroup.add(frameOuter);

      const portalTex = createDestinationPortalCanvas(dest.country, dest.theme);
      const portalPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 2.02),
        new THREE.MeshBasicMaterial({ map: portalTex, toneMapped: false })
      );
      portalPlane.position.z = 0.045;
      portalPlane.userData = {
        type: 'gate2_destination',
        country: dest.country,
        isCorrect: dest.isCorrect,
        prompt: `Pick ${dest.country} ✈️`
      };
      interactableMeshes.push(portalPlane);
      portalGroup.add(portalPlane);
      scene.add(portalGroup);

      stage2PortalBoxes.push({
        x: dest.x,
        z: 49.3,
        country: dest.country,
        isCorrect: dest.isCorrect
      });
    });

    // --- GATE 3 (Z = 41.0): 4-Digit Phone PIN (8080) ---
    const barrier3 = createMagicGateArch(41.0, 'GATE 3 • My Cellphone PIN?', 'Click the phone to enter 4-digit PIN');
    gateBarrierMeshes.push(barrier3);

    const phonePed = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.0, 12), marbleMat);
    phonePed.position.set(0, 0.5, 42.8);
    scene.add(phonePed);

    const phoneCanvas = document.createElement('canvas');
    phoneCanvas.width = 256;
    phoneCanvas.height = 460;
    const pCtx = phoneCanvas.getContext('2d');
    pCtx.fillStyle = '#16102c';
    pCtx.fillRect(0, 0, 256, 460);
    pCtx.strokeStyle = '#ffd485';
    pCtx.lineWidth = 8;
    pCtx.strokeRect(8, 8, 240, 444);
    pCtx.fillStyle = '#ffffff';
    pCtx.font = 'bold 44px sans-serif';
    pCtx.textAlign = 'center';
    pCtx.fillText('🔒', 128, 120);
    pCtx.fillText('08:08', 128, 185);
    pCtx.fillStyle = '#ffd485';
    pCtx.font = '22px sans-serif';
    pCtx.fillText('CLICK TO ENTER', 128, 260);
    pCtx.fillText('4-DIGIT PIN', 128, 292);

    const phoneTex = new THREE.CanvasTexture(phoneCanvas);
    phoneTex.encoding = THREE.sRGBEncoding;
    const phone3DMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 1.05, 0.08),
      new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false })
    );
    phone3DMesh.position.set(0, 1.55, 42.8);
    phone3DMesh.rotation.x = -0.15;
    phone3DMesh.userData = {
      type: 'gate3_phone',
      prompt: 'Unlock Phone PIN 📱'
    };
    interactableMeshes.push(phone3DMesh);
    scene.add(phone3DMesh);

    // --- GATE 4 (Z = 34.5): Hottest Planet in the Solar System (Venus) ---
    const barrier4 = createMagicGateArch(34.5, 'GATE 4 • Hottest Planet?', 'Click the hottest orbiting planet!');
    gateBarrierMeshes.push(barrier4);

    const solarPed = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.85, 12), marbleMat);
    solarPed.position.set(0, 0.42, 36.8);
    scene.add(solarPed);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffcc33, toneMapped: false })
    );
    sunMesh.position.set(0, 1.55, 36.8);
    scene.add(sunMesh);

    [
      { name: 'Mercury', color: 0xa8a29e, radius: 0.75, size: 0.14, speed: 1.55, angle: 0.2, isCorrect: false },
      { name: 'Venus', color: 0xffb703, radius: 1.15, size: 0.19, speed: 1.15, angle: 1.8, isCorrect: true },
      { name: 'Earth', color: 0x38bdf8, radius: 1.55, size: 0.19, speed: 0.9, angle: 3.4, isCorrect: false },
      { name: 'Mars', color: 0xef4444, radius: 1.95, size: 0.17, speed: 0.72, angle: 4.8, isCorrect: false },
      { name: 'Jupiter', color: 0xd97706, radius: 2.38, size: 0.25, speed: 0.52, angle: 5.9, isCorrect: false }
    ].forEach((pDef) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(pDef.radius - 0.012, pDef.radius + 0.012, 48),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 1.55, 36.8);
      scene.add(ring);

      const planetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(pDef.size, 16, 16),
        new THREE.MeshBasicMaterial({ color: pDef.color, toneMapped: false })
      );

      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 256;
      tagCanvas.height = 64;
      const tCtx = tagCanvas.getContext('2d');
      tCtx.fillStyle = 'rgba(16, 12, 32, 0.9)';
      tCtx.fillRect(16, 8, 224, 48);
      tCtx.strokeStyle = '#ffd485';
      tCtx.lineWidth = 3;
      tCtx.strokeRect(16, 8, 224, 48);
      tCtx.fillStyle = '#ffffff';
      tCtx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
      tCtx.textAlign = 'center';
      tCtx.fillText(pDef.name, 128, 42);

      const tagSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tagCanvas), toneMapped: false })
      );
      tagSprite.scale.set(0.68, 0.17, 1);
      tagSprite.position.set(0, pDef.size + 0.22, 0);
      planetMesh.add(tagSprite);

      planetMesh.userData = {
        type: 'gate4_planet',
        planetName: pDef.name,
        isCorrect: pDef.isCorrect,
        prompt: `Catch ${pDef.name} 🪐`
      };
      interactableMeshes.push(planetMesh);
      scene.add(planetMesh);

      orbitingPlanets.push({
        mesh: planetMesh,
        radius: pDef.radius,
        speed: pDef.speed,
        angle: pDef.angle,
        centerZ: 36.8
      });
    });
  }
  buildTrialBridgeAndGates();

  // ==========================================================================
  // 🎢 3D STARLIGHT ROLLER COASTER RIDE (From Z = 31.5m to Garden Entrance Z = 8.4m)
  // ==========================================================================
  let coasterCurve = null;
  let coasterCartGroup = null;

  function buildStarlightRollerCoaster() {
    // Scenic 3D Roller Coaster Curve with lift hill, big drop, banking turns & glowing heart rings!
    coasterCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.35, 31.5),    // Boarding Station after Gate 4
      new THREE.Vector3(0, 4.8, 27.0),     // Climb Lift Hill
      new THREE.Vector3(-4.5, 9.2, 22.5),  // High Starry Peak Left
      new THREE.Vector3(-8.0, 3.2, 18.0),  // Thrilling Swoop Drop
      new THREE.Vector3(0.0, 6.8, 15.0),   // Camelback Airtime Hill Overlooking Garden
      new THREE.Vector3(7.5, 4.2, 12.2),   // Sweeping Right Bank Turn
      new THREE.Vector3(2.2, 1.4, 9.8),    // Final Glide
      new THREE.Vector3(0, 0.35, 8.3)      // Garden Entrance Arrival!
    ]);

    // Glowing Twin Neon Rails
    const railTubeGeo = new THREE.TubeGeometry(coasterCurve, 140, 0.08, 8, false);
    const railMat = new THREE.MeshBasicMaterial({ color: 0xff8fb8, toneMapped: false });
    const mainRail = new THREE.Mesh(railTubeGeo, railMat);
    scene.add(mainRail);

    // Glowing Gold Track Cross-Ties & Support Pillars along the Coaster
    const steps = 65;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = coasterCurve.getPointAt(t);
      const tangent = coasterCurve.getTangentAt(t);

      const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.05, 0.16),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xffd485 : 0x72efdd, toneMapped: false })
      );
      tie.position.copy(pt);
      tie.lookAt(pt.clone().add(tangent));
      scene.add(tie);

      // Support columns down to the ground
      if (i % 6 === 0 && pt.y > 0.6) {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, pt.y, 8),
          stoneMat
        );
        col.position.set(pt.x, pt.y / 2, pt.z);
        scene.add(col);
      }

      // Giant Glowing Neon Tunnel Rings along the Coaster Track!
      if (i > 4 && i < steps - 4 && i % 9 === 0) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.65, 0.055, 10, 32),
          new THREE.MeshBasicMaterial({
            color: i % 18 === 0 ? 0xff6b9d : 0xffd485,
            toneMapped: false
          })
        );
        ring.position.copy(pt);
        ring.position.y += 0.7;
        ring.lookAt(pt.clone().add(tangent));
        scene.add(ring);
      }
    }

    // Coaster Boarding Sign at Z = 31.8
    const coasterSign = createSignBanner('🎢 STARLIGHT ROLLER COASTER', 'Click the Coaster Cart to Ride into the Garden!');
    coasterSign.position.set(0, 3.2, 31.5);
    scene.add(coasterSign);

    // 3D Roller Coaster Cart
    coasterCartGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.55, 1.65),
      new THREE.MeshStandardMaterial({
        color: 0xff4d88,
        emissive: 0x661133,
        emissiveIntensity: 0.5,
        roughness: 0.3
      })
    );
    body.position.y = 0.35;
    coasterCartGroup.add(body);

    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.1, 1.72), goldMat);
    goldTrim.position.y = 0.62;
    coasterCartGroup.add(goldTrim);

    // Seat backrest
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.15), polaroidWhiteMat);
    seatBack.position.set(0, 0.7, 0.55);
    coasterCartGroup.add(seatBack);

    // Glowing front headlights on the cart
    [-0.38, 0.38].forEach((hx) => {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff3b0, toneMapped: false })
      );
      lamp.position.set(hx, 0.42, -0.84);
      coasterCartGroup.add(lamp);
    });

    // Interactive Hitbox for Boarding the Coaster
    const cartHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.4, 2.1),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    cartHitbox.position.y = 0.6;
    cartHitbox.userData = {
      type: 'coaster_cart',
      prompt: 'Board Starlight Roller Coaster 🎢'
    };
    interactableMeshes.push(cartHitbox);
    coasterCartGroup.add(cartHitbox);

    coasterCartGroup.position.set(0, 0.35, 31.5);
    scene.add(coasterCartGroup);
  }
  buildStarlightRollerCoaster();

  function startRollerCoasterRide() {
    if (isRidingCoaster) return;
    playSparkleChime();
    isRidingCoaster = true;
    coasterProgress = 0;
    showGameToast('🎢 Hold on tight! Riding the Starlight Coaster into Our Garden! ✨', 'success', 4500);
    triggerWishLanternBurst(14);
  }

  // --- Entrance Welcome Archway + Swinging Golden Garden Doors (at Z = 7.2) ---
  function buildEntranceArchAndDoors() {
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, 7.2);

    const pillarGeo = new THREE.BoxGeometry(0.24, 3.3, 0.24);
    const leftPillar = new THREE.Mesh(pillarGeo, fenceWoodMat);
    leftPillar.position.set(-1.5, 1.65, 0);
    archGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, fenceWoodMat);
    rightPillar.position.set(1.5, 1.65, 0);
    archGroup.add(rightPillar);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.24, 0.38), fenceWoodMat);
    topBeam.position.set(0, 3.3, 0);
    archGroup.add(topBeam);

    const signBoard = createSignBanner(CFG.archwayBannerText || 'Happy Monthsary');
    signBoard.scale.set(0.82, 0.82, 1);
    signBoard.position.set(0, 3.1, 0.2);
    archGroup.add(signBoard);

    leftGardenDoorPivot = new THREE.Group();
    leftGardenDoorPivot.position.set(-1.38, 0, 0);
    const leftDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.34, 2.7, 0.08), goldMat);
    leftDoorMesh.position.set(0.67, 1.35, 0);
    leftGardenDoorPivot.add(leftDoorMesh);
    archGroup.add(leftGardenDoorPivot);

    rightGardenDoorPivot = new THREE.Group();
    rightGardenDoorPivot.position.set(1.38, 0, 0);
    const rightDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.34, 2.7, 0.08), goldMat);
    rightDoorMesh.position.set(-0.67, 1.35, 0);
    rightGardenDoorPivot.add(rightDoorMesh);
    archGroup.add(rightGardenDoorPivot);

    scene.add(archGroup);
  }
  buildEntranceArchAndDoors();

  function triggerSuddenDeathReset(reasonMsg) {
    playErrorBuzzer();
    unlockedGates = 0;
    updateGateHUD();

    gateBarrierMeshes.forEach((b) => {
      b.visible = true;
    });

    if (coasterCartGroup) {
      coasterCartGroup.position.set(0, 0.35, 31.5);
      coasterCartGroup.rotation.set(0, 0, 0);
    }

    player.pos.set(0, PLAYER_HEIGHT, SPAWN_Z);
    player.yaw = 0;
    player.pitch = 0.02;

    showGameToast(reasonMsg, 'trap', 4200);
  }

  // --- Central Romantic Gazebo, Love Letter & Monthsary Cake ---
  let letterEnvelopeMesh = null;
  let gazeboHeartMesh = null;
  const cakeCandleFlames = [];
  let cakePointLight = null;
  let candlesBlownOut = false;

  function buildCentralGazebo() {
    const gazebo = new THREE.Group();

    const step1 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.65, 0.18, 8), marbleMat);
    step1.position.y = 0.09;
    step1.receiveShadow = true;
    gazebo.add(step1);

    const step2 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.18, 8), marbleMat);
    step2.position.y = 0.27;
    step2.receiveShadow = true;
    gazebo.add(step2);

    const numPillars = 6;
    const pillarRadius = 1.98;
    for (let i = 0; i < numPillars; i++) {
      const angle = (i / numPillars) * Math.PI * 2 + Math.PI / 6;
      const px = Math.cos(angle) * pillarRadius;
      const pz = Math.sin(angle) * pillarRadius;

      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.1, 12), marbleMat);
      pillar.position.set(px, 1.9, pz);
      gazebo.add(pillar);

      for (let h = 0; h < 14; h++) {
        const spiralAngle = angle + h * 0.7;
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 6, 6),
          new THREE.MeshBasicMaterial({ color: h % 2 === 0 ? 0xffe094 : 0xff9ec7, toneMapped: false })
        );
        bulb.position.set(
          px + Math.cos(spiralAngle) * 0.13,
          0.55 + h * 0.2,
          pz + Math.sin(spiralAngle) * 0.13
        );
        gazebo.add(bulb);
      }
    }

    const roofRing = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.09, 8, 24), goldMat);
    roofRing.rotation.x = Math.PI / 2;
    roofRing.position.y = 3.45;
    gazebo.add(roofRing);

    const roofCone = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 1.4, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x221336, roughness: 0.6, side: THREE.DoubleSide })
    );
    roofCone.position.y = 4.12;
    gazebo.add(roofCone);

    const chandelier = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe5a3, toneMapped: false })
    );
    chandelier.position.set(0, 3.4, 0);
    gazebo.add(chandelier);

    // Love Letter Pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.05, 12), marbleMat);
    pedestal.position.set(-0.5, 0.88, -0.15);
    gazebo.add(pedestal);

    const pedestalTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.48), goldMat);
    pedestalTop.position.set(-0.5, 1.42, -0.15);
    gazebo.add(pedestalTop);

    const envGroup = new THREE.Group();
    envGroup.position.set(-0.5, 1.62, -0.15);

    const envCanvas = document.createElement('canvas');
    envCanvas.width = 256;
    envCanvas.height = 180;
    const eCtx = envCanvas.getContext('2d');
    eCtx.fillStyle = '#fff5ea';
    eCtx.fillRect(0, 0, 256, 180);
    eCtx.strokeStyle = '#e0a96d';
    eCtx.lineWidth = 8;
    eCtx.strokeRect(6, 6, 244, 168);
    eCtx.beginPath();
    eCtx.moveTo(6, 6);
    eCtx.lineTo(128, 98);
    eCtx.lineTo(250, 6);
    eCtx.stroke();
    eCtx.fillStyle = '#e63973';
    eCtx.beginPath();
    eCtx.arc(128, 94, 22, 0, Math.PI * 2);
    eCtx.fill();
    eCtx.fillStyle = '#ffffff';
    eCtx.font = '20px sans-serif';
    eCtx.textAlign = 'center';
    eCtx.fillText('♥', 128, 101);

    const envTex = new THREE.CanvasTexture(envCanvas);
    letterEnvelopeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.04, 0.35),
      new THREE.MeshBasicMaterial({ map: envTex, toneMapped: false })
    );
    letterEnvelopeMesh.rotation.x = 0.32;
    letterEnvelopeMesh.userData = {
      type: 'letter',
      prompt: 'Open Love Letter 💌'
    };
    interactableMeshes.push(letterEnvelopeMesh);
    envGroup.add(letterEnvelopeMesh);

    gazeboHeartMesh = createHeartMesh(0xff6b9d, 0.18);
    gazeboHeartMesh.position.set(-0.5, 2.05, -0.15);
    gazebo.add(gazeboHeartMesh);
    gazebo.add(envGroup);

    // Monthsary Cake Table
    const cakeGroup = new THREE.Group();
    cakeGroup.position.set(0.55, 0.36, -0.15);

    const tableStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.26, 0.88, 12), marbleMat);
    tableStand.position.y = 0.44;
    cakeGroup.add(tableStand);

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 20), goldMat);
    tableTop.position.y = 0.9;
    cakeGroup.add(tableTop);

    const tier1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.2, 20),
      new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.4 })
    );
    tier1.position.y = 1.02;
    cakeGroup.add(tier1);

    const tier2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.16, 20),
      new THREE.MeshStandardMaterial({ color: 0xffb6c9, roughness: 0.45 })
    );
    tier2.position.y = 1.2;
    cakeGroup.add(tier2);

    [
      [0, 0],
      [-0.08, 0.05],
      [0.08, 0.05]
    ].forEach(([cx, cz]) => {
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.13, 8),
        new THREE.MeshStandardMaterial({ color: 0xfff8dc })
      );
      candle.position.set(cx, 1.34, cz);
      cakeGroup.add(candle);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffdd66, toneMapped: false })
      );
      flame.scale.set(0.8, 1.6, 0.8);
      flame.position.set(cx, 1.43, cz);
      cakeGroup.add(flame);
      cakeCandleFlames.push(flame);
    });

    cakePointLight = new THREE.PointLight(0xffaa44, 1.1, 4.5);
    cakePointLight.position.set(0, 1.5, 0);
    cakeGroup.add(cakePointLight);

    const cakeHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.52, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    cakeHitbox.position.y = 1.18;
    cakeHitbox.userData = {
      type: 'cake',
      prompt: 'Blow Candles 🎂'
    };
    interactableMeshes.push(cakeHitbox);
    cakeGroup.add(cakeHitbox);

    gazebo.add(cakeGroup);
    scene.add(gazebo);
  }
  buildCentralGazebo();

  // ==========================================================================
  // 🧸 INTERACTIVE SEESAW WITH STUFFED TOYS + DUYAN WITH CUTE SMALL CREATURES!
  // ==========================================================================
  let seesawPlankGroup = null;
  let seesawBoostTimer = 0;
  let duyanSwingGroup = null;
  let duyanBounceTimer = 0;
  const cuteDuyanCreatures = [];

  function buildStuffedToySeesawAndDuyanCreatures() {
    // --- 1. INTERACTIVE SEESAW ("SAW") WITH TEDDY BEAR 🧸 & BUNNY PLUSHIE 🐰 (at x = -4.2, z = 4.2) ---
    const seesawRoot = new THREE.Group();
    seesawRoot.position.set(-4.2, 0, 4.2);
    seesawRoot.rotation.y = Math.PI * 0.22;

    // Fulcrum triangle base
    const base = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.52, 4),
      new THREE.MeshStandardMaterial({ color: 0xff8fb8, roughness: 0.5 })
    );
    base.position.y = 0.26;
    base.rotation.y = Math.PI / 4;
    seesawRoot.add(base);

    seesawPlankGroup = new THREE.Group();
    seesawPlankGroup.position.set(0, 0.5, 0);

    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.08, 0.44),
      new THREE.MeshStandardMaterial({ color: 0xffd485, roughness: 0.5 })
    );
    seesawPlankGroup.add(plank);

    // Handles on seesaw
    [-0.75, 0.75].forEach((hx) => {
      const handlePost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), darkWoodMat);
      handlePost.position.set(hx, 0.12, 0);
      seesawPlankGroup.add(handlePost);
    });

    // Helper: Build a Cute 3D Teddy Bear Stuffed Toy on Left Seat (x = -1.0)
    const bearGroup = new THREE.Group();
    bearGroup.position.set(-1.0, 0.22, 0);
    bearGroup.rotation.y = Math.PI / 2;
    const bearMat = new THREE.MeshStandardMaterial({ color: 0xc68b59, roughness: 0.85 });
    const bearSnoutMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.8 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    bearGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), bearMat)); // torso
    const bearHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), bearMat);
    bearHead.position.y = 0.3;
    bearGroup.add(bearHead);

    [-0.14, 0.14].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), bearMat);
      ear.position.set(ex, 0.45, 0);
      bearGroup.add(ear);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
      eye.position.set(ex * 0.45, 0.33, 0.17);
      bearGroup.add(eye);
    });
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), bearSnoutMat);
    snout.position.set(0, 0.27, 0.17);
    bearGroup.add(snout);
    seesawPlankGroup.add(bearGroup);

    // Helper: Build a Cute 3D Pink Bunny Stuffed Toy on Right Seat (x = +1.0)
    const bunnyGroup = new THREE.Group();
    bunnyGroup.position.set(1.0, 0.22, 0);
    bunnyGroup.rotation.y = -Math.PI / 2;
    const bunnyMat = new THREE.MeshStandardMaterial({ color: 0xffcad4, roughness: 0.8 });

    bunnyGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), bunnyMat)); // torso
    const bunnyHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), bunnyMat);
    bunnyHead.position.y = 0.28;
    bunnyGroup.add(bunnyHead);

    [-0.08, 0.08].forEach((ex) => {
      const longEar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.26, 10), bunnyMat);
      longEar.position.set(ex, 0.52, 0);
      longEar.rotation.z = ex * 1.5;
      bunnyGroup.add(longEar);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
      eye.position.set(ex * 0.75, 0.31, 0.16);
      bunnyGroup.add(eye);
    });
    seesawPlankGroup.add(bunnyGroup);

    // Interactive Hitbox for Seesaw
    const seesawHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 1.1, 0.8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    seesawHitbox.position.y = 0.35;
    seesawHitbox.userData = {
      type: 'seesaw_toys',
      prompt: 'Play with Stuffed Toys on Seesaw 🧸🐰'
    };
    interactableMeshes.push(seesawHitbox);
    seesawPlankGroup.add(seesawHitbox);

    seesawRoot.add(seesawPlankGroup);
    scene.add(seesawRoot);

    // --- 2. DUYAN (HAMMOCK / SWING) WITH 3 CUTE SMALL GLOWING CREATURES (at x = 5.6, z = 4.6) ---
    const duyanFrame = new THREE.Group();
    duyanFrame.position.set(5.6, 0, 4.6);
    duyanFrame.rotation.y = -Math.PI * 0.25;

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.5, 8), darkWoodMat);
    postL.position.set(-1.1, 1.25, 0);
    duyanFrame.add(postL);

    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.5, 8), darkWoodMat);
    postR.position.set(1.1, 1.25, 0);
    duyanFrame.add(postR);

    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), darkWoodMat);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 2.45, 0);
    duyanFrame.add(topBar);

    duyanSwingGroup = new THREE.Group();
    duyanSwingGroup.position.set(0, 2.45, 0);

    const ropeMat = new THREE.MeshBasicMaterial({ color: 0xffe299, toneMapped: false });
    [-0.78, 0.78].forEach((rx) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.75, 6), ropeMat);
      rope.position.set(rx, -0.88, 0);
      duyanSwingGroup.add(rope);
    });

    const seatPlank = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.08, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x4a2c2a, roughness: 0.7 })
    );
    seatPlank.position.set(0, -1.75, 0);
    duyanSwingGroup.add(seatPlank);

    // 3 Cute Small Glowing Creatures sitting on the Duyan!
    const creatureSpecs = [
      { x: -0.5, color: 0x72efdd, earType: 'cat' },    // Baby Star-Kitty Spirit
      { x: 0.0, color: 0xff9ec7, earType: 'bunny' },   // Pink Mochi Bunny Spirit
      { x: 0.5, color: 0x60a5fa, earType: 'halo' }     // Cute Blue Slime Spirit
    ];

    creatureSpecs.forEach((spec, idx) => {
      const cr = new THREE.Group();
      cr.position.set(spec.x, -1.52, 0);

      const bodyMat = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 0.45,
        roughness: 0.3
      });
      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16), bodyMat);
      blob.scale.set(1.08, 0.92, 1.0);
      cr.add(blob);

      // Cute eyes & rosy blush cheeks
      [-0.065, 0.065].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
        eye.position.set(ex, 0.03, 0.175);
        cr.add(eye);

        const blush = new THREE.Mesh(
          new THREE.SphereGeometry(0.026, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff4d79, toneMapped: false })
        );
        blush.position.set(ex * 1.45, -0.01, 0.165);
        cr.add(blush);
      });

      if (spec.earType === 'cat') {
        [-0.1, 0.1].forEach((ex) => {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.12, 4), bodyMat);
          ear.position.set(ex, 0.19, 0);
          cr.add(ear);
        });
      } else if (spec.earType === 'bunny') {
        [-0.06, 0.06].forEach((ex) => {
          const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), bodyMat);
          ear.position.set(ex, 0.22, 0);
          cr.add(ear);
        });
      } else {
        const miniHalo = new THREE.Mesh(
          new THREE.TorusGeometry(0.09, 0.015, 8, 20),
          new THREE.MeshBasicMaterial({ color: 0xffe28a, toneMapped: false })
        );
        miniHalo.rotation.x = Math.PI / 2;
        miniHalo.position.y = 0.24;
        cr.add(miniHalo);
      }

      duyanSwingGroup.add(cr);
      cuteDuyanCreatures.push({ group: cr, baseY: -1.52, phase: idx * 1.5 });
    });

    // Interactive Hitbox for Duyan Creatures
    const duyanHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.9, 0.8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    duyanHitbox.position.set(0, -1.5, 0);
    duyanHitbox.userData = {
      type: 'duyan_creatures',
      prompt: 'Pet the Cute Duyan Creatures ✨🐾'
    };
    interactableMeshes.push(duyanHitbox);
    duyanSwingGroup.add(duyanHitbox);

    duyanFrame.add(duyanSwingGroup);
    scene.add(duyanFrame);
  }
  buildStuffedToySeesawAndDuyanCreatures();

  // ==========================================================================
  // 🖼️ 100% RIGHT-SIDE-UP, VIVID 3D PHOTO FRAMES FOR ALL 17 PHOTOS
  // ==========================================================================

  function createAdaptivePhotoPlane(photoIndex, baseSize = 1.48, doubleSided = true) {
    const holder = new THREE.Group();
    const url = PHOTOS[photoIndex];

    const initCanvas = document.createElement('canvas');
    initCanvas.width = 64;
    initCanvas.height = 64;
    const iCtx = initCanvas.getContext('2d');
    iCtx.fillStyle = '#2d1e4a';
    iCtx.fillRect(0, 0, 64, 64);

    const photoTex = new THREE.CanvasTexture(initCanvas);
    photoTex.encoding = THREE.sRGBEncoding;

    const photoMat = new THREE.MeshBasicMaterial({
      map: photoTex,
      toneMapped: false
    });

    const photoGeo = new THREE.PlaneGeometry(1, 1);
    const frontMesh = new THREE.Mesh(photoGeo, photoMat);
    frontMesh.position.z = 0.036;
    holder.add(frontMesh);

    let backMesh = null;
    if (doubleSided) {
      backMesh = new THREE.Mesh(photoGeo, photoMat);
      backMesh.rotation.y = Math.PI;
      backMesh.position.z = -0.036;
      holder.add(backMesh);
    }

    const img = new Image();
    img.onload = () => {
      const hiCanvas = document.createElement('canvas');
      const maxDim = 1024;
      const aspect = img.width / img.height;
      if (aspect >= 1) {
        hiCanvas.width = maxDim;
        hiCanvas.height = Math.round(maxDim / aspect);
      } else {
        hiCanvas.height = maxDim;
        hiCanvas.width = Math.round(maxDim * aspect);
      }
      const hCtx = hiCanvas.getContext('2d');
      hCtx.drawImage(img, 0, 0, hiCanvas.width, hiCanvas.height);

      const loadedTex = new THREE.CanvasTexture(hiCanvas);
      loadedTex.encoding = THREE.sRGBEncoding;
      loadedTex.anisotropy = maxAnisotropy;
      loadedTex.minFilter = THREE.LinearFilter;
      loadedTex.magFilter = THREE.LinearFilter;
      loadedTex.needsUpdate = true;

      const loadedMat = new THREE.MeshBasicMaterial({
        map: loadedTex,
        toneMapped: false
      });
      frontMesh.material = loadedMat;
      if (backMesh) backMesh.material = loadedMat;

      let w, h;
      if (aspect >= 1) {
        w = baseSize * Math.min(aspect, 1.45);
        h = w / aspect;
      } else {
        h = baseSize * 1.15;
        w = h * aspect;
      }
      frontMesh.scale.set(w, h, 1);
      if (backMesh) backMesh.scale.set(w, h, 1);
      if (holder.userData.onResize) {
        holder.userData.onResize(w, h);
      }
    };
    img.src = (window.INLINE_PHOTOS && window.INLINE_PHOTOS[url]) || url;

    return { holder, frontMesh };
  }

  // STYLE 1: Hanging Polaroid Clothesline Garland (FIXED: rotation.y only so it NEVER flips upside down!)
  function buildPolaroidClothesline(startVec, endVec, photoIndices) {
    [startVec, endVec].forEach((pos) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.85, 8), darkWoodMat);
      post.position.set(pos.x, 1.42, pos.z);
      scene.add(post);

      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe299, toneMapped: false })
      );
      lantern.position.set(pos.x, 2.9, pos.z);
      scene.add(lantern);
    });

    const totalBulbs = 22;
    for (let i = 0; i <= totalBulbs; i++) {
      const t = i / totalBulbs;
      const x = THREE.MathUtils.lerp(startVec.x, endVec.x, t);
      const z = THREE.MathUtils.lerp(startVec.z, endVec.z, t);
      const sag = Math.sin(t * Math.PI) * 0.25;
      const y = 2.62 - sag;

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 6, 6),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xffdf85 : 0xff9ec7, toneMapped: false })
      );
      bulb.position.set(x, y, z);
      scene.add(bulb);
    }

    const count = photoIndices.length;
    photoIndices.forEach((pIdx, i) => {
      const t = (i + 1) / (count + 1);
      const px = THREE.MathUtils.lerp(startVec.x, endVec.x, t);
      const pz = THREE.MathUtils.lerp(startVec.z, endVec.z, t);
      const sag = Math.sin(t * Math.PI) * 0.25;
      const attachY = 2.62 - sag;

      const pivot = new THREE.Group();
      pivot.position.set(px, attachY, pz);
      // Use pure horizontal Y rotation toward the center so X and Z rotations stay 0 (100% right-side up!)
      pivot.rotation.y = Math.atan2(-px, -pz);

      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), fenceWoodMat);
      clip.position.y = -0.04;
      pivot.add(clip);

      const { holder } = createAdaptivePhotoPlane(pIdx, 1.25, true);
      holder.position.set(0, -0.82, 0);

      const backing = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), polaroidWhiteMat);
      backing.position.set(0, -0.03, 0);
      holder.add(backing);

      holder.userData.onResize = (w, h) => {
        backing.scale.set(w + 0.14, h + 0.22, 1);
      };

      pivot.add(holder);
      scene.add(pivot);

      // Apply sway to `holder` instead of `pivot` so `pivot` orientation is never disturbed
      animatedDisplays.push({
        type: 'sway',
        group: holder,
        phase: pIdx * 1.3
      });
    });
  }

  // STYLE 2: Levitating Golden Crystal Halo Frame
  function buildFloatingHaloDisplay(x, z, photoIndex) {
    const root = new THREE.Group();
    root.position.set(x, 1.65, z);
    root.rotation.y = Math.atan2(-x, -z);

    const groundRing = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.75, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd485, side: THREE.DoubleSide, toneMapped: false })
    );
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.set(x, 0.03, z);
    scene.add(groundRing);

    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.028, 12, 40), goldMat);
    root.add(haloRing);

    const { holder } = createAdaptivePhotoPlane(photoIndex, 1.45, true);
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), roseGoldMat);
    holder.add(frameBox);

    holder.userData.onResize = (w, h) => {
      frameBox.scale.set(w + 0.12, h + 0.12, 1);
    };

    const heart = createHeartMesh(0xff7eb3, 0.13);
    heart.position.set(0, 1.32, 0);
    root.add(heart);
    floatingHearts.push({ mesh: heart, baseY: 1.32 });

    root.add(holder);
    scene.add(root);

    animatedDisplays.push({
      type: 'float',
      group: root,
      baseY: 1.65,
      phase: photoIndex * 0.9
    });
  }

  // STYLE 3: Vintage Artist's Wooden Tripod Easel
  function buildTripodEaselDisplay(x, z, photoIndex) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.atan2(-x, -z);

    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.55, 8), fenceWoodMat);
    leftLeg.position.set(-0.55, 1.22, 0.05);
    leftLeg.rotation.z = -0.14;
    leftLeg.rotation.x = -0.08;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.55, 8), fenceWoodMat);
    rightLeg.position.set(0.55, 1.22, 0.05);
    rightLeg.rotation.z = 0.14;
    rightLeg.rotation.x = -0.08;
    group.add(rightLeg);

    const backLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 8), fenceWoodMat);
    backLeg.position.set(0, 1.18, -0.52);
    backLeg.rotation.x = 0.28;
    group.add(backLeg);

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.18), darkWoodMat);
    shelf.position.set(0, 0.85, 0.12);
    group.add(shelf);

    const { holder } = createAdaptivePhotoPlane(photoIndex, 1.48, true);
    holder.position.set(0, 1.62, 0.14);
    holder.rotation.x = -0.05;

    const woodBacking = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), goldMat);
    holder.add(woodBacking);

    holder.userData.onResize = (w, h) => {
      woodBacking.scale.set(w + 0.14, h + 0.14, 1);
    };

    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.34, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd785, toneMapped: false })
    );
    lantern.position.set(0.78, 0.17, 0.25);
    group.add(lantern);

    group.add(holder);
    scene.add(group);
  }

  // STYLE 4: Sakura Blossom Trellis Arch Frame
  function buildBlossomTrellisDisplay(x, z, photoIndex) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.atan2(-x, -z);

    [-0.95, 0.95].forEach((px) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.55, 0.11), darkWoodMat);
      col.position.set(px, 1.27, 0);
      group.add(col);
    });

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.11, 0.2), darkWoodMat);
    topBeam.position.set(0, 2.55, 0);
    group.add(topBeam);

    [
      [-0.9, 2.5, 0.08, 0.28],
      [-0.45, 2.64, 0.08, 0.3],
      [0, 2.68, 0.1, 0.34],
      [0.45, 2.64, 0.08, 0.3],
      [0.9, 2.5, 0.08, 0.28]
    ].forEach(([bx, by, bz, r], idx) => {
      const col = idx % 2 === 0 ? 0xffa6c9 : 0xffd1e6;
      const cluster = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, 1),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.38 })
      );
      cluster.position.set(bx, by, bz);
      group.add(cluster);
    });

    const { holder } = createAdaptivePhotoPlane(photoIndex, 1.5, true);
    holder.position.set(0, 1.52, 0);

    const borderMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), polaroidWhiteMat);
    holder.add(borderMesh);

    holder.userData.onResize = (w, h) => {
      borderMesh.scale.set(w + 0.14, h + 0.14, 1);
    };

    group.add(holder);
    scene.add(group);
  }

  // STYLE 5: Marble & Gold Garden Pedestal Display
  function buildMarblePedestalDisplay(x, z, photoIndex) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.atan2(-x, -z);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.85, 12), marbleMat);
    column.position.y = 0.42;
    group.add(column);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.52), goldMat);
    cap.position.y = 0.86;
    group.add(cap);

    const { holder } = createAdaptivePhotoPlane(photoIndex, 1.45, true);
    holder.position.set(0, 1.65, 0);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), goldMat);
    holder.add(frame);

    holder.userData.onResize = (w, h) => {
      frame.scale.set(w + 0.14, h + 0.14, 1);
    };

    group.add(holder);
    scene.add(group);
  }

  // STYLE 6: Cozy Twilight Picnic Blanket Nook
  function buildPicnicNookDisplay(x, z, photoIndex) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.atan2(-x, -z);

    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 24),
      new THREE.MeshStandardMaterial({ color: 0x381934, roughness: 0.9 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.02;
    group.add(rug);

    const c1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.35, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0xff8fb8, roughness: 0.8 })
    );
    c1.position.set(-0.55, 0.08, 0.35);
    group.add(c1);

    const c2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.35, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd485, roughness: 0.8 })
    );
    c2.position.set(0.55, 0.08, 0.35);
    group.add(c2);

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 1.35, 10), roseGoldMat);
    stand.position.set(0, 0.68, -0.25);
    group.add(stand);

    const { holder } = createAdaptivePhotoPlane(photoIndex, 1.45, true);
    holder.position.set(0, 1.52, -0.22);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), roseGoldMat);
    holder.add(frame);

    holder.userData.onResize = (w, h) => {
      frame.scale.set(w + 0.14, h + 0.14, 1);
    };

    group.add(holder);
    scene.add(group);
  }

  // STYLE 7: Illuminated Glass Pavilion Showcase Frame
  function buildGlassShowcaseDisplay(x, z, photoIndex) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.atan2(-x, -z);

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.65), marbleMat);
    base.position.y = 0.09;
    group.add(base);

    [
      [-0.78, -0.22],
      [0.78, -0.22],
      [-0.78, 0.22],
      [0.78, 0.22]
    ].forEach(([rx, rz]) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 8), goldMat);
      rod.position.set(rx, 1.28, rz);
      group.add(rod);
    });

    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.07, 0.62), goldMat);
    roofCap.position.y = 2.48;
    group.add(roofCap);

    const { holder } = createAdaptivePhotoPlane(photoIndex, 1.48, true);
    holder.position.set(0, 1.45, 0);

    const border = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), polaroidWhiteMat);
    holder.add(border);

    holder.userData.onResize = (w, h) => {
      border.scale.set(w + 0.12, h + 0.12, 1);
    };

    group.add(holder);
    scene.add(group);
  }

  function populateAll17Photos() {
    buildPolaroidClothesline(
      new THREE.Vector3(-8.4, 0, 1.8),
      new THREE.Vector3(-4.8, 0, 6.2),
      [0, 1, 2]
    );
    buildPolaroidClothesline(
      new THREE.Vector3(4.8, 0, 6.2),
      new THREE.Vector3(8.4, 0, 1.8),
      [3, 4, 5]
    );

    buildFloatingHaloDisplay(-6.4, -1.2, 6);
    buildFloatingHaloDisplay(6.4, -1.2, 7);
    buildFloatingHaloDisplay(0, -7.8, 8);

    buildTripodEaselDisplay(-5.0, -5.4, 9);
    buildTripodEaselDisplay(5.0, -5.4, 10);

    buildPicnicNookDisplay(-7.6, -4.0, 11);
    buildPicnicNookDisplay(7.6, -4.0, 14);

    buildBlossomTrellisDisplay(-2.6, -7.0, 12);
    buildBlossomTrellisDisplay(2.6, -7.0, 13);

    buildMarblePedestalDisplay(-3.6, 1.2, 15);
    buildGlassShowcaseDisplay(3.6, 1.2, 16);
  }
  populateAll17Photos();

  // --- Starlight Lily Pond ---
  function buildPond() {
    const pondGroup = new THREE.Group();
    pondGroup.position.set(-6.8, 0.02, 6.8);

    const waterMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.45, 28),
      new THREE.MeshStandardMaterial({
        color: 0x103752,
        emissive: 0x0b2c44,
        emissiveIntensity: 0.65,
        roughness: 0.15,
        metalness: 0.6
      })
    );
    waterMesh.rotation.x = -Math.PI / 2;
    pondGroup.add(waterMesh);

    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.18 + (i % 3) * 0.04, 1),
        stoneMat
      );
      rock.position.set(Math.cos(ang) * 1.45, 0.08, Math.sin(ang) * 1.45);
      pondGroup.add(rock);
    }
    scene.add(pondGroup);
  }
  buildPond();

  // --- Cherry Blossom Trees with Glowing Night Canopies & Fairy Lights ---
  function buildCherryBlossomTree(tx, tz, scale = 1.0) {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x241312, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.36 * scale, 2.6 * scale, 8), trunkMat);
    trunk.position.y = 1.3 * scale;
    tree.add(trunk);

    const blossomColors = [0xff7eb3, 0xff9ec7, 0xff6b9d, 0xffb8d2];
    [
      [0, 3.1, 0, 1.35],
      [-0.95, 2.7, 0.5, 1.05],
      [0.95, 2.75, -0.4, 1.1],
      [0.4, 2.9, 0.95, 0.95],
      [-0.5, 2.85, -0.9, 1.0],
      [0, 3.65, 0.2, 0.95]
    ].forEach(([ox, oy, oz, r], i) => {
      const col = blossomColors[i % blossomColors.length];
      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r * scale, 1),
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.35,
          roughness: 0.8
        })
      );
      foliage.position.set(ox * scale, oy * scale, oz * scale);
      tree.add(foliage);
    });

    // Hanging glowing tree lanterns
    [-0.7, 0.7].forEach((lx) => {
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.24, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe28a, toneMapped: false })
      );
      lantern.position.set(lx * scale, 2.15 * scale, 0.3 * scale);
      tree.add(lantern);
    });

    scene.add(tree);
  }

  buildCherryBlossomTree(-7.8, -7.4, 1.15);
  buildCherryBlossomTree(7.8, -7.4, 1.15);
  buildCherryBlossomTree(-7.8, 7.2, 1.05);
  buildCherryBlossomTree(7.8, 7.2, 1.05);

  function addFairyString(startVec, endVec, bulbs = 20) {
    for (let i = 1; i < bulbs; i++) {
      const t = i / bulbs;
      const x = THREE.MathUtils.lerp(startVec.x, endVec.x, t);
      const z = THREE.MathUtils.lerp(startVec.z, endVec.z, t);
      const sag = Math.sin(t * Math.PI) * 0.65;
      const y = THREE.MathUtils.lerp(startVec.y, endVec.y, t) - sag;

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 6, 6),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xffe082 : 0xff8fb8, toneMapped: false })
      );
      bulb.position.set(x, y, z);
      scene.add(bulb);
    }
  }

  addFairyString(new THREE.Vector3(-1.8, 3.3, -1.8), new THREE.Vector3(-7.8, 3.2, -7.4));
  addFairyString(new THREE.Vector3(1.8, 3.3, -1.8), new THREE.Vector3(7.8, 3.2, -7.4));
  addFairyString(new THREE.Vector3(-1.8, 3.3, 1.8), new THREE.Vector3(-7.8, 3.0, 7.2));
  addFairyString(new THREE.Vector3(1.8, 3.3, 1.8), new THREE.Vector3(7.8, 3.0, 7.2));

  // --- Starry Sky Dome & Glowing Moon ---
  function buildStarrySky() {
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85 + 0.15);
      const r = 85;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.95 })));

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff4d2, toneMapped: false })
    );
    moon.position.set(18, 28, -36);
    scene.add(moon);
  }
  buildStarrySky();

  // --- Bright Golden Fireflies & Falling Cherry Blossom Petals ---
  const fireflyCount = 240;
  const fireflyGeo = new THREE.BufferGeometry();
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflyPhases = new Float32Array(fireflyCount);

  for (let i = 0; i < fireflyCount; i++) {
    fireflyPositions[i * 3] = (Math.random() - 0.5) * 20;
    fireflyPositions[i * 3 + 1] = 0.25 + Math.random() * 3.8;
    fireflyPositions[i * 3 + 2] = -9.5 + Math.random() * 20;
    fireflyPhases[i] = Math.random() * Math.PI * 2;
  }
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
  const fireflies = new THREE.Points(
    fireflyGeo,
    new THREE.PointsMaterial({ color: 0xffe66d, size: 0.13, transparent: true, opacity: 0.95 })
  );
  scene.add(fireflies);

  const petalCount = 220;
  const petalGeo = new THREE.BufferGeometry();
  const petalPositions = new Float32Array(petalCount * 3);
  for (let i = 0; i < petalCount; i++) {
    petalPositions[i * 3] = (Math.random() - 0.5) * 19;
    petalPositions[i * 3 + 1] = Math.random() * 6;
    petalPositions[i * 3 + 2] = (Math.random() - 0.5) * 19;
  }
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));
  const petals = new THREE.Points(
    petalGeo,
    new THREE.PointsMaterial({ color: 0xff9ec7, size: 0.085, transparent: true, opacity: 0.88 })
  );
  scene.add(petals);

  // --- Floating Sky Lanterns ---
  const activeSkyLanterns = [];

  function spawnSkyLantern(customPos) {
    const lanternGroup = new THREE.Group();
    const sx = customPos ? customPos.x : (Math.random() - 0.5) * 14;
    const sz = customPos ? customPos.z : (Math.random() - 0.5) * 14;
    lanternGroup.position.set(sx, 0.9, sz);

    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.12, 0.42, 10),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, toneMapped: false })
    );
    lanternGroup.add(shell);

    const innerCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff5cc, toneMapped: false })
    );
    innerCore.position.y = -0.08;
    lanternGroup.add(innerCore);

    scene.add(lanternGroup);
    activeSkyLanterns.push({
      mesh: lanternGroup,
      speedY: 0.65 + Math.random() * 0.45,
      driftPhase: Math.random() * Math.PI * 2
    });
  }

  for (let i = 0; i < 12; i++) {
    spawnSkyLantern({
      x: (Math.random() - 0.5) * 16,
      z: (Math.random() - 0.5) * 16
    });
    activeSkyLanterns[activeSkyLanterns.length - 1].mesh.position.y = 2.5 + Math.random() * 10;
  }

  function triggerWishLanternBurst(count = 16) {
    playSparkleChime();
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.5 + Math.random() * 6.5;
        spawnSkyLantern({
          x: player.pos.x + Math.cos(angle) * dist * 0.5,
          z: player.pos.z + Math.sin(angle) * dist * 0.5
        });
      }, i * 110);
    }
  }

  // --- Pointer Lock & First-Person Controls ---
  function requestGamePointerLock() {
    if (activeModal) return;
    container.requestPointerLock = container.requestPointerLock || container.mozRequestPointerLock;
    if (container.requestPointerLock) {
      container.requestPointerLock();
    }
  }

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === container;
    if (isPointerLocked) {
      welcomeOverlay.classList.remove('active');
      hud.classList.remove('hidden');
    } else if (!activeModal) {
      welcomeOverlay.classList.add('active');
    }
  });

  enterGardenBtn.addEventListener('click', () => {
    initAudio();
    welcomeOverlay.classList.remove('active');
    hud.classList.remove('hidden');
    requestGamePointerLock();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked || activeModal) return;
    const sensitivity = 0.0021;
    player.yaw -= e.movementX * sensitivity;
    player.pitch -= e.movementY * sensitivity;
    player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, player.pitch));
  });

  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') keys.w = true;
    if (code === 'KeyS' || code === 'ArrowDown') keys.s = true;
    if (code === 'KeyA' || code === 'ArrowLeft') keys.a = true;
    if (code === 'KeyD' || code === 'ArrowRight') keys.d = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.shift = true;

    if (code === 'KeyM') toggleMusic();
    if (code === 'KeyF' && !activeModal) triggerWishLanternBurst(6);
    if (code === 'KeyE' && !activeModal && hoveredInteractable) {
      triggerInteraction(hoveredInteractable);
    }

    if (activeModal === 'phone') {
      if (e.key >= '0' && e.key <= '9') {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        enteredPin = enteredPin.slice(0, -1);
        renderPinDots();
      }
    }

    if (code === 'Escape' && activeModal) {
      closeAllModals(false);
    }
  });

  window.addEventListener('keyup', (e) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') keys.w = false;
    if (code === 'KeyS' || code === 'ArrowDown') keys.s = false;
    if (code === 'KeyA' || code === 'ArrowLeft') keys.a = false;
    if (code === 'KeyD' || code === 'ArrowRight') keys.d = false;
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.shift = false;
  });

  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (isPointerLocked && !activeModal && hoveredInteractable) {
      triggerInteraction(hoveredInteractable);
    }
  });

  // --- Raycasting & Interactive Triggers ---
  const raycaster = new THREE.Raycaster();
  const screenCenter = new THREE.Vector2(0, 0);

  function checkInteractions() {
    if (activeModal || isRidingCoaster) {
      crosshair.classList.remove('interactive');
      interactionPrompt.classList.add('hidden');
      return;
    }

    raycaster.setFromCamera(screenCenter, camera);
    const hits = raycaster.intersectObjects(interactableMeshes, false);

    let candidate = null;
    if (hits.length > 0 && hits[0].distance < 5.5) {
      candidate = hits[0].object;
    }

    hoveredInteractable = candidate;

    if (hoveredInteractable) {
      crosshair.classList.add('interactive');
      interactionPrompt.classList.remove('hidden');
      promptText.textContent = `Click • ${hoveredInteractable.userData.prompt}`;
    } else {
      crosshair.classList.remove('interactive');
      interactionPrompt.classList.add('hidden');
    }
  }

  function triggerInteraction(mesh) {
    const data = mesh.userData;

    if (data.type === 'gate1_crystal') {
      if (data.isCorrect) {
        playSparkleChime();
        unlockedGates = Math.max(unlockedGates, 1);
        gateBarrierMeshes[0].visible = false;
        updateGateHUD();
        showGameToast('💙 Blue! Gate 1 Unlocked — Walk forward to Gate 2!', 'success');
      } else {
        triggerSuddenDeathReset(`❌ ${data.colorName} is wrong! My favorite color isn't ${data.colorName} 😜`);
      }
      return;
    }

    if (data.type === 'gate2_destination') {
      handleStage2Choice(data.isCorrect, data.country);
      return;
    }

    if (data.type === 'gate3_phone') {
      openPhoneModal();
      return;
    }

    if (data.type === 'gate4_planet') {
      if (data.isCorrect) {
        playSparkleChime();
        unlockedGates = Math.max(unlockedGates, 4);
        gateBarrierMeshes[3].visible = false;
        updateGateHUD();
        showGameToast('🪐 VENUS! All 4 Questions Solved — Hop on the Roller Coaster Ahead! 🎢', 'success', 4800);
      } else {
        triggerSuddenDeathReset(`🪐 Oops! ${data.planetName} is not the hottest planet! Back to Gate 1 😜`);
      }
      return;
    }

    if (data.type === 'coaster_cart') {
      startRollerCoasterRide();
      return;
    }

    if (data.type === 'seesaw_toys') {
      playCutePlushieSound();
      seesawBoostTimer = 4.5;
      spawnHeartBurst(new THREE.Vector3(-4.2, 1.1, 4.2), 12);
      showGameToast('🧸🐰 Teddy & Bunny are bouncing happily on the seesaw!', 'success', 2800);
      return;
    }

    if (data.type === 'duyan_creatures') {
      playCutePlushieSound();
      duyanBounceTimer = 4.5;
      spawnHeartBurst(new THREE.Vector3(5.6, 1.2, 4.6), 14);
      showGameToast('🐾✨ The little duyan creatures purr and shower you with hearts!', 'success', 2800);
      return;
    }

    if (data.type === 'letter') {
      playSparkleChime();
      openLetterModal();
    } else if (data.type === 'cake') {
      playSparkleChime();
      blowOutCakeCandles(mesh);
    }
  }

  function handleStage2Choice(isCorrect, country) {
    if (isCorrect) {
      playSparkleChime();
      unlockedGates = Math.max(unlockedGates, 2);
      gateBarrierMeshes[1].visible = false;
      updateGateHUD();
      showGameToast('🇯🇵 JAPAN! Gate 2 Unlocked — Walk forward to Gate 3!', 'success');
    } else {
      triggerSuddenDeathReset(`✈️ Wrong flight (${country})! Teleported back to Gate 1 😜`);
    }
  }

  // --- Gate 3 Smartphone Lock Screen Keypad Logic (PIN: 8080) ---
  function openPhoneModal() {
    enteredPin = '';
    renderPinDots();
    phoneLockIcon.textContent = '🔒';
    phonePromptLabel.textContent = 'Enter 4-Digit Passcode';
    activeModal = 'phone';
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    phoneModal.classList.remove('hidden');
    welcomeOverlay.classList.remove('active');
  }

  function renderPinDots(isError = false) {
    pinDotEls.forEach((dot, idx) => {
      dot.classList.toggle('filled', idx < enteredPin.length);
      dot.classList.toggle('error', isError);
    });
  }

  function handlePinDigit(digit) {
    if (enteredPin.length >= 4) return;
    playTone(620 + Number(digit) * 35, 0.04, 0.12);
    enteredPin += digit;
    renderPinDots();

    if (enteredPin.length === 4) {
      if (enteredPin === '8080') {
        phoneLockIcon.textContent = '🔓';
        phonePromptLabel.textContent = 'Unlocked!';
        playSparkleChime();
        setTimeout(() => {
          unlockedGates = Math.max(unlockedGates, 3);
          gateBarrierMeshes[2].visible = false;
          updateGateHUD();
          closeAllModals(true);
          showGameToast('📱 PIN 8080 Correct! Gate 3 Unlocked — Final Planet Gate Ahead!', 'success');
        }, 420);
      } else {
        renderPinDots(true);
        phonePromptLabel.textContent = 'Wrong PIN! Resetting to Gate 1...';
        phoneDevice.classList.add('shake');
        setTimeout(() => {
          phoneDevice.classList.remove('shake');
          closeAllModals(true);
          triggerSuddenDeathReset('📱 Wrong Phone PIN! Who are you? Back to Gate 1 🤨');
        }, 650);
      }
    }
  }

  keypadBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      handlePinDigit(btn.getAttribute('data-digit'));
    });
  });

  pinClearBtn.addEventListener('click', () => {
    enteredPin = '';
    renderPinDots();
  });

  pinBackBtn.addEventListener('click', () => {
    enteredPin = enteredPin.slice(0, -1);
    renderPinDots();
  });

  closePhoneBtn.addEventListener('click', () => closeAllModals(true));

  function blowOutCakeCandles(cakeHitbox) {
    candlesBlownOut = !candlesBlownOut;
    cakeCandleFlames.forEach((f) => {
      f.visible = !candlesBlownOut;
    });
    if (cakePointLight) {
      cakePointLight.intensity = candlesBlownOut ? 0 : 1.1;
    }
    if (candlesBlownOut) {
      cakeHitbox.userData.prompt = 'Relight Candles ✨';
      triggerWishLanternBurst(14);
    } else {
      cakeHitbox.userData.prompt = 'Blow Candles 🎂';
    }
  }

  function openLetterModal() {
    activeModal = 'letter';
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    letterModal.classList.remove('hidden');
    welcomeOverlay.classList.remove('active');
  }

  function closeAllModals(relockPointer = true) {
    activeModal = null;
    phoneModal.classList.add('hidden');
    letterModal.classList.add('hidden');
    if (relockPointer) {
      requestGamePointerLock();
    } else {
      welcomeOverlay.classList.add('active');
    }
  }

  closeLetterBtn.addEventListener('click', () => closeAllModals(true));
  releaseLanternsBtn.addEventListener('click', () => {
    closeAllModals(true);
    triggerWishLanternBurst(18);
  });

  // --- Main Animation Loop ---
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    // 1. ROLLER COASTER RIDE ANIMATION
    if (isRidingCoaster && coasterCurve && coasterCartGroup) {
      coasterProgress += dt / COASTER_DURATION;
      if (coasterProgress >= 1) {
        coasterProgress = 1;
        isRidingCoaster = false;
        unlockedGates = 5;
        updateGateHUD();
        player.pos.set(0, PLAYER_HEIGHT, 6.2);
        player.yaw = 0;
        player.pitch = 0;
        showGameToast('🌸 Welcome to Our Secret Starlit Garden! Walk around & explore! 💖', 'success', 5000);
        triggerWishLanternBurst(18);
      } else {
        // Smooth ease-in-out speed variation
        const pt = coasterCurve.getPointAt(coasterProgress);
        const lookAheadT = Math.min(1, coasterProgress + 0.02);
        const nextPt = coasterCurve.getPointAt(lookAheadT);

        coasterCartGroup.position.copy(pt);
        coasterCartGroup.lookAt(nextPt);

        // Seat the player camera inside the coaster cart looking forward along the track!
        player.pos.set(pt.x, pt.y + 1.25, pt.z);
        camera.position.copy(player.pos);
        camera.lookAt(nextPt.x, nextPt.y + 1.05, nextPt.z);
      }
    } else if (isPointerLocked && !activeModal) {
      // 2. NORMAL FIRST-PERSON WALKING
      const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
      const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

      const moveVec = new THREE.Vector3();
      if (keys.w) moveVec.add(forward);
      if (keys.s) moveVec.sub(forward);
      if (keys.d) moveVec.add(right);
      if (keys.a) moveVec.sub(right);

      if (moveVec.lengthSq() > 0) {
        moveVec.normalize();
        const currentSpeed = keys.shift ? player.speed * 1.45 : player.speed;
        player.pos.addScaledVector(moveVec, currentSpeed * dt);

        // Enforce Gate Barriers along Z
        let minAllowedZ = -9.3;
        if (unlockedGates < 1) minAllowedZ = 55.0;
        else if (unlockedGates < 2) minAllowedZ = 48.0;
        else if (unlockedGates < 3) minAllowedZ = 41.5;
        else if (unlockedGates < 4) minAllowedZ = 35.0;
        else if (unlockedGates === 4) minAllowedZ = 30.6; // Stop at Coaster Station until riding coaster!

        player.pos.z = Math.max(minAllowedZ, Math.min(61.8, player.pos.z));

        const maxHalfX = player.pos.z > 9.3 ? 2.65 : 9.3;
        player.pos.x = Math.max(-maxHalfX, Math.min(maxHalfX, player.pos.x));

        // Walk-through detection for Gate 2 Destination Portals (at Z ~ 49.3)
        if (unlockedGates === 1 && Math.abs(player.pos.z - 49.3) < 0.65) {
          stage2PortalBoxes.forEach((box) => {
            if (Math.abs(player.pos.x - box.x) < 0.65) {
              handleStage2Choice(box.isCorrect, box.country);
            }
          });
        }

        // Auto-board roller coaster if she walks right into the cart at Z ~ 31.5!
        if (unlockedGates === 4 && player.pos.z < 31.8 && Math.abs(player.pos.x) < 1.1) {
          startRollerCoasterRide();
        }

        // Center gazebo pedestal collision
        const distCenter = Math.hypot(player.pos.x, player.pos.z);
        if (distCenter < 0.72) {
          const pushAngle = Math.atan2(player.pos.z, player.pos.x);
          player.pos.x = Math.cos(pushAngle) * 0.72;
          player.pos.z = Math.sin(pushAngle) * 0.72;
        }

        player.walkBobTimer += dt * 8.5;
      }

      const distFromGazeboCenter = Math.hypot(player.pos.x, player.pos.z);
      const platformHeight = distFromGazeboCenter < 2.45 ? 0.34 : 0;
      const headBob = Math.sin(player.walkBobTimer) * 0.035;
      player.pos.y = THREE.MathUtils.lerp(player.pos.y, PLAYER_HEIGHT + platformHeight + headBob, 0.18);

      camera.position.copy(player.pos);
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
    } else if (!isRidingCoaster) {
      camera.position.copy(player.pos);
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
    }

    // Animate Gate 1 Crystals
    stage1Crystals.forEach((c, idx) => {
      c.rotation.y = elapsed * 1.4 + idx;
      c.position.y = 1.38 + Math.sin(elapsed * 2.2 + idx) * 0.07;
    });

    // Animate Gate 4 Orbiting Solar System Planets
    orbitingPlanets.forEach((p) => {
      p.angle += p.speed * dt * 0.55;
      p.mesh.position.set(
        Math.cos(p.angle) * p.radius,
        1.55 + Math.sin(elapsed * 2 + p.angle) * 0.04,
        p.centerZ + Math.sin(p.angle) * p.radius
      );
      p.mesh.rotation.y += dt;
    });

    // Smoothly Swing Open the Golden Garden Doors when Coaster Ride nears/reaches the Garden!
    if (leftGardenDoorPivot && rightGardenDoorPivot) {
      const doorsOpen = unlockedGates >= 5 || (isRidingCoaster && coasterProgress > 0.75);
      const targetLeftRot = doorsOpen ? -Math.PI * 0.62 : 0;
      const targetRightRot = doorsOpen ? Math.PI * 0.62 : 0;
      leftGardenDoorPivot.rotation.y = THREE.MathUtils.lerp(leftGardenDoorPivot.rotation.y, targetLeftRot, 0.06);
      rightGardenDoorPivot.rotation.y = THREE.MathUtils.lerp(rightGardenDoorPivot.rotation.y, targetRightRot, 0.06);
    }

    // Animate Stuffed Toy Seesaw ("Saw")
    if (seesawPlankGroup) {
      if (seesawBoostTimer > 0) seesawBoostTimer -= dt;
      const speed = seesawBoostTimer > 0 ? 6.5 : 1.8;
      const amp = seesawBoostTimer > 0 ? 0.24 : 0.11;
      seesawPlankGroup.rotation.z = Math.sin(elapsed * speed) * amp;
    }

    // Animate Duyan & Cute Small Creatures
    if (duyanSwingGroup) {
      if (duyanBounceTimer > 0) duyanBounceTimer -= dt;
      const swingSpeed = duyanBounceTimer > 0 ? 3.8 : 1.4;
      const swingAmp = duyanBounceTimer > 0 ? 0.22 : 0.08;
      duyanSwingGroup.rotation.x = Math.sin(elapsed * swingSpeed) * swingAmp;

      cuteDuyanCreatures.forEach((cr) => {
        const hop = duyanBounceTimer > 0 ? Math.abs(Math.sin(elapsed * 9 + cr.phase)) * 0.18 : Math.sin(elapsed * 2.5 + cr.phase) * 0.03;
        cr.group.position.y = cr.baseY + hop;
      });
    }

    // Animate Burst Hearts
    for (let i = burstHearts.length - 1; i >= 0; i--) {
      const bh = burstHearts[i];
      bh.life -= dt;
      bh.mesh.position.y += bh.velY * dt;
      bh.mesh.position.x += bh.velX * dt;
      bh.mesh.position.z += bh.velZ * dt;
      bh.mesh.rotation.y += dt * 3;
      if (bh.life <= 0) {
        scene.remove(bh.mesh);
        burstHearts.splice(i, 1);
      }
    }

    // Animate Swaying Polaroids & Levitating Halo Frames
    animatedDisplays.forEach((d) => {
      if (d.type === 'sway') {
        d.group.rotation.z = Math.sin(elapsed * 1.5 + d.phase) * 0.04;
      } else if (d.type === 'float') {
        d.group.position.y = d.baseY + Math.sin(elapsed * 1.8 + d.phase) * 0.08;
      }
    });

    floatingHearts.forEach((item, i) => {
      item.mesh.position.y = item.baseY + Math.sin(elapsed * 2.2 + i) * 0.06;
      item.mesh.rotation.y = elapsed * 1.2 + i;
    });

    if (gazeboHeartMesh) {
      gazeboHeartMesh.position.y = 2.05 + Math.sin(elapsed * 2.5) * 0.08;
      gazeboHeartMesh.rotation.y = elapsed * 1.5;
    }

    if (letterEnvelopeMesh) {
      letterEnvelopeMesh.position.y = Math.sin(elapsed * 2.2) * 0.04;
      letterEnvelopeMesh.rotation.y = Math.sin(elapsed * 0.8) * 0.15;
    }

    if (!candlesBlownOut) {
      cakeCandleFlames.forEach((flame, idx) => {
        flame.scale.y = 1.5 + Math.sin(elapsed * 14 + idx * 2) * 0.25;
      });
    }

    const fPos = fireflies.geometry.attributes.position.array;
    for (let i = 0; i < fireflyCount; i++) {
      const phase = fireflyPhases[i];
      fPos[i * 3 + 1] += Math.sin(elapsed * 1.8 + phase) * 0.003;
      fPos[i * 3] += Math.cos(elapsed * 0.9 + phase) * 0.002;
    }
    fireflies.geometry.attributes.position.needsUpdate = true;

    const pPos = petals.geometry.attributes.position.array;
    for (let i = 0; i < petalCount; i++) {
      pPos[i * 3 + 1] -= dt * 0.42;
      pPos[i * 3] += Math.sin(elapsed + i) * 0.004;
      if (pPos[i * 3 + 1] < 0.05) {
        pPos[i * 3 + 1] = 5.5;
      }
    }
    petals.geometry.attributes.position.needsUpdate = true;

    for (let i = activeSkyLanterns.length - 1; i >= 0; i--) {
      const l = activeSkyLanterns[i];
      l.mesh.position.y += l.speedY * dt;
      l.mesh.position.x += Math.sin(elapsed + l.driftPhase) * 0.005;
      l.mesh.rotation.y += dt * 0.4;
      if (l.mesh.position.y > 38) {
        l.mesh.position.y = 1.2;
      }
    }

    checkInteractions();
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
