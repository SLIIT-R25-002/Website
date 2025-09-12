import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  Modal,
} from "antd";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  CalendarOutlined,
  CameraOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";

const { Title, Text } = Typography;

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

const SessionsList = ({ onBack, onViewSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailsVisible, setSessionDetailsVisible] = useState(false);
  const [sessionImages, setSessionImages] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    totalImages: 0,
  });

  // Load all sessions
  useEffect(() => {
    const q = query(collection(db, "sessions"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const sessionsData = [];
        const newStats = {
          total: 0,
          inProgress: 0,
          completed: 0,
          totalImages: 0,
        };

        // Process sessions sequentially to avoid overwhelming the database
        const processSession = async (docSnapshot) => {
          const sessionData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // Count images for each session
          try {
            const imagesSnapshot = await getDocs(collection(db, "sessions", docSnapshot.id, "images"));
            sessionData.imageCount = imagesSnapshot.size;
            newStats.totalImages += imagesSnapshot.size;
          } catch (error) {
            console.error(`Error counting images for session ${docSnapshot.id}:`, error);
            sessionData.imageCount = 0;
          }

          sessionsData.push(sessionData);
          newStats.total += 1;
          
          if (sessionData.status === "inprogress") {
            newStats.inProgress += 1;
          } else if (sessionData.status === "completed") {
            newStats.completed += 1;
          }
        };

        // Process all sessions
        await Promise.all(snapshot.docs.map(processSession));

        setSessions(sessionsData);
        setStats(newStats);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading sessions:", error);
        message.error("Failed to load sessions");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Load session details when viewing a specific session
  const handleViewSessionDetails = async (session) => {
    setSelectedSession(session);
    setSessionDetailsVisible(true);
    
    // Load images for this session
    const unsubscribeImages = onSnapshot(
      collection(db, "sessions", session.id, "images"),
      (imagesSnapshot) => {
        const images = [];
        imagesSnapshot.forEach((imageDoc) => {
          images.push({ id: imageDoc.id, ...imageDoc.data() });
        });
        
        // Sort images by timestamp
        images.sort((a, b) => getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp));
        setSessionImages(images);
      },
      (error) => {
        console.error("Error loading session images:", error);
        message.error("Failed to load session images");
      }
    );

    // Store unsubscribe function to clean up later
    setSelectedSession(prevSession => ({ 
      ...prevSession, 
      ...session, 
      unsubscribeImages 
    }));
  };

  const handleCloseSessionDetails = () => {
    if (selectedSession?.unsubscribeImages) {
      selectedSession.unsubscribeImages();
    }
    setSessionDetailsVisible(false);
    setSelectedSession(null);
    setSessionImages([]);
  };

  // Delete session function
  const handleDeleteSession = async (sessionId) => {
    try {
      // First, delete all images in the session
      const imagesSnapshot = await getDocs(collection(db, "sessions", sessionId, "images"));
      const deleteImagePromises = imagesSnapshot.docs.map(async (imageDoc) => {
        // Delete segments for each image
        const segmentsSnapshot = await getDocs(collection(db, "sessions", sessionId, "images", imageDoc.id, "segments"));
        const deleteSegmentPromises = segmentsSnapshot.docs.map(segmentDoc =>
          deleteDoc(doc(db, "sessions", sessionId, "images", imageDoc.id, "segments", segmentDoc.id))
        );
        await Promise.all(deleteSegmentPromises);
        
        // Delete the image document
        return deleteDoc(doc(db, "sessions", sessionId, "images", imageDoc.id));
      });
      
      await Promise.all(deleteImagePromises);
      
      // Finally, delete the session document
      await deleteDoc(doc(db, "sessions", sessionId));
      
      message.success("Session deleted successfully!");
    } catch (error) {
      console.error("Error deleting session:", error);
      message.error("Failed to delete session. Please try again.");
    }
  };

  // Confirm delete with modal
  const confirmDeleteSession = (session) => {
    Modal.confirm({
      title: 'Delete Session',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Are you sure you want to delete this session?</p>
          <p><strong>Session ID:</strong> <code>{session.id}</code></p>
          <p><strong>Created:</strong> {new Date(getTimestampValue(session.createdAt)).toLocaleString()}</p>
          <p><strong>Images:</strong> {session.imageCount || 0}</p>
          <br />
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
            This action cannot be undone. All images and data in this session will be permanently deleted.
          </p>
        </div>
      ),
      okText: 'Delete Session',
      okType: 'danger',
      cancelText: 'Cancel',
      width: 500,
      onOk: () => handleDeleteSession(session.id),
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "inprogress":
        return "processing";
      case "completed":
        return "success";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "inprogress":
        return <SyncOutlined spin />;
      case "completed":
        return <CheckCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const columns = [
    {
      title: "Session ID",
      dataIndex: "id",
      key: "id",
      width: 200,
      render: (id) => (
        <Text code copyable style={{ fontSize: "11px" }}>
          {id}
        </Text>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (timestamp) => {
        const date = new Date(getTimestampValue(timestamp));
        return (
          <Space direction="vertical" size="small">
            <Text style={{ fontSize: "12px" }}>
              {date.toLocaleDateString()}
            </Text>
            <Text type="secondary" style={{ fontSize: "11px" }}>
              {date.toLocaleTimeString()}
            </Text>
          </Space>
        );
      },
      sorter: (a, b) => getTimestampValue(a.createdAt) - getTimestampValue(b.createdAt),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status === "inprogress" ? "In Progress" : "Completed"}
        </Tag>
      ),
      filters: [
        { text: "In Progress", value: "inprogress" },
        { text: "Completed", value: "completed" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Images",
      dataIndex: "imageCount",
      key: "imageCount",
      width: 100,
      render: (count) => (
        <Badge
          count={count || 0}
          style={{ backgroundColor: count > 0 ? "#52c41a" : "#d9d9d9" }}
        />
      ),
      sorter: (a, b) => (a.imageCount || 0) - (b.imageCount || 0),
    },
    {
      title: "Actions",
      key: "actions",
      width: 50,
      render: (_, session) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewSessionDetails(session)}
            />
          </Tooltip>
          <Button
            type="link"
            size="small"
            onClick={() => {
              if (onViewSession) {
                onViewSession(session.id);
              }
            }}
          >
            Open
          </Button>
          <Tooltip title="Delete Session">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDeleteSession(session)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const imageColumns = [
    {
      title: "Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 80,
      render: (url) => (
        <img
          src={url}
          alt="Session"
          style={{
            width: "60px",
            height: "60px",
            objectFit: "cover",
            borderRadius: "4px",
          }}
        />
      ),
    },
    {
      title: "Captured",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (timestamp) => {
        const date = new Date(getTimestampValue(timestamp));
        return (
          <Space direction="vertical" size="small">
            <Text style={{ fontSize: "12px" }}>
              {date.toLocaleDateString()}
            </Text>
            <Text type="secondary" style={{ fontSize: "11px" }}>
              {date.toLocaleTimeString()}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "GPS",
      dataIndex: "gps",
      key: "gps",
      render: (gps) =>
        gps ? (
          <Tag color="blue" size="small">
            {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: "11px" }}>
            No GPS
          </Text>
        ),
    },
    {
      title: "Segments",
      dataIndex: "segments",
      key: "segments",
      render: (segments) => (
        <Badge
          count={segments?.length || 0}
          style={{ backgroundColor: segments?.length > 0 ? "#52c41a" : "#d9d9d9" }}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", padding: "20px" }}>
      {/* Header */}
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={onBack}
              >
                Back to Capture
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                All Sessions
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Sessions"
              value={stats.total}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.inProgress}
              prefix={<SyncOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Images"
              value={stats.totalImages}
              prefix={<CameraOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Sessions Table */}
      <Card title="Sessions" style={{ width: "100%" }}>
        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} sessions`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Session Details Modal */}
      <Modal
        title={
          selectedSession && (
            <Space>
              <EyeOutlined />
              <span>Session Details</span>
              <Tag color={getStatusColor(selectedSession.status)}>
                {selectedSession.status === "inprogress" ? "In Progress" : "Completed"}
              </Tag>
            </Space>
          )
        }
        open={sessionDetailsVisible}
        onCancel={handleCloseSessionDetails}
        footer={[
          <Button key="close" onClick={handleCloseSessionDetails}>
            Close
          </Button>,
          ...(selectedSession ? [(
            <Button
              key="delete"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                confirmDeleteSession(selectedSession);
                handleCloseSessionDetails();
              }}
            >
              Delete Session
            </Button>
          ), (
            <Button
              key="open"
              type="primary"
              onClick={() => {
                if (onViewSession) {
                  onViewSession(selectedSession.id);
                }
                handleCloseSessionDetails();
              }}
            >
              Open Session
            </Button>
          )] : []),
        ]}
        width={800}
      >
        {selectedSession && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Session Info */}
            <Card size="small" title="Session Information">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Space direction="vertical" size="small">
                    <Text strong>Session ID:</Text>
                    <Text code copyable style={{ fontSize: "11px" }}>
                      {selectedSession.id}
                    </Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space direction="vertical" size="small">
                    <Text strong>Created:</Text>
                    <Text>
                      {new Date(getTimestampValue(selectedSession.createdAt)).toLocaleString()}
                    </Text>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Images Table */}
            <Card size="small" title={`Images (${sessionImages.length})`}>
              {sessionImages.length > 0 ? (
                <Table
                  columns={imageColumns}
                  dataSource={sessionImages}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              ) : (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <CameraOutlined style={{ fontSize: "24px", color: "#d9d9d9" }} />
                  <br />
                  <Text type="secondary">No images in this session</Text>
                </div>
              )}
            </Card>
          </Space>
        )}
      </Modal>
    </Space>
  );
};

export default SessionsList;
