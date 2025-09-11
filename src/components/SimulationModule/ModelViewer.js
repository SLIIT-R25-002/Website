import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import { TransformControls } from 'three-transformcontrols';
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSimModal, setShowSimModal] = useState(false);

    // 🌍 User Inputs
    const [lat, setLat] = useState(6.9271);
    const [lon, setLon] = useState(79.8612);
    const [dateTime, setDateTime] = useState(() => {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        return now.toISOString().slice(0, 16);
    });
    const [temperature, setTemperature] = useState(35);
    const [humidity, setHumidity] = useState(64);
    const [simulationStatus, setSimulationStatus] = useState(false);

    // 🌬️ Wind & Heatmap
    const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
    const [windSpeedKmph, setWindSpeedKmph] = useState(0);
    const windVectorsRef = useRef([]);
    const originalMaterialsRef = useRef(new Map());
    const [simulationSuccess, setSimulationSuccess] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState(null);

    // const defaults = {
    //     Thickness: 0.2,
    //     Density: 2400,
    //     Thermal_Conductivity: 1.8,
    //     Specific_Heat_Capacity: 900,
    //     Emissivity: 0.85,
    //     Infrared_Reflectivity: 0.2,
    //     Porosity: 12,
    //     Solar_Absorptance: 0.8,
    //     Solar_Reflectance: 0.2,
    //     Material_type: "Concrete"
    // };

    const API_KEY = '229b7c42c71d41f99ae44120252003';

    const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 };
    const fileInputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '4px' };
    const inputStyle = { padding: '10px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '14px' };
    const fileInputStyle = { padding: '10px', border: '1px dashed #007bff', borderRadius: '8px', background: '#f8f9ff', fontSize: '14px' };
    const primaryButton = {
        padding: '14px 24px', background: 'linear-gradient(90deg, #007bff, #0056b3)', color: 'white', border: 'none', borderRadius: '12px',
        fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(0,123,255,0.3)',
        ':hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,123,255,0.4)' }
    };
    const secondaryButton = {
        ...primaryButton, background: 'linear-gradient(90deg, #28a745, #1e7e34)', marginLeft: '10px'
    };
    const toggleButton = (active) => ({
        ...primaryButton,
        background: active ? 'linear-gradient(90deg, #ffc107, #e0a800)' : 'linear-gradient(90deg, #6c757d, #495057)',
        marginLeft: '10px'
    });
    // const progressBarBackground = {
    //     height: '20px', backgroundColor: '#e9ecef', borderRadius: '10px', overflow: 'hidden', border: '1px solid #dee2e6'
    // };
    // const progressBarFill = {
    //     height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'progressFill 2s ease-in-out infinite'
    // };

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

        windVectorsRef.current.forEach((line) => scene.remove(line));
        windVectorsRef.current = [];
    };

    /* eslint-disable no-console */
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
                    metalness: 0.2,
                });
            }
        });

        setIsHeatmapVisible(true);
    };
    /* eslint-enable no-console */
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
                    opacity: 0.6,
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
            windVectorsRef.current.forEach((line) => scene.remove(line));
            windVectorsRef.current = [];
        } else if (windSpeedKmph > 0) {
            createWindVectors();
        }
    };
// --- Send CSV to MATLAB Backend ---
    const runSimulationInMATLAB = (csvContent) => {
        setLoading(true);
        setError(null);
        setSimulationSuccess(false);

        // ✅ Correctly remove the data URL prefix
        const csvString = csvContent.startsWith('data:text/csv;charset=utf-8,')
            ? csvContent.substring('data:text/csv;charset=utf-8,'.length)
            : csvContent;

        // ✅ Log full header for verification
        console.log("CSV Header:", csvString.split('\n')[0]); // Should log full header
        console.log("First data row:", csvString.split('\n')[1]); // Should log first object

        // Create Blob and FormData
        const blob = new Blob([csvString], { type: 'text/csv' });
        const formData = new FormData();
        formData.append('file', blob, 'simulation_input.csv');

        fetch('http://localhost:4200/upload-simulation-input', {
            method: 'POST',
            body: formData,
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSimulationSuccess(true);
                    console.log("simulation success");
                    if(data.prediction.is_heat_island){
                        setSimulationStatus(true);
                    }else{
                        setSimulationStatus(false);
                    }
                } else {
                    setError("Simulation failed on server.");
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("❌ Fetch error:", err);
                setError("Could not reach MATLAB backend.");
                setLoading(false);
            });
    };

    // --- Take Snapshot ---
    const takeSnapshot = () => {
        if (!renderer || !scene) return;

        // Step 1: Temporarily remove transform control helper (gizmo)
        let helper = null;
        if (transformControlRef.current) {
            helper = transformControlRef.current.getHelper();
            scene.remove(helper);
        }

        // Step 2: Capture snapshot in next frame
        requestAnimationFrame(() => {
            try {
                // Get data URL (e.g., "data:image/png;base64,...")
                const dataURL = renderer.domElement.toDataURL('image/png');

                // Extract base64 string for backend
                const base64Image = dataURL.split(',')[1];

                // ✅ 1. SEND TO BACKEND
                fetch('http://localhost:4200/get_recommendation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image: base64Image,
                        timestamp: new Date().toISOString()
                    })
                })
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        console.log('✅ Recommendation response:', data);

                        if (data.success && data.recommendation?.gemini_recommendation) {
                            setAiRecommendation(data.recommendation.gemini_recommendation);
                        }
                    })
                    .catch(err => {
                        console.error('❌ Failed to send image to backend:', err);
                    });

                // ✅ 2. DOWNLOAD IMAGE FOR USER
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = `snapshot_${new Date().toISOString().slice(0, 10)}_${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

            } catch (err) {
                console.error('❌ Snapshot capture failed:', err);
            } finally {
                // Re-add helper
                if (helper) {
                    scene.add(helper);
                }
            }
        });
    };

    // --- Generate CSV ---
    const generateCSV = (localWindSpeedKmph, weatherTemperature, weatherHumidity) => {
        const model = buildingGroupRef.current;
        const csvData = [
            [
                'Object Name',
                'Thickness (m)',
                'Density (kg/m³)',
                'Thermal_Conductivity (W/m·K)',
                'Specific_Heat_Capacity (J/kg·K)',
                'Emissivity',
                'Infrared_Reflectivity',
                'Porosity',
                'Solar_Absorptance',
                'Solar_Reflectance',
                'Area',
                'Mass',
                'Material_type',
                'Wind_Speed',
                'Sun_Exposure',
                'Temperature',
                'Humidity'
            ]
        ];

        model.traverse((node) => {
            if (node.isMesh && node.userData.Sun_Exposure !== undefined) {
                // ✅ Skip any object whose name starts with "Plane"
                if (node.name && node.name.startsWith('Plane')) {
                    return; // Skip this node
                }
                const { userData } = node; // ✅ Fixed: destructuring
                const windSpeedMps = parseFloat(((localWindSpeedKmph * 1000) / 3600).toFixed(4));

                csvData.push([
                    node.name || 'Unnamed',
                    userData.Thickness?.toFixed(6) || '',
                    userData.Density || '',
                    userData.Thermal_Conductivity?.toFixed(6) || '',
                    userData.Specific_Heat_Capacity || '',
                    userData.Emissivity?.toFixed(6) || '',
                    userData.Infrared_Reflectivity?.toFixed(6) || '',
                    userData.Porosity || 0,
                    userData.Solar_Absorptance?.toFixed(6) || '',
                    userData.Solar_Reflectance?.toFixed(6) || '',
                    userData.Area?.toFixed(6),
                    userData.Mass?.toFixed(6),
                    userData.Material_type || 'Unknown',
                    windSpeedMps,
                    userData.Sun_Exposure.toFixed(1),
                    weatherTemperature,
                    weatherHumidity
                ]);
            }
        });
        const csvContent = `data:text/csv;charset=utf-8,${csvData.map(row => row.join(",")).join("\n")}`;
        runSimulationInMATLAB(csvContent);
        // const encodedUri = encodeURI(csvContent);
        // const link = document.createElement("a");
        // link.setAttribute("href", encodedUri);
        // link.setAttribute("download", `simulation_result_${new Date().toISOString().slice(0, 10)}.csv`);
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);
    };

    // --- START SIMULATION ---
    const startManualSimulation = async () => {
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
                `http://api.weatherapi.com/v1/history.json?key=${API_KEY}&q=${lat},${lon}&dt=${date}`
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

        generateCSV(windKmph, temperature, humidity);
    };

    const startDynamicSimulation = async () => {
        const model = buildingGroupRef.current;
        if (model.children.length === 0) {
            console.warn("Please upload a building model first.");
            return;
        }

        const date = dateTime.split('T')[0];
        const hour = parseInt(dateTime.split('T')[1].split(':')[0], 10);

        let windKmph = 10;
        let wTemperature = 20;
        let wHumidity = 20;
        try {
            const res = await fetch(
                `http://api.weatherapi.com/v1/history.json?key=${API_KEY}&q=${lat},${lon}&dt=${date}`
            );
            const data = await res.json();
            const hourData = data.forecast.forecastday[0].hour.find(h =>
                new Date(h.time).getHours() === hour
            );
            if (hourData) {
                await setTemperature(hourData.temp_c);
                await setHumidity(hourData.humidity)
                wTemperature = hourData.temp_c;
                wHumidity = hourData.humidity;
                windKmph = hourData.wind_kph;
            }
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

        generateCSV(windKmph, wTemperature, wHumidity);
    };
    // --- Transform Control ---
    const attachTransformControl = (object) => {
        if (!scene || !camera || !renderer || !object) return;

        // ✅ Remove old helper if exists
        if (transformControlRef.current) {
            const oldHelper = transformControlRef.current.getHelper();
            scene.remove(oldHelper);
            transformControlRef.current.dispose();
        }

        const control = new TransformControls(camera, renderer.domElement);
        control.attach(object);
        control.setMode('translate');

        control.addEventListener('dragging-changed', (event) => {
            orbitControlsRef.current.enabled = !event.value;
        });

        const helper = control.getHelper();
        scene.add(helper);
        transformControlRef.current = control;
    };

    // --- Load Model ---
    const loadModel = (file, group, selectable = false) => {
        if (!file || !scene) return;

        // ✅ Clear group before adding new model
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child);
        }

        const url = URL.createObjectURL(file);
        const ext = file.name.toLowerCase().split('.').pop();

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
                    }
                });

                // ✅ Add to group (not directly to scene)
                group.add(model);

                // ✅ Attach transform control only if selectable
                if (selectable) {
                    attachTransformControl(model);
                }
            }, undefined, (err) => {
                console.error('Error loading GLTF:', err);
            });
        }
        // ... handle STL
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
        newCamera.position.set(0, 10, 15); // Adjust based on your scene size
        newCamera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at center of scene
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

    // const setTransformMode = (mode) => { // 'translate' | 'rotate' | 'scale'
    //     if (transformControlRef.current) {
    //         transformControlRef.current.setMode(mode);
    //     }
    // };

    return (
        <div style={{ fontFamily: 'Segoe UI, system-ui, sans-serif', background: '#f0f2f5', minHeight: '100vh' }}>

            <div style={{ display: 'none' }}>
                <style>
                    {`
        .heat-scape-loader {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin: 0px auto;
          position: relative;
          display: block;
          box-sizing: border-box;
          animation: heatScapeShadowRolling 3s linear infinite;
        }

        @keyframes heatScapeShadowRolling {
          0% {
            box-shadow: 
              0px 0 rgba(0, 123, 255, 0), 
              0px 0 rgba(0, 123, 255, 0), 
              0px 0 rgba(0, 123, 255, 0), 
              0px 0 rgba(0, 123, 255, 0);
          }
          12% {
            box-shadow: 
              100px 0 #007bff, 
              0px 0 rgba(0, 123, 255, 0), 
              0px 0 rgba(0, 123, 255, 0), 
              0px 0 rgba(0, 123, 255, 0);
          }
          25% {
            box-shadow: 
              110px 0 #007bff, 
              100px 0 #007bff, 
              0px 0 rgba(0, 123, 255, 0), 
              0px 0 rgba(0, 123, 255, 0);
          }
          36% {
            box-shadow: 
              120px 0 #007bff, 
              110px 0 #007bff, 
              100px 0 #007bff, 
              0px 0 rgba(0, 123, 255, 0);
          }
          50% {
            box-shadow: 
              130px 0 #007bff, 
              120px 0 #007bff, 
              110px 0 #007bff, 
              100px 0 #007bff;
          }
          62% {
            box-shadow: 
              200px 0 rgba(0, 123, 255, 0), 
              130px 0 #007bff, 
              120px 0 #007bff, 
              110px 0 #007bff;
          }
          75% {
            box-shadow: 
              200px 0 rgba(0, 123, 255, 0), 
              200px 0 rgba(0, 123, 255, 0), 
              130px 0 #007bff, 
              120px 0 #007bff;
          }
          87% {
            box-shadow: 
              200px 0 rgba(0, 123, 255, 0), 
              200px 0 rgba(0, 123, 255, 0), 
              200px 0 rgba(0, 123, 255, 0), 
              130px 0 #007bff;
          }
          100% {
            box-shadow: 
              200px 0 rgba(0, 123, 255, 0), 
              200px 0 rgba(0, 123, 255, 0), 
              200px 0 rgba(0, 123, 255, 0), 
              200px 0 rgba(0, 123, 255, 0);
          }
        }
      `}
                </style>
            </div>

            {/* 3D Viewer */}
            <div
                ref={mountRef}
                style={{
                    width: '100%',
                    height: '600px',
                    border: '1px solid #ddd',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    cursor: 'grab',
                    overflow: 'hidden',
                    margin: '20px auto',
                    maxWidth: '1200px'
                }}
            />

            {/* Controls */}
            <div
                style={{
                    maxWidth: '1200px',
                    margin: '0 auto 40px',
                    padding: '30px',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    border: '1px solid #e0e0e0'
                }}
            >
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '15px' }}>
                <button type="button" onClick={() => transformControlRef.current?.setMode('translate')} style={toggleButton(transformControlRef.current?.mode === 'translate')}>
                    📦 Move
                </button>
                <button type="button" onClick={() => transformControlRef.current?.setMode('rotate')} style={toggleButton(transformControlRef.current?.mode === 'rotate')}>
                    🔄 Rotate
                </button>
                </div>
                <h2 style={{
                    textAlign: 'center',
                    color: '#1a1a1a',
                    marginBottom: '20px',
                    fontSize: '28px',
                    fontWeight: '600',
                    background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    🌍 Urban Heat Island Simulation
                </h2>
                <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={inputGroupStyle}>
                            <label>📍 Latitude:</label>
                            <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value))} style={inputStyle} />
                        </div>
                        <div style={inputGroupStyle}>
                            <label>📍 Longitude:</label>
                            <input type="number" step="0.0001" value={lon} onChange={(e) => setLon(parseFloat(e.target.value))} style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={inputGroupStyle}>
                            <label>📅 Date & Time:</label>
                            <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={inputGroupStyle}>
                            <label>🌡️ Temperature (°C):</label>
                            <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} style={inputStyle} />
                        </div>
                        <div style={inputGroupStyle}>
                            <label>💧 Humidity (%):</label>
                            <input type="number" step="1" value={humidity} onChange={(e) => setHumidity(parseInt(e.target.value, 10))} style={inputStyle} />
                        </div>
                    </div>
                </div>

                <hr style={{ border: '1px solid #eee', margin: '24px 0' }} />

                <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                    <div style={fileInputGroupStyle}>
                        <label>🏢 Upload Building Model:</label>
                        <input type="file" accept=".glb,.gltf,.stl" onChange={handleBuildingUpload} style={fileInputStyle} />
                    </div>
                    <div style={fileInputGroupStyle}>
                        <label>🗺️ Upload GIS Model:</label>
                        <input type="file" accept=".glb,.gltf,.stl" onChange={handleGISUpload} style={fileInputStyle} />
                    </div>
                </div>

                {/* Simulation Progress */}
                {loading && !simulationSuccess && (
                    <div
                        style={{
                            marginBottom: '20px',
                            textAlign: 'center',
                            padding: '16px',
                            background: '#f8f9ff',
                            borderRadius: '12px',
                            border: '1px solid #d0e7ff',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    >
                        <div
                            style={{
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: '100%',
                                marginTop: '3px',
                                marginLeft: '-100px'
                            }}
                        >
                            <div className="heat-scape-loader"></div>
                        </div>
                        <div
                            style={{
                                fontSize: '16px',
                                color: '#1a1a1a',
                                fontWeight: '500',
                                marginTop:'3px',
                                marginBottom: '0px'
                            }}
                        >
                            Running thermal simulation in MATLAB
                        </div>
                    </div>
                )}

                {simulationStatus && simulationSuccess && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '16px',
                        background: '#eddbd4',
                        color: '#2b181a',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        animation: 'fadeIn 0.5s ease-in'
                    }}>
                        ✅ Thermal simulation completed! Heat Island Detected.
                        <button type="button" onClick={takeSnapshot} style={secondaryButton}>
                            📝 Take Recommendations
                        </button>
                    </div>
                )}

                {!simulationStatus && simulationSuccess && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '16px',
                        background: '#d4edda',
                        color: '#155724',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        animation: 'fadeIn 0.5s ease-in'
                    }}>
                        ✅ Thermal simulation completed! No Heat Island Detected.
                    </div>
                )}

                {error && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '16px',
                        background: '#f8d7da',
                        color: '#721c24',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        ❌ {error}
                    </div>
                )}

                {/* Simulation Mode Selection Modal */}
                {showSimModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 2000
                    }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '32px',
                            width: '90%',
                            maxWidth: '500px',
                            textAlign: 'center',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.2)'
                        }}>
                            <h3 style={{ marginBottom: '16px', color: '#1a1a1a' }}>Choose Simulation Mode</h3>
                            <p style={{ color: '#555', marginBottom: '24px' }}>
                                Select how you'd like to run the thermal simulation.
                            </p>

                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSimModal(false);
                                        startManualSimulation();
                                    }}
                                    style={{
                                        ...primaryButton,
                                        background: 'linear-gradient(90deg, #007bff, #0056b3)',
                                        padding: '12px 20px',
                                        fontSize: '16px'
                                    }}
                                >
                                    🛠️ Manual
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSimModal(false);
                                        startDynamicSimulation();
                                    }}
                                    style={{
                                        ...primaryButton,
                                        background: 'linear-gradient(90deg, #28a745, #1e7e34)',
                                        padding: '12px 20px',
                                        fontSize: '16px'
                                    }}
                                >
                                    🌐 Dynamic
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowSimModal(false)}
                                style={{
                                    marginTop: '24px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#6c757d',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px' }}>
                    <button type="button" onClick={() => setShowSimModal(true)} style={primaryButton}>
                        ▶️ Start Simulation
                    </button>
                    <button type="button" onClick={toggleHeatmap} style={toggleButton(isHeatmapVisible)}>
                        {isHeatmapVisible ? '👁️ Show Default View' : '🔥 Show Heatmap'}
                    </button>
                    <button type="button" onClick={toggleWind} style={toggleButton(windVectorsRef.current.length > 0)}>
                        {windVectorsRef.current.length > 0 ? '🌬️ Hide Wind' : '🌬️ Show Wind'}
                    </button>
                </div>

                <p style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#666',
                    marginTop: '20px',
                    fontStyle: 'italic'
                }}>
                    Rotate: Click & Drag | Zoom: Scroll | Move Model: Click after upload
                </p>
            </div>
            {/* AI Recommendation Popup */}
            {aiRecommendation && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        padding: '24px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        position: 'relative'
                    }}>
                        <h3 style={{ margin: '0 0 16px', color: '#1a1a1a' }}>💡 AI Recommendation</h3>
                        <button
                            onClick={() => setAiRecommendation(null)}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                background: '#f0f0f0',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                color: '#555'
                            }}
                            type="button"
                        >
                            ×
                        </button>
                        <p style={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6',
                            color: '#333',
                            margin: 0
                        }}>
                            {aiRecommendation}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ModelViewer;
