import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import SunCalc from 'suncalc';

function ModelViewer() {
    const mountRef = useRef(null);
    const [scene, setScene] = useState(null);
    const [renderer, setRenderer] = useState(null);
    const [camera, setCamera] = useState(null);
    const orbitControlsRef = useRef(null);
    const transformControlRef = useRef(null);
    const buildingGroupRef = useRef(new THREE.Group());
    const gisGroupRef = useRef(new THREE.Group());

    // 🌍 User Inputs
    const [lat, setLat] = useState(6.9271); // Sri Lanka default
    const [lon, setLon] = useState(79.8612);
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm

    // 📊 Exposure result
    const [exposurePercent, setExposurePercent] = useState(null);

    // --- Transform Control ---
    const attachTransformControl = (object) => {
        if (!scene || !camera || !renderer || !object) return;

        if (transformControlRef.current) {
            scene.remove(transformControlRef.current);
            transformControlRef.current.dispose();
        }

        const control = new TransformControls(camera, renderer.domElement);
        control.attach(object);
        control.setMode('translate');

        control.addEventListener('dragging-changed', (event) => {
            orbitControlsRef.current.enabled = !event.value;
        });

        scene.add(control);
        transformControlRef.current = control;
    };

    useEffect(() => {
        const mount = mountRef.current;
        const width = mount.clientWidth;
        const height = mount.clientHeight;

        const newScene = new THREE.Scene();
        newScene.background = new THREE.Color(0xf0f9fa);
        setScene(newScene);

        const newCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        newCamera.position.set(0, 10, 15);
        setCamera(newCamera);

        const newRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        newRenderer.setSize(width, height);
        newRenderer.shadowMap.enabled = true;
        newRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mount.appendChild(newRenderer.domElement);
        setRenderer(newRenderer);

        const orbitControls = new OrbitControls(newCamera, newRenderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControlsRef.current = orbitControls;

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        newScene.add(ambientLight);

        // Sun light (Directional)
        const sunLight = new THREE.DirectionalLight(0xffffdd, 1);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 200;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        newScene.add(sunLight);

        // Add models
        newScene.add(buildingGroupRef.current);
        newScene.add(gisGroupRef.current);

        // Update Sun Position
        const updateSun = () => {
            const now = new Date(dateTime);
            const { altitude, azimuth } = SunCalc.getPosition(now, lat, lon);

            const radius = 100;
            const x = radius * Math.cos(altitude) * Math.sin(azimuth);
            const y = radius * Math.sin(altitude);
            const z = radius * Math.cos(altitude) * Math.cos(azimuth);

            sunLight.position.set(x, y, z);
            sunLight.target.position.set(0, 0, 0);
            sunLight.lookAt(0, 0, 0);

            // Optional: update helper
            if (window.sunHelper) newScene.remove(window.sunHelper);
            const helper = new THREE.DirectionalLightHelper(sunLight, 5);
            newScene.add(helper);
            window.sunHelper = helper;
        };

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            orbitControls.update();
            newRenderer.render(newScene, newCamera);
        };
        animate();

        // Initial update
        updateSun();

        // Cleanup
        return () => {
            if (transformControlRef.current) {
                newScene.remove(transformControlRef.current);
                transformControlRef.current.dispose();
            }
            if (orbitControls) orbitControls.dispose();
            mount.removeChild(newRenderer.domElement);
            newRenderer.dispose();
        };
    }, [lat, lon, dateTime]);

    // --- Exposure Calculation ---
    const calculateExposure = () => {
        if (!scene || !camera || !renderer) {
            console.warn("Scene, camera, or renderer not available.");
            return;
        }

        const model = buildingGroupRef.current;
        if (model.children.length === 0) {
            console.warn("Please upload a building model first.");
            return;
        }

        const raycaster = new THREE.Raycaster();
        const light = scene.children.find(c => c.isDirectionalLight);
        if (!light) {
            console.warn("Sun light not found in scene.");
            return;
        }

        const sunDirection = new THREE.Vector3();
        light.getWorldDirection(sunDirection).normalize();
        console.log("🌞 Sun Direction:", sunDirection.toArray());

        let totalVertices = 0;
        let exposedVertices = 0;

        console.group("📊 Exposure Calculation per Mesh");

        model.traverse((node) => {
            if (node.isMesh && node.geometry) {
                const positionAttr = node.geometry.attributes.position;
                const worldMatrix = node.matrixWorld;

                console.group(`Mesh: ${node.name || 'Unnamed'} | Vertices: ${positionAttr.count}`);

                for (let i = 0; i < positionAttr.count; i+=1) { // ✅ Fixed: was i+1
                    const vertex = new THREE.Vector3();
                    vertex.fromBufferAttribute(positionAttr, i);
                    vertex.applyMatrix4(worldMatrix);

                    totalVertices += 1;

                    raycaster.set(vertex, sunDirection);
                    const intersects = raycaster.intersectObjects(scene.children, true);

                    const isExposed = intersects.length === 0 || intersects[0].object === node;
                    if (isExposed) exposedVertices += 1;

                    // Optional: log first few vertices for debug
                    if (i < 5) {
                        console.log(`Vertex ${i}:`, vertex.toArray(), isExposed ? "✅ Exposed" : "❌ Shadowed");
                    }
                }

                console.log(`Result: ${exposedVertices} / ${positionAttr.count} vertices exposed`);
                console.groupEnd();
            }
        });

        console.groupEnd();

        const exposure = totalVertices > 0 ? (exposedVertices / totalVertices) * 100 : 0;
        const roundedExposure = exposure.toFixed(1);

        console.group("✅ Final Exposure Summary");
        console.log("Total Vertices:", totalVertices);
        console.log("Exposed Vertices:", exposedVertices);
        console.log("Sun Direction:", sunDirection.toArray());
        console.log(`Exposure Percentage: ${roundedExposure}%`);
        console.groupEnd();

        setExposurePercent(roundedExposure);
    };

    // --- Export to CSV ---
    const exportToCSV = () => {
        if (exposurePercent === null) {
            console.warn("Run exposure calculation first.");
            return;
        }

        const rows = [
            ['Property', 'Value'],
            ['Latitude', lat],
            ['Longitude', lon],
            ['Date & Time', dateTime],
            ['Sunlight Exposure (%)', exposurePercent],
        ];

        const csvContent = `data:text/csv;charset=utf-8,${rows.map(row => row.join(",")).join("\n")}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `exposure_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Model Loading ---
    const loadModel = (file, group, selectable = false) => {
        if (!file || !scene) return;

        const url = URL.createObjectURL(file);
        const ext = file.name.toLowerCase().split('.').pop();

        group.clear();

        if (ext === 'glb' || ext === 'gltf') {
            new GLTFLoader().load(
                url,
                (gltf) => {
                    const model = gltf.scene;
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    group.add(model);
                    if (selectable) attachTransformControl(model);
                },
                undefined,
                (e) => console.error('GLTF Error', e)
            );
        } else if (ext === 'stl') {
            new STLLoader().load(
                url,
                (geom) => {
                    const mesh = new THREE.Mesh(
                        geom,
                        new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
                    );
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.scale.set(0.01, 0.01, 0.01);
                    group.add(mesh);
                    if (selectable) attachTransformControl(mesh);
                },
                undefined,
                (e) => console.error('STL Error', e)
            );
        }
    };

    const handleBuildingUpload = (e) => {
        const file = e.target.files[0];
        if (file) loadModel(file, buildingGroupRef.current, true);
    };

    const handleGISUpload = (e) => {
        const file = e.target.files[0];
        if (file) loadModel(file, gisGroupRef.current, false);
    };

    const captureSnapshot = () => {
        if (renderer) {
            const dataURL = renderer.domElement.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = 'snapshot.png';
            link.click();
        }
    };

    return (
        <div>
            {/* 3D Viewer */}
            <div
                ref={mountRef}
                style={{
                    width: '100%',
                    height: '600px',
                    border: '1px solid #ccc',
                    cursor: 'pointer',
                }}
            />

            {/* Controls */}
            <div style={{ marginTop: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                <h3>🌍 Sunlight Exposure Setup</h3>

                <div style={{ marginBottom: '10px' }}>
                    <label>Latitude: </label>
                    <input
                        type="number"
                        step="0.0001"
                        value={lat}
                        onChange={(e) => setLat(parseFloat(e.target.value))}
                        style={{ width: '120px' }}
                    />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label>Longitude: </label>
                    <input
                        type="number"
                        step="0.0001"
                        value={lon}
                        onChange={(e) => setLon(parseFloat(e.target.value))}
                        style={{ width: '120px' }}
                    />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label>Date & Time: </label>
                    <input
                        type="datetime-local"
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                    />
                </div>

                <button type="button" onClick={calculateExposure} style={{ marginTop: '10px', marginRight: '10px' }}>
                    🌞 Calculate Exposure
                </button>

                <button type="button" onClick={exportToCSV} style={{ marginTop: '10px', marginRight: '10px' }}>
                    💾 Export to CSV
                </button>

                {exposurePercent !== null && (
                    <p style={{ fontWeight: 'bold', color: '#d9534f', marginTop: '10px' }}>
                        🔆 Sunlight Exposure: <strong>{exposurePercent}%</strong> of model is lit.
                    </p>
                )}

                <hr style={{ margin: '15px 0' }} />

                <label>🏢 Upload Building Model: </label>
                <input type="file" accept=".glb,.gltf,.stl" onChange={handleBuildingUpload} />
                <br />

                <label>🗺️ Upload GIS Model: </label>
                <input type="file" accept=".glb,.gltf,.stl" onChange={handleGISUpload} />
                <br />

                <button type="button" onClick={captureSnapshot} style={{ marginTop: '10px' }}>
                    📸 Take Snapshot
                </button>
            </div>
        </div>
    );
}

export default ModelViewer;
