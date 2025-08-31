import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'antd';
import { SettingOutlined, RobotOutlined } from '@ant-design/icons';
import CollectTemperature from './CollectTemperature';
import AutonomousNavigation from './AutonomousNavigation';

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
            try {
                const { data } = messageTxt;

                // GPS Data
                if (data.includes('GPS_DATA:')) {
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
                        setTemperature(JSON.parse(data.split(':')[1]) || []);
                        console.log(JSON.parse(data.split(':')[1]) || []);
                        setIsCollecting(false);
                        addLogMessage(`🌡️ Temperature data received`);
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
                    setAutonomousMode(true);
                    setIsNavigating(true);
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
        };
    }, [addLogMessage, reconnectAttempts, maxReconnectAttempts]);

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

    // Shared props for both components
    const sharedProps = {
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
        manualReconnect
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