import React, { useState } from "react";

function Segment() {
  const [image, setImage] = useState(null);

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(URL.createObjectURL(e.target.files[0]));
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
            {/* Replace this with your segmentation result */}
       
          </div>
        </div>
      )}
      
    
    </div>
  );
}

export default Segment;
