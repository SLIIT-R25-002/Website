import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Space,
  Typography,
  Alert,
  QRCode,
  Row,
  Col,
  Divider,
  message,
  Image,
  Badge,
  List,
  Tag,
  Modal,
} from "antd";
import {
  PlusOutlined,
  MobileOutlined,
  ReloadOutlined,
  CameraOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  AimOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import SessionsList from "./SessionsList";

const { Title, Text, Paragraph } = Typography;

// Utility function to convert Firestore timestamp to JavaScript timestamp
const getTimestampValue = (timestamp) => {
  if (!timestamp) return 0;
  
  // If it's already a number (JavaScript timestamp), return it
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  // If it's a Firestore timestamp object
  if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
    // Convert Firestore timestamp to JavaScript timestamp (milliseconds)
    return timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000);
  }
  
  return 0;
};

const CaptureImages = () => {
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorTxt, setErrorTxt] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [gyroModalVisible, setGyroModalVisible] = useState(false);
  const [gpsModalVisible, setGpsModalVisible] = useState(false);
  const [showSessionsList, setShowSessionsList] = useState(false);

  const qrCodeValue = sessionId ? `heatscape://join/${sessionId}` : "";

  // Modal handlers
  const showGyroModal = (image) => {
    setSelectedImage(image);
    setGyroModalVisible(true);
  };

  const showGpsModal = (image) => {
    setSelectedImage(image);
    setGpsModalVisible(true);
  };

  const handleModalClose = () => {
    setGyroModalVisible(false);
    setGpsModalVisible(false);
    setSelectedImage(null);
  };

  // Delete image function
  const handleDeleteImage = async (imageId) => {
    try {
      await deleteDoc(doc(db, "sessions", sessionId, "images", imageId));
      message.success("Image deleted successfully!");
    } catch (error) {
      console.error("Error deleting image:", error);
      message.error("Failed to delete image. Please try again.");
    }
  };

  // Confirm delete with modal
  const confirmDelete = (image) => {
    Modal.confirm({
      title: 'Delete Image',
      content: `Are you sure you want to delete this image? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handleDeleteImage(image.id),
    });
  };

  const handleCreateSession = async () => {
    setLoading(true);
    setErrorTxt(null);

    try {
      const docRef = await addDoc(collection(db, "sessions"), {
        createdAt: serverTimestamp(),
        status: "inprogress",
        images: [],
        conclusion: null,
      });

      setSessionId(docRef.id);
      message.success("Session created successfully!");
    } catch (err) {
      console.error("Error creating session:", err);
      setErrorTxt("Failed to create session. Please try again.");
      message.error("Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    localStorage.removeItem("heatscape_session_id");
    setSessionId(null);
    setImages([]);
    setErrorTxt(null);
    setShowSessionsList(false);
  };

  const handleShowSessionsList = () => {
    setShowSessionsList(true);
  };

  const handleBackFromSessionsList = () => {
    setShowSessionsList(false);
  };

  const handleViewSessionFromList = (sessionIdFromList) => {
    setSessionId(sessionIdFromList);
    localStorage.setItem("heatscape_session_id", sessionIdFromList);
    setShowSessionsList(false);
  };

  // Load session from localStorage on component mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem("heatscape_session_id");
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  // Save session to localStorage whenever sessionId changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("heatscape_session_id", sessionId);
    }
  }, [sessionId]);

  // Listen for images in real-time when session is active
  useEffect(() => {
    if (!sessionId) return undefined;

    let segmentUnsubscribers = [];

    const unsub = onSnapshot(
      collection(db, "sessions", sessionId, "images"),
      (snapshot) => {
        // Clean up previous segment listeners
        segmentUnsubscribers.forEach(unsubFn => unsubFn());
        segmentUnsubscribers = [];

        const imgs = [];
        
        snapshot.forEach((documment) => {
          const imageData = { id: documment.id, ...documment.data() };
          imageData.segments = []; // Initialize empty segments array
          imgs.push(imageData);

          // Set up real-time listener for segments of this image
          const segmentUnsub = onSnapshot(
            collection(db, "sessions", sessionId, "images", documment.id, "segments"),
            (segmentsSnapshot) => {
              const segments = [];
              segmentsSnapshot.forEach((segDoc) => {
                segments.push({ id: segDoc.id, ...segDoc.data() });
              });

              // Update the segments for this specific image
              setImages(prevImages => {
                const updatedImages = prevImages.map(img => {
                  if (img.id === documment.id) {
                    return { ...img, segments };
                  }
                  return img;
                });
                
                // Sort by timestamp (newest first)
                updatedImages.sort((a, b) => getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp));
                console.log("Images with updated segments:", updatedImages);
                return updatedImages;
              });
            },
            (segError) => {
              console.error(`Error listening to segments for image ${documment.id}:`, segError);
            }
          );

          segmentUnsubscribers.push(segmentUnsub);
        });

        // Initial set of images (segments will be updated by their individual listeners)
        const sortedImages = imgs.sort((a, b) => getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp));
        console.log("Initial images:", sortedImages);
        setImages(sortedImages);
      },
      (error) => {
        console.error("Error listening to images:", error);
        message.error("Failed to load images");
      }
    );

    // Cleanup function
    return () => {
      unsub();
      segmentUnsubscribers.forEach(unsubFn => unsubFn());
    };
  }, [sessionId]);

  // Show sessions list if requested
  if (showSessionsList) {
    return (
      <SessionsList
        onBack={handleBackFromSessionsList}
        onViewSession={handleViewSessionFromList}
      />
    );
  }

  return (
    <Space
      direction="vertical"
      size="large"
      style={{ width: "100%", padding: "20px" }}
    >
      {errorTxt && (
        <Alert
          message="Error"
          description={errorTxt}
          type="error"
          showIcon
          closable
          onClose={() => setErrorTxt(null)}
        />
      )}

      {!sessionId ? (
        // No active session - show create session option
        <Card style={{ textAlign: "center", backgroundColor: "#fafafa", height: 'calc(100vh-285px)' }}>
          <Space direction="vertical" size="large" style={{height: '100%', justifyContent: 'center'}}>
            <div>
              <PlusOutlined style={{ fontSize: "48px", color: "#1890ff" }} />
              <Title level={3} style={{ marginTop: "16px" }}>
                No Active Session
              </Title>
              <Paragraph type="secondary">
                Create a new session to start capturing thermal images
              </Paragraph>
            </div>

            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleCreateSession}
              icon={<PlusOutlined />}
            >
              Create New Session
            </Button>

            <Button
              size="large"
              onClick={handleShowSessionsList}
              icon={<UnorderedListOutlined />}
            >
              View All Sessions
            </Button>
          </Space>
        </Card>
      ) : (
        // Active session - show QR code and session info
        <>
          {images.length === 0 ? (
            // Full layout when no images yet
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card title="Session Information" style={{ height: "100%" }}>
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    <div>
                      <Text strong>Session ID:</Text>
                      <br />
                      <Text code copyable style={{ fontSize: "12px" }}>
                        {sessionId}
                      </Text>
                    </div>

                    <div>
                      <Text strong>Status:</Text>
                      <br />
                      <Text type="success">Active & Ready</Text>
                    </div>

                    <Divider />

                    <Space>
                      <Button
                        onClick={handleNewSession}
                        icon={<ReloadOutlined />}
                      >
                        New Session
                      </Button>
                      <Button
                        onClick={handleShowSessionsList}
                        icon={<UnorderedListOutlined />}
                      >
                        All Sessions
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card
                  title={
                    <>
                      Mobile App Connection &nbsp;
                      <MobileOutlined style={{ color: "#1890ff" }} />
                    </>
                  }
                  style={{ height: "100%" }}
                >
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%", alignItems: "center" }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <Paragraph
                        style={{ marginTop: "8px", marginBottom: "16px" }}
                      >
                        Scan this QR code with your mobile app
                        <br />
                        <Text
                          code
                          style={{ fontSize: "10px", wordBreak: "break-all" }}
                        >
                          {qrCodeValue}
                        </Text>
                      </Paragraph>
                    </div>

                    <QRCode
                      value={qrCodeValue}
                      size={200}
                      style={{ margin: "0 auto" }}
                    />

                    {/* <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            QR Code Value:
                        </Text>
                        <br />
                        </div> */}
                  </Space>
                </Card>
              </Col>
            </Row>
          ) : (
            // Compact layout when images are present
            <Card>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={8}>
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: "100%" }}
                  >
                    <div>
                      <Text strong style={{ fontSize: "12px" }}>
                        Session ID:
                      </Text>
                      <br />
                      <Text code copyable style={{ fontSize: "10px" }}>
                        {sessionId}
                      </Text>
                    </div>
                    <Text type="success" style={{ fontSize: "12px" }}>
                      Active & Ready
                    </Text>
                  </Space>
                </Col>

                <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                  <Space direction="vertical" size="small" align="center">
                    <Text style={{ fontSize: "12px" }}>Mobile Connection</Text>
                    <QRCode value={qrCodeValue} size={80} />
                  </Space>
                </Col>

                <Col xs={24} sm={8} style={{ textAlign: "right" }}>
                  <Space direction="vertical">
                    <Button
                      onClick={handleShowSessionsList}
                      icon={<UnorderedListOutlined />}
                      size="small"
                      style={{ width: '100%' }}
                    >
                      All Sessions
                    </Button>
                    <Button
                      onClick={handleNewSession}
                      icon={<ReloadOutlined />}
                      size="small"
                      style={{ width: '100%' }}
                    >
                      New Session
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          )}
        </>
      )}

      {sessionId && images.length > 0 && (
        <Card
          title={
            <Space>
              <CameraOutlined />
              <span>Captured Images</span>
              <Badge
                count={images.length}
                style={{ backgroundColor: "#52c41a" }}
              />
            </Space>
          }
        >
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 3,
              lg: 4,
              xl: 4,
              xxl: 6,
            }}
            dataSource={images}
            renderItem={(image) => (
              <List.Item>
                <Card
                  hoverable
                  cover={
                    <Image
                      alt={`Captured image ${image.id}`}
                      src={image.imageUrl}
                      style={{ height: 200, objectFit: "cover" }}
                      placeholder={
                        <div
                          style={{
                            height: 200,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <CameraOutlined
                            style={{ fontSize: "24px", color: "#d9d9d9" }}
                          />
                        </div>
                      }
                    />
                  }
                >
                  <Card.Meta
                    title={
                      <Space
                        direction="vertical"
                        size="small"
                        style={{ width: "100%" }}
                      >
                        <div>
                          <Text strong style={{ fontSize: "12px" }}>
                            {new Date(getTimestampValue(image.timestamp)).toLocaleTimeString()}
                          </Text>
                        </div>
                        {image.gps && (
                          <Tag size="small" color="blue">
                            <EnvironmentOutlined style={{ fontSize: "10px" }} />
                            {` ${image.gps.lat.toFixed(4)}, ${image.gps.lng.toFixed(4)}`}
                          </Tag>
                        )}
                        {image.segments && image.segments.length > 0 && (
                          <Tag size="small" color="green">
                            {image.segments.length} segment
                            {image.segments.length > 1 ? "s" : ""}
                          </Tag>
                        )}
                        <Space size="small" style={{ marginTop: "8px" }}>
                          {image.gyro && (
                            <Button
                              size="small"
                              type="text"
                              icon={<CompassOutlined />}
                              onClick={() => showGyroModal(image)}
                              style={{ fontSize: "10px", padding: "0 4px" }}
                            >
                              Gyro
                            </Button>
                          )}
                          {image.gps && (
                            <Button
                              size="small"
                              type="text"
                              icon={<AimOutlined />}
                              onClick={() => showGpsModal(image)}
                              style={{ fontSize: "10px", padding: "0 4px" }}
                            >
                              GPS
                            </Button>
                          )}
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => confirmDelete(image)}
                            style={{ fontSize: "10px", padding: "0 4px" }}
                            title="Delete image"
                          />
                        </Space>
                      </Space>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}

      {sessionId && images.length === 0 && (
        <Card style={{ textAlign: "center", backgroundColor: "#f9f9f9" }}>
          <Space direction="vertical" size="middle">
            <CameraOutlined style={{ fontSize: "48px", color: "#d9d9d9" }} />
            <div>
              <Title level={4} type="secondary">
                Waiting for Images
              </Title>
              <Paragraph type="secondary">
                Images captured from your mobile app will appear here in
                real-time
              </Paragraph>
            </div>
          </Space>
        </Card>
      )}
      
      {/* Gyro Data Modal */}
      <Modal
        title={
          <Space>
            <CompassOutlined />
            <span>Gyroscope Data</span>
          </Space>
        }
        open={gyroModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="close" onClick={handleModalClose}>
            Close
          </Button>
        ]}
        width={400}
      >
        {selectedImage?.gyro && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: "center" }}>
                    <Text strong style={{ color: "#1890ff" }}>Roll</Text>
                    <br />
                    <Text code style={{ fontSize: "12px" }}>
                      {selectedImage.gyro.roll?.toFixed(6)}°
                    </Text>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: "center" }}>
                    <Text strong style={{ color: "#52c41a" }}>Pitch</Text>
                    <br />
                    <Text code style={{ fontSize: "12px" }}>
                      {selectedImage.gyro.pitch?.toFixed(6)}°
                    </Text>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: "center" }}>
                    <Text strong style={{ color: "#fa541c" }}>Yaw</Text>
                    <br />
                    <Text code style={{ fontSize: "12px" }}>
                      {selectedImage.gyro.yaw?.toFixed(6)}°
                    </Text>
                  </div>
                </Card>
              </Col>
            </Row>
            <Divider />
            <div>
              <Text strong>Raw Data:</Text>
              <pre style={{ 
                backgroundColor: "#f5f5f5", 
                padding: "8px", 
                borderRadius: "4px",
                fontSize: "11px",
                marginTop: "8px"
              }}>
                {JSON.stringify(selectedImage.gyro, null, 2)}
              </pre>
            </div>
          </Space>
        )}
      </Modal>

      {/* GPS Data Modal */}
      <Modal
        title={
          <Space>
            <AimOutlined />
            <span>GPS Data</span>
          </Space>
        }
        open={gpsModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="close" onClick={handleModalClose}>
            Close
          </Button>
        ]}
        width={500}
      >
        {selectedImage?.gps && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small">
                  <div style={{ textAlign: "center" }}>
                    <Text strong style={{ color: "#1890ff" }}>Latitude</Text>
                    <br />
                    <Text code style={{ fontSize: "12px" }}>
                      {selectedImage.gps.lat?.toFixed(7)}
                    </Text>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <div style={{ textAlign: "center" }}>
                    <Text strong style={{ color: "#52c41a" }}>Longitude</Text>
                    <br />
                    <Text code style={{ fontSize: "12px" }}>
                      {selectedImage.gps.lng?.toFixed(7)}
                    </Text>
                  </div>
                </Card>
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small">
                  <div style={{ textAlign: "center" }}>
                    <Text strong style={{ color: "#fa541c" }}>Altitude</Text>
                    <br />
                    <Text code style={{ fontSize: "12px" }}>
                      {selectedImage.gps.altitude?.toFixed(2)}m
                    </Text>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <div style={{ textAlign: "center" }}>
                    <Text strong style={{ color: "#722ed1" }}>Accuracy</Text>
                    <br />
                    <Text code style={{ fontSize: "12px" }}>
                      ±{selectedImage.gps.accuracy?.toFixed(2)}m
                    </Text>
                  </div>
                </Card>
              </Col>
            </Row>
            <Divider />
            <div>
              <Text strong>Raw Data:</Text>
              <pre style={{ 
                backgroundColor: "#f5f5f5", 
                padding: "8px", 
                borderRadius: "4px",
                fontSize: "11px",
                marginTop: "8px"
              }}>
                {JSON.stringify(selectedImage.gps, null, 2)}
              </pre>
            </div>
          </Space>
        )}
      </Modal>
    </Space>
  );
};

export default CaptureImages;
