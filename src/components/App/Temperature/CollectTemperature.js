import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Row, Col, Button, Card, Space, Typography, Alert, Progress } from 'antd';
import { CameraOutlined, CarOutlined, EnvironmentOutlined, DashboardOutlined, StopOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const wsUrl = 'wss://esp32.local:81';

const CollectTemperature = () => {
    const [temperature, setTemperature] = useState([]);
    const [socketReady, setSocketReady] = useState(false);
    const [logMessages, setLogMessages] = useState([]);
    const [camIP, setCamIP] = useState('');
    const [showLogs, setShowLogs] = useState(false);
    const [isCollecting, setIsCollecting] = useState(false);
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
                    {/* System Logs */}
                    <Row>
                        <Col span={24}>
                            <div style={{
                                padding: '15px',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '8px',
                            }}>
                                <h3 style={{ marginTop: 0, color: '#495057' }}>📋 System Logs</h3>
                                <div
                                    ref={scrollViewRef}
                                    style={{
                                        height: '200px',
                                        overflowY: 'auto',
                                        backgroundColor: '#000',
                                        color: '#00ff00',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        fontFamily: 'monospace',
                                        fontSize: '12px'
                                    }}
                                >
                                    {logMessages.map((msg) => (
                                        <div key={msg.key}>
                                            [{new Date().toLocaleTimeString()}] {msg.messageTxt}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </>
    );
};

export default CollectTemperature;