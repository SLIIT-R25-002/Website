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
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  MobileOutlined,
  ReloadOutlined,
  CameraOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";

const { Title, Text, Paragraph } = Typography;

const CaptureImages = () => {
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorTxt, setErrorTxt] = useState(null);
  const [images, setImages] = useState([]);

  const qrCodeValue = sessionId ? `heatscape://join/${sessionId}` : "";

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
    if (!sessionId) return;

    const unsub = onSnapshot(
      collection(db, "sessions", sessionId, "images"),
      (snapshot) => {
        const imgs = [];
        snapshot.forEach((doc) => imgs.push({ id: doc.id, ...doc.data() }));
        // Sort by timestamp (newest first)
        imgs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setImages(imgs);
      },
      (error) => {
        console.error("Error listening to images:", error);
        message.error("Failed to load images");
      }
    );
    // eslint-disable-next-line consistent-return
    return () => unsub();
  }, [sessionId]);

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
                  <Button
                    onClick={handleNewSession}
                    icon={<ReloadOutlined />}
                    size="small"
                  >
                    New Session
                  </Button>
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
                  actions={[
                    <Tooltip title="View GPS Location">
                      <EnvironmentOutlined key="location" />
                    </Tooltip>,
                    <Tooltip title="View Timestamp">
                      <ClockCircleOutlined key="time" />
                    </Tooltip>,
                  ]}
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
                            {new Date(image.timestamp).toLocaleTimeString()}
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
    </Space>
  );
};

export default CaptureImages;
