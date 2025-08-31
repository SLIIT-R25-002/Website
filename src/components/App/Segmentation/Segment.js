import React, { useState, useRef } from "react";

const Segment = () => {
  const [currentStep, setCurrentStep] = useState("upload"); // 'upload', 'processing', 'results'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const [calibrationDistance, setCalibrationDistance] = useState("");
  const [calculatedAreas, setCalculatedAreas] = useState({});
  const [visibleMasks, setVisibleMasks] = useState({});
  const [calculating, setCalculating] = useState({});
  const fileInputRef = useRef(null);

  // Mock color palette matching the API design
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

  const handleFileUpload = (file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage({
          file,
          url: e.target.result,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const { files } = e.dataTransfer;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const startAnalysis = async () => {
    if (!uploadedImage) return;

    setCurrentStep("processing");

    // Simulate API processing with realistic delays
    const steps = [
      { message: "1/3: Detecting objects...", delay: 1500 },
      { message: "2/3: Segmenting material surfaces...", delay: 2000 },
      { message: "3/3: Finalizing analysis...", delay: 1000 },
    ];

    await Promise.all(
      steps.map(async (step) => {
        setProcessingStatus(step.message);
        await new Promise((resolve) => {
          setTimeout(resolve, step.delay);
        });
      })
    );

    // Mock analysis results
    const mockResults = {
      detected_classes: ["building", "road", "sky", "vegetation"],
      masks: [
        {
          material: "Glass",
          color: COLOR_PALETTE[0],
          mask_base64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
        {
          material: "Brick",
          color: COLOR_PALETTE[1],
          mask_base64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
        {
          material: "Concrete",
          color: COLOR_PALETTE[2],
          mask_base64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
        {
          material: "Metal",
          color: COLOR_PALETTE[3],
          mask_base64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
        {
          material: "Wood",
          color: COLOR_PALETTE[4],
          mask_base64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
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

    // Simulate API call delay
    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });

    // Mock area calculation
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

  const resetAnalysis = () => {
    setCurrentStep("upload");
    setUploadedImage(null);
    setAnalysisResults(null);
    setCalculatedAreas({});
    setVisibleMasks({});
    setCalibrationDistance("");
    setProcessingStatus("");
  };

  // Upload Screen
  if (currentStep === "upload") {
    return (
      <div
        className="surface-bg min-vh-100 d-flex flex-column justify-content-center align-items-center px-2"
        style={{ background: "#f8f9fb" }}
      >
        <h1
          className="display-3 fw-bold text-center mb-2"
          style={{ color: "#181c3a", letterSpacing: "-1px" }}
        >
          Urban Material Analyzer
        </h1>
        <p
          className="lead text-center mb-4"
          style={{ color: "#4a4a4a", fontSize: "1.25rem" }}
        >
          Upload an image to analyze building materials and calculate surface
          areas
        </p>
        <div
          className="card shadow border-0 p-4 mb-4 animate__animated animate__fadeIn surface-upload-card"
          style={{
            maxWidth: 520,
            width: "100%",
            background: "#fff",
            borderRadius: 18,
            cursor: "pointer",
            transition: "box-shadow .2s",
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="text-center mb-2">
            <span
              role="img"
              aria-label="folder"
              style={{ fontSize: 36, color: "#f7b731" }}
            >
              📁
            </span>
          </div>
          <h3 className="fw-bold text-center mb-1" style={{ color: "#181c3a" }}>
            Drag and drop your image here
          </h3>
          <div
            className="text-center text-muted mb-2"
            style={{ fontSize: "1.05rem" }}
          >
            or click to browse files
          </div>
          <div
            className="text-center text-secondary mb-3"
            style={{ fontSize: ".98rem" }}
          >
            Supports <b>JPG</b>, <b>PNG</b>, and other image formats
          </div>
          <div className="d-flex justify-content-center">
            <input
              ref={fileInputRef}
              id="segment-file-input"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              style={{ display: "none" }}
            />
            <label
              className="btn btn-outline-primary px-4 py-2 mb-0"
              style={{
                fontWeight: 500,
                borderRadius: 8,
                fontSize: "1rem",
                marginBottom: 0,
              }}
              htmlFor="segment-file-input"
            >
              Choose File
            </label>
            <span
              className="align-self-center ms-2 text-muted"
              style={{ fontSize: ".98rem" }}
            >
              {uploadedImage ? uploadedImage.name : "No file chosen"}
            </span>
          </div>
          {uploadedImage && (
            <div
              className="alert alert-success mt-3 mb-0 text-center p-2"
              style={{ borderRadius: 8, fontSize: ".98rem" }}
            >
              Selected file: <strong>{uploadedImage.name}</strong>
            </div>
          )}
        </div>
        {uploadedImage && (

              <button
                type="button"
                onClick={startAnalysis}
                className="btn btn-primary px-4 py-2 ms-3"
                style={{ fontSize: ".98rem", borderRadius: 6 }}
              >
                Start Analysis
              </button>
        )}







        <style>{`
          .surface-bg {
            background: #f8f9fb;
          }
          .surface-upload-card:hover {
            box-shadow: 0 8px 32px 0 rgba(24,28,58,0.12), 0 1.5px 6px 0 rgba(24,28,58,0.08);
          }
          @media (max-width: 600px) {
            .surface-upload-card {
              padding: 1.5rem !important;
            }
            .display-3 {
              font-size: 2.1rem !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // Processing Screen
  if (currentStep === "processing") {
    return (
      <div className="main-container">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12">
              <div className="card-wrap text-center">
                <h3 className="mb-4">Analyzing Image</h3>
                <img
                  src={uploadedImage.url}
                  alt="Processing"
                  className="img-fluid mb-4"
                  style={{
                    borderRadius: "10px",
                    maxHeight: "200px",
                    objectFit: "cover",
                  }}
                />
                <div className="spinner mb-3"></div>
                <p
                  className="mb-2"
                  style={{ color: "#6c757d", fontSize: "1.1rem" }}
                >
                  {processingStatus}
                </p>
                <div
                  className="progress-bar-custom mx-auto"
                  style={{ width: 200 }}
                >
                  <div className="progress-fill"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results Screen
  return (
    <div className="main-container">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="card-wrap">
              <div className="components-wrap text-center">
                <h3>Analysis Complete</h3>
                <p>
                  Interact with the results below to calculate material areas.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-lg-6">
            <div className="card-wrap mb-4">
              <div className="components-wrap">
                <h4 className="mb-3">
                  <i className="fa fa-image mr-2 text-primary"></i>Uploaded
                  Image
                </h4>
                <div className="row align-items-center">
                  <div className="col-3">
                    <img
                      src={uploadedImage.url}
                      alt="Uploaded"
                      className="img-fluid"
                      style={{
                        borderRadius: "8px",
                        maxHeight: "60px",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <div className="col-6">
                    <h6 className="mb-1" style={{ color: "#495057" }}>
                      {uploadedImage.name}
                    </h6>
                    <small style={{ color: "#6c757d" }}>
                      Analysis completed
                    </small>
                  </div>
                  <div className="col-3 text-end">
                    <button
                      type="button"
                      onClick={resetAnalysis}
                      className="btn btn-outline-primary btn-sm"
                    >
                      New Image
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-wrap mb-4">
              <div className="components-wrap">
                <h4 className="mb-3">
                  <i className="fa fa-search mr-2 text-success"></i>Detected
                  Objects
                </h4>
                <div>
                  {analysisResults?.detected_classes.map((obj) => (
                    <span
                      key={obj}
                      className="tag-item mr-2 mb-2 d-inline-block"
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="card-wrap mb-4">
              <div className="components-wrap">
                <h4 className="mb-3">
                  <i className="fa fa-ruler mr-2 text-warning"></i>Calibration
                </h4>
                <div className="mb-3">
                  <label
                    className="form-label font-weight-bold"
                    style={{ color: "#495057" }}
                  >
                    Real-world Distance (meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 20.0"
                    value={calibrationDistance}
                    onChange={(e) => setCalibrationDistance(e.target.value)}
                    className="form-control mb-2"
                  />
                  <small className="form-text text-muted">
                    Enter a known distance in the image for area calculations
                  </small>
                </div>
              </div>
            </div>
            <div className="card-wrap mb-4">
              <div className="components-wrap">
                <h4 className="mb-3">
                  <i className="fa fa-layer-group mr-2 text-purple"></i>Material
                  Breakdown
                </h4>
                <div>
                  {analysisResults?.masks.map((item) => (
                    <div
                      key={item.material}
                      className="d-flex align-items-center justify-content-between p-2 mb-2"
                      style={{
                        border: "1px solid #dee2e6",
                        borderRadius: "8px",
                        background: "#fafbfc",
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <div
                          className="color-swatch mr-2"
                          style={{
                            backgroundColor: item.color,
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            border: "2px solid #dee2e6",
                          }}
                        ></div>
                        <span
                          className="font-weight-bold mr-2"
                          style={{ color: "#495057" }}
                        >
                          {item.material}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleMaskVisibility(item.material)}
                          className="btn-eye ml-2"
                          title={
                            visibleMasks[item.material]
                              ? "Hide mask"
                              : "Show mask"
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#6c757d",
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ fontSize: "14px" }}>
                            {visibleMasks[item.material] ? "🙈" : "👁"}
                          </span>
                        </button>
                      </div>
                      <div className="d-flex align-items-center">
                        {calculatedAreas[item.material] ? (
                          <span
                            className="area-result mr-3"
                            style={{ color: "#28a745", fontWeight: 600 }}
                          >
                            {calculatedAreas[item.material]} m²
                          </span>
                        ) : (
                          <span className="mr-3" style={{ color: "#adb5bd" }}>
                            --- m²
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => calculateArea(item.material)}
                          disabled={
                            calculating[item.material] || !calibrationDistance
                          }
                          className="btn btn-primary btn-sm"
                        >
                          {calculating[item.material] ? (
                            <span>Calculating...</span>
                          ) : (
                            <span>Calculate</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card-wrap mb-4">
              <div className="components-wrap">
                <h4 className="mb-3">
                  <i className="fa fa-eye mr-2 text-info"></i>Interactive
                  Visualizer
                </h4>
                <div
                  className="visualizer-container position-relative"
                  style={{
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "#fff",
                    minHeight: 300,
                  }}
                >
                  <img
                    src={uploadedImage.url}
                    alt="Analysis visualization"
                    className="img-fluid w-100"
                    style={{ borderRadius: "10px" }}
                  />
                  {analysisResults?.masks.map(
                    (item) =>
                      visibleMasks[item.material] && (
                        <div
                          key={item.material}
                          className="mask-overlay position-absolute w-100 h-100"
                          style={{
                            backgroundColor: item.color,
                            opacity: 0.4,
                            mixBlendMode: "multiply",
                            top: 0,
                            left: 0,
                            borderRadius: "10px",
                          }}
                        >
                          <div
                            className="mask-label position-absolute"
                            style={{
                              top: 8,
                              left: 8,
                              background: "rgba(0,0,0,0.8)",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: "0.8rem",
                              fontWeight: 500,
                            }}
                          >
                            {item.material}
                          </div>
                        </div>
                      )
                  )}
                  {Object.values(visibleMasks).every((v) => !v) && (
                    <div
                      className="instructions-overlay position-absolute w-100 h-100 d-flex align-items-center justify-content-center"
                      style={{
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "10px",
                        top: 0,
                        left: 0,
                      }}
                    >
                      <div className="instructions-box bg-white p-4 rounded shadow text-center">
                        <div style={{ fontSize: "2rem", marginBottom: "10px" }}>
                          👁
                        </div>
                        <p
                          className="mb-0"
                          style={{ color: "#6c757d", fontSize: "0.9rem" }}
                        >
                          Click the eye icons to visualize material masks
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <small style={{ color: "#6c757d" }}>
                    <div>
                      • Click the eye icons (👁) in the left panel to show/hide
                      material overlays
                    </div>
                    <div>
                      • Enter a calibration distance to calculate accurate
                      surface areas
                    </div>
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Segment;
