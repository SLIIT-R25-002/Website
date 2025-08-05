import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Row, Col, Button, message, Card, Typography } from 'antd';

const { Text } = Typography;

const wsUrl = 'wss://esp32.local:81';

const AutonomousNavigation = () => {
    const [socketReady, setSocketReady] = useState(false);
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
    }, [addLogMessage]);

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

    return (
        <div style={{ 
            minHeight: '100vh', 
            backgroundColor: '#f5f5f5',
            padding: '20px'
        }}>
            <Row justify="center">
                <Col xs={24} lg={20} xl={18}>
                    <div style={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        padding: '30px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h1 style={{ 
                            textAlign: 'center', 
                            marginBottom: '30px',
                            color: '#1976d2'
                        }}>
                            🤖 Autonomous Navigation System
                        </h1>

                        {/* Connection Status */}
                        <Row style={{ marginBottom: '20px' }}>
                            <Col span={24}>
                                <div style={{
                                    padding: '10px',
                                    backgroundColor: socketReady ? '#e8f5e8' : '#ffebee',
                                    border: `2px solid ${socketReady ? '#4CAF50' : '#f44336'}`,
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <strong>
                                        Connection Status: {socketReady ? '🟢 Connected' : '🔴 Disconnected'}
                                    </strong>
                                </div>
                            </Col>
                        </Row>

                        {/* GPS Status */}
                        <Row style={{ marginBottom: '30px' }}>
                            <Col span={24}>
                                <div style={{
                                    padding: '15px',
                                    backgroundColor: '#e3f2fd',
                                    border: '2px solid #2196F3',
                                    borderRadius: '8px',
                                }}>
                                    <h3 style={{ marginTop: 0, color: '#1976d2' }}>📍 GPS Status</h3>
                                    <Row gutter={[16, 8]}>
                                        <Col xs={12} sm={6}>
                                            <div><strong>Latitude:</strong> {gpsData.latitude?.toFixed(6)}</div>
                                        </Col>
                                        <Col xs={12} sm={6}>
                                            <div><strong>Longitude:</strong> {gpsData.longitude?.toFixed(6)}</div>
                                        </Col>
                                        <Col xs={12} sm={6}>
                                            <div><strong>Speed:</strong> {gpsData.speed?.toFixed(1)} km/h</div>
                                        </Col>
                                        <Col xs={12} sm={6}>
                                            <div><strong>Satellites:</strong> {gpsData.satellites}</div>
                                        </Col>
                                    </Row>
                                </div>
                            </Col>
                        </Row>

                        {/* Autonomous Navigation Control */}
                        <Row style={{ marginBottom: '30px' }}>
                            <Col span={24}>
                                <div style={{
                                    padding: '15px',
                                    backgroundColor: autonomousMode ? '#e8f5e8' : '#f0f2f5',
                                    border: `2px solid ${autonomousMode ? '#4CAF50' : '#ccc'}`,
                                    borderRadius: '8px',
                                }}>
                                    <h3 style={{ marginTop: 0, color: autonomousMode ? '#2e7d32' : '#333' }}>
                                        🎯 Autonomous Navigation {autonomousMode && '(ACTIVE)'}
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

                        {/* System Logs */}
                        <Row>
                            <Col span={24}>
                                <Card 
                                    title="System Logs" 
                                    style={{ marginTop: '24px' }}
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
                </Col>
            </Row>
        </div>
    );
};

export default AutonomousNavigation;
