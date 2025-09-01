/**
 * 3D Interactive Background using Three.js
 */
function init3DBackground() {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg-canvas'),
        antialias: true,
        alpha: true 
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(3.5);

    // --- Objects (Shapes) ---
    const shapeGroup = createShapes();
    scene.add(shapeGroup);

    function createShapes() {
        const shapeGroup = new THREE.Group();
        const geometries = [
            new THREE.IcosahedronGeometry(1, 0), // Crystal
            new THREE.TorusGeometry(0.8, 0.3, 16, 100) // Ring
        ];
        const material = new THREE.MeshNormalMaterial();

        const isMobile = window.innerWidth <= 768;
        const shapeCount = isMobile ? 20 : 50;

        for (let i = 0; i < shapeCount; i++) {
            const geometry = geometries[Math.floor(Math.random() * geometries.length)];
            const mesh = new THREE.Mesh(geometry, material);
            
            const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(20));
            mesh.position.set(x, y, z);

            const scale = THREE.MathUtils.randFloat(0.4, 0.8);
            mesh.scale.set(scale, scale, scale);
            
            mesh.userData = {
                rotationSpeed: {
                    x: Math.random() * 0.005,
                    y: Math.random() * 0.005
                },
                originalY: y,
                bobOffset: Math.random() * Math.PI * 2 
            };
            shapeGroup.add(mesh);
        }
        return shapeGroup;
    }
    
    // --- Mouse and Touch Interaction ---
    const mouse = { x: 0, y: 0 };

    // ADDED: A single function to handle updating the position from both mouse and touch events
    function updatePosition(event) {
        const x = event.touches ? event.touches[0].clientX : event.clientX;
        const y = event.touches ? event.touches[0].clientY : event.clientY;

        // Normalize position from -1 to 1
        mouse.x = (x / window.innerWidth) * 2 - 1;
        mouse.y = -(y / window.innerHeight) * 2 + 1;
    }

    // MODIFIED: Added event listeners for both mouse and touch movements
    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('touchmove', updatePosition);


    // --- Animation Loop ---
    function animate() {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.0005;

        shapeGroup.children.forEach(mesh => {
            mesh.rotation.x += mesh.userData.rotationSpeed.x;
            mesh.rotation.y += mesh.userData.rotationSpeed.y;
            mesh.position.y = mesh.userData.originalY + Math.sin(time + mesh.userData.bobOffset) * 0.25;
        });

        shapeGroup.rotation.y += (mouse.x * 0.2 - shapeGroup.rotation.y) * 0.05;
        shapeGroup.rotation.x += (mouse.y * 0.2 - shapeGroup.rotation.x) * 0.05;
        
        renderer.render(scene, camera);
    }
    
    // --- Responsiveness ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

document.addEventListener('DOMContentLoaded', init3DBackground);