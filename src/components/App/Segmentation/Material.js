import React, { useState } from "react";

function Material({segmentationResult, maskResult}) {
  const [selectedClass, setSelectedClass] = useState("Building");
  const [maskExtracted, setMaskExtracted] = useState(false);
  const [materialIdentified, setMaterialIdentified] = useState(false);

  // Dummy image URLs for demonstration
  const segmentationImage = segmentationResult;
  const maskImage = maskResult;

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    setMaskExtracted(false);
    setMaterialIdentified(false);
  };

  const handleExtractMask = () => {
    setMaskExtracted(true);
    setMaterialIdentified(false);
  };

  const handleIdentifyMaterial = () => {
    setMaterialIdentified(true);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h2>Material Identification</h2>
      {/* Segmentation image section */}
      <div
        style={{
          marginBottom: 24,
          background: "#fafbfc",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <h4 style={{ marginBottom: 12 }}>Segmentation Image</h4>
        <img
          src={segmentationImage}
          alt="Segmentation"
          style={{
            width: "100%",
            maxHeight: 250,
            objectFit: "contain",
            borderRadius: 4,
            background: "#fff",
          }}
        />
      </div>

      {/* Dropdown for extracted classes */}
      <div
        style={{
          marginBottom: 24,
          background: "#fafbfc",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <label htmlFor="class-select" style={{ fontWeight: 500 }}>
          Select Class:
        </label>
        <select
          id="class-select"
          value={selectedClass}
          onChange={handleClassChange}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="Building">Building</option>
          <option value="Road">Road</option>
          <option value="Sidewalk">Sidewalk</option>
        </select>
      </div>

      {/* Extract mask button */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <button
          type="button"
          onClick={handleExtractMask}
          disabled={maskExtracted}
          style={{
            padding: "10px 24px",
            borderRadius: 6,
            background: maskExtracted ? "#ccc" : "#007bff",
            color: "#fff",
            border: "none",
            fontWeight: 500,
            cursor: maskExtracted ? "not-allowed" : "pointer",
            fontSize: 16,
          }}
        >
          Extract the Mask
        </button>
      </div>

      {/* Extracted mask image section */}
      {maskExtracted && (
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
            src={maskImage}
            alt="Extracted Mask"
            style={{
              width: "100%",
              maxHeight: 200,
              objectFit: "contain",
              borderRadius: 4,
              background: "#fff",
            }}
          />
        </div>
      )}

      {/* Identify material button */}
      {maskExtracted && (
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <button
            type="button"
            onClick={handleIdentifyMaterial}
            disabled={materialIdentified}
            style={{
              padding: "10px 24px",
              borderRadius: 6,
              background: materialIdentified ? "#ccc" : "#28a745",
              color: "#fff",
              border: "none",
              fontWeight: 500,
              cursor: materialIdentified ? "not-allowed" : "pointer",
              fontSize: 16,
            }}
          >
            Identify the Material
          </button>
        </div>
      )}

      {/* Show identified material result (dummy) */}
      {materialIdentified && (
        <div
          style={{
            color: "#28a745",
            fontWeight: "bold",
            fontSize: 18,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          Material: Concrete (example)
        </div>
      )}
    </div>
  );
}

export default Material;
