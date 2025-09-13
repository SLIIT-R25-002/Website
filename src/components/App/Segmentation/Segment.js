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
  SaveOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
// Import Firebase
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { db } from "../../../firebase";
// API Configuration
const API_CONFIG = {
  BASE_URL: "https://da1b6f385d10.ngrok-free.app",
  ENDPOINTS: {
    ANALYZE: "/analyze",
    CALCULATE_AREA: "/calculate_area",
  },
};
const Segment = () => {
  const [currentStep, setCurrentStep] = useState("upload"); // 'upload', 'image-selection', 'processing', 'results'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const [calibrationDistance, setCalibrationDistance] = useState("");
  const [calculatedAreas, setCalculatedAreas] = useState({});
  const [visibleMasks, setVisibleMasks] = useState({});
  const [calculating, setCalculating] = useState({});
  const [progress, setProgress] = useState(0);
  const [availableImages, setAvailableImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Save functionality state
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [segmentsSaved, setSegmentsSaved] = useState(false);
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
  // New function to handle the actual image analysis
  const proceedWithImageAnalysis = async (imageData) => {
    try {
      setCurrentStep("processing");
      setProcessingStatus("Preparing image for analysis...");
      setProgress(10);
      if (!imageData.data.imageUrl) {
        setProcessingStatus(
          "❌ Image URL not found. Please check image upload."
        );
        setTimeout(() => setCurrentStep("upload"), 3000);
        return;
      }
      // Set image in state
      const imageFromFirestore = {
        url: imageData.data.imageUrl,
        name: imageData.name,
        id: imageData.id,
      };
      console.log("Setting uploaded image:", imageFromFirestore);
      setUploadedImage(imageFromFirestore);
      setProgress(25);
      // Call backend API for analysis
      setProcessingStatus("1/4: Getting image from Firebase Storage...");
      // Extract storage path from imageUrl
      let imagePath;
      if (imageData.data.imageUrl.includes("firebasestorage.googleapis.com")) {
        // If it's a Firebase Storage URL, extract the path
        const url = new URL(imageData.data.imageUrl);
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
        imagePath = imageData.data.imageUrl;
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
      console.log("Response structure check:", {
        hasResult: !!analysisData.result,
        hasDetectedClasses: !!(
          analysisData.result && analysisData.result.detected_classes
        ),
        hasMasks: !!(analysisData.result && analysisData.result.masks),
        detectedClassesType: analysisData.result?.detected_classes
          ? typeof analysisData.result.detected_classes
          : "undefined",
        masksType: analysisData.result?.masks
          ? typeof analysisData.result.masks
          : "undefined",
      });

      // Validate the response structure
      if (!analysisData || !analysisData.result) {
        throw new Error("Invalid response format: missing result data");
      }

      setProcessingStatus("3/4: Processing segmentation results...");
      setProgress(75);

      // Transform backend response to frontend format with defensive programming
      const transformedResults = {
        detected_classes: (analysisData.result.detected_classes || []).map(
          (cls) => (typeof cls === "string" ? cls : cls.name || "Unknown")
        ),
        masks: [],
        material_breakdown: analysisData.result.material_breakdown || {},
      };
      // Process masks from backend response - new simplified format with error handling
      let colorIndex = 0;
      if (
        analysisData.result.masks &&
        typeof analysisData.result.masks === "object"
      ) {
        Object.entries(analysisData.result.masks).forEach(
          ([className, classData]) => {
            if (classData && classData.mask) {
              transformedResults.masks.push({
                material: className || "Unknown",
                color: COLOR_PALETTE[colorIndex % COLOR_PALETTE.length],
                mask_base64: classData.mask,
                className: className || "Unknown",
                materialType: className || "Unknown",
              });
              colorIndex += 1;
            }
          }
        );
      } else {
        console.warn("No masks data found in analysis result");
      }
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
      console.error("Error analyzing image:", error);
      setProcessingStatus(`❌ Failed to analyze image: ${error.message}`);
      setTimeout(() => setCurrentStep("upload"), 3000);
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
      // Get all images from the session
      const imagesQuery = query(
        collection(db, "sessions", sessionId, "images"),
        orderBy("timestamp", "desc")
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
      // Prepare all images data for potential selection
      const allImages = querySnapshot.docs.map((docSnapshot, index) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          url: data.imageUrl,
          name: `image_${docSnapshot.id}.jpg`,
          timestamp: data.timestamp,
          data,
          index,
        };
      });
      console.log("All available images:", allImages);
      setAvailableImages(allImages);
      // If there's more than one image, go to selection step
      if (allImages.length > 1) {
        setCurrentStep("image-selection");
        return;
      }
      // If only one image, proceed directly with analysis
      const imageToAnalyze = allImages[0];
      await proceedWithImageAnalysis(imageToAnalyze);
    } catch (error) {
      console.error("Error loading images from session:", error);
      setProcessingStatus(`❌ Failed to load images: ${error.message}`);
      setTimeout(() => setCurrentStep("upload"), 3000);
    }
  };
  // Function to handle image selection and proceed with analysis
  const selectImageForAnalysis = async (index) => {
    setSelectedImageIndex(index);
    const selectedImage = availableImages[index];
    await proceedWithImageAnalysis(selectedImage);
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

  // Helper function to create colored mask from base64
  const createColoredMask = (maskBase64, color) =>
    new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original mask
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = imageData;
        
        // Convert hex color to RGB
        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        };
        
        const rgb = hexToRgb(color);
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          
          // If pixel is not transparent (mask area)
          if (alpha > 128) {
            // Apply the segment color
            data[i] = rgb.r;     // Red
            data[i + 1] = rgb.g; // Green  
            data[i + 2] = rgb.b; // Blue
            data[i + 3] = 255;   // Alpha
          } else {
            // Make background black
            data[i] = 0;         // Red
            data[i + 1] = 0;     // Green
            data[i + 2] = 0;     // Blue
            data[i + 3] = 255;   // Alpha (opaque black)
          }
        }
        
        // Put the modified image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert canvas to base64
        const coloredBase64 = canvas.toDataURL('image/png').split(',')[1];
        resolve(coloredBase64);
      };
      
      img.src = `data:image/png;base64,${maskBase64}`;
    });

  // Helper function to convert base64 to blob
  const base64ToBlob = (base64Data) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: "image/png" });
  };

  // Function to upload mask image to Firebase Storage
  const uploadMaskImage = async (maskBase64, segmentId, material, color) => {
    try {
      const storage = getStorage();
      const sessionId = localStorage.getItem("heatscape_session_id");
      const timestamp = new Date().toISOString().split("T")[0];
      const fileName = `mask_${material}_${segmentId}_${timestamp}.png`;
      const storagePath = `sessions/${sessionId}/images/${uploadedImage.id}/segments/${fileName}`;

      // Create colored mask with segment color and black background
      const coloredMaskBase64 = await createColoredMask(maskBase64, color);
      
      // Convert base64 to blob
      const blob = base64ToBlob(coloredMaskBase64);

      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading mask image:", error);
      throw error;
    }
  };

  // Function to save segment data to Firestore
  const saveSegmentData = async (segment, maskImageURL, surfaceArea) => {
    try {
      const sessionId = localStorage.getItem("heatscape_session_id");
      if (!sessionId) {
        throw new Error("No active session found");
      }

      const segmentData = {
        sessionId,
        originalImageId: uploadedImage?.id || null,
        originalImageName: uploadedImage?.name || null,
        originalImageURL: uploadedImage?.url || null,
        material: segment.material,
        materialType: segment.materialType,
        color: segment.color,
        segmentImageUrl:maskImageURL,
        surfaceArea: surfaceArea || null,
        calibrationDistance: calibrationDistance || null,
        hasAreaCalculation: !!surfaceArea,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      // Add to segments collection
      const segmentsCollectionRef = collection(
        db,
        `sessions/${sessionId}/images/${uploadedImage.id}/segments`
      );
      const docRef = await addDoc(segmentsCollectionRef, segmentData);

      console.log("Segment saved with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error saving segment data:", error);
      throw error;
    }
  };

  // Main function to save all segments
  const saveAllSegments = async () => {
    if (!analysisResults?.masks || analysisResults.masks.length === 0) {
      setSaveStatus("❌ No segments to save");
      return;
    }

    setSaving(true);
    setSaveStatus("Starting save process...");

    try {
      const sessionId = localStorage.getItem("heatscape_session_id");
      if (!sessionId) {
        throw new Error("No active session found");
      }

      const totalSegments = analysisResults.masks.length;

      // Process all segments in parallel
      const savePromises = analysisResults.masks.map(async (segment, i) => {
        setSaveStatus(
          `Processing segment ${i + 1} of ${totalSegments}: ${segment.material}...`
        );

        // Generate unique segment ID
        const segmentId = `seg_${Date.now()}_${i}`;

        // Upload mask image to storage
        const maskImageURL = await uploadMaskImage(
          segment.mask_base64,
          segmentId,
          segment.material,
          segment.color
        );

        // Get surface area if calculated
        const surfaceArea = calculatedAreas[segment.material] || null;

        // Save segment data to Firestore
        await saveSegmentData(segment, maskImageURL, surfaceArea);

        return { segment: segment.material, success: true };
      });

      // Wait for all saves to complete
      const results = await Promise.all(savePromises);
      const savedCount = results.filter((result) => result.success).length;

      setSaveStatus(
        `✅ Successfully saved ${savedCount} segments to database!`
      );
      setSegmentsSaved(true);

      // Clear status after 5 seconds
      setTimeout(() => {
        setSaveStatus("");
      }, 5000);
    } catch (error) {
      console.error("Error saving segments:", error);
      setSaveStatus(`❌ Failed to save segments: ${error.message}`);

      // Clear error status after 10 seconds
      setTimeout(() => {
        setSaveStatus("");
      }, 10000);
    } finally {
      setSaving(false);
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
            className="mb-3 me-3"
          >
            Start Material Analysis
          </Button>
          <Alert
            message={
              <div className="d-flex align-items-center">
                <InfoCircleOutlined className="me-2" />
                <div>
                  <div>
                    <strong>Start Material Analysis:</strong> Load images from
                    the current session for analysis
                  </div>
                </div>
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
  // STEP 2: IMAGE SELECTION
  if (currentStep === "image-selection") {
    return (
      <div className="container py-5">
        <Card>
          <div className="text-center mb-4">
            <div
              className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center"
              style={{ width: "64px", height: "64px" }}
            >
              <PictureOutlined style={{ fontSize: "32px", color: "#888" }} />
            </div>
            <h2 className="mt-3">Select Image for Analysis</h2>
            <p className="text-muted">
              {availableImages.length} images found in this session. Choose one
              to analyze.
            </p>
          </div>
          <Row gutter={[16, 16]} className="mb-4">
            {availableImages.map((image, index) => (
              <Col xs={24} sm={12} md={8} lg={6} key={image.id}>
                <Card
                  hoverable
                  cover={
                    <div style={{ height: "200px", overflow: "hidden" }}>
                      <img
                        src={image.url}
                        alt={`Session ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  }
                  className={
                    selectedImageIndex === index ? "border-primary" : ""
                  }
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Card.Meta
                    title={`Image ${index + 1}`}
                    description={
                      <div>
                        <div className="small text-muted">
                          {image.timestamp
                            ? new Date(
                                image.timestamp.toDate()
                              ).toLocaleString()
                            : "No timestamp"}
                        </div>
                        {selectedImageIndex === index && (
                          <div className="text-primary mt-2">✓ Selected</div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
          <div className="text-center">
            <Button
              type="primary"
              size="large"
              onClick={() => selectImageForAnalysis(selectedImageIndex)}
              disabled={selectedImageIndex === null}
              icon={<PartitionOutlined />}
            >
              Analyze Selected Image
            </Button>
            <Button
              type="default"
              size="large"
              className="ms-3"
              onClick={() => setCurrentStep("upload")}
            >
              Back
            </Button>
          </div>
          <Alert
            message={
              <div className="d-flex align-items-center">
                <InfoCircleOutlined className="me-2" />
                Click on an image to select it, then click "Analyze Selected
                Image" to proceed
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
  // STEP 3: PROCESSING
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
  // STEP 4: RESULTS
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

      {/* Save Section */}
      <Card className="mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap">
          <div className="flex-grow-1">
            <h5 className="mb-1">Save Segments to Database</h5>
            <p className="text-muted small mb-0">
              Save each segmented material as mask image and surface area
              results to the database
            </p>
          </div>
          <div className="ms-3">
            <Button
              type="primary"
              onClick={saveAllSegments}
              loading={saving}
              disabled={segmentsSaved || !analysisResults?.masks?.length}
              size="large"
              icon={segmentsSaved ? <CheckCircleOutlined /> : <SaveOutlined />}
            >
              {segmentsSaved
                ? "Segments Saved"
                : `Save ${analysisResults?.masks?.length || 0} Segments`}
            </Button>
          </div>
        </div>
        {saveStatus && (
          <div className="mt-3">
            <Alert
              message={saveStatus}
              type={
                saveStatus.includes("✅")
                  ? "success"
                  : saveStatus.includes("❌")
                    ? "error"
                    : "info"
              }
              showIcon
              className="mb-0"
            />
          </div>
        )}
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
                <SearchOutlined /> Detected Classes
              </>
            }
          >
            <div>
              {analysisResults?.detected_classes.map((className) => (
                <Tag
                  key={className}
                  className="me-2 mb-2"
                  color={
                    className === "building"
                      ? "blue"
                      : className === "vegetation"
                        ? "green"
                        : "default"
                  }
                >
                  {className.charAt(0).toUpperCase() + className.slice(1)}
                </Tag>
              ))}
            </div>
            {analysisResults?.detected_classes.length === 0 && (
              <div className="text-muted">No classes detected</div>
            )}
          </Card>
          <Card
            className="mb-3"
            title={
              <>
                <InfoCircleOutlined /> Analysis Summary
              </>
            }
          >
            <Row gutter={[16, 16]} className="text-center">
              <Col xs={8}>
                <div className="h4 text-primary mb-1">
                  {analysisResults?.detected_classes.length || 0}
                </div>
                <div className="text-muted small">Classes Detected</div>
              </Col>
              <Col xs={8}>
                <div className="h4 text-success mb-1">
                  {analysisResults?.masks.length || 0}
                </div>
                <div className="text-muted small">Segments Created</div>
              </Col>
              <Col xs={8}>
                <div className="h4 text-warning mb-1">
                  {Object.keys(calculatedAreas).length}
                </div>
                <div className="text-muted small">Areas Calculated</div>
              </Col>
            </Row>
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
                <PartitionOutlined /> Segmentation Results
              </>
            }
          >
            <div className="mt-3">
              {analysisResults?.masks.map((item) => (
                <div
                  key={item.material}
                  className="d-flex justify-content-between align-items-center p-3 bg-light rounded mb-2 border"
                  style={{
                    borderLeft: `4px solid ${item.color}`,
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle me-3"
                      style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: item.color,
                        border: "2px solid white",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    ></div>
                    <div>
                      <div className="fw-medium d-flex align-items-center">
                        {item.material === "building" && "🏢 "}
                        {item.material === "vegetation" && "🌿 "}
                        {item.material.charAt(0).toUpperCase() +
                          item.material.slice(1)}
                      </div>
                      <div className="small text-muted">
                        Segmented area ready for calculation
                      </div>
                      {/* Display material breakdown if available */}
                      {analysisResults?.material_breakdown[item.material] && (
                        <div className="mt-2">
                          <small className="text-muted">
                            Materials:{" "}
                            {analysisResults.material_breakdown[
                              item.material
                            ].map((mat) => (
                              <span key={mat.material}>
                                {mat.material}: {mat.percentage.toFixed(1)}%
                                {analysisResults.material_breakdown[
                                  item.material
                                ].indexOf(mat) <
                                analysisResults.material_breakdown[
                                  item.material
                                ].length -
                                  1
                                  ? ", "
                                  : ""}
                              </span>
                            ))}
                          </small>
                        </div>
                      )}
                    </div>
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
                      className="ms-3"
                      title={
                        visibleMasks[item.material] ? "Hide mask" : "Show mask"
                      }
                    />
                  </div>
                  <div className="d-flex align-items-center">
                    {calculatedAreas[item.material] ? (
                      <span className="text-success fw-bold me-3 bg-success bg-opacity-10 px-2 py-1 rounded">
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
              {(!analysisResults?.masks ||
                analysisResults.masks.length === 0) && (
                <div className="text-center text-muted py-4">
                  <PartitionOutlined
                    style={{ fontSize: "48px", opacity: 0.3 }}
                  />
                  <div className="mt-2">No segmented materials found</div>
                </div>
              )}
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
              style={{ height: "400px", border: "2px dashed #d9d9d9" }}
            >
              <img
                src={uploadedImage.url}
                alt="Analysis visualization"
                className="w-100 h-100"
                style={{ objectFit: "contain" }}
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
                            objectFit: "contain",
                            opacity: 0.8,
                            mixBlendMode: "multiply",
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
                      <div className="position-absolute top-0 start-0 m-2">
                        <span
                          className="badge rounded-pill text-white px-3 py-2"
                          style={{
                            backgroundColor: item.color,
                            fontSize: "12px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                          }}
                        >
                          {item.material === "building" && "🏢 "}
                          {item.material === "vegetation" && "🌿 "}
                          {item.material.charAt(0).toUpperCase() +
                            item.material.slice(1)}
                        </span>
                      </div>
                    </div>
                  )
              )}
              {Object.values(visibleMasks).every((v) => !v) && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-black bg-opacity-10">
                  <div className="bg-white p-4 rounded text-center shadow">
                    <div className="display-4 mb-2">👁</div>
                    <p className="text-muted small mb-2">
                      <strong>
                        Click the eye icons to visualize segmentation masks
                      </strong>
                    </p>
                    <p className="text-muted small">
                      Available classes:{" "}
                      {analysisResults?.detected_classes.join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="d-flex flex-wrap gap-2 mb-2">
                {analysisResults?.masks.map((item) => (
                  <Button
                    key={item.material}
                    size="small"
                    type={visibleMasks[item.material] ? "primary" : "default"}
                    onClick={() => toggleMaskVisibility(item.material)}
                    className="d-flex align-items-center"
                    style={{
                      borderColor: item.color,
                      ...(visibleMasks[item.material] && {
                        backgroundColor: item.color,
                        borderColor: item.color,
                      }),
                    }}
                  >
                    <div
                      className="rounded-circle me-2"
                      style={{
                        width: "8px",
                        height: "8px",
                        backgroundColor: visibleMasks[item.material]
                          ? "white"
                          : item.color,
                      }}
                    ></div>
                    {item.material === "building" && "🏢 "}
                    {item.material === "vegetation" && "🌿 "}
                    {item.material}
                  </Button>
                ))}
              </div>
              <div className="small text-muted">
                <p>
                  • Toggle mask visibility with the buttons above or eye icons
                </p>
                <p>
                  • Enter a calibration distance to calculate accurate surface
                  areas
                </p>
                <p>
                  • Masks are overlaid with {Math.round(0.8 * 100)}% opacity for
                  better visibility
                </p>
                <p>• Material composition details shown for each segment</p>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
export default Segment;
