import React, { useState, useEffect } from "react";

function Segment() {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [maskLoading, setMaskLoading] = useState(false);
  const [maskError, setMaskError] = useState(null);
  const [maskResult, setMaskResult] = useState(null);
  const [classOptions, setClassOptions] = useState([]);
  const [segmentationResult, setSegmentationResult] = useState(null);

  // Fetch class options from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/classes")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.classes)) {
          setClassOptions(data.classes);
          if (data.classes.length > 0) {
            setSelectedClass(data.classes[0].id);
          }
        }
      })
      .catch(() => {
        setClassOptions([
          { id: "Building", name: "Building" },
          { id: "Road", name: "Road" },
          { id: "Sidewalk", name: "Sidewalk" },
          { id: "Green Area", name: "Green Area" },
        ]);
        setSelectedClass("Building");
      });
  }, []);

  const handleImageUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(URL.createObjectURL(file));
      setImageFile(file);
      setSegmentationResult(null);
      setError(null);
      setLoading(true);
      setMaskResult(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("http://localhost:5000/api/segment/all", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          throw new Error("Segmentation failed");
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setSegmentationResult(url);
      } catch (err) {
        setError(err.message || "Error connecting to backend");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    setMaskResult(null);
    setMaskError(null);
  };

  const handleExtractMask = async () => {
    if (!imageFile) {
      setMaskError("Please upload an image first.");
      return;
    }
    setMaskLoading(true);
    setMaskError(null);
    setMaskResult(null);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("class_id", selectedClass);
      const response = await fetch("http://localhost:5000/api/segment/class", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to extract mask");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setMaskResult(url);
    } catch (err) {
      setMaskError(err.message || "Error extracting mask");
    } finally {
      setMaskLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h2>Image Segmentation</h2>
      {/* Image upload button */}
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      {/* Show the uploaded image */}
      {image && (
        <div style={{ marginTop: 16 }}>
          <h4>Uploaded Image:</h4>
          <img src={image} alt="Uploaded" style={{ maxWidth: "100%" }} />
        </div>
      )}

      {/* Show the segmentation result image */}
      {image && (
        <div style={{ marginTop: 24 }}>
          <h4>Segmentation Result:</h4>
          {loading && (
            <div style={{ color: "#888", padding: 24 }}>
              Processing image...
            </div>
          )}
          {error && <div style={{ color: "red", padding: 24 }}>{error}</div>}
          {!loading && !error && segmentationResult && (
            <img
              src={segmentationResult}
              alt="Segmentation Result"
              style={{ maxWidth: "100%", borderRadius: 4, background: "#fff" }}
            />
          )}
          {!loading && !error && !segmentationResult && (
            <div
              style={{
                width: "100%",
                height: 200,
                background: "#eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
              }}
            >
              No segmentation result yet
            </div>
          )}
        </div>
      )}

      {/* Dropdown for class specification (dynamic from backend) */}
      {image && classOptions.length > 0 && (
        <div style={{ marginTop: 32, marginBottom: 16 }}>
          <label
            htmlFor="class-select"
            style={{ fontWeight: 500, marginRight: 12 }}
          >
            Select Class:
          </label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={handleClassChange}
            style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
          >
            {classOptions.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Button for extract mask */}
      {image && (
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={handleExtractMask}
            disabled={maskLoading}
            style={{
              padding: "10px 24px",
              borderRadius: 6,
              background: maskLoading ? "#ccc" : "#007bff",
              color: "#fff",
              border: "none",
              fontWeight: 500,
              cursor: maskLoading ? "not-allowed" : "pointer",
              fontSize: 16,
            }}
          >
            {maskLoading ? "Extracting..." : "Extract Mask"}
          </button>
        </div>
      )}

      {/* Extracted mask image */}
      {maskResult && (
        <div
          style={{
            marginBottom: 24,
            background: "#fafbfc",
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h4 style={{ marginBottom: 12 }}>Extracted Mask</h4>
          <img
            src={maskResult}
            alt="Extracted Mask"
            style={{
              width: "100%",
              maxHeight: 400,
              minHeight: 300,
              objectFit: "contain",
              borderRadius: 4,
              background: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            }}
          />
        </div>
      )}
      {maskError && (
        <div style={{ color: "red", marginBottom: 16 }}>{maskError}</div>
      )}
    </div>
  );
}

export default Segment;
