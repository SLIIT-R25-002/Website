import React, { useState } from "react";

function Segment() {
  const [image, setImage] = useState(null);
  const [segmentationResult, setSegmentationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(URL.createObjectURL(file));
      setSegmentationResult(null);
      setError(null);
      setLoading(true);
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
    </div>
  );
}

export default Segment;
