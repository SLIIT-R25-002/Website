import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Table,
  Spinner,
  Card,
  Image,
  Alert,
} from 'react-bootstrap';
import axios from 'axios';
import { message } from 'antd';

const HeatIslandDetector = () => {
  const [formData, setFormData] = useState({
    location: '',
    material: '',
    temperature: '',
    humidity: '',
    area: '',
  });
  const [entries, setEntries] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddEntry = () => {
    const { location, material, temperature, humidity, area } = formData;
    if (!location || !material || !temperature || !humidity || !area) {
      message.warning('Please fill in all fields.');
      return;
    }
    setEntries([...entries, { ...formData }]);
    setFormData({ location: '', material: '', temperature: '', humidity: '', area: '' });
  };

  const removeDataEntry = (indexToRemove) => {
    const updated = entries.filter((_, index) => index !== indexToRemove);
    setEntries(updated);
  };

  const getRecommendations = async () => {
    if (entries.length === 0) {
      message.warning('Please add at least one entry.');
      return;
    }

    if (!imageFile) {
      message.warning('Please upload an image.');
      return;
    }

    setLoading(true);
    const base64 = await toBase64(imageFile);
    const payload = {
      data: entries.map((e) => [
        e.location,
        e.material,
        parseFloat(e.temperature),
        parseFloat(e.humidity),
        parseFloat(e.area),
      ]),
      image_base64: base64,
    };

    try {
      const response = await axios.post('http://localhost:5000/predict', payload);
      setResults(response.data);
    } catch (error) {
      message.error('Prediction failed.');
    }
    setLoading(false);
  };

  return (
    <Container>
      <h2 className="my-4">Urban Heat Island Detection</h2>
      <Row>
        <Col md={6}>
          <Form>
            <Form.Group controlId="location">
              <Form.Label>Location</Form.Label>
              <Form.Control name="location" value={formData.location} onChange={handleChange} />
            </Form.Group>
            <Form.Group controlId="material">
              <Form.Label>Material</Form.Label>
              <Form.Control name="material" value={formData.material} onChange={handleChange} />
            </Form.Group>
            <Form.Group controlId="temperature">
              <Form.Label>Temperature (°C)</Form.Label>
              <Form.Control
                name="temperature"
                type="number"
                value={formData.temperature}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group controlId="humidity">
              <Form.Label>Humidity (%)</Form.Label>
              <Form.Control
                name="humidity"
                type="number"
                value={formData.humidity}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group controlId="area">
              <Form.Label>Area (sqm)</Form.Label>
              <Form.Control
                name="area"
                type="number"
                value={formData.area}
                onChange={handleChange}
              />
            </Form.Group>
            <Button className="mt-3" onClick={handleAddEntry}>
              Add Entry
            </Button>
          </Form>
        </Col>
        <Col md={6}>
          <Form.Group controlId="image">
            <Form.Label>Upload Segmented Image</Form.Label>
            <Form.Control
              type="file"
              onChange={(e) => {
                setImageFile(e.target.files[0]);
                setImagePreview(URL.createObjectURL(e.target.files[0]));
              }}
            />
          </Form.Group>
          {imagePreview && (
            <Image src={imagePreview} fluid thumbnail className="mt-3" />
          )}
        </Col>
      </Row>

      <h4 className="mt-5">Data Entries</h4>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Location</th>
            <th>Material</th>
            <th>Temp (°C)</th>
            <th>Humidity (%)</th>
            <th>Area (sqm)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={`${e.location}-${e.material}-${e.temperature}`}>
              <td>{e.location}</td>
              <td>{e.material}</td>
              <td>{e.temperature}</td>
              <td>{e.humidity}</td>
              <td>{e.area}</td>
              <td>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeDataEntry(i)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Button variant="primary" onClick={getRecommendations} disabled={loading}>
        {loading ? <Spinner animation="border" size="sm" /> : 'Submit for Analysis'}
      </Button>

      {results && (
        <Card className="mt-4">
          <Card.Body>
            <Card.Title>Prediction Summary</Card.Title>
            <p><strong>Heat Retaining Surface:</strong> {results.summary.heat_retaining_percent}%</p>
            <p><strong>Vegetation Coverage:</strong> {results.summary.vegetation_percent}%</p>
            <p><strong>Average Temperature:</strong> {results.summary.avg_temperature}°C</p>
            <p><strong>Average Humidity:</strong> {results.summary.avg_humidity}%</p>
            <p><strong>Final Decision:</strong> {results.summary.final_decision}</p>
            {results.gemini_recommendation && (
              <Alert variant="info">
                <strong>Gemini Recommendations:</strong>
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {results.gemini_recommendation}
                </pre>
              </Alert>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default HeatIslandDetector;
