// src/components/Segment.js (or wherever you have it)
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

// Import Firebase
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { db } from "../../../firebase";

// API Configuration
const API_CONFIG = {
  BASE_URL: "https://e7da4d3c4451.ngrok-free.app",
  ENDPOINTS: {
    ANALYZE: "/analyze",
    CALCULATE_AREA: "/calculate_area",
  },
};

const Segment = () => {
  const [currentStep, setCurrentStep] = useState("upload"); // 'upload', 'processing', 'results'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const [calibrationDistance, setCalibrationDistance] = useState("");
  const [calculatedAreas, setCalculatedAreas] = useState({});
  const [visibleMasks, setVisibleMasks] = useState({});
  const [calculating, setCalculating] = useState({});
  const [progress, setProgress] = useState(0);

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

  // Backend API base URL - update this to your actual backend URL
  const API_BASE_URL = API_CONFIG.BASE_URL;

  // Helper function to get image blob from Firebase Storage using storage path
  const getImageBlobFromStorage = async (imagePath) => {
    try {
      const storage = getStorage();
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);

      console.log("Firebase Storage URL:", url);

      // Fetch the image using the download URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log("Downloaded blob:", blob.size, "bytes");
      return blob;
    } catch (error) {
      console.error("Error getting image from Firebase Storage:", error);
      throw error;
    }
  };

  const startAnalysis = async () => {
    setCurrentStep("processing");
    setProcessingStatus("Loading latest image from session...");

    try {
      // Get the current session ID from localStorage
      const sessionId = localStorage.getItem("heatscape_session_id");

      if (!sessionId) {
        setProcessingStatus(
          "❌ No active session found. Please capture images first."
        );
        setTimeout(() => setCurrentStep("upload"), 3000);
        return;
      }

      console.log("Session ID:", sessionId);
      setProcessingStatus("Fetching images from session...");
      setProgress(10);

      // Get the latest image from the session
      const imagesQuery = query(
        collection(db, "sessions", sessionId, "images"),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      console.log("Querying images collection...");
      const querySnapshot = await getDocs(imagesQuery);

      console.log("Query snapshot size:", querySnapshot.size);

      if (querySnapshot.empty) {
        setProcessingStatus(
          "❌ No images found in session. Please capture images first."
        );
        setTimeout(() => setCurrentStep("upload"), 3000);
        return;
      }

      const latestImageDoc = querySnapshot.docs[0];
      const latestImageData = latestImageDoc.data();

      console.log("Latest image data:", latestImageData);

      if (!latestImageData.imageUrl) {
        setProcessingStatus(
          "❌ Image URL not found. Please check image upload."
        );
        setTimeout(() => setCurrentStep("upload"), 3000);
        return;
      }

      // Set image in state
      const imageFromFirestore = {
        url: latestImageData.imageUrl,
        name: `image_${latestImageDoc.id}.jpg`,
        id: latestImageDoc.id,
      };

      console.log("Setting uploaded image:", imageFromFirestore);
      setUploadedImage(imageFromFirestore);
      setProgress(25);

      // Call backend API for analysis
      setProcessingStatus("1/4: Getting image from Firebase Storage...");

      // Extract storage path from imageUrl
      let imagePath;
      if (latestImageData.imageUrl.includes("firebasestorage.googleapis.com")) {
        // If it's a Firebase Storage URL, extract the path
        const url = new URL(latestImageData.imageUrl);

        // For Firebase Storage URLs, the path is in pathname after /o/
        const pathMatch = url.pathname.match(/\/o\/(.+)$/);

        if (pathMatch) {
          imagePath = decodeURIComponent(pathMatch[1]);
        } else {
          console.error("Firebase URL format not recognized:", url.pathname);
          throw new Error(
            `Could not extract storage path from Firebase URL: ${url.pathname}`
          );
        }
      } else {
        // If it's a direct path, use it as is
        imagePath = latestImageData.imageUrl;
      }

      console.log("Using storage path:", imagePath);

      // Download the image as blob using Firebase Storage
      const imageBlob = await getImageBlobFromStorage(imagePath);

      // Create FormData for backend API
      const formData = new FormData();
      formData.append("file", imageBlob, imageFromFirestore.name);

      setProcessingStatus("2/4: Analyzing image with AI model...");
      setProgress(50);

      // Call backend analyze endpoint
      const analyzeResponse = await fetch(
        `${API_BASE_URL}${API_CONFIG.ENDPOINTS.ANALYZE}`,
        {
          method: "POST",
          headers: {
            "ngrok-skip-browser-warning": "true", // Add this for ngrok
          },
          body: formData,
        }
      );

      if (!analyzeResponse.ok) {
        throw new Error(
          `Backend analysis failed: ${analyzeResponse.statusText}`
        );
      }

      const analysisData = await analyzeResponse.json();
      console.log("Analysis response:", analysisData);

      setProcessingStatus("3/4: Processing segmentation results...");
      setProgress(75);

      // Transform backend response to frontend format
      const transformedResults = {
        detected_classes: analysisData.result.detected_classes.map(
          (cls) => cls.name
        ),
        masks: [],
      };

      // Process masks from backend response
      let colorIndex = 0;
      Object.entries(analysisData.result.masks).forEach(
        ([className, materials]) => {
          Object.entries(materials).forEach(([materialName, materialData]) => {
            transformedResults.masks.push({
              material: `${className} - ${materialName}`,
              color: COLOR_PALETTE[colorIndex % COLOR_PALETTE.length],
              mask_base64: materialData.mask,
              className,
              materialType: materialName,
            });
            colorIndex += 1;
          });
        }
      );

      setProcessingStatus("4/4: Finalizing analysis...");
      setProgress(90);

      // Small delay for UI smoothness
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      setProgress(100);
      setAnalysisResults(transformedResults);
      setCurrentStep("results");
    } catch (error) {
      console.error("Error loading image from session:", error);
      setProcessingStatus(`❌ Failed to analyze image: ${error.message}`);
      setTimeout(() => setCurrentStep("upload"), 3000);
    }
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

    try {
      // Find the material mask data
      const materialData = analysisResults.masks.find(
        (mask) => mask.material === material
      );

      if (!materialData) {
        throw new Error("Material mask not found");
      }

      // Prepare the request body for calculate_area endpoint
      const requestBody = {
        image_filename: uploadedImage.name,
        mask_base64: materialData.mask_base64,
        real_distance: parseFloat(calibrationDistance),
      };

      console.log("Calculating area for:", material, requestBody);

      // Call backend calculate_area endpoint
      const response = await fetch(
        `${API_BASE_URL}${API_CONFIG.ENDPOINTS.CALCULATE_AREA}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true", // Add this for ngrok
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`Area calculation failed: ${response.statusText}`);
      }

      const areaData = await response.json();
      console.log("Area calculation response:", areaData);

      // Update calculated areas with the result
      setCalculatedAreas((prev) => ({
        ...prev,
        [material]: areaData.surface_area.toFixed(1),
      }));
    } catch (error) {
      console.error("Error calculating area:", error);
      setProcessingStatus(
        `❌ Failed to calculate area for ${material}: ${error.message}`
      );
    } finally {
      setCalculating((prev) => ({ ...prev, [material]: false }));
    }
  };

  const toggleMaskVisibility = (material) => {
    setVisibleMasks((prev) => ({
      ...prev,
      [material]: !prev[material],
    }));
  };

  // Helper function to create mask overlay URL from base64
  const createMaskOverlay = (maskBase64) => {
    try {
      // Create a data URL for the mask image
      return `data:image/png;base64,${maskBase64}`;
    } catch (error) {
      console.error("Error creating mask overlay:", error);
      return null;
    }
  };

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
                Latest image will be automatically loaded and analyzed using AI
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
          <h3 className="text-center mb-4">Analyzing Session Image</h3>

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

          {processingStatus.includes("Failed") && (
            <Alert
              message={processingStatus}
              type="error"
              className="mt-3"
              closable
            />
          )}

          <Progress percent={progress} status="active" showInfo={false} />
        </Card>
      </div>
    );
  }

  // STEP 3: RESULTS
  return (
    <div className="container py-4">
      {/* Header */}
      <Card className="mb-4 d-flex align-items-center flex-wrap">
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
                        pointerEvents: "none",
                      }}
                    >
                      {item.mask_base64 && item.mask_base64 !== "..." ? (
                        <img
                          src={createMaskOverlay(item.mask_base64)}
                          alt={`${item.material} mask`}
                          className="w-100 h-100"
                          style={{
                            objectFit: "cover",
                            opacity: 0.6,
                            mixBlendMode: "multiply",
                            filter: `hue-rotate(${item.color})`,
                          }}
                        />
                      ) : (
                        <div
                          className="w-100 h-100"
                          style={{
                            backgroundColor: item.color,
                            opacity: 0.3,
                            mixBlendMode: "multiply",
                          }}
                        />
                      )}
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
