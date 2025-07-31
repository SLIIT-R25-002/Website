import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import SunCalc from 'suncalc';

function ModelViewer({ lat = 6.9271, lon = 79.8612 }) {
    const mountRef = useRef(null);
    const [scene, setScene] = useState(null);
    const [renderer, setRenderer] = useState(null);

    useEffect(() => {
        const mount = mountRef.current;
        const width = mount.clientWidth;
        const height = mount.clientHeight;

        const newScene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.set(0, 2, 5);

        const newRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        newRenderer.setSize(width, height);
        newRenderer.shadowMap.enabled = true;
        mount.appendChild(newRenderer.domElement);

        const controls = new OrbitControls(camera, newRenderer.domElement);
        controls.enableDamping = true;

        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        newScene.add(ambient);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        newScene.add(sunLight);

        const updateSunPosition = () => {
            const now = new Date();
            const { altitude, azimuth } = SunCalc.getPosition(now, lat, lon);
            const radius = 10;
            const x = radius * Math.cos(altitude) * Math.sin(azimuth);
            const y = radius * Math.sin(altitude);
            const z = radius * Math.cos(altitude) * Math.cos(azimuth);
            sunLight.position.set(x, y, z);
        };
        updateSunPosition();

        setScene(newScene);
        setRenderer(newRenderer);

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            newRenderer.render(newScene, camera);
        };
        animate();

        return () => {
            mount.removeChild(newRenderer.domElement);
        };
    }, [lat, lon]);

    const loadModel = (file, sceneGroup) => {
        const url = URL.createObjectURL(file);
        if (!scene) return;

        if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
            const loader = new GLTFLoader();
            loader.load(url, (gltf) => {
                gltf.scene.traverse((node) => {
                    if (node.isMesh) {
                        Object.assign(node, {
                            castShadow: true,
                            receiveShadow: true,
                        });
                    }
                });

                sceneGroup.add(gltf.scene);
                scene.add(sceneGroup);
            });
        } else if (file.name.endsWith('.stl')) {
            const loader = new STLLoader();
            loader.load(url, (geometry) => {
                const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                sceneGroup.add(mesh);
                scene.add(sceneGroup);
            });
        }
    };

    // Separate groups for building and GIS
    const buildingGroup = new THREE.Group();
    const gisGroup = new THREE.Group();

    const handleBuildingUpload = (e) => {
        const file = e.target.files[0];
        loadModel(file, buildingGroup);
    };

    const handleGISUpload = (e) => {
        const file = e.target.files[0];
        loadModel(file, gisGroup);
    };

    const captureSnapshot = () => {
        if (renderer) {
            const dataURL = renderer.domElement.toDataURL('image/png');
            console.log('📸 Snapshot Captured:', dataURL);
            // Optionally send to backend
        }
    };

    return (
        <div>
            <div style={{ width: '100%', height: '600px' }} ref={mountRef} />

            <div style={{ marginTop: '10px' }}>
                <label>🏢 Upload Building Model: </label>
                <input type="file" accept=".glb,.gltf,.obj,.stl" onChange={handleBuildingUpload} />
                <br />
                <label>🗺️ Upload GIS Model: </label>
                <input type="file" accept=".glb,.gltf,.obj,.stl" onChange={handleGISUpload} />
                <br />
                <button type="button" onClick={captureSnapshot}>
                    📸 Take Snapshot
                </button>
            </div>
        </div>
    );
}

export default ModelViewer;
