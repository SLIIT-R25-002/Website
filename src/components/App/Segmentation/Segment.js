import React, { useState } from "react";
import { Button, Card, Input, Alert, Progress, Tag, Row, Col } from "antd";
import {
  SearchOutlined,
  PartitionOutlined,
  ToolOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  PictureOutlined,
  SyncOutlined,
} from "@ant-design/icons";

const Segment = () => {
  const [currentStep, setCurrentStep] = useState("upload"); // 'upload', 'processing', 'results'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const [calibrationDistance, setCalibrationDistance] = useState("");
  const [calculatedAreas, setCalculatedAreas] = useState({});
  const [visibleMasks, setVisibleMasks] = useState({});
  const [calculating, setCalculating] = useState({});

  const COLOR_PALETTE = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ];

  const startAnalysis = async () => {
    setCurrentStep("processing");

    setProcessingStatus("Loading image from Firebase...");
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    const mockFirebaseImage = {
      file: null,
      url: "https://images.unsplash.com/photo-1448630360428-65456885c650?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2067&q=80",
      name: "firebase_building_image.jpg",
    };

    setUploadedImage(mockFirebaseImage);

    const steps = [
      { message: "1/4: Processing Firebase image...", delay: 1000 },
      { message: "2/4: Detecting objects...", delay: 1500 },
      { message: "3/4: Segmenting material surfaces...", delay: 2000 },
      { message: "4/4: Finalizing analysis...", delay: 1000 },
    ];

    const processSteps = async () => {
      await Promise.all(
        steps.map(
          (step) =>
            new Promise((resolve) => {
              setProcessingStatus(step.message);
              setTimeout(resolve, step.delay);
            })
        )
      );
    };

    await processSteps();

    const mockResults = {
      detected_classes: ["building", "road", "sky", "vegetation"],
      masks: [
        { material: "Glass", color: COLOR_PALETTE[0], mask_base64: "..." },
        { material: "Brick", color: COLOR_PALETTE[1], mask_base64: "..." },
        { material: "Concrete", color: COLOR_PALETTE[2], mask_base64: "..." },
        { material: "Metal", color: COLOR_PALETTE[3], mask_base64: "..." },
        { material: "Wood", color: COLOR_PALETTE[4], mask_base64: "..." },
      ],
    };

    setAnalysisResults(mockResults);
    setCurrentStep("results");
  };

  const calculateArea = async (material) => {
    if (
      !calibrationDistance ||
      Number.isNaN(Number.parseFloat(calibrationDistance))
    ) {
      setProcessingStatus("Please enter a valid calibration distance first.");
      return;
    }

    setCalculating((prev) => ({ ...prev, [material]: true }));

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    const mockArea = (Math.random() * 100 + 10).toFixed(1);
    setCalculatedAreas((prev) => ({ ...prev, [material]: mockArea }));
    setCalculating((prev) => ({ ...prev, [material]: false }));
  };

  const toggleMaskVisibility = (material) => {
    setVisibleMasks((prev) => ({
      ...prev,
      [material]: !prev[material],
    }));
  };

  // const resetAnalysis = () => {
  //   setCurrentStep("upload");
  //   setUploadedImage(null);
  //   setAnalysisResults(null);
  //   setCalculatedAreas({});
  //   setVisibleMasks({});
  //   setCalibrationDistance("");
  //   setProcessingStatus("");
  // };

  // STEP 1: UPLOAD / INITIAL SCREEN
  if (currentStep === "upload") {
    return (
      <div className="container py-5">
        <Card className="text-center">
          <div className="mb-4">
            <div
              className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center"
              style={{ width: "64px", height: "64px" }}
            >
              <PictureOutlined style={{ fontSize: "32px", color: "#888" }} />
            </div>
            <h2 className="mt-3">Waiting for Images</h2>
            <p className="text-muted">
              Ready to analyze building materials from captured images
            </p>
          </div>

          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} md={8}>
              <Card size="small" className="bg-light border-success">
                <SearchOutlined
                  className="text-success mb-2"
                  style={{ fontSize: "24px" }}
                />
                <div className="fw-medium text-success">Object Detection</div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" className="bg-light border-warning">
                <PartitionOutlined
                  className="text-warning mb-2"
                  style={{ fontSize: "24px" }}
                />
                <div className="fw-medium text-warning">
                  Material Segmentation
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" className="bg-light border-primary">
                <ToolOutlined
                  className="text-primary mb-2"
                  style={{ fontSize: "24px" }}
                />
                <div className="fw-medium text-primary">Area Calculation</div>
              </Card>
            </Col>
          </Row>

          <Button
            type="primary"
            size="large"
            onClick={startAnalysis}
            icon={<SyncOutlined />}
            className="mb-3"
          >
            Start Material Analysis
          </Button>

          <Alert
            message={
              <div className="d-flex align-items-center">
                <InfoCircleOutlined className="me-2" />
                Image will be automatically loaded from Firebase storage
              </div>
            }
            type="info"
            showIcon={false}
            className="mt-3"
          />
        </Card>
      </div>
    );
  }

  // STEP 2: PROCESSING
  if (currentStep === "processing") {
    return (
      <div className="container py-5 d-flex justify-content-center">
        <Card style={{ width: "100%", maxWidth: "600px" }}>
          <h3 className="text-center mb-4">Analyzing Firebase Image</h3>

          {uploadedImage?.url && (
            <img
              src={uploadedImage.url}
              alt="Processing"
              className="img-fluid rounded mb-4"
              style={{ maxHeight: "200px", objectFit: "cover" }}
            />
          )}

          <div className="text-center mb-4">
            <LoadingOutlined
              spin
              style={{ fontSize: "48px", color: "#1890ff" }}
            />
            <p className="mt-3 fw-medium">{processingStatus}</p>
          </div>

          <Progress percent={60} status="active" showInfo={false} />
        </Card>
      </div>
    );
  }

  // STEP 3: RESULTS
  return (
    <div className="container py-4">
      {/* Header */}
      <Card className="mb-4 flex  align-items-center flex-wrap w-100%"
      
      >
        <div className="flex-grow-1">
          <h3 className="mb-1">Analysis Complete</h3>
          <p className="text-muted mb-0">
            Interact with the results below to calculate material areas.
          </p>
        </div>
        {/* <Button
          type="primary"
          onClick={resetAnalysis}
          icon={<SyncOutlined />}
          className="ms-auto"
        >
          New Analysis
        </Button> */}
      </Card>

      <Row gutter={[24, 24]}>
        {/* LEFT COLUMN */}
        <Col xs={24} lg={12}>
          <Card
            className="mb-3"
            title={
              <>
                <PictureOutlined /> Uploaded Image
              </>
            }
          >
            <div className="d-flex align-items-center">
              <img
                src={uploadedImage.url}
                alt="Uploaded"
                className="rounded"
                style={{ width: "64px", height: "64px", objectFit: "cover" }}
              />
              <div className="ms-3">
                <div className="fw-bold">{uploadedImage.name}</div>
                <div className="text-muted small">Analysis completed</div>
              </div>
            </div>
          </Card>

          <Card
            className="mb-3"
            title={
              <>
                <SearchOutlined /> Detected Objects
              </>
            }
          >
            <div>
              {analysisResults?.detected_classes.map((obj) => (
                <Tag key={obj} className="me-2 mb-2">
                  {obj}
                </Tag>
              ))}
            </div>
          </Card>

          <Card
            className="mb-3"
            title={
              <>
                <ToolOutlined /> Calibration
              </>
            }
          >
            <div>
              <label className="form-label">Real-world Distance (meters)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g., 20.0"
                value={calibrationDistance}
                onChange={(e) => setCalibrationDistance(e.target.value)}
                className="mb-2"
              />
              <div className="text-muted small">
                Enter a known distance in the image for area calculations
              </div>
            </div>
          </Card>

          <Card
            title={
              <>
                <PartitionOutlined /> Material Breakdown
              </>
            }
          >
            <div className="mt-3">
              {analysisResults?.masks.map((item) => (
                <div
                  key={item.material}
                  className="d-flex justify-content-between align-items-center p-3 bg-light rounded mb-2"
                >
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle me-2"
                      style={{
                        width: "16px",
                        height: "16px",
                        backgroundColor: item.color,
                        border: "1px solid #ddd",
                      }}
                    ></div>
                    <span className="fw-medium">{item.material}</span>
                    <Button
                      type="text"
                      icon={
                        visibleMasks[item.material] ? (
                          <EyeOutlined />
                        ) : (
                          <EyeInvisibleOutlined />
                        )
                      }
                      onClick={() => toggleMaskVisibility(item.material)}
                      className="ms-2"
                    />
                  </div>
                  <div className="d-flex align-items-center">
                    {calculatedAreas[item.material] ? (
                      <span className="text-success fw-bold me-3">
                        {calculatedAreas[item.material]} m²
                      </span>
                    ) : (
                      <span className="text-muted me-3">--- m²</span>
                    )}
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => calculateArea(item.material)}
                      disabled={
                        calculating[item.material] || !calibrationDistance
                      }
                      loading={calculating[item.material]}
                    >
                      Calculate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* RIGHT COLUMN - VISUALIZER */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <>
                <EyeOutlined /> Interactive Visualizer
              </>
            }
          >
            <div
              className="position-relative bg-light rounded overflow-hidden"
              style={{ height: "400px" }}
            >
              <img
                src={uploadedImage.url}
                alt="Analysis visualization"
                className="w-100 h-100"
                style={{ objectFit: "cover" }}
              />
              {analysisResults?.masks.map(
                (item) =>
                  visibleMasks[item.material] && (
                    <div
                      key={item.material}
                      className="position-absolute top-0 start-0 w-100 h-100"
                      style={{
                        backgroundColor: item.color,
                        opacity: 0.3,
                        mixBlendMode: "multiply",
                        pointerEvents: "none",
                      }}
                    >
                      <div className="position-absolute top-0 start-0 m-2 bg-dark text-white px-2 py-1 rounded small">
                        {item.material}
                      </div>
                    </div>
                  )
              )}
              {Object.values(visibleMasks).every((v) => !v) && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-black bg-opacity-10">
                  <div className="bg-white p-4 rounded text-center shadow">
                    <div className="display-4 mb-2">👁</div>
                    <p className="text-muted small">
                      Click the eye icons to visualize material masks
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 small text-muted">
              <p>• Click the eye icons to show/hide material overlays</p>
              <p>
                • Enter a calibration distance to calculate accurate surface
                areas
              </p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Segment;
