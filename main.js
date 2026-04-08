import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 15, 45);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);

const playerGeo = new THREE.BoxGeometry(1, 1, 1);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(0, 1, 0);
scene.add(player);

const obstacles = [];
const boxMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

let lastPlatformX = 0;

function addPlatform(x, width, y = 0) {
    const geo = new THREE.BoxGeometry(width, 1, 3);
    const mesh = new THREE.Mesh(geo, boxMat);
    mesh.position.set(x, y, 0);
    scene.add(mesh);
    obstacles.push(mesh);
    lastPlatformX = x + width / 2;
}

function spawnNextPlatform() {
    const gap = 3 + Math.random() * 3; // distancia
    const width = 5 + Math.random() * 10; 
    const y = Math.random() > 0.5 ? 0 : 1.5; // altura
    const nextX = lastPlatformX + gap + width / 2;
    addPlatform(nextX, width, y);
}

// Plataforma inicial
addPlatform(0, 20, 0);

// Generar las primeras 5
for(let i = 0; i < 5; i++) {
    spawnNextPlatform();
}

let velY = 0;
const gravity = -0.012;
const jumpPower = 0.35;
const moveSpeed = 0.12;
let isGrounded = false;

const raycaster = new THREE.Raycaster();
const downDirection = new THREE.Vector3(0, -1, 0);

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isGrounded) {
        velY = jumpPower;
        isGrounded = false;
    }
});

function update() {
    requestAnimationFrame(update);

    player.position.x += moveSpeed;
    velY += gravity;
    player.position.y += velY;

    // Generar nueva plataforma si el jugador se acerca al final
    if (player.position.x > lastPlatformX - 50) {
        spawnNextPlatform();
    }

    raycaster.set(player.position, downDirection);
    const hits = raycaster.intersectObjects(obstacles);

    if (hits.length > 0 && hits[0].distance < 0.51) {
        if (velY < 0) {
            player.position.y = hits[0].point.y + 0.5;
            velY = 0;
            isGrounded = true;
            player.rotation.z = Math.round(player.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
        }
    } else {
        isGrounded = false;
        player.rotation.z -= 0.08;
    }

    if (player.position.y < -5) {
        player.position.set(0, 2, 0);
        player.rotation.z = 0;
        velY = 0;
        // Opcional: limpiar obstáculos y reiniciar x
    }

    camera.position.set(player.position.x - 8, 5, 12);
    camera.lookAt(player.position.x + 2, 0, 0);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

update();