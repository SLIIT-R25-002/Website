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
    const [lat, setLat] = useState(6.9271);
    const [lon, setLon] = useState(79.8612);
    const [dateTime, setDateTime] = useState('2025-08-05T15:00');
    const [temperature, setTemperature] = useState(35);
    const [humidity, setHumidity] = useState(64);

    // 🌬️ Wind & Heatmap
    const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
    const [windSpeedKmph, setWindSpeedKmph] = useState(0);
    const windVectorsRef = useRef([]);
    const originalMaterialsRef = useRef(new Map());

    const API_KEY = '229b7c42c71d41f99ae44120252003';

    // --- Heatmap Functions ---
    const resetHeatmap = () => {
        buildingGroupRef.current.traverse((node) => {
            if (node.isMesh) {
                const original = originalMaterialsRef.current.get(node);
                if (original && node.material !== original) {
                    node.material = original;
                }
            }
        });

        windVectorsRef.current.forEach(line => scene.remove(line));
        windVectorsRef.current = [];
    };

    const showHeatmap = () => {
        resetHeatmap();

        const red = new THREE.Color(1, 0, 0);
        const yellow = new THREE.Color(1, 1, 0);
        const green = new THREE.Color(0, 1, 0);

        buildingGroupRef.current.traverse((node) => {
            if (node.isMesh && node.userData.exposurePercent !== undefined) {
                const t = node.userData.exposurePercent / 100;
                const color = t > 0.5
                    ? red.clone().lerp(yellow, 1 - (t - 0.5) * 2)
                    : green.clone().lerp(yellow, t * 2);

                node.material = new THREE.MeshStandardMaterial({
                    color,
                    transparent: true,
                    opacity: 0.7,
                    roughness: 0.5,
                    metalness: 0.2
                });
            }
        });

        setIsHeatmapVisible(true);
    };

    const hideHeatmap = () => {
        resetHeatmap();
        setIsHeatmapVisible(false);
    };

    // --- Wind Animation ---
    const createWindVectors = () => {
        const model = buildingGroupRef.current;
        const direction = new THREE.Vector3(-1, 0, 0).normalize();
        const speedFactor = windSpeedKmph / 10;

        model.traverse((node) => {
            if (node.isMesh && node.userData.exposurePercent !== undefined) {
                const box = new THREE.Box3().setFromObject(node);
                const center = box.getCenter(new THREE.Vector3());

                const geometry = new THREE.BufferGeometry();
                const start = center.clone();
                const end = center.clone().add(direction.clone().multiplyScalar(5 * speedFactor));

                geometry.setFromPoints([start, end]);

                const material = new THREE.LineDashedMaterial({
                    color: 0x88ccff,
                    dashSize: 0.5,
                    gapSize: 0.5,
                    scale: 1 + speedFactor,
                    transparent: true,
                    opacity: 0.6
                });

                const line = new THREE.Line(geometry, material);
                line.computeLineDistances();
                scene.add(line);
                windVectorsRef.current.push(line);
            }
        });
    };

    // --- Toggle Views ---
    const toggleHeatmap = () => {
        if (isHeatmapVisible) {
            hideHeatmap();
        } else {
            showHeatmap();
        }
    };

    const toggleWind = () => {
        if (windVectorsRef.current.length > 0) {
            windVectorsRef.current.forEach(line => scene.remove(line));
            windVectorsRef.current = [];
        } else if (windSpeedKmph > 0) {
            createWindVectors();
        }
    };

    // --- Generate CSV ---
    const generateCSV = (localWindSpeedKmph) => {
        const model = buildingGroupRef.current;
        const csvData = [
            [
                "Object Name",
                "Thickness (m)",
                "Density (kg/m³)",
                "Thermal_Conductivity (W/m·K)",
                "Specific_Heat_Capacity (J/kg·K)",
                "Emissivity",
                "Infrared_Reflectivity",
                "Porosity",
                "Solar_Absorptance",
                "Solar_Reflectance",
                "Area",
                "Mass",
                "Material_type",
                "Wind_Speed",
                "Sun_Exposure",
                "Temperature",
                "Humidity"
            ]
        ];

        model.traverse((node) => {
            if (node.isMesh && node.userData.Sun_Exposure !== undefined) {
                const { userData } = node; // ✅ Fixed: destructuring
                const positionAttr = node.geometry?.attributes?.position;
                const area = positionAttr ? (positionAttr.count / 3) * 0.5 : 10; // rough estimate
                const mass = area * (userData.Thickness || 0.1) * (userData.Density || 2400);

                const windSpeedMps = parseFloat(((localWindSpeedKmph * 1000) / 3600).toFixed(4));

                csvData.push([
                    node.name || 'Unnamed',
                    userData.Thickness?.toFixed(6) || '',
                    userData.Density || '',
                    userData.Thermal_Conductivity?.toFixed(6) || '',
                    userData.Specific_Heat_Capacity || '',
                    userData.Emissivity?.toFixed(6) || '',
                    userData.Infrared_Reflectivity?.toFixed(6) || '',
                    userData.Porosity || '',
                    userData.Solar_Absorptance?.toFixed(6) || '',
                    userData.Solar_Reflectance?.toFixed(6) || '',
                    area.toFixed(6),
                    mass.toFixed(2),
                    userData.Material_type || 'Unknown',
                    windSpeedMps,
                    userData.Sun_Exposure.toFixed(1),
                    temperature,
                    humidity
                ]);
            }
        });

        const csvContent = `data:text/csv;charset=utf-8,${csvData.map(row => row.join(",")).join("\n")}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `simulation_result_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- START SIMULATION ---
    const startSimulation = async () => {
        const model = buildingGroupRef.current;
        if (model.children.length === 0) {
            console.warn("Please upload a building model first.");
            return;
        }

        const date = dateTime.split('T')[0];
        const hour = parseInt(dateTime.split('T')[1].split(':')[0], 10);

        let windKmph = 10;
        try {
            const res = await fetch(
                `https://api.weatherapi.com/v1/history.json?key=${API_KEY}&q=${lat},${lon}&dt=${date}`
            );
            const data = await res.json();
            const hourData = data.forecast.forecastday[0].hour.find(h =>
                new Date(h.time).getHours() === hour
            );
            if (hourData) windKmph = hourData.wind_kph;
        } catch (err) {
            console.warn("Weather API failed, using default wind speed", err);
        }

        setWindSpeedKmph(windKmph);

        const sunLight = scene.children.find(c => c.isDirectionalLight);
        if (!sunLight) return;

        const sunDirection = new THREE.Vector3();
        sunLight.getWorldDirection(sunDirection).normalize();
        const raycaster = new THREE.Raycaster();

        resetHeatmap();

        model.traverse((node) => {
            if (node.isMesh && node.geometry) {
                const { position } = node.geometry.attributes; // ✅ Fixed: destructuring
                if (!position) return;

                const worldMatrix = node.matrixWorld;
                let totalVertices = 0;
                let exposedVertices = 0;

                for (let i = 0; i < position.count; i += 1) { // ✅ Fixed: i += 1
                    const vertex = new THREE.Vector3().fromBufferAttribute(position, i);
                    vertex.applyMatrix4(worldMatrix);
                    totalVertices += 1;

                    raycaster.set(vertex, sunDirection);
                    const intersects = raycaster.intersectObjects(scene.children, true);
                    if (intersects.length === 0 || intersects[0].object === node) {
                        exposedVertices += 1;
                    }
                }

                const exposure = totalVertices > 0 ? (exposedVertices / totalVertices) * 100 : 0;
                node.userData.Sun_Exposure = exposure;
                node.userData.exposurePercent = exposure;
            }
        });

        generateCSV(windKmph);
    };

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

    // --- Load Model ---
    const loadModel = (file, group, selectable = false) => {
        if (!file || !scene) return;
        const url = URL.createObjectURL(file);
        const ext = file.name.toLowerCase().split('.').pop();
        group.clear();

        if (ext === 'glb' || ext === 'gltf') {
            new GLTFLoader().load(url, (gltf) => {
                const model = gltf.scene;
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;

                        if (!originalMaterialsRef.current.has(node)) {
                            originalMaterialsRef.current.set(node, node.material);
                        }

                        const defaults = {
                            Thickness: 0.2,
                            Density: 2400,
                            Thermal_Conductivity: 1.8,
                            Specific_Heat_Capacity: 900,
                            Emissivity: 0.85,
                            Infrared_Reflectivity: 0.2,
                            Porosity: 12,
                            Solar_Absorptance: 0.8,
                            Solar_Reflectance: 0.2,
                            Material_type: "Concrete"
                        };
                        Object.keys(defaults).forEach(key => {
                            if (node.userData[key] === undefined) {
                                node.userData[key] = defaults[key];
                            }
                        });
                    }
                });
                group.add(model);
                if (selectable) attachTransformControl(model);
            });
        } else if (ext === 'stl') {
            new STLLoader().load(url, (geom) => {
                const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.scale.set(0.01, 0.01, 0.01);

                mesh.userData = {
                    Material_type: 'Steel',
                    Thickness: 0.03,
                    Density: 7800,
                    Thermal_Conductivity: 50,
                    Specific_Heat_Capacity: 550,
                    Emissivity: 0.3,
                    Infrared_Reflectivity: 0.7,
                    Porosity: 0,
                    Solar_Absorptance: 0.55,
                    Solar_Reflectance: 0.45,
                };

                originalMaterialsRef.current.set(mesh, mesh.material);
                group.add(mesh);
                if (selectable) attachTransformControl(mesh);
            });
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

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        newScene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffdd, 1);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;

        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 200;
        sunLight.shadow.camera.updateProjectionMatrix();
        newScene.add(sunLight);

        newScene.add(buildingGroupRef.current);
        newScene.add(gisGroupRef.current);

        const updateSun = () => {
            const now = new Date(dateTime);
            const { altitude, azimuth } = SunCalc.getPosition(now, lat, lon);
            const r = 100;
            sunLight.position.set(
                r * Math.cos(altitude) * Math.sin(azimuth),
                r * Math.sin(altitude),
                r * Math.cos(altitude) * Math.cos(azimuth)
            );
            sunLight.target.position.set(0, 0, 0);
            sunLight.lookAt(0, 0, 0);
        };

        const animate = () => {
            requestAnimationFrame(animate);

            windVectorsRef.current.forEach(line => {
                const { material } = line; // ✅ Use destructuring
                material.offset -= 0.005 * windSpeedKmph; // Faster wind = faster flow
            });

            orbitControls.update();
            newRenderer.render(newScene, newCamera);
        };
        animate();

        updateSun();

        return () => {
            if (transformControlRef.current) {
                newScene.remove(transformControlRef.current);
                transformControlRef.current.dispose();
            }
            if (orbitControls) orbitControls.dispose();
            mount.removeChild(newRenderer.domElement);
            newRenderer.dispose();
        };
    }, [lat, lon, dateTime, windSpeedKmph]); // ✅ Fixed: added windSpeedKmph

    return (
        <div>
            <div
                ref={mountRef}
                style={{
                    width: '100%',
                    height: '600px',
                    border: '1px solid #ccc',
                    cursor: 'pointer',
                }}
            />

            <div style={{ marginTop: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                <h3>🌍 Simulation Setup</h3>

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

                <div style={{ marginBottom: '10px' }}>
                    <label>Temperature (°C): </label>
                    <input
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        style={{ width: '80px' }}
                    />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label>Humidity (%): </label>
                    <input
                        type="number"
                        step="1"
                        value={humidity}
                        onChange={(e) => setHumidity(parseInt(e.target.value, 10))}
                        style={{ width: '80px' }}
                    />
                </div>

                <hr style={{ margin: '15px 0' }} />

                <label>🏢 Upload Building Model: </label>
                <input type="file" accept=".glb,.gltf,.stl" onChange={handleBuildingUpload} />
                <br />

                <label>🗺️ Upload GIS Model: </label>
                <input type="file" accept=".glb,.gltf,.stl" onChange={handleGISUpload} />
                <br />

                <button type="button" onClick={startSimulation} style={{ marginTop: '15px', fontWeight: 'bold' }}>
                    ▶️ Start Simulation
                </button>

                <div style={{ marginTop: '10px' }}>
                    <button type="button" onClick={toggleHeatmap} style={{ marginRight: '10px' }}>
                        {isHeatmapVisible ? '👁️ Show Default View' : '🔥 Show Heatmap'}
                    </button>
                    <button type="button" onClick={toggleWind} style={{ marginRight: '10px' }}>
                        {windVectorsRef.current.length > 0 ? '🌬️ Hide Wind' : '🌬️ Show Wind'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModelViewer;
