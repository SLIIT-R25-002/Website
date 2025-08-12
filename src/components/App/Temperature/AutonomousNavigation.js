import { useEffect, useState } from 'react';
import { Row, Col, Button, message, Card, Typography, Space, Progress, Statistic, Input, Divider, Upload, Image, Spin } from 'antd';
import { 
    RobotOutlined, 
    EnvironmentOutlined, 
    AimOutlined, 
    PlayCircleOutlined, 
    StopOutlined,
    CompassOutlined,
    DashboardOutlined,
    WifiOutlined,
    UploadOutlined,
    PictureOutlined,
    CameraOutlined,
    DeleteOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const AutonomousNavigation = ({ 
    socketReady, 
    isReconnecting,
    logMessages, 
    setLogMessages,
    gpsData, 
    gyroData, // Add gyroData prop
    sendCommand, 
    scrollViewRef,
    autonomousMode,
    targetCoords,
    navigationData,
    isNavigating,
    setTargetCoords,
    setAutonomousMode,
    setIsNavigating,
    switchButton,
    manualReconnect,
    camIP // Add camIP prop for live feed
}) => {
    // State for image management
    const [uploadedImages, setUploadedImages] = useState([]);
    const [backendImages, setBackendImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);

    // Function to fetch images from backend
    const fetchBackendImages = async () => {
        try {
            // Replace with your actual backend endpoint
            const response = await fetch('/api/navigation/images');
            const data = await response.json();
            if (data.status !== 'error') {
                setBackendImages(data);
            } else {
                console.error('Backend error:', data.message);
            }
        } catch (error) {
            console.error('Failed to fetch backend images:', error);
        }
    };

    // Handle image upload
    const handleImageUpload = ({ file, onSuccess, onError }) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const newImage = {
                uid: file.uid,
                name: file.name,
                url: e.target.result,
                file, // Store the actual file object for backend upload
                coordinates: null, // Will be set when user clicks on image
                timestamp: new Date().toISOString()
            };
            setUploadedImages(prev => [...prev, newImage]);
            setSelectedImage(newImage); // Set as current processing image
            onSuccess();
            message.success(`${file.name} uploaded successfully`);
        };
        reader.onerror = () => {
            onError();
            message.error(`Failed to upload ${file.name}`);
        };
        reader.readAsDataURL(file);
    };

    // Handle image selection and coordinate setting
    const handleImageSelect = (image) => {
        setSelectedImage(image);
        setSelectedImage(image); // Set as current processing image
        if (image.coordinates) {
            setTargetCoords({
                lat: image.coordinates.lat,
                lng: image.coordinates.lng
            });
            message.success('Target coordinates set from image');
        }
    };

    // Handle image deletion
    const handleImageDelete = (imageUid) => {
        const allImages = [...backendImages, ...uploadedImages];
        // const imageToDelete = allImages.find(img => img.uid === imageUid);
        
        // Remove from uploaded images
        setUploadedImages(prev => prev.filter(img => img.uid !== imageUid));
        
        // If deleted image was the current processing image, set next available image
        if (selectedImage?.uid === imageUid) {
            const remainingImages = allImages.filter(img => img.uid !== imageUid);
            setSelectedImage(remainingImages.length > 0 ? remainingImages[0] : null);
        }
        
        message.success('Image deleted');
    };

    // Handle coordinate setting for image
    const handleSetImageCoordinates = (imageUid, coordinates) => {
        const parsedLat = parseFloat(coordinates.lat);
        const parsedLng = parseFloat(coordinates.lng);

        if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
            message.error('Please enter valid numbers for latitude and longitude.');
            return;
        }
        
        setUploadedImages(prev => prev.map(img => 
            img.uid === imageUid ? { ...img, coordinates: {lat: parsedLat, lng: parsedLng} } : img
        ));
        
        // Update backend images (if needed)
        setBackendImages(prev => prev.map(img => 
            img.uid === imageUid ? { ...img, coordinates: {lat: parsedLat, lng: parsedLng} } : img
        ));
        
        // Update current processing image if it's the same image
        if (selectedImage?.uid === imageUid) {
            setSelectedImage(prev => ({ ...prev, coordinates: {lat: parsedLat, lng: parsedLng} }));
        }
        
        message.success('Coordinates set for image');
    };

    // Function to send reference image to backend
    const sendReferenceImage = async (imageObject) => {
        if (!imageObject) {
            message.error('No image selected to send as reference');
            return;
        }

        try {
            const formData = new FormData();
            
            // Check if we have the actual file object (for uploaded images)
            if (imageObject.file) {
                formData.append('image', imageObject.file);
            } else {
                // For backend images or images without file object, convert data URL to blob
                try {
                    let blob;
                    if (imageObject.url.startsWith('data:')) {
                        // Convert data URL to blob
                        const response = await fetch(imageObject.url);
                        blob = await response.blob();
                    } else {
                        // Fetch from URL
                        const response = await fetch(imageObject.url);
                        if (!response.ok) {
                            throw new Error(`Failed to fetch image: ${response.statusText}`);
                        }
                        blob = await response.blob();
                    }
                    formData.append('image', blob, imageObject.name || 'reference_image.jpg');
                } catch (fetchError) {
                    console.error('Error processing image:', fetchError);
                    message.error('Failed to process image for upload');
                    return;
                }
            }

            const response = await fetch('http://localhost:5003/api/set_reference', {
                method: 'POST',
                body: formData,
            });

            const responseData = await response.json();
            if (responseData.status !== 'error') {
                message.success('Reference image sent successfully');
                console.log('Backend response:', responseData);
            } else {
                message.error(`Failed to send reference image: ${responseData.message}`);
            }
        } catch (error) {
            console.error('Error sending reference image:', error);
            message.error(`Error sending reference image: ${error.message}`);
        }
    };

    // Function to start video stream
    const startVideoStream = async () => {
        if (!camIP) {
            message.error('Camera IP not available');
            return;
        }
        setAutonomousMode(true);

        try {
            const response = await fetch('http://localhost:5003/api/start_stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    stream_source: `http://${camIP}:81/stream`
                })
            });

            const responseData = await response.json();
            if (responseData.status !== 'error') {
                message.success('Video stream started successfully');
                console.log('Stream start response:', responseData);
                
                // Set autonomous mode and navigation state
                setIsNavigating(true);
                
            } else {
                message.error(`Failed to start video stream: ${responseData.message}`);
            }
        } catch (error) {
            console.error('Error starting video stream:', error);
            message.error(`Error starting video stream: ${error.message}`);
            setAutonomousMode(false);
        }
    };

    // Function to stop video stream
    const stopVideoStream = async () => {
        try {
            const response = await fetch('http://localhost:5003/api/stop_stream', {
                method: 'POST'
            });

            const responseData = await response.json();
            if (responseData.status !== 'error') {
                message.success('Video stream stopped successfully');
                console.log('Stream stop response:', responseData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error stopping video stream:', error);
            message.error(`Error stopping video stream: ${error.message}`);
            return false;
        }
    };


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

    // Fetch backend images on component mount
    useEffect(() => {
        fetchBackendImages();
    }, []);

    // Set initial current processing image when images are available
    useEffect(() => {
        const allImages = [...backendImages, ...uploadedImages];
        if (allImages.length > 0 && !selectedImage) {
            setSelectedImage(allImages[0]);
        }
    }, [backendImages, uploadedImages, selectedImage]);

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
                                                <span>Navigation Target</span>
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
                                        <Row gutter={[16, 16]}>
                                            {(autonomousMode) ?
                                            <Col span={24}>
                                                <div style={{
                                                    width: '100%',
                                                    aspectRatio: '4/3',
                                                    border: '3px solid #52c41a',
                                                    borderRadius: 12,
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    backgroundColor: '#f0f2f5',
                                                    marginBottom: '16px'
                                                }}>
                                                    {isNavigating ?
                                                        <iframe
                                                            src="http://localhost:5003/api/video_stream?show_keypoints=true"
                                                            title="Camera Stream"
                                                            style={{ width: '100%', height: '100%', border: 'none' }}
                                                            allow="camera"
                                                        />
                                                        :
                                                        <Spin size="large" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                                                    }
                                                </div>
                                            </Col>
                                            :
                                            <> 
                                                {/* Left Side: Image Gallery and Upload */}
                                                <Col xs={24} lg={12}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
                                                                <PictureOutlined /> Target Image
                                                            </Text>
                                                        </div>
                                                        
                                                        {/* Show upload only if no images exist */}
                                                        {backendImages.length === 0 && uploadedImages.length === 0 && (
                                                            <Upload.Dragger
                                                                customRequest={handleImageUpload}
                                                                accept="image/*"
                                                                showUploadList={false}
                                                                style={{ marginBottom: '16px', height: '120px' }}
                                                                disabled={autonomousMode}
                                                            >
                                                                <div style={{ padding: '16px' }}>
                                                                    <UploadOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
                                                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                                                        Upload Target Image
                                                                    </div>
                                                                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                                                        Click or drag image to upload
                                                                    </div>
                                                                </div>
                                                            </Upload.Dragger>
                                                        )}

                                                        {/* Current Processing Image (Large Display) */}
                                                        {selectedImage && (
                                                            <div style={{ marginBottom: '16px' }}>
                                                                <div style={{
                                                                    border: '2px solid #1890ff',
                                                                    borderRadius: '8px',
                                                                    overflow: 'hidden',
                                                                    position: 'relative',
                                                                    backgroundColor: '#f0f2f5',
                                                                    height: '200px'
                                                                }}>
                                                                    <Image
                                                                        src={selectedImage.url}
                                                                        alt={selectedImage.name}
                                                                        style={{ 
                                                                            width: '100%', 
                                                                            height: '100%', 
                                                                            objectFit: 'cover',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        onClick={() => {
                                                                            setSelectedImage(selectedImage);
                                                                        }}
                                                                        preview={false}
                                                                    />
                                                                    <div
                                                                        style={{
                                                                            position: 'absolute',
                                                                            bottom: 0,
                                                                            left: 0,
                                                                            right: 0,
                                                                            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                                                            color: 'white',
                                                                            padding: '8px 12px',
                                                                            fontSize: '12px',
                                                                        }}
                                                                        >
                                                                        <div style={{ fontWeight: 'bold' }}>{selectedImage.name}</div>

                                                                        {selectedImage.coordinates ? (
                                                                            <div style={{ fontSize: '10px', opacity: 0.9 }}>
                                                                            📍 {selectedImage.coordinates.lat.toFixed(4)}, {selectedImage.coordinates.lng.toFixed(4)}
                                                                            </div>
                                                                        ) : (
                                                                            <Space size="small" style={{ marginTop: 4 }}>
                                                                                <Input
                                                                                    placeholder="Lat"
                                                                                    value={targetCoords.lat}
                                                                                    onChange={(e) => setTargetCoords((prev) => ({ ...prev, lat: e.target.value }))}
                                                                                    style={{ width: 100 }}
                                                                                    size="small"
                                                                                />
                                                                                <Input
                                                                                    placeholder="Lng"
                                                                                    value={targetCoords.lng}
                                                                                    onChange={(e) => setTargetCoords((prev) => ({ ...prev, lng: e.target.value }))}
                                                                                    style={{ width: 100 }}
                                                                                    size="small"
                                                                                />
                                                                                <Button type="primary" size="small" onClick={() => handleSetImageCoordinates(selectedImage.uid, targetCoords)}>
                                                                                    Set
                                                                                </Button>
                                                                            </Space>
                                                                        )}
                                                                        </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Horizontal Image List */}
                                                        {(backendImages.length > 0 || uploadedImages.length > 0) && (
                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ 
                                                                    display: 'flex', 
                                                                    justifyContent: 'space-between', 
                                                                    alignItems: 'center', 
                                                                    marginBottom: '8px' 
                                                                }}>
                                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                        Available Images ({backendImages.length + uploadedImages.length})
                                                                    </Text>
                                                                    {uploadedImages.length === 0 && (
                                                                        <Upload
                                                                            customRequest={handleImageUpload}
                                                                            accept="image/*"
                                                                            showUploadList={false}
                                                                            disabled={autonomousMode}
                                                                        >
                                                                            <Button 
                                                                                size="small" 
                                                                                icon={<UploadOutlined />}
                                                                                type="dashed"
                                                                                disabled={autonomousMode}
                                                                            >
                                                                                Add
                                                                            </Button>
                                                                        </Upload>
                                                                    )}
                                                                </div>
                                                                
                                                                <div style={{
                                                                    display: 'flex',
                                                                    gap: '8px',
                                                                    overflowX: 'auto',
                                                                    padding: '8px 0',
                                                                    border: '1px solid #d9d9d9',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: '#fafafa'
                                                                }}>
                                                                    {/* Backend Images */}
                                                                    {backendImages.map((item) => (
                                                                        <div
                                                                            key={item.uid}
                                                                            style={{
                                                                                position: 'relative',
                                                                                height: '60px',
                                                                                width: '60px',
                                                                                border: selectedImage?.uid === item.uid ? '2px solid #1890ff' : '2px solid transparent',
                                                                                borderRadius: '6px',
                                                                                overflow: 'hidden',
                                                                                cursor: 'pointer',
                                                                                backgroundColor: '#fff',
                                                                            }}
                                                                            onClick={() => handleImageSelect(item)}
                                                                        >
                                                                            <Image
                                                                                src={item.url}
                                                                                alt={item.name}
                                                                                style={{ 
                                                                                    width: '100%', 
                                                                                    height: '100%', 
                                                                                    objectFit: 'cover' 
                                                                                }}
                                                                                preview={false}
                                                                            />
                                                                            {item.coordinates && (
                                                                                <div style={{
                                                                                    position: 'absolute',
                                                                                    top: '2px',
                                                                                    right: '2px',
                                                                                    background: 'rgba(82, 196, 26, 0.8)',
                                                                                    borderRadius: '50%',
                                                                                    width: '12px',
                                                                                    height: '12px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center'
                                                                                }}>
                                                                                    <div style={{ 
                                                                                        width: '6px', 
                                                                                        height: '6px', 
                                                                                        background: '#fff', 
                                                                                        borderRadius: '50%' 
                                                                                    }} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}

                                                                    {/* Uploaded Images */}
                                                                    {uploadedImages.map((item) => (
                                                                        <div
                                                                            key={item.uid}
                                                                            style={{
                                                                                position: 'relative',
                                                                                width: '60px',
                                                                                height: '60px',
                                                                                border: selectedImage?.uid === item.uid ? '2px solid #1890ff' : '2px solid transparent',
                                                                                borderRadius: '6px',
                                                                                overflow: 'hidden',
                                                                                cursor: 'pointer',
                                                                                backgroundColor: '#fff'
                                                                            }}
                                                                            onClick={() => handleImageSelect(item)}
                                                                        >
                                                                            <Image
                                                                                src={item.url}
                                                                                alt={item.name}
                                                                                style={{ 
                                                                                    width: '100%', 
                                                                                    height: '100%', 
                                                                                    objectFit: 'cover' 
                                                                                }}
                                                                                preview={false}
                                                                            />
                                                                            {item.coordinates && (
                                                                                <div style={{
                                                                                    position: 'absolute',
                                                                                    top: '2px',
                                                                                    right: '2px',
                                                                                    background: 'rgba(82, 196, 26, 0.8)',
                                                                                    borderRadius: '50%',
                                                                                    width: '12px',
                                                                                    height: '12px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center'
                                                                                }}>
                                                                                    <div style={{ 
                                                                                        width: '6px', 
                                                                                        height: '6px', 
                                                                                        background: '#fff', 
                                                                                        borderRadius: '50%' 
                                                                                    }} />
                                                                                </div>
                                                                            )}
                                                                            <Button
                                                                                type="text"
                                                                                size="small"
                                                                                danger
                                                                                icon={<DeleteOutlined />}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleImageDelete(item.uid);
                                                                                }}
                                                                                disabled={autonomousMode}
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    top: '2px',
                                                                                    left: '2px',
                                                                                    minWidth: '20px',
                                                                                    height: '20px',
                                                                                    padding: 0,
                                                                                    background: 'rgba(255, 77, 79, 0.8)',
                                                                                    color: 'white',
                                                                                    fontSize: '10px'
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Col>

                                                {/* Right Side: Live Camera Feed */}
                                                <Col xs={24} lg={12}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                                                                <CameraOutlined /> Live Camera Feed
                                                            </Text>
                                                        </div>
                                                        
                                                        {camIP ? (
                                                            <>
                                                                <div style={{
                                                                    width: '100%',
                                                                    maxWidth: 300,
                                                                    aspectRatio: '4/3',
                                                                    border: '3px solid #52c41a',
                                                                    borderRadius: 12,
                                                                    overflow: 'hidden',
                                                                    position: 'relative',
                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                                    backgroundColor: '#f0f2f5',
                                                                    marginBottom: '16px'
                                                                }}>
                                                                    <iframe
                                                                        src={`http://${camIP}:81/stream`}
                                                                        title="Camera Stream"
                                                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                                                        allow="camera"
                                                                    />
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: 8,
                                                                        left: 8,
                                                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                                                        color: 'white',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '10px'
                                                                    }}>
                                                                        LIVE
                                                                    </div>
                                                                </div>
                                                                <div style={{ marginTop: '12px' }}>
                                                                    <Button 
                                                                        type="primary"
                                                                        size="small"
                                                                        icon={<PictureOutlined />}
                                                                        onClick={() => selectedImage && sendReferenceImage(selectedImage)}
                                                                        disabled={!selectedImage || autonomousMode}
                                                                        style={{ marginRight: '8px' }}
                                                                    >
                                                                        Set Reference
                                                                    </Button>
                                                                    <Button 
                                                                        type={autonomousMode ? "default" : "primary"}
                                                                        danger={autonomousMode}
                                                                        size="small"
                                                                        icon={autonomousMode ? <StopOutlined /> : <PlayCircleOutlined />}
                                                                        onClick={autonomousMode ? stopVideoStream : startVideoStream}
                                                                        disabled={!camIP}
                                                                        style={{ marginRight: '8px' }}
                                                                    >
                                                                        {autonomousMode ? 'Stop Stream' : 'Start Stream'}
                                                                    </Button>
                                                                    {selectedImage && (
                                                                        <Text 
                                                                            type="success" 
                                                                            style={{ fontSize: '12px' }}
                                                                        >
                                                                            ✓ Ready
                                                                        </Text>
                                                                    )}
                                                                </div>
                                                            </>
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
                                            </>
                                            }
                                        </Row>
                                    </Card>
                                </Col>

                                <Col span={24}>
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
                                                    onClick={async () => {
                                                        if (autonomousMode) {
                                                            sendCommand('STOP_AUTO');
                                                            // Also stop the video stream
                                                            await stopVideoStream();
                                                        } else if (targetCoords.lat && targetCoords.lng) {
                                                            // Send reference image to backend if one is selected
                                                            if (selectedImage) {
                                                                const success = await sendReferenceImage(selectedImage);
                                                                if (!success) {
                                                                    message.warning('Failed to send reference image, but continuing with navigation');
                                                                }
                                                            }
                                                            sendCommand(`SET_TARGET:${targetCoords.lat},${targetCoords.lng}`);
                                                        } else {
                                                            message.warning('Please enter target coordinates');
                                                        }
                                                    }}
                                                    disabled={!autonomousMode && (!targetCoords.lat || !targetCoords.lng)}
                                                    loading={isNavigating && !autonomousMode}
                                                    style={{ width: '100%', height: '50px' }}
                                                >
                                                    {autonomousMode ? 'Stop Navigation' : (
                                                        selectedImage ? 'Start Navigation + Set Reference' : 'Start Navigation'
                                                    )}
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
                                                {selectedImage?.coordinates ? (
                                                    <Button
                                                        size="large"
                                                        icon={<PictureOutlined />}
                                                        onClick={() => {
                                                            setTargetCoords({
                                                                lat: selectedImage.coordinates.lat.toString(),
                                                                lng: selectedImage.coordinates.lng.toString()
                                                            });
                                                            message.success('Image coordinates set as target');
                                                        }}
                                                        disabled={autonomousMode}
                                                        style={{ width: '100%', height: '50px', backgroundColor: '#52c41a', borderColor: '#52c41a', color: 'white' }}
                                                    >
                                                        Use Image Target
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="large"
                                                        icon={<AimOutlined />}
                                                        onClick={() => sendCommand('GET_TARGET')}
                                                        style={{ width: '100%', height: '50px' }}
                                                    >
                                                        Get Target Info
                                                    </Button>
                                                )}
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
                            </Row>
                        </Col>
                    </Row>
                </Col>
                <Col xs={24} xxl={6}>
                    <Row gutter={[12, 12]}>
                        {/* System Logs */}
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

                        {/* Navigation Details - Only show when autonomous mode is active */}
                        {autonomousMode && (
                            <Col span={24}>
                                <Card title={<><CompassOutlined /> Navigation Details</>} size="small">
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
                            </Col>
                        )}

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

export default AutonomousNavigation;
