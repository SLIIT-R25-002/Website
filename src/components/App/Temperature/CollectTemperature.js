import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Row, Col, Button, Card, Space, Typography, Statistic } from 'antd';
import { 
    CameraOutlined, 
    CarOutlined, 
    EnvironmentOutlined, 
    DashboardOutlined, 
    StopOutlined,
    WifiOutlined,
    CompassOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const wsUrl = 'wss://esp32.local:81';

const CollectTemperature = () => {
    const [temperature, setTemperature] = useState([]);
    const [socketReady, setSocketReady] = useState(false);
    const [logMessages, setLogMessages] = useState([]);
    const [camIP, setCamIP] = useState('');
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
    const keysPressed = useRef(new Set());

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
                setIsCollecting(false);
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

    // Keyboard control handlers
    const handleKeyDown = useCallback((event) => {
        if (keysPressed.current.has(event.key.toLowerCase())) return; // Prevent key repeat
        keysPressed.current.add(event.key.toLowerCase());
        
        switch (event.key.toLowerCase()) {
            // Movement controls (Arrow keys)
            case 'arrowup':
                event.preventDefault();
                sendCommand('backward');
                break;
            case 'arrowdown':
                event.preventDefault();
                sendCommand('forward');
                break;
            case 'arrowleft':
                event.preventDefault();
                sendCommand('right');
                break;
            case 'arrowright':
                event.preventDefault();
                sendCommand('left');
                break;
            // Camera controls (WASD)
            case 'w':
                event.preventDefault();
                sendCommand('V_TURN_CAM:65');
                break;
            case 's':
                event.preventDefault();
                sendCommand('V_TURN_CAM:125');
                break;
            case 'a':
                event.preventDefault();
                sendCommand('H_TURN_CAM:125');
                break;
            case 'd':
                event.preventDefault();
                sendCommand('H_TURN_CAM:65');
                break;
            // Emergency stop
            case ' ':
            case 'escape':
                event.preventDefault();
                sendCommand('stop');
                break;
            default:
                break;
        }
    }, [sendCommand]);

    const handleKeyUp = useCallback((event) => {
        keysPressed.current.delete(event.key.toLowerCase());

        switch (event.key.toLowerCase()) {
            // Stop movement when arrow keys are released
            case 'arrowup':
            case 'arrowdown':
            case 'arrowleft':
            case 'arrowright':
                event.preventDefault();
                sendCommand('stop');
                break;
            // Reset camera position when WASD keys are released
            case 'w':
            case 's':
                event.preventDefault();
                sendCommand('V_TURN_CAM:90');
                break;
            case 'a':
            case 'd':
                event.preventDefault();
                sendCommand('H_TURN_CAM:90');
                break;
            default:
                break;
        }
    }, [sendCommand]);

    useEffect(() => {
        flipCam(camIP);
    }, [camIP, flipCam]);

    useEffect(() => {
        connectWebSocket();
        
        // Add keyboard event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            if (ws.current) {
                ws.current.close();
            }
            // Remove keyboard event listeners
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [connectWebSocket, handleKeyDown, handleKeyUp]);

    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight;
        }
    }, [logMessages]);

    return (
        <div style={{ 
            minHeight: '100vh', 
            backgroundColor: '#f0f2f5', 
            padding: '20px',
            tabIndex: 0 // Make div focusable for keyboard events
        }}>
            <Row justify="center" gutter={[24, 24]}>
                <Col xs={24} xxl={20}>
                    {/* Header */}
                    <Card style={{ marginBottom: '24px', textAlign: 'center' }}>
                        <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                            <CameraOutlined style={{ marginRight: '12px' }} />
                            Manual Temperature Collection System
                        </Title>
                        <Text type="secondary">Use keyboard controls: Arrow keys for movement, WASD for camera, Space/Esc for stop</Text>
                    </Card>

                    {/* Status Dashboard */}
                    <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                        {/* Connection Status */}
                        <Col xs={24} sm={12} lg={6}>
                            <Card size="small">
                                <Statistic
                                    title="Connection"
                                    value={socketReady ? "Connected" : "Disconnected"}
                                    prefix={<WifiOutlined style={{ color: socketReady ? '#52c41a' : '#ff4d4f' }} />}
                                    valueStyle={{ 
                                        color: socketReady ? '#52c41a' : '#ff4d4f',
                                        fontSize: '16px'
                                    }}
                                />
                            </Card>
                        </Col>

                        {/* Navigation Status */}
                        <Col xs={24} sm={12} lg={6}>
                            <Card size="small">
                                <Statistic
                                    title="Navigation"
                                    value={socketReady ? "Active" : "Idle"}
                                    prefix={<CompassOutlined style={{ color: socketReady ? '#1890ff' : '#d9d9d9' }} />}
                                    valueStyle={{ 
                                        color: socketReady ? '#1890ff' : '#8c8c8c',
                                        fontSize: '16px'
                                    }}
                                />
                            </Card>
                        </Col>

                        {/* GPS Status */}
                        <Col xs={24} sm={12} lg={6}>
                            <Card size="small">
                                <Statistic
                                    title="GPS Satellites"
                                    value={gpsData.satellites}
                                    prefix={<EnvironmentOutlined style={{ color: gpsData.satellites > 3 ? '#52c41a' : '#faad14' }} />}
                                    suffix="sats"
                                    valueStyle={{ 
                                        color: gpsData.satellites > 3 ? '#52c41a' : '#faad14',
                                        fontSize: '16px'
                                    }}
                                />
                            </Card>
                        </Col>

                        {/* Speed */}
                        <Col xs={24} sm={12} lg={6}>
                            <Card size="small">
                                <Statistic
                                    title="Speed"
                                    value={gpsData.speed?.toFixed(1)}
                                    prefix={<DashboardOutlined />}
                                    suffix="km/h"
                                    valueStyle={{ fontSize: '16px' }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[24, 24]}>
                        {/* Camera Control Panel */}
                        <Col xs={24} lg={12}>
                            <Card title={<><CameraOutlined /> Camera Control (WASD)</>} style={{ height: '100%' }}>
                                {camIP ? (
                                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                        {/* Camera Feed */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                width: '100%',
                                                maxWidth: '400px',
                                                aspectRatio: '4/3',
                                                border: '3px solid #1890ff',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                position: 'relative',
                                                margin: '0 auto',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                            }}>
                                                <iframe
                                                    src={`http://${camIP}:81/stream`}
                                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                                    title="Camera Stream"
                                                    onError={() => setCamIP('')}
                                                />
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    danger
                                                    onClick={() => setCamIP('')}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px'
                                                    }}
                                                >
                                                    Reset
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Camera Control Buttons */}
                                        <div style={{ textAlign: 'center' }}>
                                            <Space direction="vertical" size="small">
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    onMouseDown={() => sendCommand('V_TURN_CAM:65')}
                                                    onMouseUp={() => sendCommand('V_TURN_CAM:90')}
                                                    onMouseLeave={() => sendCommand('V_TURN_CAM:90')}
                                                    style={{ width: '80px' }}
                                                >
                                                    ↑ W
                                                </Button>
                                                <Space size="small">
                                                    <Button
                                                        type="primary"
                                                        size="large"
                                                        onMouseDown={() => sendCommand('H_TURN_CAM:125')}
                                                        onMouseUp={() => sendCommand('H_TURN_CAM:90')}
                                                        onMouseLeave={() => sendCommand('H_TURN_CAM:90')}
                                                        style={{ width: '80px' }}
                                                    >
                                                        ← A
                                                    </Button>
                                                    <Button
                                                        type="primary"
                                                        size="large"
                                                        onMouseDown={() => sendCommand('H_TURN_CAM:65')}
                                                        onMouseUp={() => sendCommand('H_TURN_CAM:90')}
                                                        onMouseLeave={() => sendCommand('H_TURN_CAM:90')}
                                                        style={{ width: '80px' }}
                                                    >
                                                        D →
                                                    </Button>
                                                </Space>
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    onMouseDown={() => sendCommand('V_TURN_CAM:125')}
                                                    onMouseUp={() => sendCommand('V_TURN_CAM:90')}
                                                    onMouseLeave={() => sendCommand('V_TURN_CAM:90')}
                                                    style={{ width: '80px' }}
                                                >
                                                    ↓ S
                                                </Button>
                                            </Space>
                                        </div>
                                    </Space>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <div style={{
                                            width: '200px',
                                            height: '150px',
                                            backgroundColor: '#f5f5f5',
                                            border: '2px dashed #d9d9d9',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 20px'
                                        }}>
                                            <Text type="secondary">Camera Loading...</Text>
                                        </div>
                                        <Button 
                                            type="primary" 
                                            onClick={() => sendCommand('GET_CAM_IP')}
                                            loading={!socketReady}
                                        >
                                            Refresh Camera
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </Col>

                        {/* Vehicle Movement Panel */}
                        <Col xs={24} lg={12}>
                            <Card title={<><CarOutlined /> Vehicle Movement (Arrow Keys)</>} style={{ height: '100%' }}>
                                <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                                    {/* Movement Controls */}
                                    <Space direction="vertical" size="middle">
                                        <Button
                                            type="primary"
                                            size="large"
                                            onMouseDown={() => sendCommand('backward')}
                                            onMouseUp={() => sendCommand('stop')}
                                            onMouseLeave={() => sendCommand('stop')}
                                            style={{ 
                                                width: '120px', 
                                                height: '60px', 
                                                fontSize: '16px',
                                                backgroundColor: '#52c41a'
                                            }}
                                        >
                                            ↑ Forward
                                        </Button>
                                        <Space size="middle">
                                            <Button
                                                type="primary"
                                                size="large"
                                                onMouseDown={() => sendCommand('right')}
                                                onMouseUp={() => sendCommand('stop')}
                                                onMouseLeave={() => sendCommand('stop')}
                                                style={{ 
                                                    width: '100px', 
                                                    height: '60px', 
                                                    fontSize: '16px',
                                                    backgroundColor: '#1890ff'
                                                }}
                                            >
                                                ← Left
                                            </Button>
                                            <Button
                                                type="primary"
                                                size="large"
                                                onMouseDown={() => sendCommand('left')}
                                                onMouseUp={() => sendCommand('stop')}
                                                onMouseLeave={() => sendCommand('stop')}
                                                style={{ 
                                                    width: '100px', 
                                                    height: '60px', 
                                                    fontSize: '16px',
                                                    backgroundColor: '#1890ff'
                                                }}
                                            >
                                                Right →
                                            </Button>
                                        </Space>
                                        <Button
                                            type="primary"
                                            size="large"
                                            onMouseDown={() => sendCommand('forward')}
                                            onMouseUp={() => sendCommand('stop')}
                                            onMouseLeave={() => sendCommand('stop')}
                                            style={{ 
                                                width: '120px', 
                                                height: '60px', 
                                                fontSize: '16px',
                                                backgroundColor: '#fa8c16'
                                            }}
                                        >
                                            ↓ Backward
                                        </Button>
                                    </Space>

                                    {/* Emergency Stop */}
                                    <Button
                                        danger
                                        size="large"
                                        icon={<StopOutlined />}
                                        onClick={() => sendCommand('stop')}
                                        style={{ 
                                            width: '200px', 
                                            height: '50px', 
                                            fontSize: '16px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        EMERGENCY STOP
                                    </Button>
                                </Space>
                            </Card>
                        </Col>
                    </Row>

                    {/* Temperature Collection Panel */}
                    <Card 
                        title={<><EnvironmentOutlined /> Temperature Data Collection</>} 
                        style={{ marginTop: '24px' }}
                    >
                        <Row gutter={[24, 24]} align="middle">
                            <Col xs={24} md={8}>
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        loading={isCollecting}
                                        onClick={() => {
                                            setIsCollecting(true);
                                            sendCommand('get_temp');
                                            setTemperature([]);
                                        }}
                                        style={{ 
                                            width: '100%', 
                                            height: '60px', 
                                            fontSize: '18px',
                                            backgroundColor: '#fa8c16',
                                            borderColor: '#fa8c16'
                                        }}
                                    >
                                        {isCollecting ? 'Collecting...' : 'Collect Temperature'}
                                    </Button>
                                </Space>
                            </Col>
                            <Col xs={24} md={16}>
                                {Array.isArray(temperature) && temperature.length > 0 ? (
                                    <Card size="small" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                                        <Row align="middle" gutter={16}>
                                            <Col>
                                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                                                    {(temperature.reduce((x, y) => x + y, 0) / temperature.length)?.toFixed(2)}°C
                                                </div>
                                            </Col>
                                            <Col flex="auto">
                                                <div>
                                                    <Text strong>Latest Temperature Reading</Text><br />
                                                    <Text type="secondary">Based on {temperature.length} data points</Text>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card>
                                ) : (
                                    <div style={{ 
                                        padding: '20px', 
                                        textAlign: 'center', 
                                        backgroundColor: '#fafafa', 
                                        borderRadius: '8px',
                                        border: '2px dashed #d9d9d9'
                                    }}>
                                        <Text type="secondary">No temperature data collected yet</Text>
                                    </div>
                                )}
                            </Col>
                        </Row>
                    </Card>

                    {/* Sensor Data Panel */}
                    <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
                        {/* GPS Data */}
                        <Col xs={24} lg={12}>
                            <Card title={<><EnvironmentOutlined /> Current Location</>}>
                                <Row gutter={[8, 12]}>
                                    <Col span={24}>
                                        <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #91d5ff' }}>
                                            <Row gutter={[8, 8]}>
                                                <Col span={12}>
                                                    <Text type="secondary">Latitude</Text><br />
                                                    <Text strong style={{ fontSize: '16px' }}>{gpsData.latitude?.toFixed(6)}</Text>
                                                </Col>
                                                <Col span={12}>
                                                    <Text type="secondary">Longitude</Text><br />
                                                    <Text strong style={{ fontSize: '16px' }}>{gpsData.longitude?.toFixed(6)}</Text>
                                                </Col>
                                            </Row>
                                        </div>
                                    </Col>
                                    <Col span={8}>
                                        <Text type="secondary">Altitude</Text><br />
                                        <Text strong>{gpsData.altitude?.toFixed(1)} m</Text>
                                    </Col>
                                    <Col span={8}>
                                        <Text type="secondary">HDOP</Text><br />
                                        <Text strong>{gpsData.hdop?.toFixed(2)}</Text>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>

                        {/* IMU Data */}
                        <Col xs={24} lg={12}>
                            <Card title={<><DashboardOutlined /> IMU Sensor</>} size="small">
                                <Row gutter={[8, 8]}>
                                    <Col span={8}>
                                        <Text strong>Gyro X:</Text><br />
                                        {gyroData.gyro_x?.toFixed(2)}°/s
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Gyro Y:</Text><br />
                                        {gyroData.gyro_y?.toFixed(2)}°/s
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Gyro Z:</Text><br />
                                        {gyroData.gyro_z?.toFixed(2)}°/s
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Accel X:</Text><br />
                                        {gyroData.accel_x?.toFixed(2)}g
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Accel Y:</Text><br />
                                        {gyroData.accel_y?.toFixed(2)}g
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Accel Z:</Text><br />
                                        {gyroData.accel_z?.toFixed(2)}g
                                    </Col>
                                    <Col span={12}>
                                        <Text strong>Tilt:</Text> {Math.sqrt(gyroData.angle_x ** 2 + gyroData.angle_y ** 2)?.toFixed(1)}°
                                    </Col>
                                    <Col span={12}>
                                        <Text strong>IMU Temp:</Text> {gyroData.temp?.toFixed(1)}°C
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    </Row>

                    {/* System Logs (Collapsible) */}
                    <Card 
                        title="System Logs" 
                        style={{ marginTop: '24px' }}
                        extra={
                            <Button size="small" onClick={() => setLogMessages([])}>
                                Clear Logs
                            </Button>
                        }
                    >
                        <div
                            ref={scrollViewRef}
                            style={{
                                height: '200px',
                                overflowY: 'auto',
                                backgroundColor: '#001529',
                                color: '#52c41a',
                                padding: '12px',
                                borderRadius: '6px',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                border: '1px solid #d9d9d9',
                                textAlign: 'left',
                            }}
                        >
                            {logMessages.map((msg) => (
                                <div key={msg.key} style={{ marginBottom: '2px' }}>
                                    [{new Date().toLocaleTimeString()}] {msg.messageTxt}
                                </div>
                            ))}
                            {logMessages.length === 0 && (
                                <Text type="secondary">No logs yet...</Text>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default CollectTemperature;