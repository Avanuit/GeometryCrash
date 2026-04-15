import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.Fog(0x87CEEB, 20, 150);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(20, 40, 20);
sun.castShadow = true;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 300;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

let velY = 0, velX = 0, gameActive = true, isGrounded = false;
const gravity = -0.018, jumpPower = 0.44, speed = 0.28;

const uiWin = document.getElementById('win-screen');

const matPasto = new THREE.MeshStandardMaterial({ color: 0x7cfc00 }); 
const matPastoDetalle = new THREE.MeshStandardMaterial({ color: 0x6ec000 });
const matTierra = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); 
const matPiedra = new THREE.MeshStandardMaterial({ color: 0x999999 });
const matTierraOscura = new THREE.MeshStandardMaterial({ color: 0x654321 });
const matPinchos = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.2 });
const matEstrella = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.6 });
const matNube = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
const matMontana = new THREE.MeshStandardMaterial({ color: 0x4b6e2f, flatShading: true });

const playerGeo = new THREE.SphereGeometry(0.5, 32, 32);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.3 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.castShadow = true;
scene.add(player);

const colisionables = [], trampas = [], coleccionables = [], plataformasMoviles = [];
const raycaster = new THREE.Raycaster();
const keys = { a: false, d: false, space: false };

// --- FUNCION CREAR PAISAJE FONDO ---
function crearPaisaje() {
    for (let i = 0; i < 15; i++) {
        const h = 15 + Math.random() * 20;
        const geo = new THREE.ConeGeometry(10 + Math.random() * 10, h, 4);
        const mesh = new THREE.Mesh(geo, matMontana);
        mesh.position.set(-50 + i * 30, h / 2 - 15, -40 - Math.random() * 20);
        mesh.rotation.y = Math.random() * Math.PI;
        scene.add(mesh);
    }

    for (let i = 0; i < 12; i++) {
        const nubeGrupo = new THREE.Group();
        const numPartes = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < numPartes; j++) {
            const geo = new THREE.SphereGeometry(1.5 + Math.random(), 8, 8);
            const mesh = new THREE.Mesh(geo, matNube);
            mesh.position.set(j * 1.5, Math.random(), 0);
            nubeGrupo.add(mesh);
        }
        nubeGrupo.position.set(-20 + i * 35, 15 + Math.random() * 10, -35);
        scene.add(nubeGrupo);
    }
}

// --- FUNCION CREAR BLOQUE SUELO ---
function crearBloqueSuelo(x, yTop, z, w, d) {
    const hPasto = 1;
    const hTierra = 50; 
    const grupoSuelo = new THREE.Group();
    grupoSuelo.position.set(x, yTop, z);

    const geoPasto = new THREE.BoxGeometry(w, hPasto, d);
    const meshPasto = new THREE.Mesh(geoPasto, matPasto);
    meshPasto.position.y = -hPasto / 2;
    meshPasto.castShadow = true;
    meshPasto.receiveShadow = true;
    grupoSuelo.add(meshPasto);

    const decoracion = new THREE.Group();
    const numPasto = Math.floor(w * d * 0.4);
    for (let i = 0; i < numPasto; i++) {
        const hDet = 0.2 + Math.random() * 0.4;
        const geoDet = new THREE.BoxGeometry(0.15, hDet, 0.15);
        const meshDet = new THREE.Mesh(geoDet, matPastoDetalle);
        const randZ = (Math.random() - 0.5) * d;
        if (Math.abs(randZ) > 0.8) { 
            meshDet.position.set((Math.random() - 0.5) * w, hDet / 2, randZ);
            decoracion.add(meshDet);
        }
    }

    const geoTierra = new THREE.BoxGeometry(w, hTierra, d);
    const meshTierra = new THREE.Mesh(geoTierra, matTierra);
    meshTierra.position.y = -hPasto - (hTierra / 2);
    meshTierra.receiveShadow = true;
    grupoSuelo.add(meshTierra);

    const numPiedras = Math.floor(w * 0.6);
    for (let i = 0; i < numPiedras; i++) {
        const s = 0.2 + Math.random() * 0.4;
        const geoP = new THREE.BoxGeometry(s, s, s);
        const meshP = new THREE.Mesh(geoP, matPiedra);
        meshP.position.set((Math.random() - 0.5) * w, -1 - Math.random() * 3, d / 2 + 0.05);
        meshP.rotation.set(Math.random(), Math.random(), Math.random());
        decoracion.add(meshP);
    }

    grupoSuelo.add(decoracion);
    scene.add(grupoSuelo);
    
    colisionables.push(meshPasto);
    colisionables.push(meshTierra);
    
    return grupoSuelo;
}

// --- FUNCION CREAR CAJA TIERRA OSCURA ---
function crearCajaTierraOscura(x, yTop, z, w, h, d, esColisionable = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, matTierraOscura);
    mesh.position.set(x, yTop - (h / 2), z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    if (esColisionable) colisionables.push(mesh);
    return mesh;
}

// --- FUNCION CREAR LINEA PINCHOS ---
function crearLineaPinchos(x, yTop, z, numPinchosZ, espaciadoZ) {
    const grupoPinchos = new THREE.Group();
    grupoPinchos.position.set(x, yTop, z);
    for(let i = 0; i < numPinchosZ; i++) {
        const geoPincho = new THREE.ConeGeometry(0.3, 0.8, 4);
        const meshPincho = new THREE.Mesh(geoPincho, matPinchos);
        meshPincho.position.z = (i * espaciadoZ) - ((numPinchosZ - 1) * espaciadoZ) / 2;
        meshPincho.position.y = 0.4;
        meshPincho.castShadow = true;
        grupoPinchos.add(meshPincho);
        trampas.push(meshPincho);
    }
    scene.add(grupoPinchos);
    return grupoPinchos;
}

// --- FUNCION CREAR ESTRELLA ---
function crearEstrella(x, yTop, z) {
    const geo = new THREE.TorusKnotGeometry(0.4, 0.1, 64, 8);
    const mesh = new THREE.Mesh(geo, matEstrella);
    mesh.position.set(x, yTop + 1, z);
    scene.add(mesh);
    coleccionables.push(mesh);
}

// --- FUNCION CREAR PLATAFORMA MOVIL SUELO ---
function crearPlataformaMovilSuelo(x, yTop, z, w, d, vX, range) {
    const grupoSuelo = crearBloqueSuelo(x, yTop, z, w, d);
    plataformasMoviles.push({ grupo: grupoSuelo, vel: vX, startX: x, range: range });
}

// --- FUNCION RESET LEVEL ---
function resetLevel() {
    gameActive = true;
    if (uiWin) uiWin.style.display = 'none';
    player.position.set(0, 2, 0);
    velY = 0; velX = 0;
}

// --- FUNCION CONSTRUCCION NIVEL ---
crearPaisaje();
crearCajaTierraOscura(-11, 10, 0, 2, 20, 15);
crearBloqueSuelo(0, 0, 0, 22, 12); 
crearBloqueSuelo(14, 1.5, 0, 5, 10); 
crearBloqueSuelo(22, 0, 0, 8, 10); 
crearLineaPinchos(22, 0, 0, 6, 1);
crearBloqueSuelo(32, 2.5, 0, 6, 10); 
crearBloqueSuelo(42, 0, 0, 6, 10); 
crearPlataformaMovilSuelo(52, -1, 0, 5, 10, 0.08, 12);
crearPlataformaMovilSuelo(65, -1, 0, 5, 10, -0.08, 12);
crearBloqueSuelo(78, 0, 0, 10, 12);
crearBloqueSuelo(85, 2, 0, 4, 10);
crearBloqueSuelo(90, 4, 0, 4, 10);
crearBloqueSuelo(95, 6, 0, 4, 10);
crearBloqueSuelo(110, 0, 0, 15, 15);
crearEstrella(112, 0.5, 0);
crearCajaTierraOscura(118, 10, 0, 2, 20, 15);

resetLevel();

// --- FUNCION EVENT LISTENERS TECLADO ---
window.addEventListener('keydown', (e) => { 
    if(e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = true;
    if(e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = true;
    if(e.code === 'Space' || e.code === 'ArrowUp') keys.space = true;
    if(e.code === 'KeyR' && !gameActive) resetLevel();
});

window.addEventListener('keyup', (e) => { 
    if(e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
    if(e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
    if(e.code === 'Space' || e.code === 'ArrowUp') keys.space = false;
});

// --- FUNCION UPDATE ---
function update() {
    requestAnimationFrame(update);
    if (!gameActive) return;

    plataformasMoviles.forEach(p => {
        const oldX = p.grupo.position.x;
        p.grupo.position.x += p.vel;
        let collision = false;
        if (Math.abs(p.grupo.position.x - p.startX) > p.range) {
            collision = true;
        } else {
            const boxP = new THREE.Box3().setFromObject(p.grupo);
            boxP.expandByScalar(-0.1); 
            for (let i = 0; i < colisionables.length; i++) {
                const col = colisionables[i];
                if (col.parent === p.grupo || col === p.grupo) continue;
                const boxCol = new THREE.Box3().setFromObject(col);
                if (boxP.intersectsBox(boxCol)) {
                    collision = true;
                    break;
                }
            }
        }
        if (collision) {
            p.grupo.position.x = oldX; 
            p.vel *= -1; 
        }
    });

    if (keys.a) velX = -speed;
    else if (keys.d) velX = speed;
    else velX *= 0.85;

    player.position.x += velX;
    player.rotation.z -= velX * 1.5; 
    velY += gravity;
    player.position.y += velY;

    if (keys.space && isGrounded) {
        velY = jumpPower;
        isGrounded = false;
    }

    checkCollisions();

    if (player.position.y < -20) resetLevel();

    camera.position.lerp(new THREE.Vector3(player.position.x, player.position.y + 5, 18), 0.1);
    camera.lookAt(player.position.x, player.position.y + 1, 0);

    renderer.render(scene, camera);
}

// --- FUNCION CHECK COLLISIONS ---
function checkCollisions() {
    const pPos = player.position.clone();
    
    trampas.forEach(p => { 
        const pWorldPos = new THREE.Vector3();
        p.getWorldPosition(pWorldPos);
        if (pPos.distanceTo(pWorldPos) < 0.75) resetLevel(); 
    });

    coleccionables.forEach(est => {
        est.rotation.y += 0.05;
        est.rotation.x += 0.02;
        if (pPos.distanceTo(est.position) < 1.2) {
            gameActive = false;
            if (uiWin) uiWin.style.display = 'block';
        }
    });

    raycaster.set(pPos, new THREE.Vector3(0, -1, 0));
    const floorHits = raycaster.intersectObjects(colisionables, false);
    if (floorHits.length > 0 && floorHits[0].distance < 0.5) {
        if (velY < 0) {
            velY = 0;
            player.position.y = floorHits[0].point.y + 0.5;
            isGrounded = true;
            const hitObj = floorHits[0].object;
            const pm = plataformasMoviles.find(p => p.grupo === hitObj.parent);
            if (pm) player.position.x += pm.vel;
        }
    } else { isGrounded = false; }

    const dirX = velX > 0 ? 1 : -1;
    raycaster.set(pPos, new THREE.Vector3(dirX, 0, 0));
    const wallHits = raycaster.intersectObjects(colisionables, false);
    const muros = wallHits.filter(h => h.distance < 0.55 && Math.abs(h.point.y - pPos.y) < 0.4);
    if (muros.length > 0) {
        player.position.x = muros[0].point.x - (0.55 * dirX);
        velX = 0;
    }
}

// --- FUNCION RESIZE WINDOW ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

update();