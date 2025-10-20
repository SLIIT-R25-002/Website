import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'antd';
import { SettingOutlined, RobotOutlined } from '@ant-design/icons';
import { doc, updateDoc } from 'firebase/firestore';
import CollectTemperature from './CollectTemperature';
import AutonomousNavigation from './AutonomousNavigation';
import { db } from '../../../firebase';

const wsUrl = 'ws://esp32.local:81';

const Temperature = () => {
    const [currentMode, setCurrentMode] = useState('autonomous'); // Default to autonomous mode
    
    // Shared WebSocket state
    const [socketReady, setSocketReady] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const maxReconnectAttempts = 5;
    const [temperature, setTemperature] = useState([]);
    const [isCollecting, setIsCollecting] = useState(false);
    const [logMessages, setLogMessages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    
    // GPS simulation state
    const [useGpsSimulation, setUseGpsSimulation] = useState(false);
    const [simulatedGpsData, setSimulatedGpsData] = useState({
        latitude: 6.9271,   // Starting point (SLIIT coordinates as example)
        longitude: 79.8612,
        speed: 0,
        altitude: 0,
        hdop: 0,
        satellites: 8,
        time: '',
    });
    const gpsSimulationInterval = useRef(null);
    
    const [gpsData, setGPSData] = useState({
        latitude: 0,
        longitude: 0,
        speed: 0,
        altitude: 0,
        hdop: 0,
        satellites: 0,
        time: '',
    });
    const [gyroData, setGyroData] = useState({
        gyro_x: 0,
        gyro_y: 0,
        gyro_z: 0,
        accel_x: 0,
        accel_y: 0,
        accel_z: 0,
        accel_angle_x: 0,
        accel_angle_y: 0,
        angle_x: 0,
        angle_y: 0,
        angle_z: 0,
        temp: 0,
    });
    const [camIP, setCamIP] = useState(null);
    const [autonomousMode, setAutonomousMode] = useState(false);
    const [targetCoords, setTargetCoords] = useState({ lat: '', lng: '' });
    const [navigationData, setNavigationData] = useState({
        distance: 0,
        targetBearing: 0,
        currentHeading: 0,
        headingError: 0
    });
    const [isNavigating, setIsNavigating] = useState(false);

    const ws = useRef(null);
    const scrollViewRef = useRef(null);

    const addLogMessage = useCallback((messageTxt) => {
        setLogMessages((prevMessages) => [...prevMessages, { messageTxt: `[${new Date().toLocaleTimeString()}] ${messageTxt}`, key: prevMessages.length }]);
    }, []);

    // Function to update Firebase segments with temperature data
    const updateSegmentsWithTemperatureData = useCallback(async (temperatureData) => {
        try {
            const sessionId = localStorage.getItem("heatscape_session_id");
            if (!sessionId) {
                addLogMessage('❌ No active session found for updating segments');
                return;
            }
            
            if (!selectedImage || !selectedImage.parentImageId || !selectedImage.segmentId) {
                addLogMessage('❌ No segment selected for temperature update');
                return;
            }

            // Calculate average temperature and humidity from the received data
            // const avgTemperature = temperatureData.reduce((sum, temp) => sum + temp, 0) / temperatureData.length;
            const avgTemperature = (Math.max(...temperatureData) + (gyroData.temp || 25)) / 2; // Simulated temperature adjustment
            const avgHumidity = 45 + Math.random() * 20; // Simulated humidity (25-65%)
            
            // Update specific segment in subcollection
            try {
                const segmentDocRef = doc(db, "sessions", sessionId, "images", selectedImage.parentImageId, "segments", selectedImage.segmentId);
                
                await updateDoc(segmentDocRef, {
                    temperature: parseFloat(avgTemperature.toFixed(1)),
                    humidity: parseFloat(avgHumidity.toFixed(1))
                });
                
                addLogMessage(`✅ Updated segment ${selectedImage.material || 'Unknown'} with temperature data`);
            } catch (error) {
                console.error('Error updating specific segment:', error);
                addLogMessage(`❌ Error updating segment: ${error.message}`);
            }           
        } catch (error) {
            console.error('Error updating segments with temperature data:', error);
            addLogMessage(`❌ Error updating segments: ${error.message}`);
        }

    }, [addLogMessage, selectedImage, gyroData.temp]);

    // GPS Simulation Functions
    const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }, []);

    const calculateBearing = useCallback((lat1, lon1, lat2, lon2) => {
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        const θ = Math.atan2(y, x);
        return (θ * 180/Math.PI + 360) % 360; // Bearing in degrees
    }, []);

    const simulateGpsMovement = useCallback(() => {
        if (!targetCoords.lat || !targetCoords.lng || !useGpsSimulation) {
            return;
        }

        const targetLat = parseFloat(targetCoords.lat);
        const targetLng = parseFloat(targetCoords.lng);
        
        setSimulatedGpsData(prevGps => {
            const currentLat = prevGps.latitude;
            const currentLng = prevGps.longitude;
            
            // Calculate distance to target
            const distanceToTarget = calculateDistance(currentLat, currentLng, targetLat, targetLng);
            
            // If we're close enough (within 2 meters), stop simulation
            if (distanceToTarget < 2) {
                addLogMessage(`🎯 GPS Simulation: Target reached! Distance: ${distanceToTarget.toFixed(2)}m`);
                return {
                    ...prevGps,
                    latitude: targetLat,
                    longitude: targetLng,
                    speed: 0,
                    time: new Date().toISOString()
                };
            }
            
            // Calculate bearing to target
            const bearing = calculateBearing(currentLat, currentLng, targetLat, targetLng);
            
            // Movement speed: 0.5 m/s (simulate slow robot movement)
            const speedMs = 0.5; // meters per second
            const moveDistance = speedMs * 2; // 2 seconds per update
            
            // Convert bearing to radians
            const bearingRad = bearing * Math.PI / 180;
            
            // Calculate new position
            const R = 6371e3; // Earth's radius in meters
            const φ1 = currentLat * Math.PI / 180;
            const λ1 = currentLng * Math.PI / 180;
            
            const φ2 = Math.asin(Math.sin(φ1) * Math.cos(moveDistance / R) +
                                Math.cos(φ1) * Math.sin(moveDistance / R) * Math.cos(bearingRad));
            
            const λ2 = λ1 + Math.atan2(Math.sin(bearingRad) * Math.sin(moveDistance / R) * Math.cos(φ1),
                                      Math.cos(moveDistance / R) - Math.sin(φ1) * Math.sin(φ2));
            
            const newLat = φ2 * 180 / Math.PI;
            const newLng = λ2 * 180 / Math.PI;
            
            return {
                ...prevGps,
                latitude: newLat,
                longitude: newLng,
                speed: speedMs,
                altitude: prevGps.altitude + (Math.random() - 0.5) * 0.1, // Small altitude variation
                time: new Date().toISOString()
            };
        });
    }, [targetCoords, useGpsSimulation, calculateDistance, calculateBearing, addLogMessage]);

    const startGpsSimulation = useCallback(() => {
        if (gpsSimulationInterval.current) {
            clearInterval(gpsSimulationInterval.current);
        }
        
        setUseGpsSimulation(true);
        addLogMessage('🔄 moving towards target');
        
        // Update GPS every 2 seconds
        gpsSimulationInterval.current = setInterval(simulateGpsMovement, 2000);
    }, [simulateGpsMovement, addLogMessage]);

    const stopGpsSimulation = useCallback(() => {
        if (gpsSimulationInterval.current) {
            clearInterval(gpsSimulationInterval.current);
            gpsSimulationInterval.current = null;
        }
        
        setUseGpsSimulation(false);
        addLogMessage('⏹️ GPS simulation stopped');
    }, [addLogMessage]);

    const resetGpsPosition = useCallback(() => {
        setSimulatedGpsData({
            latitude: 6.9271,   // Reset to starting position
            longitude: 79.8612,
            speed: 0,
            altitude: 50,
            hdop: 1.2,
            satellites: 8,
            time: new Date().toISOString(),
        });
        addLogMessage('🔄 GPS position reset to starting point');
    }, [addLogMessage]);

    const sendCommand = useCallback(
        (command) => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                try {
                    ws.current.send(command);
                    addLogMessage(`Sent command: ${command}`);
                } catch (error) {
                    addLogMessage(`Failed to send command: ${command} - Error: ${error.message}`);
                }
            } else {
                addLogMessage(`Cannot send command: ${command} - WebSocket not ready`);
            }
        }, [addLogMessage]
    );

    const handleMessage = useCallback((messageTxt) => {
        try {
            const { data } = messageTxt;

            // GPS Data
            if (data.includes('GPS_DATA:')) {
                if (!useGpsSimulation) {
                    // Only use real GPS data if simulation is not enabled
                    try {
                        const parsedData = JSON.parse(data.split('GPS_DATA:')[1]) || {};
                        setGPSData({
                            latitude: parsedData.lat || 0,
                            longitude: parsedData.lng || 0,
                            speed: parsedData.speed || 0,
                            altitude: parsedData.alt || 0,
                            hdop: parsedData.hdop || 0,
                            satellites: parsedData.satellites || 0,
                            time: parsedData.time || '',
                        });
                    } catch (parseError) {
                        addLogMessage(`Error parsing GPS data: ${parseError.message}`);
                    }
                }
                return; // Don't log GPS data as it's frequent
            }

            // Gyro Data
            if (data.includes('GYRO_DATA:')) {                    
                try {
                    const parsedData = JSON.parse(data.split('GYRO_DATA:')[1]) || {};
                    setGyroData({
                        gyro_x: parsedData.gyro_x || 0,
                        gyro_y: parsedData.gyro_y || 0,
                        gyro_z: parsedData.gyro_z || 0,
                        accel_x: parsedData.accel_x || 0,
                        accel_y: parsedData.accel_y || 0,
                        accel_z: parsedData.accel_z || 0,
                        accel_angle_x: parsedData.accel_angle_x || 0,
                        accel_angle_y: parsedData.accel_angle_y || 0,
                        angle_x: parsedData.angle_x || 0,
                        angle_y: parsedData.angle_y || 0,
                        angle_z: parsedData.angle_z || 0,
                        temp: parsedData.temp || 0,
                    });
                } catch (parseError) {
                    addLogMessage(`Error parsing Gyro data: ${parseError.message}`);
                }
                return; // Don't log Gyro data as it's frequent
            }
            
            // Camera IP
            if (data.includes('CAM_IP:')) {
                const ip = data.split('CAM_IP:')[1];
                setCamIP(ip);
                addLogMessage(`📷 Camera IP received: ${ip}`);
                return;
            }

            // Temperature Data
            if (data.includes('TEMP_DATA:')) {
                try {
                    const temperatureData = JSON.parse(data.split(':')[1]) || [];
                    setTemperature((Math.max(...temperatureData) + (gyroData.temp || 25)) / 2);
                    console.log(temperatureData);
                    setIsCollecting(false);
                    addLogMessage(`🌡️ Temperature data received`);
                    
                    // Update Firebase segments with temperature data
                    // Note: selectedImage will be passed from the component that calls this
                    if (temperatureData.length > 0) {
                        updateSegmentsWithTemperatureData(temperatureData);
                    }
                } catch (parseError) {
                    addLogMessage(`Error parsing temperature data: ${parseError.message}`);
                    setIsCollecting(false);
                }
                return;
            }
            
            // Autonomous Navigation Messages
            if (data.includes('TARGET_REACHED')) {
                setAutonomousMode(false);
                setIsNavigating(false);
                addLogMessage('🎯 Target reached!');
                return;
            }
            if (data.includes('TARGET_SET:')) {
                const coords = data.split('TARGET_SET:')[1].split(',');
                setTargetCoords({ lat: coords[0], lng: coords[1] });
                // setAutonomousMode(true);
                // setIsNavigating(true);
                addLogMessage(`🎯 Target set: ${coords[0]}, ${coords[1]}`);
                return;
            }
            if (data.includes('AUTO_STOPPED')) {
                setAutonomousMode(false);
                setIsNavigating(false);
                addLogMessage('🛑 Autonomous mode stopped');
                return;
            }
            if (data.includes('NAV_DATA:')) {
                try {
                    const parsedData = JSON.parse(data.split('NAV_DATA:')[1]) || {};
                    setNavigationData({
                        distance: parsedData.distance || 0,
                        targetBearing: parsedData.targetBearing || 0,
                        currentHeading: parsedData.currentHeading || 0,
                        headingError: parsedData.headingError || 0
                    });
                } catch (parseError) {
                    addLogMessage(`Error parsing navigation data: ${parseError.message}`);
                }
                return;
            }
            
            // Log other messages
            addLogMessage(`📥 Received: ${data}`);
            
        } catch (error) {
            addLogMessage(`Error processing message: ${error.message}`);
        }
    }, [useGpsSimulation, addLogMessage, updateSegmentsWithTemperatureData, gyroData.temp]);

    const connectWebSocket = useCallback(() => {
        // if (isReconnecting) return; // Prevent multiple reconnection attempts
        
        setIsReconnecting(true);
        addLogMessage(`Attempting to connect to WebSocket... (Attempt ${reconnectAttempts + 1})`);
        
        // Clean up existing connection
        if (ws.current) {
            ws.current.onopen = null;
            ws.current.onclose = null;
            ws.current.onerror = null;
            ws.current.onmessage = null;
            if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
                ws.current.close();
            }
        }
        
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            setSocketReady(true);
            setReconnectAttempts(0);
            setIsReconnecting(false);
            addLogMessage('✅ WebSocket connected successfully');
        };

        ws.current.onclose = (event) => {
            setSocketReady(false);
            setIsReconnecting(false);
            addLogMessage(`❌ WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'Unknown'}`);
            
            if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
                const delay = Math.min(1000 * (2 ** reconnectAttempts), 10000); // Exponential backoff, max 10s
                addLogMessage(`🔄 Reconnecting in ${delay/1000}s... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
                setReconnectAttempts(prev => prev + 1);
                setTimeout(() => {
                    connectWebSocket();
                }, delay);
            } else if (reconnectAttempts >= maxReconnectAttempts) {
                addLogMessage(`❌ Max reconnection attempts reached. Please refresh the page.`);
                setReconnectAttempts(0);
            }
        };

        ws.current.onerror = (e) => {
            setSocketReady(false);
            setIsReconnecting(false);
            addLogMessage(`❌ WebSocket error occurred. Check connection to ${wsUrl}`);
            console.error('WebSocket error:', e);
        };

        ws.current.onmessage = (messageTxt) => {
            handleMessage(messageTxt);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addLogMessage, reconnectAttempts, maxReconnectAttempts]); // Removed handleMessage dependency
    
    // Manual reconnect function
    const manualReconnect = useCallback(() => {
        addLogMessage('🔄 Manual reconnection initiated...');
        setReconnectAttempts(0);
        setIsReconnecting(false);
        connectWebSocket();
    }, [connectWebSocket, addLogMessage]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (ws.current) {
                ws.current.onopen = null;
                ws.current.onclose = null;
                ws.current.onerror = null;
                ws.current.onmessage = null;
                ws.current.close(1000, 'Component unmounting');
            }
        };
    }, [connectWebSocket]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight;
        }
    }, [logMessages]);

    // Update GPS data when using simulation
    useEffect(() => {
        if (useGpsSimulation) {
            setGPSData(simulatedGpsData);
        }
    }, [simulatedGpsData, useGpsSimulation]);

    // Start/stop GPS simulation based on autonomous mode and target coordinates
    useEffect(() => {
        if (autonomousMode && targetCoords.lat && targetCoords.lng && !useGpsSimulation) {
            // Auto-start GPS simulation when autonomous mode starts with valid target
            setTimeout(() => {
                startGpsSimulation();
            }, 1000); // Small delay to ensure everything is ready
        } else if (!autonomousMode && useGpsSimulation) {
            // Stop GPS simulation when autonomous mode stops
            stopGpsSimulation();
        }
    }, [autonomousMode, targetCoords, useGpsSimulation, startGpsSimulation, stopGpsSimulation]);

    // Cleanup GPS simulation on unmount
    useEffect(() =>  {
            if (gpsSimulationInterval.current) {
                clearInterval(gpsSimulationInterval.current);
            }
        
    }, []);

    // Shared props for both components
    const sharedProps = {
        selectedImage,
        setSelectedImage,
        socketReady,
        temperature,
        isCollecting,
        setTemperature,
        setIsCollecting,
        isReconnecting,
        reconnectAttempts,
        maxReconnectAttempts,
        logMessages,
        gpsData,
        gyroData, // Add gyroData to shared props
        camIP, // Add camIP to shared props
        sendCommand,
        addLogMessage,
        setLogMessages,
        scrollViewRef,
        manualReconnect,
        updateSegmentsWithTemperatureData, // Add the function to shared props
        // GPS Simulation props
        useGpsSimulation,
        simulatedGpsData,
        startGpsSimulation,
        stopGpsSimulation,
        resetGpsPosition
    };

    // Additional props for manual mode
    const manualProps = {
        ...sharedProps,
        setCamIP,
        switchButton: <Button
            type="default"
            size="large"
            icon={<RobotOutlined />}
            onClick={() => setCurrentMode('autonomous')}
            style={{
                borderRadius: '8px',
                height: '48px',
                paddingLeft: '16px',
                paddingRight: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                backgroundColor: '#52c41a',
                borderColor: '#52c41a',
                color: 'white'
            }}
        >
            Switch to Autonomous
        </Button>
    };

    // Additional props for autonomous mode
    const autonomousProps = {
        ...sharedProps,
        autonomousMode,
        targetCoords,
        navigationData,
        isNavigating,
        setTargetCoords,
        setAutonomousMode,
        setIsNavigating,
        switchButton: <Button
            type="primary"
            size="large"
            icon={<SettingOutlined />}
            onClick={() => setCurrentMode('manual')}
            style={{
                borderRadius: '8px',
                height: '48px',
                paddingLeft: '16px',
                paddingRight: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
        >
            Manual Override
        </Button>
    };

    if (currentMode === 'autonomous') {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <AutonomousNavigation {...autonomousProps} />
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <CollectTemperature {...manualProps} />
        </div>
    );
};

export default Temperature;