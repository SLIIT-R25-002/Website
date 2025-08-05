import { useEffect, useRef, useCallback } from 'react';
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
    switchButton
}) => {
    const keysPressed = useRef(new Set());

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
                sendCommand('V_TURN_CAM:40');
                break;
            case 's':
                event.preventDefault();
                sendCommand('V_TURN_CAM:100');
                break;
            case 'a':
                event.preventDefault();
                sendCommand('H_TURN_CAM:100');
                break;
            case 'd':
                event.preventDefault();
                sendCommand('H_TURN_CAM:40');
                break;
            // Emergency stop
            case ' ':
            case 'escape':
                event.preventDefault();
                sendCommand('stop');
                sendCommand('V_TURN_CAM:90');
                sendCommand('H_TURN_CAM:90');
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
        // Add keyboard event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            // Remove keyboard event listeners
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

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
                                                                        onMouseDown={() => sendCommand('V_TURN_CAM:65')}
                                                                        onMouseUp={() => sendCommand('V_TURN_CAM:90')}
                                                                        onMouseLeave={() => sendCommand('V_TURN_CAM:90')}
                                                                        style={{ width: '60px' }}
                                                                    >
                                                                        ↑ W
                                                                    </Button>
                                                                    <Space size="small">
                                                                        <Button
                                                                            type="primary"
                                                                            size="small"
                                                                            onMouseDown={() => sendCommand('H_TURN_CAM:125')}
                                                                            onMouseUp={() => sendCommand('H_TURN_CAM:90')}
                                                                            onMouseLeave={() => sendCommand('H_TURN_CAM:90')}
                                                                            style={{ width: '60px' }}
                                                                        >
                                                                            ← A
                                                                        </Button>
                                                                        <Button
                                                                            type="primary"
                                                                            size="small"
                                                                            onMouseDown={() => sendCommand('H_TURN_CAM:65')}
                                                                            onMouseUp={() => sendCommand('H_TURN_CAM:90')}
                                                                            onMouseLeave={() => sendCommand('H_TURN_CAM:90')}
                                                                            style={{ width: '60px' }}
                                                                        >
                                                                            D →
                                                                        </Button>
                                                                    </Space>
                                                                    <Button
                                                                        type="primary"
                                                                        size="small"
                                                                        onMouseDown={() => sendCommand('V_TURN_CAM:125')}
                                                                        onMouseUp={() => sendCommand('V_TURN_CAM:90')}
                                                                        onMouseLeave={() => sendCommand('V_TURN_CAM:90')}
                                                                        style={{ width: '60px' }}
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
                                                                onMouseDown={() => sendCommand('backward')}
                                                                onMouseUp={() => sendCommand('stop')}
                                                                onMouseLeave={() => sendCommand('stop')}
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
                                                                    onMouseDown={() => sendCommand('right')}
                                                                    onMouseUp={() => sendCommand('stop')}
                                                                    onMouseLeave={() => sendCommand('stop')}
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
                                                                    onMouseDown={() => sendCommand('left')}
                                                                    onMouseUp={() => sendCommand('stop')}
                                                                    onMouseLeave={() => sendCommand('stop')}
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
                                                                onMouseDown={() => sendCommand('forward')}
                                                                onMouseUp={() => sendCommand('stop')}
                                                                onMouseLeave={() => sendCommand('stop')}
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
                                            [{new Date().toLocaleTimeString()}] {msg.messageTxt}
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