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
        alpha: true // Important for a transparent background
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(4); // MODIFIED: Moved camera slightly closer

    // --- Lighting ---
    // Ambient light to softly illuminate the whole scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // MODIFIED: Slightly brighter ambient light
    scene.add(ambientLight);

    // Point lights to create highlights and a sense of depth
    // MODIFIED: Increased point light intensity for more vibrant highlights
    const pointLight1 = new THREE.PointLight(0x8A2BE2, 2); // Purple light
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x4169E1, 2); // Royal blue light
    pointLight2.position.set(-5, -5, 2);
    scene.add(pointLight2);

    // --- Objects (Shapes) ---
    const shapeGroup = new THREE.Group(); // Group to hold all shapes for easy manipulation
    const geometry = new THREE.IcosahedronGeometry(1, 0); // A 20-sided shape

    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.7,
        roughness: 0.2
    });

    // Create a field of shapes with random positions and scales
    // MODIFIED: Increased number of shapes from 30 to 40
    for (let i = 0; i < 40; i++) {
        const mesh = new THREE.Mesh(geometry, material);
        
        const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(15));
        mesh.position.set(x, y, z);

        const scale = THREE.MathUtils.randFloat(0.2, 0.6);
        mesh.scale.set(scale, scale, scale);
        
        // Store random rotation speeds on each mesh object
        mesh.userData.rotationSpeed = {
            x: Math.random() * 0.005,
            y: Math.random() * 0.005
        };

        shapeGroup.add(mesh);
    }
    scene.add(shapeGroup);

    // --- Mouse Interaction ---
    const mouse = { x: 0, y: 0 };
    document.addEventListener('mousemove', (event) => {
        // Normalize mouse position from -1 to 1
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // --- Animation Loop ---
    function animate() {
        requestAnimationFrame(animate);

        // Animate each shape individually
        shapeGroup.children.forEach(mesh => {
            mesh.rotation.x += mesh.userData.rotationSpeed.x;
            mesh.rotation.y += mesh.userData.rotationSpeed.y;
        });

        // Make the entire group react to mouse movement for a parallax effect
        // Using easing (lerp) for smoother motion
        shapeGroup.rotation.y += (mouse.x * 0.2 - shapeGroup.rotation.y) * 0.05;
        shapeGroup.rotation.x += (mouse.y * 0.2 - shapeGroup.rotation.x) * 0.05;
        
        renderer.render(scene, camera);
    }
    
    // --- Responsiveness ---
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start the animation
    animate();
}

// Run the function after the document is loaded
document.addEventListener('DOMContentLoaded', init3DBackground);