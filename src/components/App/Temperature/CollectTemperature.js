import { useEffect, useRef, useCallback, useState } from 'react';
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

const CollectTemperature = ({ 
    socketReady, 
    isReconnecting,
    logMessages, 
    gpsData, 
    camIP, 
    setCamIP,
    temperature,
    setTemperature,
    isCollecting,
    setIsCollecting,
    gyroData,
    sendCommand, 
    addLogMessage, 
    setLogMessages,
    scrollViewRef,
    switchButton,
    manualReconnect
}) => {
    // eslint-disable-next-line no-unused-vars
    const [camAngle, setCamAngle] = useState({V_TURN_CAM: 90, H_TURN_CAM: 90});
    const keysPressed = useRef(new Set());
    const commandQueue = useRef([]);
    const lastCommandTime = useRef(0);
    const isProcessingCommands = useRef(false);
    
    // Rate limiting for commands (minimum 100ms between commands)
    const COMMAND_RATE_LIMIT = 100;

    const processCommandQueue = useCallback(() => {
        if (commandQueue.current.length > 0) {
            // Get the latest command of the same type to avoid spam
            const latestCommand = commandQueue.current.pop();
            commandQueue.current = [];
            
            sendCommand(latestCommand);
            lastCommandTime.current = Date.now();
            
            // Check if more commands are waiting
            setTimeout(() => {
                if (commandQueue.current.length > 0) {
                    processCommandQueue();
                } else {
                    isProcessingCommands.current = false;
                }
            }, COMMAND_RATE_LIMIT);
        } else {
            isProcessingCommands.current = false;
        }
    }, [sendCommand]);

    // Enhanced sendCommand with rate limiting
    const sendCommandWithRateLimit = useCallback((command) => {
        const now = Date.now();
        if (now - lastCommandTime.current < COMMAND_RATE_LIMIT) {
            // Add to queue if too soon
            commandQueue.current.push(command);
            if (!isProcessingCommands.current) {
                isProcessingCommands.current = true;
                setTimeout(() => {
                    processCommandQueue();
                }, COMMAND_RATE_LIMIT - (now - lastCommandTime.current));
            }
            return;
        }
        
        // Send immediately
        sendCommand(command);
        lastCommandTime.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sendCommand]);

    const flipCam = useCallback(
        async (ip) => {
            if (ip) {
                try {
                    addLogMessage(`Attempting to configure camera at ${ip}`);
                    const response = await fetch(`http://${ip}/control?var=vflip&val=0`, {
                        method: 'GET',
                        timeout: 5000
                    });
                    
                    if (response.ok) {
                        addLogMessage(`Camera configured successfully`);
                    } else {
                        addLogMessage(`Camera configuration failed: ${response.status}`);
                    }
                } catch (error) {
                    addLogMessage(`Error configuring camera: ${error.message}`);
                    // Don't reset camIP on network errors, just log them
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
                sendCommandWithRateLimit('backward');
                break;
            case 'arrowdown':
                event.preventDefault();
                sendCommandWithRateLimit('forward');
                break;
            case 'arrowleft':
                event.preventDefault();
                sendCommandWithRateLimit('right');
                break;
            case 'arrowright':
                event.preventDefault();
                sendCommandWithRateLimit('left');
                break;
            // Camera controls (WASD)
            case 'w':
                event.preventDefault();
                setCamAngle(prev => {
                    const newVAngle = Math.max(0, prev.V_TURN_CAM - 10); // Limit to minimum 0
                    sendCommandWithRateLimit(`V_TURN_CAM:${newVAngle}`);
                    return { ...prev, V_TURN_CAM: newVAngle };
                });
                break;
            case 's':
                event.preventDefault();
                setCamAngle(prev => {
                    const newVAngle = Math.min(180, prev.V_TURN_CAM + 10); // Limit to maximum 180
                    sendCommandWithRateLimit(`V_TURN_CAM:${newVAngle}`);
                    return { ...prev, V_TURN_CAM: newVAngle };
                });
                break;
            case 'a':
                event.preventDefault();
                setCamAngle(prev => {
                    const newHAngle = Math.min(180, prev.H_TURN_CAM + 10); // Limit to maximum 180
                    sendCommandWithRateLimit(`H_TURN_CAM:${newHAngle}`);
                    return { ...prev, H_TURN_CAM: newHAngle };
                });
                break;
            case 'd':
                event.preventDefault();
                setCamAngle(prev => {
                    const newHAngle = Math.max(0, prev.H_TURN_CAM - 10); // Limit to minimum 0
                    sendCommandWithRateLimit(`H_TURN_CAM:${newHAngle}`);
                    return { ...prev, H_TURN_CAM: newHAngle };
                });
                break;
            // Emergency stop
            case ' ':
            case 'escape':
                event.preventDefault();
                sendCommand('stop'); // Emergency stop should be immediate
                sendCommand('V_TURN_CAM:90');
                sendCommand('H_TURN_CAM:90');
                // Reset camera angle state to center position
                setCamAngle({ V_TURN_CAM: 90, H_TURN_CAM: 90 });
                break;
            default:
                break;
        }
    }, [sendCommand, sendCommandWithRateLimit]);

    const handleKeyUp = useCallback((event) => {
        keysPressed.current.delete(event.key.toLowerCase());

        switch (event.key.toLowerCase()) {
            // Stop movement when arrow keys are released
            case 'arrowup':
            case 'arrowdown':
            case 'arrowleft':
            case 'arrowright':
                event.preventDefault();
                sendCommand('stop'); // Stop should be immediate
                break;
            default:
                break;
        }
    }, [sendCommand]);

    useEffect(() => {
        flipCam(camIP);
    }, [camIP, flipCam]);

    useEffect(() => {
        // Add keyboard event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            // Remove keyboard event listeners
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Get camera IP on component mount
    useEffect(() => {
        if (socketReady) {
            sendCommand('GET_CAM_IP');
        }
    }, [socketReady, sendCommand]);

    return (
        <div style={{ 
            minHeight: 'calc(100vh - 500px)', 
            backgroundColor: '#f0f2f5', 
            padding: '20px 20px',
            tabIndex: 0
        }}>
            <Row justify="start" gutter={[12, 12]}>
                <Col xs={24} xxl={18}>
                    <Row gutter={[12, 12]}>
                        <Col span={24}>
                            {/* Header */}
                            <Card style={{ textAlign: 'center' }} >
                                <Row justify='space-evenly'>
                                    <Col>
                                        <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                                            <CameraOutlined style={{ marginRight: '12px' }} />
                                            Manual Temperature Collection System
                                        </Title>
                                        <Text type="secondary">Use keyboard controls: Arrow keys for movement, WASD for camera, Space/Esc for stop</Text>
                                    </Col>
                                    <Col style={{ textAlign: 'right' }}>
                                        {switchButton}
                                    </Col>
                                </Row>
                            </Card>
                        </Col>

                        <Col span={24}>
                        {/* Status Dashboard */}
                            <Row gutter={[12, 12]}>
                                {/* Connection Status */}
                                <Col xs={24} sm={12} lg={6}>
                                    <Card size="small">
                                        <Statistic
                                            title="Connection"
                                            value={
                                                isReconnecting ? "Connecting..." : 
                                                socketReady ? "Connected" : "Disconnected"
                                            }
                                            prefix={
                                                <WifiOutlined style={{ 
                                                    color: isReconnecting ? '#faad14' : 
                                                           socketReady ? '#52c41a' : '#ff4d4f' 
                                                }} />
                                            }
                                            valueStyle={{ 
                                                color: isReconnecting ? '#faad14' : 
                                                       socketReady ? '#52c41a' : '#ff4d4f',
                                                fontSize: '14px'
                                            }}
                                        />
                                        {(!socketReady && !isReconnecting) && (
                                            <Button 
                                                size="small" 
                                                type="primary" 
                                                onClick={manualReconnect}
                                                style={{ marginTop: '8px', width: '100%' }}
                                            >
                                                Reconnect
                                            </Button>
                                        )}
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
                        </Col>

                        <Col span={24}>
                            <Row gutter={[12, 12]}>
                                {/* Left Side: Combined Camera and Vehicle Control */}
                                <Col xs={24} lg={14}>
                                    <Card title={<><CameraOutlined /> Camera & Vehicle Control</>} style={{ height: '100%' }} size='small'>
                                        <Row gutter={[16, 16]}>
                                            {/* Camera Control Section */}
                                            <Col xs={24} xl={12}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                                                        <CameraOutlined /> Camera Control (WASD)
                                                    </Text>
                                                    {camIP ? (
                                                        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '16px' }}>
                                                            {/* Camera Feed */}
                                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                <div style={{
                                                                    width: '100%',
                                                                    maxWidth: 300,
                                                                    aspectRatio: '4/3',
                                                                    border: '3px solid #1890ff',
                                                                    borderRadius: 12,
                                                                    overflow: 'hidden',
                                                                    position: 'relative',
                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                                    backgroundColor: '#f0f2f5'
                                                                }}>
                                                                    <iframe
                                                                        src={`http://${camIP}:81/stream`}
                                                                        title="Camera Stream"
                                                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                                                        allow="camera"
                                                                    />
                                                                    <Button
                                                                        size="small"
                                                                        type="primary"
                                                                        danger
                                                                        onClick={() => {
                                                                            setCamIP('');
                                                                        }}
                                                                        style={{
                                                                            position: 'absolute',
                                                                            top: 8,
                                                                            right: 8,
                                                                            zIndex: 10
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
                                                                        size="small"
                                                                        onMouseDown={() => sendCommandWithRateLimit('V_TURN_CAM:65')}
                                                                        onMouseUp={() => sendCommandWithRateLimit('V_TURN_CAM:90')}
                                                                        onMouseLeave={() => sendCommandWithRateLimit('V_TURN_CAM:90')}
                                                                        style={{ width: '60px' }}
                                                                        disabled={!socketReady}
                                                                    >
                                                                        ↑ W
                                                                    </Button>
                                                                    <Space size="small">
                                                                        <Button
                                                                            type="primary"
                                                                            size="small"
                                                                            onMouseDown={() => sendCommandWithRateLimit('H_TURN_CAM:125')}
                                                                            onMouseUp={() => sendCommandWithRateLimit('H_TURN_CAM:90')}
                                                                            onMouseLeave={() => sendCommandWithRateLimit('H_TURN_CAM:90')}
                                                                            style={{ width: '60px' }}
                                                                            disabled={!socketReady}
                                                                        >
                                                                            ← A
                                                                        </Button>
                                                                        <Button
                                                                            type="primary"
                                                                            size="small"
                                                                            onMouseDown={() => sendCommandWithRateLimit('H_TURN_CAM:65')}
                                                                            onMouseUp={() => sendCommandWithRateLimit('H_TURN_CAM:90')}
                                                                            onMouseLeave={() => sendCommandWithRateLimit('H_TURN_CAM:90')}
                                                                            style={{ width: '60px' }}
                                                                            disabled={!socketReady}
                                                                        >
                                                                            D →
                                                                        </Button>
                                                                    </Space>
                                                                    <Button
                                                                        type="primary"
                                                                        size="small"
                                                                        onMouseDown={() => sendCommandWithRateLimit('V_TURN_CAM:125')}
                                                                        onMouseUp={() => sendCommandWithRateLimit('V_TURN_CAM:90')}
                                                                        onMouseLeave={() => sendCommandWithRateLimit('V_TURN_CAM:90')}
                                                                        style={{ width: '60px' }}
                                                                        disabled={!socketReady}
                                                                    >
                                                                        ↓ S
                                                                    </Button>
                                                                </Space>
                                                            </div>
                                                        </Space>
                                                    ) : (
                                                        <div style={{ textAlign: 'center', padding: '20px' }}>
                                                            <div style={{
                                                                width: '150px',
                                                                height: '120px',
                                                                backgroundColor: '#f5f5f5',
                                                                border: '2px dashed #d9d9d9',
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                margin: '0 auto 16px'
                                                            }}>
                                                                <Text type="secondary">Camera Loading...</Text>
                                                            </div>
                                                            <Button 
                                                                type="primary" 
                                                                size="small"
                                                                onClick={() => sendCommand('GET_CAM_IP')}
                                                                loading={!socketReady}
                                                            >
                                                                Refresh Camera
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </Col>

                                            {/* Vehicle Movement Section */}
                                            <Col xs={24} xl={12}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                                                        <CarOutlined /> Vehicle Movement (Arrow Keys)
                                                    </Text>
                                                    <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '16px' }}>
                                                        {/* Movement Controls */}
                                                        <Space direction="vertical" size="middle">
                                                            <Button
                                                                type="primary"
                                                                size="large"
                                                                onMouseDown={() => sendCommandWithRateLimit('backward')}
                                                                onMouseUp={() => sendCommand('stop')}
                                                                onMouseLeave={() => sendCommand('stop')}
                                                                disabled={!socketReady}
                                                                style={{ 
                                                                    width: '120px', 
                                                                    height: '50px', 
                                                                    fontSize: '14px',
                                                                    backgroundColor: '#52c41a'
                                                                }}
                                                            >
                                                                ↑ Forward
                                                            </Button>
                                                            <Space size="middle">
                                                                <Button
                                                                    type="primary"
                                                                    size="large"
                                                                    onMouseDown={() => sendCommandWithRateLimit('right')}
                                                                    onMouseUp={() => sendCommand('stop')}
                                                                    onMouseLeave={() => sendCommand('stop')}
                                                                    disabled={!socketReady}
                                                                    style={{ 
                                                                        width: '80px', 
                                                                        height: '50px', 
                                                                        fontSize: '14px',
                                                                        backgroundColor: '#1890ff'
                                                                    }}
                                                                >
                                                                    ← Left
                                                                </Button>
                                                                <Button
                                                                    type="primary"
                                                                    size="large"
                                                                    onMouseDown={() => sendCommandWithRateLimit('left')}
                                                                    onMouseUp={() => sendCommand('stop')}
                                                                    onMouseLeave={() => sendCommand('stop')}
                                                                    disabled={!socketReady}
                                                                    style={{ 
                                                                        width: '80px', 
                                                                        height: '50px', 
                                                                        fontSize: '14px',
                                                                        backgroundColor: '#1890ff'
                                                                    }}
                                                                >
                                                                    Right →
                                                                </Button>
                                                            </Space>
                                                            <Button
                                                                type="primary"
                                                                size="large"
                                                                onMouseDown={() => sendCommandWithRateLimit('forward')}
                                                                onMouseUp={() => sendCommand('stop')}
                                                                onMouseLeave={() => sendCommand('stop')}
                                                                disabled={!socketReady}
                                                                style={{ 
                                                                    width: '120px', 
                                                                    height: '50px', 
                                                                    fontSize: '14px',
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
                                                                width: '160px', 
                                                                height: '40px', 
                                                                fontSize: '14px',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            EMERGENCY STOP
                                                        </Button>
                                                    </Space>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>

                                {/* Right Side: Temperature Collection */}
                                <Col xs={24} lg={10}>
                                    <Card 
                                        title={<><EnvironmentOutlined /> Temperature Data Collection</>} 
                                        style={{ height: '100%' }}
                                    >
                                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                            <div style={{ textAlign: 'center' }}>
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
                                            </div>
                                            
                                            <div>
                                                {Array.isArray(temperature) && temperature.length > 0 ? (
                                                    <Card size="small" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#52c41a', marginBottom: '8px' }}>
                                                                {(temperature.reduce((x, y) => x + y, 0) / temperature.length)?.toFixed(2)}°C
                                                            </div>
                                                            <div>
                                                                <Text strong style={{ fontSize: '16px' }}>Latest Temperature Reading</Text><br />
                                                                <Text type="secondary">Based on {temperature.length} data points</Text>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ) : (
                                                    <div style={{ 
                                                        padding: '40px 20px', 
                                                        textAlign: 'center', 
                                                        backgroundColor: '#fafafa', 
                                                        borderRadius: '8px',
                                                        border: '2px dashed #d9d9d9'
                                                    }}>
                                                        <Text type="secondary" style={{ fontSize: '16px' }}>No temperature data collected yet</Text>
                                                    </div>
                                                )}
                                            </div>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Col>
                <Col xs={24} xxl={6}>
                    <Row gutter={[12, 12]}>
                        {/* System Logs (Collapsible) */}
                        <Col span={24}>
                            <Card 
                                title="System Logs" 
                                style={{ width: '100%' }}
                                extra={
                                    <Button size="small" onClick={() => setLogMessages([])}>
                                        Clear Logs
                                    </Button>
                                }
                                size="small"
                            >
                                <div
                                    ref={scrollViewRef}
                                    style={{
                                        height: '105px',
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
                                            {msg.messageTxt}
                                        </div>
                                    ))}
                                    {logMessages.length === 0 && (
                                        <Text type="secondary">No logs yet...</Text>
                                    )}
                                </div>
                            </Card>
                        </Col>
                            
                        {/* GPS Data */}
                        <Col span={24}>
                            <Card title={<><EnvironmentOutlined /> Current Location</>} size="small">
                                <Row gutter={[8, 12]}>
                                    <Col span={24}>
                                        <div style={{ padding: '6px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #91d5ff' }}>
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
                                    <Col span={7}>
                                        <Text type="secondary">Altitude</Text><br />
                                        <Text strong>{gpsData.altitude?.toFixed(1)} m</Text>
                                    </Col>
                                    <Col span={7}>
                                        <Text type="secondary">HDOP</Text><br />
                                        <Text strong>{gpsData.hdop?.toFixed(2)}</Text>
                                    </Col>
                                    <Col span={10}>
                                        <Text type="secondary">Time</Text><br />
                                        <Text strong>{gpsData.time}</Text>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>

                        {/* IMU Data */}
                        <Col span={24}>
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
                </Col>
            </Row>
        </div>
    );
};

export default CollectTemperature;