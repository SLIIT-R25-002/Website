import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Row, Col, Button, message } from 'antd';

const wsUrl = 'wss://esp32.local:81';

const CollectTemperature = () => {
    const [temperature, setTemperature] = useState([]);
    const [socketReady, setSocketReady] = useState(false);
    const [logMessages, setLogMessages] = useState([]);
    const [camIP, setCamIP] = useState('');
    const [showLogs, setShowLogs] = useState(false);
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
    
    const [autonomousMode, setAutonomousMode] = useState(false);
    const [targetCoords, setTargetCoords] = useState({ lat: '', lng: '' });
    const [navigationData, setNavigationData] = useState({
        distance: 0,
        targetBearing: 0,
        currentHeading: 0,
        headingError: 0
    });

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
        },
        [addLogMessage]
    );

    const connectWebSocket = useCallback(() => {
        addLogMessage('Attempting to connect to WebSocket...');
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            setSocketReady(true);
            addLogMessage('WebSocket is open now.');
            sendCommand('GET_CAM_IP');
        };

        ws.current.onclose = (event) => {
            setSocketReady(false);
            addLogMessage(`WebSocket is closed now. Code: ${event.code}, Reason: ${event.reason}`);
            if (!event.wasClean) {
                addLogMessage('Reconnecting due to unexpected closure...');
                setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
            }
        };

        ws.current.onerror = (e) => {
            setSocketReady(false);
            addLogMessage(`WebSocket error: ${JSON.stringify(e, null, 2)}`);
        };

        ws.current.onmessage = (messageTxt) => {
            if (messageTxt.data.includes('CAM_IP:')) {
                setCamIP(messageTxt.data?.split(':')[1] || '');
            }
            if (messageTxt.data.includes('TEMP_DATA:')) {
                setTemperature(JSON.parse(messageTxt.data?.split(':')[1]) || []);
            }
            if (messageTxt.data.includes('GPS_DATA:')) {
                const parsedData = JSON.parse(messageTxt.data?.split('GPS_DATA:')[1]) || {};
                console.log('Parsed GPS Data:', parsedData);
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
            if (messageTxt.data.includes('TARGET_REACHED')) {
                setAutonomousMode(false);
                addLogMessage('🎯 Target reached!');
            }
            if (messageTxt.data.includes('TARGET_SET:')) {
                const coords = messageTxt.data.split('TARGET_SET:')[1].split(',');
                setTargetCoords({ lat: coords[0], lng: coords[1] });
                setAutonomousMode(true);
                addLogMessage(`🎯 Target set: ${coords[0]}, ${coords[1]}`);
            }
            if (messageTxt.data.includes('AUTO_STOPPED')) {
                setAutonomousMode(false);
                addLogMessage('🛑 Autonomous mode stopped');
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
            addLogMessage(`Received message: ${messageTxt.data}`);
        };
    }, [addLogMessage, sendCommand]);

    const flipCam = useCallback(
        async (ip) => {
            if (ip) {
                try {
                    await fetch(`http://${ip}/control?var=vflip&val=0`);
                } catch (error) {
                    addLogMessage(`Error flipping camera: ${error.message}`);
                }
            }
        },
        [addLogMessage]
    );

    useEffect(() => {
        flipCam(camIP);
    }, [camIP, flipCam]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connectWebSocket]);

    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight;
        }
    }, [logMessages]);

    const buttonStyle = {
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '15px 20px',
        border: 'none',
        borderRadius: '10px',
        margin: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
    };

    const controlButtonStyle = {
        backgroundColor: '#2196F3',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '5px',
        margin: '2px',
        cursor: 'pointer',
        fontSize: '14px',
    };

    return (
        <>
            <Row
                justify="center"
                style={{
                    padding: '20px',
                    backgroundColor: '#f0f2f5',
                    borderRadius: '8px',
                }}
            >
                <Col xs={24} lg={20} xl={18}>
                    {/* Header */}
                    <Row justify="space-between" align="middle" style={{ marginBottom: '20px' }}>
                        <Col flex="auto" style={{ textAlign: 'center' }}>
                            <h2 style={{ margin: 0 }}>Thermal Camera Temperature Collection</h2>
                        </Col>
                        <Col>
                            <Button
                                onClick={() => setShowLogs(!showLogs)}
                                style={{ ...controlButtonStyle, backgroundColor: '#666' }}
                            >
                                {showLogs ? 'Hide Logs' : 'Show Logs'}
                            </Button>
                        </Col>
                    </Row>

                    {/* Connection Status */}
                    <Row justify="center" style={{ marginBottom: '20px' }}>
                        <Col>
                            <span
                                style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: socketReady ? 'green' : 'red',
                                }}
                            >
                                {socketReady ? 'Connected' : 'Disconnected'}
                            </span>
                        </Col>
                    </Row>

                    {/* Logs Panel */}
                    {showLogs && (
                        <Row style={{ marginBottom: '20px' }}>
                            <Col span={24}>
                                <div
                                    style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #ccc',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        maxHeight: '300px',
                                    }}
                                >
                                    <h3>System Logs</h3>
                                    <div
                                        ref={scrollViewRef}
                                        style={{
                                            maxHeight: '250px',
                                            overflowY: 'auto',
                                            backgroundColor: '#f9f9f9',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            fontSize: '14px',
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        {logMessages.map(({ messageTxt, key }) => (
                                            <div key={key} style={{ marginBottom: '2px' }}>
                                                {messageTxt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    )}

                    {/* Camera Control Section */}
                    {camIP ? (
                        <Row style={{ marginBottom: '30px' }}>
                            <Col span={24}>
                                <h3>Camera Control</h3>
                                <Row justify="center" gutter={[0, 16]}>
                                    {/* UP Button */}
                                    <Col span={24} style={{ textAlign: 'center' }}>
                                        <Button
                                            style={controlButtonStyle}
                                            onMouseDown={() => sendCommand('V_TURN_CAM:65')}
                                            onMouseUp={() => sendCommand('V_TURN_CAM:90')}
                                            onMouseLeave={() => sendCommand('V_TURN_CAM:90')}
                                        >
                                            ↑ UP
                                        </Button>
                                    </Col>

                                    {/* Middle Row with Left, Camera View, and Right */}
                                    <Col span={24}>
                                        <Row justify="center" align="middle" gutter={16}>
                                            {/* LEFT Button */}
                                            <Col>
                                                <Button
                                                    style={controlButtonStyle}
                                                    onMouseDown={() => sendCommand('H_TURN_CAM:125')}
                                                    onMouseUp={() => sendCommand('H_TURN_CAM:90')}
                                                    onMouseLeave={() => sendCommand('H_TURN_CAM:90')}
                                                >
                                                    ← LEFT
                                                </Button>
                                            </Col>

                                            {/* Camera View */}
                                            <Col>
                                                <div
                                                    style={{
                                                        width: '320px',
                                                        height: '240px',
                                                        border: '2px solid #ccc',
                                                        borderRadius: '8px',
                                                        overflow: 'hidden',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    <iframe
                                                        src={`http://${camIP}:81/stream`}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                        }}
                                                        title="Camera Stream"
                                                        onError={() => setCamIP('')}
                                                    />
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: '5px',
                                                            right: '5px',
                                                            backgroundColor: 'rgba(0,0,0,0.7)',
                                                            color: 'white',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={() => setCamIP('')}
                                                    >
                                                        Reset Camera
                                                    </div>
                                                </div>
                                            </Col>

                                            {/* RIGHT Button */}
                                            <Col>
                                                <Button
                                                    style={controlButtonStyle}
                                                    onMouseDown={() => sendCommand('H_TURN_CAM:65')}
                                                    onMouseUp={() => sendCommand('H_TURN_CAM:90')}
                                                    onMouseLeave={() => sendCommand('H_TURN_CAM:90')}
                                                >
                                                    RIGHT →
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Col>

                                    {/* DOWN Button */}
                                    <Col span={24} style={{ textAlign: 'center' }}>
                                        <Button
                                            style={controlButtonStyle}
                                            onMouseDown={() => sendCommand('V_TURN_CAM:125')}
                                            onMouseUp={() => sendCommand('V_TURN_CAM:90')}
                                            onMouseLeave={() => sendCommand('V_TURN_CAM:90')}
                                        >
                                            ↓ DOWN
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    ) : (
                        <Row justify="center" style={{ marginBottom: '30px' }}>
                            <Col style={{ textAlign: 'center' }}>
                                <p>Waiting for Camera...</p>
                                <Button
                                    style={{ ...buttonStyle, backgroundColor: 'grey' }}
                                    onClick={() => sendCommand('GET_CAM_IP')}
                                >
                                    Refresh Camera
                                </Button>
                            </Col>
                        </Row>
                    )}
                    {/* Movement Control Section */}
                    <Row style={{ marginBottom: '30px' }}>
                        <Col span={24}>
                            <h3>Vehicle Movement Control</h3>
                            <Row justify="center" gutter={[16, 16]}>
                                {/* Forward Button */}
                                <Col xs={24} sm={12} md={6}>
                                    <Button
                                        style={{
                                            ...buttonStyle,
                                            backgroundColor: '#4CAF50',
                                            width: '100%',
                                            height: '60px',
                                            fontSize: '18px',
                                        }}
                                        onMouseDown={() => sendCommand('backward')}
                                        onMouseUp={() => sendCommand('stop')}
                                        onMouseLeave={() => sendCommand('stop')}
                                    >
                                        ↑ Forward
                                    </Button>
                                </Col>
                            </Row>
                            <Row justify="center" gutter={[16, 16]} style={{ marginTop: '10px' }}>
                                {/* Left Button */}
                                <Col xs={12} sm={6} md={6}>
                                    <Button
                                        style={{
                                            ...buttonStyle,
                                            backgroundColor: '#2196F3',
                                            width: '100%',
                                            height: '60px',
                                            fontSize: '18px',
                                        }}
                                        onMouseDown={() => sendCommand('right')}
                                        onMouseUp={() => sendCommand('stop')}
                                        onMouseLeave={() => sendCommand('stop')}
                                    >
                                        ← Left
                                    </Button>
                                </Col>
                                {/* Right Button */}
                                <Col xs={12} sm={6} md={6}>
                                    <Button
                                        style={{
                                            ...buttonStyle,
                                            backgroundColor: '#f44336',
                                            width: '100%',
                                            height: '60px',
                                            fontSize: '18px',
                                        }}
                                        onMouseDown={() => sendCommand('left')}
                                        onMouseUp={() => sendCommand('stop')}
                                        onMouseLeave={() => sendCommand('stop')}
                                    >
                                        Right →
                                    </Button>
                                </Col>
                            </Row>
                            <Row justify="center" gutter={[16, 16]} style={{ marginTop: '10px' }}>
                                {/* Backward Button */}
                                <Col xs={24} sm={12} md={6}>
                                    <Button
                                        style={{
                                            ...buttonStyle,
                                            backgroundColor: '#FF9800',
                                            width: '100%',
                                            height: '60px',
                                            fontSize: '18px',
                                        }}
                                        onMouseDown={() => sendCommand('forward')}
                                        onMouseUp={() => sendCommand('stop')}
                                        onMouseLeave={() => sendCommand('stop')}
                                    >
                                        ↓ Backward
                                    </Button>
                                </Col>
                            </Row>
                            <Row justify="center" style={{ marginTop: '20px' }}>
                                {/* Emergency Stop Button */}
                                <Col xs={24} sm={12} md={8}>
                                    <Button
                                        style={{
                                            ...buttonStyle,
                                            backgroundColor: '#d32f2f',
                                            width: '100%',
                                            height: '50px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                        }}
                                        onClick={() => sendCommand('stop')}
                                    >
                                        🛑 EMERGENCY STOP
                                    </Button>
                                </Col>
                            </Row>
                        </Col>
                    </Row>

                    {/* Temperature Collection */}
                    <Row style={{ marginBottom: '30px' }}>
                        <Col span={24}>
                            <h3>Temperature Data Collection</h3>
                            <Row justify="center">
                                <Col>
                                    <Button
                                        style={{ ...buttonStyle, backgroundColor: '#b98e34' }}
                                        onClick={() => {
                                            sendCommand('get_temp');
                                            setTemperature([]);
                                        }}
                                    >
                                        Collect Temperature Data
                                    </Button>
                                    {Array.isArray(temperature) && temperature.length > 0 && (
                                        <div
                                            style={{
                                                marginTop: '20px',
                                                padding: '15px',
                                                backgroundColor: '#e8f5e8',
                                                borderRadius: '8px',
                                                border: '2px solid #4CAF50',
                                            }}
                                        >
                                            <h4
                                                style={{
                                                    margin: '0 0 10px 0',
                                                    color: '#2e7d32',
                                                }}
                                            >
                                                Temperature Reading
                                            </h4>
                                            <div
                                                style={{
                                                    fontSize: '24px',
                                                    fontWeight: 'bold',
                                                    color: '#1b5e20',
                                                }}
                                            >
                                                {(
                                                    temperature.reduce((x, y) => x + y, 0) /
                                                    temperature.length
                                                )?.toFixed(2)}
                                                °C
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '14px',
                                                    color: '#666',
                                                    marginTop: '5px',
                                                }}
                                            >
                                                Based on {temperature.length} data points
                                            </div>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </Col>
                    </Row>

                    {/* GPS Data Display */}
                    <Row style={{ marginTop: '20px' }}>
                        <Col span={24}>
                            <div
                                style={{
                                    padding: '15px',
                                    backgroundColor: '#e0e0e0',
                                    borderRadius: '8px',
                                }}
                            >
                                <h3 style={{ marginTop: 0 }}>GPS Location Data</h3>
                                <Row gutter={[16, 8]}>
                                    <Col xs={24} sm={12} md={8}>
                                        <div>
                                            <strong>Latitude:</strong> {gpsData.latitude?.toFixed(6)}
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <div>
                                            <strong>Longitude:</strong> {gpsData.longitude?.toFixed(6)}
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <div>
                                            <strong>Speed:</strong> {gpsData.speed?.toFixed(2)} km/h
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <div>
                                            <strong>Altitude:</strong> {gpsData.altitude?.toFixed(2)}
                                            meters
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <div>
                                            <strong>HDOP:</strong> {gpsData.hdop?.toFixed(2)}
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <div>
                                            <strong>Satellites:</strong> {gpsData.satellites}
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={24} md={16}>
                                        <div>
                                            <strong>Time:</strong> {gpsData.time}
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </Col>
                    </Row>
                    {/* Gyroscope and Accelerometer Data Display */}
                    <Row style={{ marginTop: '20px' }}>
                        <Col span={24}>
                            <div
                                style={{
                                    padding: '15px',
                                    backgroundColor: '#e8f4fd',
                                    borderRadius: '8px',
                                }}
                            >
                                <h3 style={{ marginTop: 0 }}>IMU Sensor Data</h3>
                                <Row gutter={[16, 8]}>
                                    <Col xs={24} sm={12} md={8}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#1976d2' }}>
                                                Gyroscope (°/s)
                                            </h4>
                                            <div>
                                                <strong>X:</strong> {gyroData.gyro_x?.toFixed(3)}
                                            </div>
                                            <div>
                                                <strong>Y:</strong> {gyroData.gyro_y?.toFixed(3)}
                                            </div>
                                            <div>
                                                <strong>Z:</strong> {gyroData.gyro_z?.toFixed(3)}
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#1976d2' }}>
                                                Accelerometer (g)
                                            </h4>
                                            <div>
                                                <strong>X:</strong> {gyroData.accel_x?.toFixed(3)}
                                            </div>
                                            <div>
                                                <strong>Y:</strong> {gyroData.accel_y?.toFixed(3)}
                                            </div>
                                            <div>
                                                <strong>Z:</strong> {gyroData.accel_z?.toFixed(3)}
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#1976d2' }}>
                                                IMU Temperature
                                            </h4>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                                {gyroData.temp?.toFixed(2)}°C
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                                <Row gutter={[16, 8]} style={{ marginTop: '15px' }}>
                                    <Col xs={24} sm={12} md={8}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#c2185b' }}>
                                                Accel Angles (°)
                                            </h4>
                                            <div>
                                                <strong>X:</strong> {gyroData.accel_angle_x?.toFixed(3)}
                                            </div>
                                            <div>
                                                <strong>Y:</strong> {gyroData.accel_angle_y?.toFixed(3)}
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#388e3c' }}>
                                                Fusion Angles (°)
                                            </h4>
                                            <div>
                                                <strong>X (Tilt X):</strong> {gyroData.angle_x?.toFixed(3)}
                                            </div>
                                            <div>
                                                <strong>Y (Tilt Y):</strong> {gyroData.angle_y?.toFixed(3)}
                                            </div>
                                            <div>
                                                <strong>Z (Rotation):</strong> {gyroData.angle_z?.toFixed(3)}
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12} md={8}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#f57c00' }}>
                                                Orientation Status
                                            </h4>
                                            <div style={{ fontSize: '14px' }}>
                                                <div>
                                                    <strong>Tilt:</strong>
                                                    {Math.sqrt(
                                                        gyroData.angle_x ** 2 + gyroData.angle_y ** 2
                                                    )?.toFixed(1)}
                                                    °
                                                </div>
                                                <div>
                                                    <strong>Motion:</strong>
                                                    {Math.sqrt(
                                                        gyroData.gyro_x ** 2 +
                                                            gyroData.gyro_y ** 2 +
                                                            gyroData.gyro_z ** 2
                                                    ) > 1
                                                        ? 'Active'
                                                        : 'Stable'}
                                                </div>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </Col>
                    </Row>
                    {/* Instructions */}
                    <Row style={{ marginTop: '30px' }}>
                        <Col span={24}>
                            <div
                                style={{
                                    padding: '15px',
                                    backgroundColor: '#fff3cd',
                                    border: '1px solid #ffeaa7',
                                    borderRadius: '8px',
                                }}
                            >
                                <h4 style={{ marginTop: 0, color: '#856404' }}>Instructions:</h4>
                                <ul style={{ color: '#856404' }}>
                                    <li>
                                        Ensure the thermal camera is properly calibrated before
                                        collecting data
                                    </li>
                                    <li>
                                        Use the camera controls to position the camera for optimal
                                        readings
                                    </li>
                                    <li>
                                        Click "Collect Temperature Data" to capture thermal measurements
                                    </li>
                                    <li>GPS data is automatically collected and displayed below</li>
                                    <li>
                                        Monitor the system logs for connection status and error messages
                                    </li>
                                </ul>
                            </div>
                        </Col>
                    </Row>
                </Col>
            </Row>
            {/* Autonomous Navigation Control */}
            <Row style={{ marginBottom: '30px' }}>
                <Col span={24}>
                    <div
                        style={{
                            padding: '15px',
                            backgroundColor: autonomousMode ? '#e8f5e8' : '#f0f2f5',
                            border: `2px solid ${autonomousMode ? '#4CAF50' : '#ccc'}`,
                            borderRadius: '8px',
                        }}
                    >
                        <h3 style={{ marginTop: 0, color: autonomousMode ? '#2e7d32' : '#333' }}>
                            🤖 Autonomous Navigation {autonomousMode && '(ACTIVE)'}
                        </h3>
                        
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        Target Latitude:
                                    </label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={targetCoords.lat}
                                        onChange={(e) => setTargetCoords(prev => ({ ...prev, lat: e.target.value }))}
                                        placeholder="Enter latitude"
                                        disabled={autonomousMode}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc'
                                        }}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} md={12}>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        Target Longitude:
                                    </label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={targetCoords.lng}
                                        onChange={(e) => setTargetCoords(prev => ({ ...prev, lng: e.target.value }))}
                                        placeholder="Enter longitude"
                                        disabled={autonomousMode}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc'
                                        }}
                                    />
                                </div>
                            </Col>
                        </Row>
                        
                        <Row gutter={[16, 16]} style={{ marginTop: '15px' }}>
                            <Col xs={24} sm={12} md={8}>
                                <Button
                                    style={{
                                        ...buttonStyle,
                                        backgroundColor: autonomousMode ? '#ff9800' : '#4CAF50',
                                        width: '100%'
                                    }}
                                    onClick={() => {
                                        if (autonomousMode) {
                                            sendCommand('STOP_AUTO');
                                        } else if (targetCoords.lat && targetCoords.lng) {
                                            sendCommand(`SET_TARGET:${targetCoords.lat},${targetCoords.lng}`);
                                        } else {
                                            message.warning('Please enter target coordinates');
                                        }
                                    }}
                                    disabled={!autonomousMode && (!targetCoords.lat || !targetCoords.lng)}
                                >
                                    {autonomousMode ? '🛑 Stop Auto' : '🚀 Start Auto'}
                                </Button>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Button
                                    style={{
                                        ...buttonStyle,
                                        backgroundColor: '#2196F3',
                                        width: '100%'
                                    }}
                                    onClick={() => {
                                        setTargetCoords({
                                            lat: gpsData.latitude.toFixed(6),
                                            lng: gpsData.longitude.toFixed(6)
                                        });
                                    }}
                                >
                                    📍 Use Current Location
                                </Button>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Button
                                    style={{
                                        ...buttonStyle,
                                        backgroundColor: '#9C27B0',
                                        width: '100%'
                                    }}
                                    onClick={() => sendCommand('GET_TARGET')}
                                >
                                    🎯 Get Target Info
                                </Button>
                            </Col>
                        </Row>
                        
                        {autonomousMode && (
                            <div style={{
                                marginTop: '15px',
                                padding: '10px',
                                backgroundColor: '#fff',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>Navigation Status</h4>
                                <Row gutter={[16, 8]}>
                                    <Col xs={12} sm={6}>
                                        <div><strong>Distance:</strong> {navigationData.distance?.toFixed(1)}m</div>
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <div><strong>Target Bearing:</strong> {navigationData.targetBearing?.toFixed(1)}°</div>
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <div><strong>Current Heading:</strong> {navigationData.currentHeading?.toFixed(1)}°</div>
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <div><strong>Heading Error:</strong> {navigationData.headingError?.toFixed(1)}°</div>
                                    </Col>
                                </Row>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>
        </>
    );
};

export default CollectTemperature;


// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":0.25,"gyro_y":-0.44,"gyro_z":-1.00,"accel_x":-0.11,"accel_y":-0.01,"accel_z":0.48,"accel_angle_x":-0.81,"accel_angle_y":13.34,"angle_x":-0.64,"angle_y":11.96,"angle_z":-116.38,"temp":32.79}
// Received message: GYRO_DATA:{"gyro_x":0.25,"gyro_y":-0.44,"gyro_z":-1.00,"accel_x":-0.11,"accel_y":-0.01,"accel_z":0.48,"accel_angle_x":-0.81,"accel_angle_y":13.34,"angle_x":-0.64,"angle_y":11.96,"angle_z":-116.38,"temp":32.79}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":0.26,"gyro_y":-0.50,"gyro_z":-1.05,"accel_x":-0.10,"accel_y":-0.00,"accel_z":0.47,"accel_angle_x":-0.16,"accel_angle_y":11.60,"angle_x":-0.64,"angle_y":11.87,"angle_z":-117.37,"temp":32.74}
// Received message: GYRO_DATA:{"gyro_x":0.26,"gyro_y":-0.50,"gyro_z":-1.05,"accel_x":-0.10,"accel_y":-0.00,"accel_z":0.47,"accel_angle_x":-0.16,"accel_angle_y":11.60,"angle_x":-0.64,"angle_y":11.87,"angle_z":-117.37,"temp":32.74}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":-1.02,"gyro_y":4.81,"gyro_z":0.77,"accel_x":-0.14,"accel_y":-0.03,"accel_z":0.46,"accel_angle_x":-3.39,"accel_angle_y":16.94,"angle_x":-0.69,"angle_y":12.20,"angle_z":-118.34,"temp":32.79}
// Received message: GYRO_DATA:{"gyro_x":-1.02,"gyro_y":4.81,"gyro_z":0.77,"accel_x":-0.14,"accel_y":-0.03,"accel_z":0.46,"accel_angle_x":-3.39,"accel_angle_y":16.94,"angle_x":-0.69,"angle_y":12.20,"angle_z":-118.34,"temp":32.79}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":1.57,"gyro_y":19.47,"gyro_z":-26.27,"accel_x":-0.32,"accel_y":-0.15,"accel_z":0.38,"accel_angle_x":-16.55,"accel_angle_y":38.63,"angle_x":0.32,"angle_y":14.46,"angle_z":-121.26,"temp":32.69}
// Received message: GYRO_DATA:{"gyro_x":1.57,"gyro_y":19.47,"gyro_z":-26.27,"accel_x":-0.32,"accel_y":-0.15,"accel_z":0.38,"accel_angle_x":-16.55,"accel_angle_y":38.63,"angle_x":0.32,"angle_y":14.46,"angle_z":-121.26,"temp":32.69}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":-9.17,"gyro_y":-15.77,"gyro_z":15.88,"accel_x":0.07,"accel_y":-0.21,"accel_z":0.52,"accel_angle_x":-22.33,"accel_angle_y":-7.62,"angle_x":-14.33,"angle_y":3.07,"angle_z":-116.59,"temp":32.69}
// Received message: GYRO_DATA:{"gyro_x":-9.17,"gyro_y":-15.77,"gyro_z":15.88,"accel_x":0.07,"accel_y":-0.21,"accel_z":0.52,"accel_angle_x":-22.33,"accel_angle_y":-7.62,"angle_x":-14.33,"angle_y":3.07,"angle_z":-116.59,"temp":32.69}
// Received message: ping
// Received message: ping
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":-5.66,"gyro_y":-9.10,"gyro_z":-10.33,"accel_x":-0.20,"accel_y":0.03,"accel_z":0.47,"accel_angle_x":3.70,"accel_angle_y":23.31,"angle_x":0.69,"angle_y":22.40,"angle_z":-100.30,"temp":32.74}
// Received message: GYRO_DATA:{"gyro_x":-5.66,"gyro_y":-9.10,"gyro_z":-10.33,"accel_x":-0.20,"accel_y":0.03,"accel_z":0.47,"accel_angle_x":3.70,"accel_angle_y":23.31,"angle_x":0.69,"angle_y":22.40,"angle_z":-100.30,"temp":32.74}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":-4.72,"gyro_y":-3.28,"gyro_z":-4.71,"accel_x":-0.10,"accel_y":0.01,"accel_z":0.54,"accel_angle_x":1.14,"accel_angle_y":10.83,"angle_x":0.06,"angle_y":9.42,"angle_z":-101.91,"temp":32.79}
// Received message: GYRO_DATA:{"gyro_x":-4.72,"gyro_y":-3.28,"gyro_z":-4.71,"accel_x":-0.10,"accel_y":0.01,"accel_z":0.54,"accel_angle_x":1.14,"accel_angle_y":10.83,"angle_x":0.06,"angle_y":9.42,"angle_z":-101.91,"temp":32.79}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":9.73,"gyro_y":3.94,"gyro_z":-12.96,"accel_x":-0.08,"accel_y":0.02,"accel_z":0.50,"accel_angle_x":2.54,"accel_angle_y":8.75,"angle_x":1.04,"angle_y":9.12,"angle_z":-102.60,"temp":32.69}
// Received message: GYRO_DATA:{"gyro_x":9.73,"gyro_y":3.94,"gyro_z":-12.96,"accel_x":-0.08,"accel_y":0.02,"accel_z":0.50,"accel_angle_x":2.54,"accel_angle_y":8.75,"angle_x":1.04,"angle_y":9.12,"angle_z":-102.60,"temp":32.69}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":74.99,"gyro_y":-44.87,"gyro_z":-30.99,"accel_x":0.05,"accel_y":-0.12,"accel_z":0.59,"accel_angle_x":-11.66,"accel_angle_y":-4.53,"angle_x":7.65,"angle_y":4.77,"angle_z":-101.24,"temp":32.79}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":74.99,"gyro_y":-44.87,"gyro_z":-30.99,"accel_x":0.05,"accel_y":-0.12,"accel_z":0.59,"accel_angle_x":-11.66,"accel_angle_y":-4.53,"angle_x":7.65,"angle_y":4.77,"angle_z":-101.24,"temp":32.79}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":-11.72,"gyro_y":-0.87,"gyro_z":5.53,"accel_x":-0.06,"accel_y":0.13,"accel_z":0.52,"accel_angle_x":14.14,"accel_angle_y":6.11,"angle_x":-2.05,"angle_y":14.03,"angle_z":-104.83,"temp":32.79}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":-11.72,"gyro_y":-0.87,"gyro_z":5.53,"accel_x":-0.06,"accel_y":0.13,"accel_z":0.52,"accel_angle_x":14.14,"accel_angle_y":6.11,"angle_x":-2.05,"angle_y":14.03,"angle_z":-104.83,"temp":32.79}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":8.64,"gyro_y":1.64,"gyro_z":3.42,"accel_x":-0.11,"accel_y":0.01,"accel_z":0.53,"accel_angle_x":1.20,"accel_angle_y":11.40,"angle_x":1.36,"angle_y":13.31,"angle_z":-106.14,"temp":32.69}
// Received message: GYRO_DATA:{"gyro_x":8.64,"gyro_y":1.64,"gyro_z":3.42,"accel_x":-0.11,"accel_y":0.01,"accel_z":0.53,"accel_angle_x":1.20,"accel_angle_y":11.40,"angle_x":1.36,"angle_y":13.31,"angle_z":-106.14,"temp":32.69}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":-38.09,"gyro_y":-13.54,"gyro_z":-20.99,"accel_x":0.03,"accel_y":-0.05,"accel_z":0.47,"accel_angle_x":-6.03,"accel_angle_y":-3.07,"angle_x":-9.55,"angle_y":2.09,"angle_z":-104.55,"temp":32.74}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GYRO_DATA:{"gyro_x":-38.09,"gyro_y":-13.54,"gyro_z":-20.99,"accel_x":0.03,"accel_y":-0.05,"accel_z":0.47,"accel_angle_x":-6.03,"accel_angle_y":-3.07,"angle_x":-9.55,"angle_y":2.09,"angle_z":-104.55,"temp":32.74}
// Sent command: H_TURN_CAM:90
// Sent command: H_TURN_CAM:90
// Sent command: H_TURN_CAM:125
// Sent command: H_TURN_CAM:90
// Sent command: H_TURN_CAM:125
// Sent command: H_TURN_CAM:90
// Sent command: H_TURN_CAM:125
// Sent command: H_TURN_CAM:90
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Received message: GPS_DATA:{"lat":0.000000,"lng":0.000000,"speed":0.00,"alt":0.00,"hdop":99.99,"satellites":0,"time":"2000/0/0 0:0:0"}
// Sent command: H_TURN_CAM:125
// Sent command: H_TURN_CAM:90
// Sent command: H_TURN_CAM:90
// Sent command: H_TURN_CAM:65
// Sent command: H_TURN_CAM:90
// Sent command: H_TURN_CAM:90
// Sent command: H_TURN_CAM:125
// Sent command: H_TURN_CAM:90
// Sent command: H_TURN_CAM:90
// Received message: GYRO_DATA:{"gyro_x":-9.94,"gyro_y":0.15,"gyro_z":-1.08,"accel_x":0.04,"accel_y":-0.06,"accel_z":0.28,"accel_angle_x":-13.00,"accel_angle_y":-7.68,"angle_x":-11.36,"angle_y":0.11,"angle_z":-102.12,"temp":32.84}
// Received message: GYRO_DATA:{"gyro_x":-9.94,"gyro_y":0.15,"gyro_z":-1.08,"accel_x":0.04,"accel_y":-0.06,"accel_z":0.28,"accel_angle_x":-13.00,"accel_angle_y":-7.68,"angle_x":-11.36,"angle_y":0.11,"angle_z":-102.12,"temp":32.84}
// Sent command: stop
// Sent command: V_TURN_CAM:90
// Sent command: stop
// Sent command: stop
// WebSocket is closed now. Code: 1006, Reason:
// Reconnecting due to unexpected closure...
// Attempting to connect to WebSocket...
// WebSocket error: { "isTrusted": true }
// WebSocket is closed now. Code: 1006, Reason:
// Reconnecting due to unexpected closure...
// Attempting to connect to WebSocket...
// WebSocket error: { "isTrusted": true }
// WebSocket is closed now. Code: 1006, Reason:
// Reconnecting due to unexpected closure...
// Attempting to connect to WebSocket...
// WebSocket error: { "isTrusted": true }
// WebSocket is closed now. Code: 1006, Reason:
// Reconnecting due to unexpected closure...
// Attempting to connect to WebSocket...
// WebSocket error: { "isTrusted": true }
// WebSocket is closed now. Code: 1006, Reason:
// Reconnecting due to unexpected closure...
// Attempting to connect to WebSocket...
// WebSocket error: { "isTrusted": true }
// WebSocket is closed now. Code: 1006, Reason:
// Reconnecting due to unexpected closure...