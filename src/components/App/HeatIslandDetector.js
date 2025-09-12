import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Table, Alert, Card, Badge } from 'react-bootstrap';
import axios from 'axios';

const API_BASE = 'http://localhost:5000'; // <- update if needed

// Utility: stable IDs
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

const materialOptions = [
  'asphalt','concrete','grass','metal','plastic','rubber','sand','soil','solar panel','steel','water','artificial turf','glass'
];

const emptySegment = () => ({
  id: uid(),
  label: '',
  material: '',
  temp: '',
  humidity: '',
  area: ''
});

const emptyImageRow = () => ({
  id: uid(),
  imageFile: null,
  imagePreview: null,
  segments: [emptySegment()],
  results: null,           // { summary, detailed_results }
  warnings: [],
  recommendation: null,    // string
  loadingPredict: false,
  loadingRecommend: false,
  error: null
});

const HeatIslandBatchDetector = () => {
  const [items, setItems] = useState([emptyImageRow()]);

  const addImageRow = () => setItems(prev => [...prev, emptyImageRow()]);
  const removeImageRow = (id) => setItems(prev => prev.filter(x => x.id !== id));

  const updateImageFile = (id, file) => {
    setItems(prev => prev.map(x => {
      if (x.id !== id) return x;
      if (!file) return { ...x, imageFile: null, imagePreview: null };
      const reader = new FileReader();
      reader.onloadend = () => {
        setItems(cur => cur.map(y => (y.id === id ? { ...y, imagePreview: reader.result } : y)));
      };
      reader.readAsDataURL(file);
      return { ...x, imageFile: file, imagePreview: null };
    }));
  };

  const addSegment = (id) =>
    setItems(prev => prev.map(x => (x.id === id ? { ...x, segments: [...x.segments, emptySegment()] } : x)));

  const removeSegment = (imageId, segId) =>
    setItems(prev => prev.map(x => {
      if (x.id !== imageId) return x;
      const segs = x.segments.filter(s => s.id !== segId);
      return { ...x, segments: segs.length ? segs : [emptySegment()] };
    }));

  const updateSegmentField = (imageId, segId, field, value) =>
    setItems(prev => prev.map(x => {
      if (x.id !== imageId) return x;
      const segs = x.segments.map(s => (s.id === segId ? { ...s, [field]: value } : s));
      return { ...x, segments: segs };
    }));

  const toNum = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
  const isFiniteNum = (v) => Number.isFinite(v);

  const buildSegmentsPayload = (segments) =>
    segments.map(s => ({
      label: String(s.label || '').trim(),
      material: String(s.material || '').toLowerCase().trim(),
      temp: Number(s.temp),
      humidity: Number(s.humidity),
      area: Number(s.area)
    }));

  const predictOne = async (imageId) => {
    setItems(prev => prev.map(x => (x.id === imageId ? { ...x, loadingPredict: true, error: null, warnings: [], recommendation: null } : x)));
    try {
      const current = items.find(x => x.id === imageId);
      if (!current) return;

      // Validate segments
      const bad = current.segments.find(seg =>
        !seg.label || !seg.material ||
        !isFiniteNum(toNum(seg.temp)) ||
        !isFiniteNum(toNum(seg.humidity)) ||
        !isFiniteNum(toNum(seg.area)) ||
        toNum(seg.humidity) < 0 || toNum(seg.humidity) > 100 || toNum(seg.area) < 0
      );
      if (bad) throw new Error('Please fill all segment fields with valid numbers (Humidity 0–100; Area ≥ 0).');

      const segmentsPayload = buildSegmentsPayload(current.segments);
      const { data } = await axios.post(`${API_BASE}/predict`, { segments: segmentsPayload });

      const transformed = {
        summary: {
          avg_temperature: data.avg_temperature,
          avg_humidity: data.avg_humidity,
          heat_retaining_percent: data.heat_retaining_percent,
          vegetation_percent: data.vegetation_percent,
          final_decision: data.is_heat_island ? 'Heat Island Detected' : 'No Heat Island Detected'
        },
        detailed_results: Array.isArray(data.detailed_predictions) ? data.detailed_predictions : []
      };

      setItems(prev => prev.map(x =>
        x.id === imageId
          ? { ...x, results: transformed, warnings: data.validation_warnings || [], error: null }
          : x
      ));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Prediction failed';
      setItems(prev => prev.map(x => (x.id === imageId ? { ...x, error: msg, results: null } : x)));
    } finally {
      setItems(prev => prev.map(x => (x.id === imageId ? { ...x, loadingPredict: false } : x)));
    }
  };

  const recommendOne = async (imageId) => {
    const current = items.find(x => x.id === imageId);
    if (!current) return;

    if (!current.results?.summary || current.results.summary.final_decision !== 'Heat Island Detected') {
      setItems(prev => prev.map(x => (x.id === imageId ? { ...x, error: 'Recommendations available only when Heat Island is detected.' } : x)));
      return;
    }
    if (!current.imageFile || !current.imagePreview) {
      setItems(prev => prev.map(x => (x.id === imageId ? { ...x, error: 'Please upload an image for this entry.' } : x)));
      return;
    }

    setItems(prev => prev.map(x => (x.id === imageId ? { ...x, loadingRecommend: true, error: null } : x)));

    try {
      const dataUrl = String(current.imagePreview); // data:image/*;base64,....
      const [header, b64] = dataUrl.split(',', 2);
      const mimeMatch = header?.match(/^data:(.+?);base64$/i);
      const imageMime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const segmentsPayload = buildSegmentsPayload(current.segments);

      const payload = {
        segments: segmentsPayload,
        image_base64: b64,
        // eslint-disable-next-line camelcase
        image_mime: imageMime
      };

      const res = await axios.post(`${API_BASE}/recommend`, payload);

      const text = res.data?.gemini_recommendation
        ? res.data.gemini_recommendation
        : (res.data?.message || '(No recommendation text returned)');

      setItems(prev => prev.map(x => (x.id === imageId ? { ...x, recommendation: text, error: null } : x)));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Recommendation failed';
      setItems(prev => prev.map(x => (x.id === imageId ? { ...x, error: msg } : x)));
    } finally {
      setItems(prev => prev.map(x => (x.id === imageId ? { ...x, loadingRecommend: false } : x)));
    }
  };

  // Replace for..of loops with Promise.all + array methods
  const predictAll = async () => {
    const ids = items.map(i => i.id);
    await Promise.all(ids.map(id => predictOne(id)));
  };

  const recommendAllDetected = async () => {
    const detectedIds = items
      .filter(it => it.results?.summary?.final_decision === 'Heat Island Detected')
      .map(it => it.id);
    await Promise.all(detectedIds.map(id => recommendOne(id)));
  };

  return (
    <Container className="mt-4" style={{ maxWidth: '98%' }}>
      <h1 className="text-center mb-4" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
        <span role="img" aria-label="fire">🔥</span> Urban Heat Island Detector <span role="img" aria-label="fire">🔥</span>
      </h1>

      <div className="d-flex gap-2 mb-3">
        <Button variant="outline-secondary" onClick={addImageRow}>+ Add Image</Button>
        <Button variant="success" onClick={predictAll}>Run Detection for All</Button>
        <Button variant="primary" onClick={recommendAllDetected}>Get Recommendations for Detected</Button>
      </div>

      {items.map(item => (
        <Card className="mb-4" key={item.id}>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Image Entry</strong>{' '}
              {item.results?.summary?.final_decision === 'Heat Island Detected' && <Badge bg="danger" className="ms-2">Detected</Badge>}
              {item.results?.summary?.final_decision === 'No Heat Island Detected' && <Badge bg="success" className="ms-2">Not Detected</Badge>}
            </div>
            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-success" onClick={() => predictOne(item.id)} disabled={item.loadingPredict}>
                {item.loadingPredict ? 'Analyzing...' : 'Detect'}
              </Button>
              <Button size="sm" variant="outline-primary" onClick={() => recommendOne(item.id)} disabled={item.loadingRecommend}>
                {item.loadingRecommend ? 'Recommending...' : 'Recommend'}
              </Button>
              <Button size="sm" variant="outline-danger" onClick={() => removeImageRow(item.id)}>Remove</Button>
            </div>
          </Card.Header>

          <Card.Body>
            {/* Image upload & preview */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Upload Urban Area Image (JPG/PNG/WebP)</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => updateImageFile(item.id, e.target.files?.[0] || null)}
                  />
                </Form.Group>
                {item.imagePreview && (
                  <div className="mt-3">
                    <img src={item.imagePreview} alt="preview" style={{ maxWidth: '360px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </div>
                )}
              </Col>
            </Row>

            {/* Segments table */}
            <Table striped bordered hover responsive className="mb-3">
              <thead>
                <tr>
                  <th>Location (label)</th>
                  <th>Material</th>
                  <th>Temp (°C)</th>
                  <th>Humidity (%)</th>
                  <th>Area (sq.m)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {item.segments.map(seg => (
                  <tr key={seg.id}>
                    <td style={{ minWidth: 160 }}>
                      <Form.Control
                        type="text"
                        value={seg.label}
                        placeholder="building"
                        onChange={(e) => updateSegmentField(item.id, seg.id, 'label', e.target.value)}
                      />
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <Form.Select
                        value={seg.material}
                        onChange={(e) => updateSegmentField(item.id, seg.id, 'material', e.target.value)}
                      >
                        <option value="">Select Material</option>
                        {materialOptions.map(m => <option key={m} value={m}>{m}</option>)}
                      </Form.Select>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control
                        type="number"
                        value={seg.temp}
                        placeholder="35"
                        onChange={(e) => updateSegmentField(item.id, seg.id, 'temp', e.target.value)}
                      />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control
                        type="number"
                        value={seg.humidity}
                        placeholder="45"
                        onChange={(e) => updateSegmentField(item.id, seg.id, 'humidity', e.target.value)}
                      />
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <Form.Control
                        type="number"
                        value={seg.area}
                        placeholder="500"
                        onChange={(e) => updateSegmentField(item.id, seg.id, 'area', e.target.value)}
                      />
                    </td>
                    <td>
                      <Button variant="outline-danger" size="sm" onClick={() => removeSegment(item.id, seg.id)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Button variant="outline-secondary" onClick={() => addSegment(item.id)}>+ Add Segment</Button>

            {/* Results */}
            {item.loadingPredict && (
              <div className="text-center my-3">
                <div className="spinner-border text-primary" role="status" />
                <p className="mt-2">Analyzing...</p>
              </div>
            )}

            {item.warnings?.length > 0 && (
              <Alert variant="warning" className="mt-3">
                <strong>Validation warnings:</strong>
                <ul className="mb-0">
                  {item.warnings.map(w => <li key={`${item.id}-${w}`}>{w}</li>)}
                </ul>
              </Alert>
            )}

            {item.results?.summary && (
              <Row className="mt-3">
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>Location Details</Card.Header>
                    <Card.Body>
                      {Array.isArray(item.results.detailed_results) && item.results.detailed_results.map(det => {
                        const flag = det.heat_island === 'Yes';
                        return (
                          <div
                            key={`${item.id}-${det.location}-${det.material}-${det.temperature}-${det.humidity}-${det.area}`}
                            className={`mb-2 ${flag ? 'text-danger' : 'text-success'}`}
                          >
                            <strong>{det.location}</strong>
                            <span className="ms-2 badge bg-secondary">{flag ? 'Heat Island' : 'No Heat Island'}</span>
                            <div className="small text-muted">
                              Material: {det.material} | Temp: {det.temperature}°C | Humidity: {det.humidity}% | Area: {det.area} m²
                            </div>
                          </div>
                        );
                      })}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>Area-Based Analysis</Card.Header>
                    <Card.Body>
                      <div className="d-flex justify-content-between mb-2"><span>🔥 Heat-Retaining Material:</span><strong>{item.results.summary.heat_retaining_percent}%</strong></div>
                      <div className="d-flex justify-content-between mb-2"><span>🌿 Vegetation Coverage:</span><strong>{item.results.summary.vegetation_percent}%</strong></div>
                      <div className="d-flex justify-content-between mb-2"><span>🌡 Avg Temperature:</span><strong>{item.results.summary.avg_temperature}°C</strong></div>
                      <div className="d-flex justify-content-between mb-2"><span>💧 Avg Humidity:</span><strong>{item.results.summary.avg_humidity}%</strong></div>
                      <Alert variant={item.results.summary.final_decision === 'Heat Island Detected' ? 'danger' : 'success'} className="mt-3">
                        <strong>Final Decision:</strong> {item.results.summary.final_decision}
                      </Alert>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Recommendations */}
            {item.loadingRecommend && (
              <div className="text-center my-3">
                <div className="spinner-border text-warning" role="status" />
                <p className="mt-2">Generating mitigation recommendations...</p>
              </div>
            )}

            {item.recommendation && !item.loadingRecommend && (
              <Card className="mt-2">
                <Card.Header>Mitigation Recommendations</Card.Header>
                <Card.Body>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{item.recommendation}</pre>
                </Card.Body>
              </Card>
            )}

            {item.error && <Alert variant="danger" className="mt-3">{item.error}</Alert>}
          </Card.Body>
        </Card>
      ))}
    </Container>
  );
};

export default HeatIslandBatchDetector;
