import { useEffect } from 'react';
import { Row, Col, Button, message, Card, Typography, Space, Progress, Statistic, Input, Divider } from 'antd';
import { 
    RobotOutlined, 
    EnvironmentOutlined, 
    AimOutlined, 
    PlayCircleOutlined, 
    StopOutlined,
    CompassOutlined,
    DashboardOutlined,
    WifiOutlined,
    
} from '@ant-design/icons';

const { Title, Text } = Typography;

const AutonomousNavigation = ({ 
    socketReady, 
    logMessages, 
    setLogMessages,
    gpsData, 
    sendCommand, 
    scrollViewRef,
    autonomousMode,
    targetCoords,
    navigationData,
    isNavigating,
    setTargetCoords,
    switchButton
}) => {
    // Add CSS animation for pulse effect
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div style={{ 
            minHeight: 'calc(100vh - 500px)', 
            backgroundColor: '#f0f2f5',
            padding: '20px 20px',
        }}>
            <Row justify="center" gutter={[12, 12]}>
                <Col xs={24} xxl={18}>
                    <Row gutter={[12, 12]}>
                        <Col span={24}>
                            {/* Header */}
                            <Card style={{ textAlign: 'center' }}>
                                <Row justify='space-evenly'>
                                    <Col>
                                        <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                                            <RobotOutlined style={{ marginRight: '12px' }} />
                                            Autonomous Navigation System
                                        </Title>
                                        <Text type="secondary">Intelligent vehicle navigation with real-time GPS tracking</Text>
                                    </Col>
                                    <Col>
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
                                            value={autonomousMode ? "Active" : "Idle"}
                                            prefix={<CompassOutlined style={{ color: autonomousMode ? '#1890ff' : '#d9d9d9' }} />}
                                            valueStyle={{ 
                                                color: autonomousMode ? '#1890ff' : '#8c8c8c',
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
                                {/* Navigation Control Panel */}
                                <Col xs={24} lg={14}>
                                    <Card 
                                        title={
                                            <Space>
                                                <AimOutlined />
                                                <span>Navigation Control</span>
                                                {autonomousMode && <Text type="success">(ACTIVE)</Text>}
                                            </Space>
                                        }
                                        extra={
                                            autonomousMode && (
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <div style={{ 
                                                        width: '8px', 
                                                        height: '8px', 
                                                        backgroundColor: '#52c41a', 
                                                        borderRadius: '50%', 
                                                        marginRight: '8px',
                                                        animation: 'pulse 1.5s infinite'
                                                    }} />
                                                    <Text type="success">Navigating</Text>
                                                </div>
                                            )
                                        }
                                    >
                                        {/* Target Coordinates Input */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <Text strong style={{ fontSize: '16px', marginBottom: '12px', display: 'block' }}>
                                                🎯 Target Destination
                                            </Text>
                                            <Row gutter={[12, 12]}>
                                                <Col xs={24} md={12}>
                                                    <Text type="secondary">Latitude</Text>
                                                    <Input
                                                        size="large"
                                                        type="number"
                                                        step="0.000001"
                                                        value={targetCoords.lat}
                                                        onChange={(e) => setTargetCoords(prev => ({ ...prev, lat: e.target.value }))}
                                                        placeholder="Enter latitude (e.g., 6.9271)"
                                                        disabled={autonomousMode}
                                                        style={{ marginTop: '4px' }}
                                                    />
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Text type="secondary">Longitude</Text>
                                                    <Input
                                                        size="large"
                                                        type="number"
                                                        step="0.000001"
                                                        value={targetCoords.lng}
                                                        onChange={(e) => setTargetCoords(prev => ({ ...prev, lng: e.target.value }))}
                                                        placeholder="Enter longitude (e.g., 79.9612)"
                                                        disabled={autonomousMode}
                                                        style={{ marginTop: '4px' }}
                                                    />
                                                </Col>
                                            </Row>
                                        </div>

                                        {/* Action Buttons */}
                                        <Row gutter={[12, 12]}>
                                            <Col xs={24} sm={8}>
                                                <Button
                                                    type={autonomousMode ? "default" : "primary"}
                                                    danger={autonomousMode}
                                                    size="large"
                                                    icon={autonomousMode ? <StopOutlined /> : <PlayCircleOutlined />}
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
                                                    loading={isNavigating && !autonomousMode}
                                                    style={{ width: '100%', height: '50px' }}
                                                >
                                                    {autonomousMode ? 'Stop Navigation' : 'Start Navigation'}
                                                </Button>
                                            </Col>
                                            <Col xs={24} sm={8}>
                                                <Button
                                                    size="large"
                                                    icon={<EnvironmentOutlined />}
                                                    onClick={() => {
                                                        setTargetCoords({
                                                            lat: gpsData.latitude.toFixed(6),
                                                            lng: gpsData.longitude.toFixed(6)
                                                        });
                                                        message.success('Current location set as target');
                                                    }}
                                                    disabled={autonomousMode}
                                                    style={{ width: '100%', height: '50px' }}
                                                >
                                                    Use Current Location
                                                </Button>
                                            </Col>
                                            <Col xs={24} sm={8}>
                                                <Button
                                                    size="large"
                                                    icon={<AimOutlined />}
                                                    onClick={() => sendCommand('GET_TARGET')}
                                                    style={{ width: '100%', height: '50px' }}
                                                >
                                                    Get Target Info
                                                </Button>
                                            </Col>
                                        </Row>

                                        {/* Navigation Progress */}
                                        {autonomousMode && navigationData.distance > 0 && (
                                            <div style={{ marginTop: '24px' }}>
                                                <Divider>Navigation Progress</Divider>
                                                <Row gutter={[16, 16]}>
                                                    <Col xs={24} sm={12}>
                                                        <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                                                            <Statistic
                                                                title="Distance to Target"
                                                                value={navigationData.distance}
                                                                precision={1}
                                                                suffix="m"
                                                                valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                                                            />
                                                        </Card>
                                                    </Col>
                                                    <Col xs={24} sm={12}>
                                                        <Card size="small" style={{ backgroundColor: '#fff7e6' }}>
                                                            <Statistic
                                                                title="Heading Error"
                                                                value={Math.abs(navigationData.headingError)}
                                                                precision={1}
                                                                suffix="°"
                                                                valueStyle={{ 
                                                                    color: Math.abs(navigationData.headingError) < 5 ? '#52c41a' : '#faad14',
                                                                    fontSize: '24px'
                                                                }}
                                                            />
                                                        </Card>
                                                    </Col>
                                                </Row>
                                                
                                                <div style={{ marginTop: '16px' }}>
                                                    <Text type="secondary">Navigation Accuracy</Text>
                                                    <Progress
                                                        percent={Math.max(0, 100 - Math.abs(navigationData.headingError) * 2)}
                                                        status={Math.abs(navigationData.headingError) < 5 ? 'success' : 'active'}
                                                        strokeColor={{
                                                            '0%': '#108ee9',
                                                            '100%': '#87d068',
                                                        }}
                                                        style={{ marginTop: '8px' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                </Col>

                                {/* GPS and System Info */}
                                <Col xs={24} lg={10}>
                                    {/* Current Location */}
                                    <Card 
                                        title={<><EnvironmentOutlined /> Current Location</>}
                                        style={{ marginBottom: '24px' }}
                                    >
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
                                            {/* <Col span={8}>
                                                <Text type="secondary">Fix Quality</Text><br />
                                                <Text strong style={{ 
                                                    color: gpsData.satellites > 6 ? '#52c41a' : 
                                                        gpsData.satellites > 3 ? '#faad14' : '#ff4d4f' 
                                                }}>
                                                    {(() => {
                                                        if (gpsData.satellites > 6) return 'Excellent';
                                                        if (gpsData.satellites > 3) return 'Good';
                                                        return 'Poor';
                                                    })()}
                                                </Text>
                                            </Col> */}
                                        </Row>
                                    </Card>

                                    {/* Navigation Details */}
                                    {autonomousMode && (
                                        <Card 
                                            title={<><CompassOutlined /> Navigation Details</>}
                                            style={{ marginBottom: '24px' }}
                                        >
                                            <Row gutter={[8, 8]}>
                                                <Col span={12}>
                                                    <Text type="secondary">Target Bearing</Text><br />
                                                    <Text strong>{navigationData.targetBearing?.toFixed(1)}°</Text>
                                                </Col>
                                                <Col span={12}>
                                                    <Text type="secondary">Current Heading</Text><br />
                                                    <Text strong>{navigationData.currentHeading?.toFixed(1)}°</Text>
                                                </Col>
                                            </Row>
                                        </Card>
                                    )}
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Col>
                <Col xs={24} xxl={6}>
                    {/* System Logs */}
                    <Card 
                        title="System Logs" 
                        style={{ width: '100%' }}
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

export default AutonomousNavigation;
