import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, message } from 'antd';
import { SettingOutlined, RobotOutlined } from '@ant-design/icons';
import CollectTemperature from './CollectTemperature';
import AutonomousNavigation from './AutonomousNavigation';

const wsUrl = 'ws://esp32.local:81';

const Temperature = () => {
    const [currentMode, setCurrentMode] = useState('autonomous'); // Default to autonomous mode
    
    // Shared WebSocket state
    const [socketReady, setSocketReady] = useState(false);
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
        setLogMessages((prevMessages) => [...prevMessages, { messageTxt, key: prevMessages.length }]);
    }, []);

    const sendCommand = useCallback(
        (command) => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(command);
                addLogMessage(`Sent command: ${command}`);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []
    );

    const connectWebSocket = useCallback(() => {
        addLogMessage('Attempting to connect to WebSocket...');
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            setSocketReady(true);
            addLogMessage('WebSocket is open now.');
        };

        ws.current.onclose = (event) => {
            setSocketReady(false);
            addLogMessage(`WebSocket is closed now. Code: ${event.code}, Reason: ${event.reason}`);
            if (!event.wasClean) {
                addLogMessage('Reconnecting due to unexpected closure...');
                setTimeout(connectWebSocket, 5000);
            }
        };

        ws.current.onerror = (e) => {
            setSocketReady(false);
            addLogMessage(`WebSocket error: ${JSON.stringify(e, null, 2)}`);
        };

        ws.current.onmessage = (messageTxt) => {
            // GPS Data
            if (messageTxt.data.includes('GPS_DATA:')) {
                const parsedData = JSON.parse(messageTxt.data?.split('GPS_DATA:')[1]) || {};
                setGPSData({
                    latitude: parsedData.lat || 0,
                    longitude: parsedData.lng || 0,
                    speed: parsedData.speed || 0,
                    altitude: parsedData.alt || 0,
                    hdop: parsedData.hdop || 0,
                    satellites: parsedData.satellites || 0,
                    time: parsedData.time || '',
                });
            }

            // Gyro Data
            if (messageTxt.data.includes('GYRO_DATA:')) {
                const parsedData = JSON.parse(messageTxt.data?.split('GYRO_DATA:')[1]) || {};
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
            }
            
            // Camera IP
            if (messageTxt.data.includes('CAM_IP:')) {
                const ip = messageTxt.data.split('CAM_IP:')[1];
                setCamIP(ip);
                addLogMessage(`Camera IP received: ${ip}`);
            }

            if (messageTxt.data.includes('TEMP_DATA:')) {
                setTemperature(JSON.parse(messageTxt.data?.split(':')[1]) || []);
                setIsCollecting(false);
            }
            
            // Autonomous Navigation Messages
            if (messageTxt.data.includes('TARGET_REACHED')) {
                setAutonomousMode(false);
                setIsNavigating(false);
                addLogMessage('🎯 Target reached!');
                message.success('Target reached successfully!');
            }
            if (messageTxt.data.includes('TARGET_SET:')) {
                const coords = messageTxt.data.split('TARGET_SET:')[1].split(',');
                setTargetCoords({ lat: coords[0], lng: coords[1] });
                setAutonomousMode(true);
                setIsNavigating(true);
                addLogMessage(`🎯 Target set: ${coords[0]}, ${coords[1]}`);
                message.success('Navigation started!');
            }
            if (messageTxt.data.includes('AUTO_STOPPED')) {
                setAutonomousMode(false);
                setIsNavigating(false);
                addLogMessage('🛑 Autonomous mode stopped');
                message.info('Navigation stopped');
            }
            if (messageTxt.data.includes('NAV_DATA:')) {
                const parsedData = JSON.parse(messageTxt.data?.split('NAV_DATA:')[1]) || {};
                setNavigationData({
                    distance: parsedData.distance || 0,
                    targetBearing: parsedData.targetBearing || 0,
                    currentHeading: parsedData.currentHeading || 0,
                    headingError: parsedData.headingError || 0
                });
            }
            
            if(!messageTxt.data.includes('GYRO_DATA:') ) addLogMessage(`Received message: ${messageTxt.data}`);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
        
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight;
        }
    }, [logMessages]);

    // Shared props for both components
    const sharedProps = {
        socketReady,
        logMessages,
        gpsData,
        sendCommand,
        addLogMessage,
        setLogMessages,
        scrollViewRef
    };

    // Additional props for manual mode
    const manualProps = {
        ...sharedProps,
        camIP,
        temperature,
        isCollecting,
        gyroData,
        setCamIP,
        setTemperature,
        setIsCollecting,
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