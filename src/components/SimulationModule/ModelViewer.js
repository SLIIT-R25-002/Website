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
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm
    const [temperature, setTemperature] = useState(35);
    const [humidity, setHumidity] = useState(64);

    // API Key
    const API_KEY = '229b7c42c71d41f99ae44120252003';

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

        // Sun light
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

        // Add groups
        newScene.add(buildingGroupRef.current);
        newScene.add(gisGroupRef.current);

        // Update Sun
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

        // Animation
        const animate = () => {
            requestAnimationFrame(animate);
            orbitControls.update();
            newRenderer.render(newScene, newCamera);
        };
        animate();

        // Initial update
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
    }, [lat, lon, dateTime]);

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
            new GLTFLoader().load(
                url,
                (gltf) => {
                    const model = gltf.scene;
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;

                            // eslint-disable-next-line camelcase
                            const {Thickness, Density, Thermal_Conductivity, Specific_Heat_Capacity, Emissivity, Infrared_Reflectivity, Porosity, Solar_Absorptance, Solar_Reflectance, Material_type} = node.userData || {};

                            // Only apply defaults for missing fields
                            // eslint-disable-next-line camelcase
                            if (Thickness === undefined || Density === undefined || Thermal_Conductivity === undefined || Specific_Heat_Capacity === undefined || Emissivity === undefined || Infrared_Reflectivity === undefined || Porosity === undefined || Solar_Absorptance === undefined || Solar_Reflectance === undefined || Material_type === undefined) {
                                console.warn(`Missing metadata for ${node.name}. Using defaults for missing fields.`);
                                node.userData = {
                                    ...node.userData, // preserve existing

                                    Material_type: node.userData.Material_type ?? 'Generic',
                                    Thickness: node.userData.Thickness ?? 0.2,
                                    Density: node.userData.Density ?? 2000,
                                    Thermal_Conductivity: node.userData.Thermal_Conductivity ?? 1.5,
                                    Specific_Heat_Capacity: node.userData.Specific_Heat_Capacity ?? 850,
                                    Emissivity: node.userData.Emissivity ?? 0.9,
                                    Infrared_Reflectivity: node.userData.Infrared_Reflectivity ?? 0.1,
                                    Porosity: node.userData.Porosity ?? 10,
                                    Solar_Absorptance: node.userData.Solar_Absorptance ?? 0.7,
                                    Solar_Reflectance: node.userData.Solar_Reflectance ?? 0.3,
                                    Mass: node.userData.Mass ?? 0.5,
                                    Area: node.userData.Area ?? 10
                                };
                            } else {
                                console.log(`Loaded metadata for ${node.name}:`, node.userData);
                            }
                        }
                    });

                    group.add(model);
                    if (selectable) attachTransformControl(model);
                },
                undefined,
                (error) => console.error('GLTF Error', error)
            );
        } else if (ext === 'stl') {
            new STLLoader().load(
                url,
                (geom) => {
                    const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                    const mesh = new THREE.Mesh(geom, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.scale.set(0.01, 0.01, 0.01); // STLs are often large

                    // For STL, simulate metadata (since STL doesn't support userData)
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

                    group.add(mesh);
                    if (selectable) attachTransformControl(mesh);
                },
                undefined,
                (error) => console.error('STL Error', error)
            );
        } else {
            console.warn('Unsupported format:', file.name);
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

    // --- START SIMULATION ---
    const startSimulation = async () => {
        const model = buildingGroupRef.current;
        if (model.children.length === 0) {
            console.log("Please upload a building model first.");
            return;
        }

        const date = dateTime.split('T')[0];
        const hour = parseInt(dateTime.split('T')[1].split(':')[0], 10); // ✅ Fixed: radix

        // Fetch weather data
        let windSpeedKmph = 10;
        try {
            const res = await fetch(
                `http://api.weatherapi.com/v1/history.json?key=${API_KEY}&q=${lat},${lon}&dt=${date}`
            );
            const data = await res.json();
            const hourData = data.forecast.forecastday[0].hour.find(h => new Date(h.time).getHours() === hour); // ✅ Fixed: arrow body
            if (hourData) windSpeedKmph = hourData.wind_kph;
        } catch (err) {
            console.warn("Weather API failed, using default wind speed", err);
        }

        const windSpeedMps = parseFloat(((windSpeedKmph * 1000) / 3600).toFixed(4)); // km/h → m/s

        // Raycaster for sun exposure
        const sunLight = scene.children.find(c => c.isDirectionalLight);
        if (!sunLight) return;

        const sunDirection = new THREE.Vector3();
        sunLight.getWorldDirection(sunDirection).normalize();

        const raycaster = new THREE.Raycaster();

        // CSV Data
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
            if (node.isMesh) {
                const { userData } = node; // ✅ Fixed: destructuring
                const geom = node.geometry;
                const matrix = node.matrixWorld;

                // Area approximation
                const positionAttr = geom.attributes.position;
                if (positionAttr) {
                    for (let i = 0; i < positionAttr.count; i += 3) {
                        const v1 = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
                        const v2 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 1);
                        const v3 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 2);
                        v1.applyMatrix4(matrix);
                        v2.applyMatrix4(matrix);
                        v3.applyMatrix4(matrix);
                    }
                }

                // Sun Exposure (%)
                let totalVertices = 0;
                let exposedVertices = 0;
                if (positionAttr) {
                    for (let i = 0; i < positionAttr.count; i+=1) {
                        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
                        vertex.applyMatrix4(matrix);
                        totalVertices += 1;
                        raycaster.set(vertex, sunDirection);
                        const intersects = raycaster.intersectObjects(scene.children, true);
                        if (intersects.length === 0 || intersects[0].object === node) {
                            exposedVertices += 1;
                        }
                    }
                }
                const sunExposure = totalVertices > 0 ? ((exposedVertices / totalVertices) * 100).toFixed(1) : 0;
                if (node.name && node.name.startsWith('Plane')) {
                    console.log(`Skipping ${node.name} (starts with "Plane")`);
                    return; // Skip this node
                }
                csvData.push([
                    node.name || 'Unnamed',
                    (userData.Thickness || 0),
                    userData.Density || '',
                    (userData.Thermal_Conductivity || 0),
                    userData.Specific_Heat_Capacity || '',
                    (userData.Emissivity || 0),
                    (userData.Infrared_Reflectivity || 0),
                    userData.Porosity || '',
                    (userData.Solar_Absorptance || 0),
                    (userData.Solar_Reflectance || 0),
                    (userData.Area || 0),
                    (userData.Mass || 0),
                    userData.Material_type || 'Unknown',
                    windSpeedMps,
                    sunExposure,
                    temperature,
                    humidity
                ]);
            }
        });

        // Generate CSV
        const csvContent = `data:text/csv;charset=utf-8,${csvData.map(row => row.join(",")).join("\n")}`; // ✅ Fixed: template literal
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `simulation_result_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                        onChange={(e) => setHumidity(parseInt(e.target.value, 10))} // ✅ Fixed: radix
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
            </div>
        </div>
    );
}

export default ModelViewer;
