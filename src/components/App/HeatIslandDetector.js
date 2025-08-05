import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Table, Alert, Card } from 'react-bootstrap';
import axios from 'axios';

const HeatIslandDetector = () => {
  const [data, setData] = useState([]);
  const [newEntry, setNewEntry] = useState({ locationType: '', material: '', temperature: '', humidity: '', area: '' });
  const [editingIndex, setEditingIndex] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  const materialOptions = [
    "asphalt", "concrete", "grass", "metal", "plastic",
    "rubber", "sand", "soil", "solar panel", "steel",
    "water", "artificial turf", "glass"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEntry(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const addOrUpdateDataEntry = () => {
    const { locationType, material, temperature, humidity, area } = newEntry;
    if (!locationType || !material || !temperature || !humidity || !area) {
      alert("Please fill in all fields");
      return;
    }

    const entry = [
      locationType,
      material,
      parseFloat(temperature),
      parseFloat(humidity),
      parseFloat(area)
    ];

    if (editingIndex !== null) {
      const updatedData = [...data];
      updatedData[editingIndex] = entry;
      setData(updatedData);
      setEditingIndex(null);
    } else {
      setData(prev => [...prev, entry]);
    }

    setNewEntry({ locationType: '', material: '', temperature: '', humidity: '', area: '' });
  };

  const startEditEntry = (index) => {
    const entry = data[index];
    setNewEntry({
      locationType: entry[0],
      material: entry[1],
      temperature: entry[2],
      humidity: entry[3],
      area: entry[4]
    });
    setEditingIndex(index);
  };

  const removeDataEntry = (indexToRemove) => {
    setData(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const predictHeatIsland = async () => {
  if (data.length === 0) {
    alert("Please add at least one data entry");
    return;
  }

  try {
    setLoading(true);
    setError(null);
    const response = await axios.post('http://localhost:5000/predict', { data });

    const backendData = response.data;

    // ✅ Wrap the backend response into expected structure
    const transformed = {
      summary: {
        avg_temperature: backendData.avg_temperature,
        avg_humidity: backendData.avg_humidity,
        heat_retaining_percent: backendData.heat_retaining_percent,
        vegetation_percent: backendData.vegetation_percent,
        final_decision: backendData.is_heat_island ? "Heat Island Detected" : "No Heat Island Detected"
      },
      detailed_results: backendData.detailed_predictions
    };

    setResults(transformed);
    setRecommendation(null);
  } catch (err) {
    setError(err.response?.data?.error || "An error occurred");
    setResults(null);
  } finally {
    setLoading(false);
  }
};


  const requestRecommendation = async () => {
    if (!imageFile) {
      alert("Please upload an image");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result.split(",")[1];
      try {
        setLoadingRecommendation(true); // 🔹 Start loading
        setError(null);
        const res = await axios.post('http://localhost:5000/recommend', {
          data,
          image_base64: base64Image
        });
        setRecommendation(res.data.gemini_recommendation);
      } catch (err) {
        setError(err.response?.data?.error || "Recommendation failed");
      } finally {
        setLoadingRecommendation(false); // 🔹 End loading
      }
    };
    reader.readAsDataURL(imageFile);
  };

  return (
    <Container className="mt-5" style={{ maxWidth: '98%' }}>
      <h1 className="text-center mb-4" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
        <span role="img" aria-label="fire">🔥</span> Urban Heat Island Detector <span role="img" aria-label="fire">🔥</span>
      </h1>

      {/* Form Section */}
      <Card className="mb-4">
        <Card.Header className="text-center fw-semibold">Add New Data Entry</Card.Header>
        <Card.Body>
          <Form>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Location Type</Form.Label>
                  <Form.Control
                    type="text"
                    name="locationType"
                    value={newEntry.locationType}
                    onChange={handleInputChange}
                    placeholder="building"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Material</Form.Label>
                  <Form.Control
                    as="select"
                    name="material"
                    value={newEntry.material}
                    onChange={handleInputChange}
                    style={{ height: '38px' }} // optional tweak for height matching
                  >
                    <option value="">Select Material</option>
                    {materialOptions.map(material => (
                      <option key={material} value={material}>{material}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Temperature (°C)</Form.Label>
                  <Form.Control
                    type="number"
                    name="temperature"
                    value={newEntry.temperature}
                    onChange={handleInputChange}
                    placeholder="35"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Humidity (%)</Form.Label>
                  <Form.Control
                    type="number"
                    name="humidity"
                    value={newEntry.humidity}
                    onChange={handleInputChange}
                    placeholder="45"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Area (sq. meters)</Form.Label>
                  <Form.Control
                    type="number"
                    name="area"
                    value={newEntry.area}
                    onChange={handleInputChange}
                    placeholder="5000"
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end">
                <Button variant={editingIndex !== null ? "primary" : "success"} onClick={addOrUpdateDataEntry} className="me-2">
                  {editingIndex !== null ? "Update Entry" : "Add Entry"}
                </Button>
                {editingIndex !== null && (
                  <Button variant="secondary" onClick={() => {
                    setEditingIndex(null);
                    setNewEntry({ locationType: '', material: '', temperature: '', humidity: '', area: '' });
                  }}>
                    Cancel
                  </Button>
                )}
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Table of Entries */}
      {data.length > 0 && (
        <Card className="mb-4">
          <Card.Header>Current Data Entries</Card.Header>
          <Card.Body>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Material</th>
                  <th>Temp (°C)</th>
                  <th>Humidity (%)</th>
                  <th>Area (sq.m)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry[0]}</td>
                    <td>{entry[1]}</td>
                    <td>{entry[2]}</td>
                    <td>{entry[3]}</td>
                    <td>{entry[4]}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => startEditEntry(index)}>Edit</Button>
                      <Button variant="outline-danger" size="sm" onClick={() => removeDataEntry(index)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Button variant="success" onClick={predictHeatIsland}>Predict Heat Island Effect</Button>
          </Card.Body>
        </Card>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2">Analyzing data...</p>
        </div>
      )}

      {/* Result Summary */}
      {results?.summary && (
        <Card className="mb-4">
          <Card.Header>Heat Island Detection Summary</Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Card>
                  <Card.Header>Location Details</Card.Header>
                  <Card.Body>
                    {Array.isArray(results.detailed_results) && results.detailed_results.map((item, index) => (
                      <div key={index} className={`mb-2 ${item.heat_island === 'Yes' ? 'text-danger' : 'text-success'}`}>
                        <strong>{item.location}</strong>
                        <span className="ms-2 badge bg-secondary">
                          {item.heat_island === 'Yes' ? 'Heat Island' : 'No Heat Island'}
                        </span>
                        <div className="small text-muted">
                          Material: {item.material} | Temp: {item.temperature}°C | Humidity: {item.humidity}% | Area: {item.area} m²
                        </div>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card>
                  <Card.Header>Area-Based Analysis</Card.Header>
                  <Card.Body>
                    <div className="d-flex justify-content-between mb-2"><span>🔥 Heat-Retaining Material:</span><strong>{results.summary.heat_retaining_percent}%</strong></div>
                    <div className="d-flex justify-content-between mb-2"><span>🌿 Vegetation Coverage:</span><strong>{results.summary.vegetation_percent}%</strong></div>
                    <div className="d-flex justify-content-between mb-2"><span>🌡 Avg Temperature:</span><strong>{results.summary.avg_temperature}°C</strong></div>
                    <div className="d-flex justify-content-between mb-2"><span>💧 Avg Humidity:</span><strong>{results.summary.avg_humidity}%</strong></div>
                    <Alert variant={results.summary.final_decision === "Heat Island Detected" ? "danger" : "success"} className="mt-3">
                      <strong>Final Decision:</strong> {results.summary.final_decision}
                    </Alert>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Upload Image for Recommendations */}
      {results?.summary?.final_decision === "Heat Island Detected" && (
        <Card className="mb-4">
          <Card.Header>Upload Image for Recommendations</Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Upload Urban Area Image (JPG)</Form.Label>
              <Form.Control type="file" accept="image/jpeg" onChange={handleImageChange} />
            </Form.Group>
            <Button variant="primary" onClick={requestRecommendation}>Get Recommendations</Button>
          </Card.Body>
        </Card>
      )}

      {/* Loading Spinner for Recommendation */}
      {loadingRecommendation && (
        <div className="text-center my-4">
          <div className="spinner-border text-warning" role="status" />
          <p className="mt-2">Generating mitigation recommendations...</p>
        </div>
      )}

      {/* Recommendation Display */}
      {recommendation && !loadingRecommendation && (
        <Card className="mb-4">
          <Card.Header>Mitigation Recommendations</Card.Header>
          <Card.Body>
            <pre>{recommendation}</pre>
          </Card.Body>
        </Card>
      )}


      {error && <Alert variant="danger" className="mt-4">{error}</Alert>}
    </Container>
  );
};

export default HeatIslandDetector;
