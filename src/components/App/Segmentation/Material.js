import React, { useState } from "react";

function Material({ maskResult }) {
  const [materialResult, setMaterialResult] = useState(null);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [materialError, setMaterialError] = useState(null);

  const maskImage = maskResult;

  const handleIdentifyMaterial = async () => {
    setMaterialLoading(true);
    setMaterialError(null);
    setMaterialResult(null);
    try {
      // Convert mask image URL to blob
      const response = await fetch(maskImage);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("file", blob, "mask.png");
      const res = await fetch("http://localhost:5001/api/classify/material", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to classify material");
      }
      const data = await res.json();
      setMaterialResult(data);
    } catch (err) {
      setMaterialError(err.message || "Error classifying material");
    } finally {
      setMaterialLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h2>Material Identification</h2>
      {/* Only show mask image */}
      {maskImage && (
        <div
          style={{
            marginBottom: 24,
            background: "#fafbfc",
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h4 style={{ marginBottom: 12 }}>Mask Image</h4>
          <img
            src={maskImage}
            alt="Mask"
            style={{
              width: "100%",
              maxHeight: 300,
              objectFit: "contain",
              borderRadius: 4,
              background: "#fff",
            }}
          />
        </div>
      )}

      {/* Identify material button */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <button
          type="button"
          onClick={handleIdentifyMaterial}
          disabled={materialLoading || !maskImage}
          style={{
            padding: "10px 24px",
            borderRadius: 6,
            background: materialLoading ? "#ccc" : "#28a745",
            color: "#fff",
            border: "none",
            fontWeight: 500,
            cursor: materialLoading || !maskImage ? "not-allowed" : "pointer",
            fontSize: 16,
          }}
        >
          {materialLoading ? "Identifying..." : "Identify the Material"}
        </button>
      </div>

      {/* Show identified material result */}
      {materialResult && (
        <div
          style={{
            color: "#28a745",
            fontWeight: "bold",
            fontSize: 18,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          Material: {materialResult.material}
        </div>
      )}
      {materialError && (
        <div style={{ color: "red", textAlign: "center", marginTop: 12 }}>
          {materialError}
        </div>
      )}
    </div>
  );
}

export default Material;
