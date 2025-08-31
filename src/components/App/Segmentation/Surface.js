import React, { useState } from "react";

export default function Surface({ maskResult, imageFile }) {
  const [resultImage, setResultImage] = useState(null);
  const [surfaceArea, setSurfaceArea] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [referencePx, setReferencePx] = useState("");
  const [referenceReal, setReferenceReal] = useState("");

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResultImage(null);
    setSurfaceArea(null);

    try {
      const maskResponse = await fetch(maskResult);
      const maskBlob = await maskResponse.blob();

      const formData = new FormData();
      formData.append("image", imageFile, imageFile?.name || "image.png");
      formData.append("mask", maskBlob, "mask.png");

      // Add reference measurements if provided
      if (referencePx && referenceReal) {
        formData.append("reference_px", referencePx);
        formData.append("reference_real", referenceReal);
      }

      const res = await fetch("http://localhost:5001/api/depth/masked", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      // Debug all available headers
      console.log("Response headers:", [...res.headers.entries()]);

      // Get the image and surface area from headers
      const blob = await res.blob();
      setResultImage(URL.createObjectURL(blob));

      const area = res.headers.get("X-Surface-Area");
      console.log("Header value:", area); // Debug
      setSurfaceArea(area ? parseFloat(area).toFixed(2) : null);
    } catch (err) {
      setError(err.message || "Error calculating surface area");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h2>Surface Area Calculation</h2>

      {/* Reference measurements input */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          background: "#f5f5f5",
          borderRadius: 8,
        }}
      >
        <h4 style={{ marginBottom: 12 }}>Reference Measurements</h4>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              Length in Pixels
            </label>
            <input
              type="number"
              value={referencePx}
              onChange={(e) => setReferencePx(e.target.value)}
              placeholder="e.g., 100"
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #ddd",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              Real Length (cm)
            </label>
            <input
              type="number"
              value={referenceReal}
              onChange={(e) => setReferenceReal(e.target.value)}
              placeholder="e.g., 8.5"
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #ddd",
              }}
            />
          </div>
        </div>
        <small style={{ color: "#666" }}>
          Measure a known object in the image (like a credit card) and enter its
          pixel length and real-world size.
        </small>
      </div>

      {/* Mask image display */}
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
          <h4 style={{ marginBottom: 12 }}>Mask Image</h4>
          <img
            src={maskResult}
            alt="Mask"
            style={{
              width: "100%",
              maxHeight: 300,
              objectFit: "contain",
              borderRadius: 4,
            }}
          />
        </div>
      )}

      {/* Calculate button */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <button
          type="button"
          onClick={handleCalculate}
          disabled={loading || !maskResult}
          style={{
            padding: "12px 24px",
            borderRadius: 6,
            background: loading ? "#ccc" : "#007bff",
            color: "#fff",
            border: "none",
            fontWeight: 500,
            cursor: loading || !maskResult ? "not-allowed" : "pointer",
            fontSize: 16,
          }}
        >
          {loading ? "Calculating..." : "Calculate Surface Area"}
        </button>
      </div>

      {/* Results display */}
      {resultImage && (
        <div
          style={{
            marginBottom: 24,
            background: "#fafbfc",
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h4 style={{ marginBottom: 12 }}>Depth Map Result</h4>
          <img
            src={resultImage}
            alt="Depth Map Result"
            style={{
              width: "100%",
              maxHeight: 300,
              objectFit: "contain",
              borderRadius: 4,
            }}
          />
        </div>
      )}

      {surfaceArea !== null && (
        <div
          style={{
            background: "#e8f5e9",
            padding: "16px",
            borderRadius: "8px",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ marginBottom: "8px", color: "#2e7d32" }}>
            Calculation Complete
          </h3>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            Surface Area:{" "}
            <span style={{ color: "#007bff" }}>{surfaceArea}</span>
            <span style={{ fontSize: "16px", color: "#666" }}>
              {referencePx && referenceReal ? " cm²" : " units²"}
            </span>
          </div>
          {!(referencePx && referenceReal) && (
            <div
              style={{ marginTop: "8px", color: "#d32f2f", fontSize: "14px" }}
            >
              Note: For real-world measurements, please provide reference values
              above.
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#ffebee",
            color: "#d32f2f",
            padding: "16px",
            borderRadius: "8px",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          Error: {error}
        </div>
      )}
    </div>
  );
}
