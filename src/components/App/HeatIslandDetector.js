// HeatIslandDetector.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Container, Row, Col, Form, Button, Table, Alert, Card, Badge } from 'react-bootstrap';
import axios from 'axios';

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

const API_BASE = 'http://localhost:5002'; // backend base

// Utility: stable IDs
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

const materialOptions = [
  'asphalt','concrete','grass','metal','plastic','rubber','sand','soil','solar panel','steel','water','artificial turf','glass'
];

// Firestore segment (array field on image doc) -> local UI segment
const mapFsSegmentToLocal = (seg) => {
  const rawMaterial = (seg?.material || '').toLowerCase();
  return {
    id: uid(),
    label: String(seg?.label ?? ''),
    material: materialOptions.includes(rawMaterial) ? rawMaterial : '',
    temp: Number(seg?.temperature ?? 0),
    humidity: Number(seg?.humidity ?? 0),
    area: Number(seg?.surfaceArea ?? 0),
  };
};

// Firestore segment (sub-collection doc) -> local UI segment
const mapFsSegmentSubdocToLocal = (seg) => {
  const rawMaterial = (seg?.material || '').toLowerCase();
  return {
    id: uid(),
    label: String(seg?.label ?? ''),
    material: materialOptions.includes(rawMaterial) ? rawMaterial : '',
    temp: Number(seg?.temperature ?? 0),
    humidity: Number(seg?.humidity ?? 0),
    area: Number(seg?.surfaceArea ?? 0),
    segmentImageUrl: String(seg?.segmentImageUrl ?? ''),
  };
};

// New manual item template
const newManualItem = () => ({
  id: uid(),
  source: 'manual',          // 'manual' | 'fs'
  fsDocId: null,
  imageUrl: '',
  imageFile: null,
  imagePreview: null,        // dataURL
  timestamp: Date.now(),
  gps: null,
  gyro: null,
  segments: [{ id: uid(), label: '', material: '', temp: '', humidity: '', area: '' }],
  results: null,
  warnings: [],
  recommendation: null,
  loadingPredict: false,
  loadingRecommend: false,
  error: null,

  // --- Chat state (per card) ---
  chatOpen: false,
  chatMessages: [],     // [{ role: 'user'|'assistant', text: string, timestamp: number }]
  chatInput: '',
  chatLoading: false,
  chatSuggestions: [],
});

// Convert local segments -> API payload (prevent NaN -> null leakage)
const toApiSegments = (segments) =>
  segments.map((s) => {
    const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
    return {
      label: String(s.label || '').trim(),
      material: String(s.material || '').toLowerCase().trim(),
      temp: num(s.temp),
      humidity: num(s.humidity),
      area: num(s.area),
    };
  });

// Convert local UI segments -> Firestore schema (array form)
const segmentsToFs = (segments) =>
  segments.map((s) => ({
    label: String(s.label || '').trim() || null,
    material: String(s.material || '').toLowerCase() || null,
    temperature: Number(s.temp),
    humidity: Number(s.humidity),
    surfaceArea: Number(s.area),
  }));

// Validation helpers
const toNum = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
const isFiniteNum = (v) => Number.isFinite(v);

// Upload a dataURL image to Storage and return public URL
const uploadDataUrlToStorage = async (path, dataUrl) => {
  const ref = storageRef(storage, path);
  await uploadString(ref, dataUrl, 'data_url');
  return getDownloadURL(ref);
};

// Pick extension based on dataURL MIME
const extFromDataUrl = (durl) => {
  const m = String(durl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  if (!m) return 'jpg';
  const mt = m[1].toLowerCase();
  if (mt.includes('png')) return 'png';
  if (mt.includes('webp')) return 'webp';
  return 'jpg';
};

// --------- Helpers for "Suggested questions" ----------
const uniq = (arr) => Array.from(new Set(arr));

const getMaterialsSet = (item) =>
  new Set(
    (item?.segments || [])
      .map((s) => String(s.material || '').trim().toLowerCase())
      .filter(Boolean)
  );

const buildChatSuggestions = (item) => {
  const mats = getMaterialsSet(item);
  const heatPct = Number(item?.results?.summary?.heat_retaining_percent ?? NaN);
  const vegPct  = Number(item?.results?.summary?.vegetation_percent ?? NaN);

  const base = [
    'What would this roughly cost for our site?',
    'Can you outline quick wins we can implement in 0–3 months?',
    'What mid-term and long-term steps should we plan for?',
    'Which materials should we prioritize replacing and why?',
    'How do we maintain these interventions over time?',
  ];

  if (!Number.isNaN(heatPct) && heatPct >= 60) {
    base.push('Which cool roof or cool pavement options fit our conditions?');
  }
  if (!Number.isNaN(vegPct) && vegPct <= 25) {
    base.push('What green options (trees, planters, rain gardens) suit tight streetscapes?');
  }
  if (mats.has('asphalt') || mats.has('concrete')) {
    base.push('Would high-albedo coatings be effective here and how often do they need reapplication?');
  }
  if (mats.has('grass') || mats.has('soil') || mats.has('artificial turf')) {
    base.push('How can we increase shade and evapotranspiration without raising water use too much?');
  }
  return uniq(base).slice(0, 7);
};

const HeatIslandDetector = () => {
  const [sessionId, setSessionId] = useState(null);
  const [items, setItems] = useState([]); // fs + manual
  const [globalError, setGlobalError] = useState(null);

  // Segment sub-collection data: { [imageDocId]: localSegments[] }
  const [segmentDocsByImage, setSegmentDocsByImage] = useState({});
  const segmentUnsubsRef = useRef({});         // { [imageDocId]: () => unsubscribe }
  const segmentDocsRef = useRef(segmentDocsByImage);

  // keep refs in sync
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { segmentDocsRef.current = segmentDocsByImage; }, [segmentDocsByImage]);

  // chat scroll refs
  const chatBoxRefs = useRef({}); // { [imageId]: HTMLDivElement }
  const setChatBoxRef = (imageId, el) => { chatBoxRefs.current[imageId] = el; };
  const scrollChatToBottom = (imageId) => {
    const el = chatBoxRefs.current[imageId];
    if (el) {
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 100);
    }
  };

  // Load sessionId from localStorage (CaptureImages sets this)
  useEffect(() => {
    const saved = localStorage.getItem('heatscape_session_id');
    setSessionId(saved || null);
  }, []);

  // Live Firestore subscription for session images + wire sub-collection listeners
  useEffect(() => {
    if (!sessionId) return undefined;

    const imagesCol = collection(db, 'sessions', sessionId, 'images');

    const unsubImages = onSnapshot(
      imagesCol,
      (snap) => {
        const fsItems = [];
        const prevItems = itemsRef.current || [];
        const alive = new Set(); // track images that still exist this tick

        snap.forEach((d) => {
          const data = d.data();
          const imageId = d.id;
          alive.add(imageId);

          // ensure sub-collection listener for this image's segments
          if (!segmentUnsubsRef.current[imageId]) {
            const segCol = collection(db, 'sessions', sessionId, 'images', imageId, 'segments');
            segmentUnsubsRef.current[imageId] = onSnapshot(
              segCol,
              (segSnap) => {
                const locals = [];
                segSnap.forEach((sdoc) => locals.push(mapFsSegmentSubdocToLocal(sdoc.data())));

                // 1) keep cache (optional, still useful)
                setSegmentDocsByImage((prev) => ({ ...prev, [imageId]: locals }));

                // 2) **update the visible item immediately**
                setItems((prev) =>
                  prev.map((it) =>
                    it.id === `fs:${imageId}` ? { ...it, segments: locals } : it
                  )
                );
              },
              (err) => console.error('segments sub-collection listener error:', err)
            );
          }


          // prefer sub-collection data if available; otherwise fallback to array field
          const subSegments = segmentDocsRef.current[imageId];
          const segments =
            Array.isArray(subSegments) && subSegments.length > 0
              ? subSegments
              : (Array.isArray(data?.segments) ? data.segments.map(mapFsSegmentToLocal) : []);

          const base = {
            id: `fs:${imageId}`,
            source: 'fs',
            fsDocId: imageId,
            imageUrl: data?.imageUrl || '',
            imageFile: null,
            imagePreview: null,
            timestamp: data?.timestamp || Date.now(),
            gps: data?.gps || null,
            gyro: data?.gyro || null,
            segments,
            results: data?.detection
              ? {
                  summary: {
                    avg_temperature: data.detection?.avg_temperature,
                    avg_humidity: data.detection?.avg_humidity,
                    heat_retaining_percent: data.detection?.heat_retaining_percent,
                    vegetation_percent: data.detection?.vegetation_percent,
                    final_decision: data.detection?.is_heat_island ? 'Heat Island Detected' : 'No Heat Island Detected'
                  },
                  detailed_results: Array.isArray(data.detection?.detailed_predictions) ? data.detection.detailed_predictions : []
                }
              : null,
            recommendation: data?.recommendation || null,
            warnings: [],
          };

          const prev = prevItems.find((x) => x.id === `fs:${imageId}`);
          fsItems.push({
            ...base,
            loadingPredict: prev?.loadingPredict ?? false,
            loadingRecommend: prev?.loadingRecommend ?? false,
            error: prev?.error ?? null,
            chatOpen: prev?.chatOpen ?? false,
            chatMessages: prev?.chatMessages ?? [],
            chatInput: prev?.chatInput ?? '',
            chatLoading: prev?.chatLoading ?? false,
            chatSuggestions: prev?.chatSuggestions ?? [],
          });
        });

        // clean up segment listeners for images no longer present
        Object.keys(segmentUnsubsRef.current).forEach((imgId) => {
          if (!alive.has(imgId)) {
            try { segmentUnsubsRef.current[imgId]?.(); } catch { /* ignore */ }
            delete segmentUnsubsRef.current[imgId];
            setSegmentDocsByImage((prev) => {
              const { [imgId]: _, ...rest } = prev;
              return rest;
            });
          }
        });

        setItems((prev) => {
          const manual = prev.filter((it) => it.source === 'manual');
          return [...fsItems, ...manual].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      },
      (err) => {
        console.error(err);
        setGlobalError('Failed to load images for this session.');
      }
    );

    // cleanup
    return () => {
      try { unsubImages(); } catch { /* ignore */ }
      Object.values(segmentUnsubsRef.current).forEach((fn) => {
        try {
          if (fn) fn();
        } catch { /* ignore */ }
      });      
      segmentUnsubsRef.current = {};
      setSegmentDocsByImage({});
    };
  }, [sessionId]);

  // ---------- Manual helpers ----------
  const addManualEntry = () => setItems((prev) => [newManualItem(), ...prev]);

  const removeManualEntry = (id) => {
    setItems((prev) => prev.filter((x) => !(x.id === id && x.source === 'manual' && !x.fsDocId)));
  };

  const updateManualFile = (id, file) => {
    if (!file) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, imageFile: null, imagePreview: null } : x)));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setItems((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, imageFile: file, imagePreview: String(reader.result), timestamp: Date.now() }
            : x
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const addSegment = (id) =>
    setItems((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, segments: [...x.segments, { id: uid(), label: '', material: '', temp: '', humidity: '', area: '' }] }
          : x
      )
    );

  const removeSegment = (imageId, segId) =>
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== imageId) return x;
        const segs = x.segments.filter((s) => s.id !== segId);
        return { ...x, segments: segs.length ? segs : [{ id: uid(), label: '', material: '', temp: '', humidity: '', area: '' }] };
      })
    );

  const updateSegmentField = (imageId, segId, field, value) =>
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== imageId) return x;
        const segs = x.segments.map((s) => (s.id === segId ? { ...s, [field]: value } : s));
        return { ...x, segments: segs };
      })
    );

  // ---------- Firestore persistence helpers ----------
  const ensureImageDocForItem = async (item) => {
    if (!sessionId) throw new Error('No active session. Open or create a session first.');
    if (item.source === 'fs' && item.fsDocId) {
      return doc(db, 'sessions', sessionId, 'images', item.fsDocId);
    }
    if (item.source === 'manual') {
      if (!item.imagePreview) throw new Error('Please upload an image for this manual entry.');
      const ext = extFromDataUrl(item.imagePreview);
      const path = `sessions/${sessionId}/manual_${item.id}.${ext}`;
      const url = await uploadDataUrlToStorage(path, item.imagePreview);
      const segmentsFs = segmentsToFs(item.segments);

      const imageDocRef = await addDoc(collection(db, 'sessions', sessionId, 'images'), {
        imageUrl: url,
        timestamp: item.timestamp || Date.now(),
        gps: item.gps || null,
        gyro: item.gyro || null,
        segments: segmentsFs, // keep array version for compatibility
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setItems((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, source: 'fs', fsDocId: imageDocRef.id, imageUrl: url } : x
        )
      );

      return imageDocRef;
    }
    throw new Error('Unable to ensure image document for this item.');
  };

  const persistSegments = async (imageDocRef, item) => {
    // Persist array form (back-compat). If you also want sub-doc writes, add them here.
    await updateDoc(imageDocRef, {
      segments: segmentsToFs(item.segments),
      updatedAt: serverTimestamp(),
    });
  };

  const saveDetectionToDb = async (imageDocRef, apiData) => {
    await updateDoc(imageDocRef, {
      detection: {
        avg_temperature: apiData.avg_temperature,
        avg_humidity: apiData.avg_humidity,
        heat_retaining_percent: apiData.heat_retaining_percent,
        vegetation_percent: apiData.vegetation_percent,
        is_heat_island: !!apiData.is_heat_island,
        detailed_predictions: Array.isArray(apiData.detailed_predictions) ? apiData.detailed_predictions : [],
        model_vote: apiData.model_vote || null,
        model_vote_details: apiData.model_vote_details || null,
      },
      updatedAt: serverTimestamp(),
    });
  };

  const saveRecommendationToDb = async (imageDocRef, text) => {
    await updateDoc(imageDocRef, {
      recommendation: text,
      updatedAt: serverTimestamp(),
    });
  };

  // ---------- Shared payload builder (fs/manual) ----------
  const buildImagePayload = (item) => {
    const segmentsPayload = toApiSegments(item.segments);

    if (item.source === 'fs') {
      if (!item.imageUrl) throw new Error('Missing image URL for this entry.');
      return { segments: segmentsPayload, image_url: item.imageUrl };
    }

    const dataUrl = item.imagePreview;
    if (!dataUrl) throw new Error('Please upload an image for this entry.');
    const parts = String(dataUrl).split(',', 2);
    const b64 = parts.length > 1 ? parts[1] : '';
    let mime = 'image/jpeg';
    const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    if (match) {
      const [, mimeType] = match;
      mime = mimeType;
    }
    return { segments: segmentsPayload, image_base64: b64, image_mime: mime };
  };

  // ---------- Predict / Recommend ----------
  const getCurrentItem = (id) => itemsRef.current.find((x) => x.id === id);

  const predictOne = async (imageId) => {
    setItems((prev) =>
      prev.map((x) => (x.id === imageId ? { ...x, loadingPredict: true, error: null, warnings: [], recommendation: null } : x))
    );
    try {
      const item = getCurrentItem(imageId);
      if (!item) return;

      if (!Array.isArray(item.segments) || !item.segments.length) {
        throw new Error('No segments found for this image.');
      }
      const bad = item.segments.find(
        (seg) =>
          !seg.material ||
          !isFiniteNum(toNum(seg.temp)) ||
          !isFiniteNum(toNum(seg.humidity)) ||
          !isFiniteNum(toNum(seg.area)) ||
          toNum(seg.humidity) < 0 ||
          toNum(seg.humidity) > 100 ||
          toNum(seg.area) < 0
      );
      if (bad) throw new Error('Segment fields must be valid (Humidity 0–100; Area ≥ 0).');

      const imageDocRef = await ensureImageDocForItem(item);
      await persistSegments(imageDocRef, item);

      const { segments } = buildImagePayload(item);
      const { data } = await axios.post(`${API_BASE}/predict`, { segments });

      await saveDetectionToDb(imageDocRef, data);

      const transformed = {
        summary: {
          avg_temperature: data.avg_temperature,
          avg_humidity: data.avg_humidity,
          heat_retaining_percent: data.heat_retaining_percent,
          vegetation_percent: data.vegetation_percent,
          final_decision: data.is_heat_island ? 'Heat Island Detected' : 'No Heat Island Detected',
        },
        detailed_results: Array.isArray(data.detailed_predictions) ? data.detailed_predictions : [],
      };

      setItems((prev) =>
        prev.map((x) =>
          x.id === imageId ? { ...x, results: transformed, warnings: data.validation_warnings || [], error: null } : x
        )
      );
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Prediction failed';
      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, error: msg, results: null } : x)));
    } finally {
      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, loadingPredict: false } : x)));
    }
  };

  const recommendOne = async (imageId) => {
    const item = getCurrentItem(imageId);
    if (!item) return;

    if (!item.results?.summary || item.results.summary.final_decision !== 'Heat Island Detected') {
      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, error: 'Recommendations available only when Heat Island is detected.' } : x)));
      return;
    }

    if (!Array.isArray(item.segments) || !item.segments.length) {
      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, error: 'No segments found for this image.' } : x)));
      return;
    }
    const bad = item.segments.find(seg =>
      !seg.material ||
      !isFiniteNum(toNum(seg.temp)) ||
      !isFiniteNum(toNum(seg.humidity)) ||
      !isFiniteNum(toNum(seg.area)) ||
      toNum(seg.humidity) < 0 ||
      toNum(seg.humidity) > 100 ||
      toNum(seg.area) < 0
    );
    if (bad) {
      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, error: 'All segment fields must be valid (Material required; Humidity 0–100; Area ≥ 0).' } : x)));
      return;
    }

    setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, loadingRecommend: true, error: null } : x)));

    try {
      const imageDocRef = await ensureImageDocForItem(item);
      await persistSegments(imageDocRef, item);

      const payload = buildImagePayload(item);
      const res = await axios.post(`${API_BASE}/recommend`, payload);
      const text = res.data?.gemini_recommendation ?? (res.data?.message || '(No recommendation text returned)');

      await saveRecommendationToDb(imageDocRef, text);

      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, recommendation: text, error: null } : x)));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Recommendation failed';
      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, error: msg } : x)));
    } finally {
      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, loadingRecommend: false } : x)));
    }
  };

  const predictAll = async () => {
    const ids = items.map((i) => i.id);
    await Promise.all(ids.map((id) => predictOne(id)));
  };

  const recommendAllDetected = async () => {
    const ids = items
      .filter((it) => it.results?.summary?.final_decision === 'Heat Island Detected')
      .map((it) => it.id);
    await Promise.all(ids.map((id) => recommendOne(id)));
  };

  // ---------- Chat helpers ----------
  const sendChatMessage = async (imageId, overrideText = null) => {
    const item = getCurrentItem(imageId);
    if (!item) return;

    const message = overrideText !== null
      ? String(overrideText).trim()
      : String(item.chatInput || '').trim();
    if (!message) return;

    if (!item.recommendation) {
      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, error: 'Open recommendations first, then you can chat.' } : x)));
      return;
    }

    const bad = item.segments.find(seg =>
      !seg.material ||
      !isFiniteNum(toNum(seg.temp)) ||
      !isFiniteNum(toNum(seg.humidity)) ||
      !isFiniteNum(toNum(seg.area)) ||
      toNum(seg.humidity) < 0 ||
      toNum(seg.humidity) > 100 ||
      toNum(seg.area) < 0
    );
    if (bad) {
      setItems((prev) => prev.map((x) => (x.id === imageId ? { ...x, error: 'All segment fields must be valid (Material required; Humidity 0–100; Area ≥ 0).' } : x)));
      return;
    }

    const userMessage = { role: 'user', text: message, timestamp: Date.now() };

    setItems((prev) =>
      prev.map((x) =>
        x.id === imageId
          ? {
              ...x,
              chatOpen: true,
              chatMessages: [...x.chatMessages, userMessage],
              chatInput: '',
              chatLoading: true,
              error: null,
            }
          : x
      )
    );

    scrollChatToBottom(imageId);

    try {
      const imageDocRef = await ensureImageDocForItem(item);
      await persistSegments(imageDocRef, item);

      const updatedItem = getCurrentItem(imageId);
      const payload = {
        ...buildImagePayload(updatedItem),
        message,
        prior_recommendation: updatedItem.recommendation,
        history: updatedItem.chatMessages.slice(0, -1), // exclude the user message we just added
      };

      const res = await axios.post(`${API_BASE}/recommend/chat`, payload);
      const reply = res.data?.reply || res.data?.answer || res.data?.message || '(No reply text returned)';

      const assistantMessage = { role: 'assistant', text: reply, timestamp: Date.now() };

      setItems((prev) =>
        prev.map((x) =>
          x.id === imageId
            ? {
                ...x,
                chatMessages: [...x.chatMessages, assistantMessage],
                chatLoading: false,
              }
            : x
        )
      );

      scrollChatToBottom(imageId);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Chat failed';
      const errorMessage = { role: 'assistant', text: `Error: ${msg}`, timestamp: Date.now() };

      setItems((prev) =>
        prev.map((x) =>
          x.id === imageId
            ? {
                ...x,
                chatMessages: [...x.chatMessages, errorMessage],
                chatLoading: false,
              }
            : x
        )
      );

      scrollChatToBottom(imageId);
    }
  };

  const toggleChat = (imageId) => {
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== imageId) return x;
        const opening = !x.chatOpen;
        return {
          ...x,
          chatOpen: opening,
          chatSuggestions: opening ? buildChatSuggestions(x) : x.chatSuggestions,
        };
      })
    );

    setTimeout(() => {
      const item = itemsRef.current.find((x) => x.id === imageId);
      if (item?.chatOpen) {
        scrollChatToBottom(imageId);
      }
    }, 200);
  };

  const refreshChatSuggestions = (imageId) => {
    setItems((prev) =>
      prev.map((x) => (x.id === imageId ? { ...x, chatSuggestions: buildChatSuggestions(x) } : x))
    );
  };

  const updateChatInput = (imageId, value) => {
    setItems((prev) =>
      prev.map((x) => (x.id === imageId ? { ...x, chatInput: value } : x))
    );
  };

  const pickSuggestion = (imageId, text) => {
    setItems((prev) =>
      prev.map((x) => (x.id === imageId ? { ...x, chatOpen: true } : x))
    );
    setTimeout(() => {
      sendChatMessage(imageId, text);
    }, 50);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Hide Session ID; only warn when no session
  const headerSession = useMemo(
    () =>
      !sessionId ? (
        <Alert variant="warning">
          No active session found. Create one in CaptureImages first, or add manual entries below.
        </Alert>
      ) : null,
    [sessionId]
  );

  return (
    <Container className="mt-4" style={{ maxWidth: '98%' }}>
      <h1 className="text-center mb-4" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
        <span role="img" aria-label="fire">🔥</span> Urban Heat Island Detector <span role="img" aria-label="fire">🔥</span>
      </h1>

      {headerSession}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button variant="outline-secondary" onClick={addManualEntry}>+ Add Manual Entry</Button>
        <Button variant="success" onClick={predictAll} disabled={!items.length}>
          Run Detection for All
        </Button>
        <Button variant="primary" onClick={recommendAllDetected} disabled={!items.length}>
          Get Recommendations for Detected
        </Button>
      </div>

      {!items.length && (
        <Alert variant="info">No images yet. Add a manual entry or wait for images to sync from the active session.</Alert>
      )}

      {items.map((item) => (
        <Card className="mb-4" key={item.id}>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>
              <strong>{item.source === 'manual' ? 'Manual Image' : 'Session Image'}</strong>{' '}
              {item.results?.summary?.final_decision === 'Heat Island Detected' && <Badge bg="danger" className="ms-2">Detected</Badge>}
              {item.results?.summary?.final_decision === 'No Heat Island Detected' && <Badge bg="success" className="ms-2">Not Detected</Badge>}
            </div>
            <div className="d-flex gap-2">
              {item.source === 'manual' && !item.fsDocId && (
                <Button size="sm" variant="outline-danger" onClick={() => removeManualEntry(item.id)} title="Discard this manual entry">
                  Remove Entry
                </Button>
              )}
              <Button size="sm" variant="outline-success" onClick={() => predictOne(item.id)} disabled={item.loadingPredict}>
                {item.loadingPredict ? 'Analyzing...' : 'Detect'}
              </Button>
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => recommendOne(item.id)}
                disabled={
                  item.loadingRecommend ||
                  item.results?.summary?.final_decision !== 'Heat Island Detected' ||
                  !Array.isArray(item.segments) ||
                  !item.segments.length ||
                  item.segments.some(seg =>
                    !seg.material ||
                    !isFiniteNum(toNum(seg.temp)) ||
                    !isFiniteNum(toNum(seg.humidity)) ||
                    !isFiniteNum(toNum(seg.area)) ||
                    toNum(seg.humidity) < 0 ||
                    toNum(seg.humidity) > 100 ||
                    toNum(seg.area) < 0
                  )
                }
                title={
                  item.results?.summary?.final_decision !== 'Heat Island Detected'
                    ? 'Run Detect first; must be Detected'
                    : (!Array.isArray(item.segments) || !item.segments.length
                        ? 'Add at least one valid segment'
                        : '')
                }
              >
                {item.loadingRecommend ? 'Recommending...' : 'Recommend'}
              </Button>
            </div>
          </Card.Header>

          <Card.Body>
            {/* Image */}
            {item.source === 'manual' ? (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Upload Image (JPG/PNG/WebP)</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => updateManualFile(item.id, e.target.files?.[0] || null)}
                  />
                </Form.Group>
                {item.imagePreview && (
                  <div className="mb-3">
                    <img src={item.imagePreview} alt="manual" style={{ maxWidth: '360px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </div>
                )}
              </>
            ) : (
              <>
                {item.imageUrl ? (
                  <div className="mb-3">
                    <img src={item.imageUrl} alt="session" style={{ maxWidth: '360px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </div>
                ) : (
                  <Alert variant="secondary">No imageUrl on this session image.</Alert>
                )}
              </>
            )}

            {/* Segments */}
            <Table striped bordered hover responsive className="mb-3">
              <thead>
                <tr>
                  <th>Mask</th>
                  <th>Location (label)</th>
                  <th>Material</th>
                  <th>Temp (°C)</th>
                  <th>Humidity (%)</th>
                  <th>Area (sq.cm)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {item.segments.length ? (
                  item.segments.map((seg) => (
                    <tr key={seg.id}>
                      <td style={{ width: 68 }}>
                        {seg.segmentImageUrl ? (
                          <img
                            src={seg.segmentImageUrl}
                            alt="segment"
                            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }}
                          />
                        ) : null}
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <Form.Control type="text" value={seg.label} placeholder="building / road / sidewalk"
                          onChange={(e) => updateSegmentField(item.id, seg.id, 'label', e.target.value)} />
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <Form.Select value={seg.material} onChange={(e) => updateSegmentField(item.id, seg.id, 'material', e.target.value)}>
                          <option value="">Select Material</option>
                          {materialOptions.map((m) => (<option key={m} value={m}>{m}</option>))}
                        </Form.Select>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <Form.Control type="number" value={seg.temp} onChange={(e) => updateSegmentField(item.id, seg.id, 'temp', e.target.value)} />
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <Form.Control type="number" value={seg.humidity} onChange={(e) => updateSegmentField(item.id, seg.id, 'humidity', e.target.value)} />
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <Form.Control type="number" value={seg.area} onChange={(e) => updateSegmentField(item.id, seg.id, 'area', e.target.value)} />
                      </td>
                      <td>
                        <Button variant="outline-danger" size="sm" onClick={() => removeSegment(item.id, seg.id)}>Remove</Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="text-center">No segments.</td></tr>
                )}
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
                <ul className="mb-0">{item.warnings.map((w) => <li key={`${item.id}-${w}`}>{w}</li>)}</ul>
              </Alert>
            )}

            {item.results?.summary && (
              <Row className="mt-3">
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>Per-Segment Results</Card.Header>
                    <Card.Body>
                      {Array.isArray(item.results.detailed_results) && item.results.detailed_results.map((det) => {
                          const flag = det.heat_island === 'Yes';
                          const key = `${item.id}-det-${det.location || det.material || det.label || Math.random()}`;
                          return (
                            <div key={key}
                               className={`mb-2 ${flag ? 'text-danger' : 'text-success'}`}>
                            <strong>{det.location || '(segment)'}</strong>
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

            {/* Enhanced Recommendations + Chat */}
            {item.recommendation && !item.loadingRecommend && (
              <Card className="mt-2" style={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                <Card.Header 
                  className="d-flex justify-content-between align-items-center"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderBottom: 'none'
                  }}
                >
                  <div className="d-flex align-items-center">
                    <span role="img" aria-label="recommendations" className="me-2">💡</span>
                    <strong>Mitigation Recommendations</strong>
                  </div>
                  <Button 
                    variant={item.chatOpen ? "light" : "outline-light"} 
                    size="sm" 
                    onClick={() => toggleChat(item.id)} 
                    className="d-flex align-items-center"
                    style={{ fontWeight: '500' }}
                  >
                    <span role="img" aria-label="chat" className="me-1">💬</span>
                    {item.chatOpen ? 'Hide Chat' : 'Ask Questions'}
                  </Button>
                </Card.Header>
                <Card.Body style={{ background: '#f8fafc' }}>
                  <div 
                    className="p-3 rounded mb-3"
                    style={{ 
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      margin: 0,
                      color: '#2d3748'
                    }}>
                      {item.recommendation}
                    </pre>
                  </div>

                  {item.chatOpen && (
                    <div className="mt-3">
                      {/* Suggested questions */}
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-2">
                          <span className="me-2 text-muted small fw-bold">💡 Quick Questions:</span>
                          <Button 
                            size="sm" 
                            variant="outline-secondary" 
                            onClick={() => refreshChatSuggestions(item.id)} 
                            title="Refresh suggestions"
                            style={{ fontSize: '12px', padding: '2px 8px' }}
                          >
                            🔄 More
                          </Button>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {item.chatSuggestions.map((q, i) => (
                            <Button
                              key={`${item.id}-sugg-${i}`}
                              size="sm"
                              variant="outline-primary"
                              className="text-start"
                              onClick={() => pickSuggestion(item.id, q)}
                              disabled={item.chatLoading}
                              style={{
                                fontSize: '12px',
                                borderRadius: '20px',
                                padding: '4px 12px',
                                maxWidth: '300px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={q}
                            >
                              {q}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Chat transcript */}
                      <Card style={{ border: '2px solid #e2e8f0' }}>
                        <Card.Header 
                          className="py-2"
                          style={{ 
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          <span role="img" aria-label="chat" className="me-2">💬</span>
                          Chat Assistant
                          {item.chatMessages.length > 0 && (
                            <Badge bg="light" text="dark" className="ms-2">
                              {item.chatMessages.length} messages
                            </Badge>
                          )}
                        </Card.Header>

                        <div
                          ref={(el) => setChatBoxRef(item.id, el)}
                          className="p-3"
                          style={{ 
                            maxHeight: '400px', 
                            overflowY: 'auto', 
                            background: 'linear-gradient(to bottom, #f1f5f9, #ffffff)',
                            minHeight: '200px'
                          }}
                        >
                          {item.chatMessages.length === 0 && !item.chatLoading && (
                            <div className="text-center text-muted py-4">
                              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                              <div className="fw-bold mb-2">Ready to help!</div>
                              <div className="small">Select a suggested question above or type your own question below.</div>
                            </div>
                          )}

                          {item.chatMessages.map((m, idx) => {
                            const isUser = m.role === 'user';
                            return (
                              <div key={`${item.id}-chat-${m.timestamp ?? idx}`} className="d-flex w-100 mb-3 align-items-start">
                                {!isUser && <div className="me-2" style={{ fontSize: 16 }}>🤖</div>}
                                <div className={isUser ? 'ms-auto' : ''} style={{ maxWidth: '80%' }}>
                                  <div
                                    className="p-3 rounded-3 position-relative"
                                    style={{
                                      background: isUser
                                        ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                                        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                                      color: isUser ? 'white' : '#1a202c',
                                      border: isUser ? 'none' : '1px solid #cbd5e1',
                                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                      fontSize: '14px',
                                      lineHeight: '1.5'
                                    }}
                                  >
                                    <div className="d-flex align-items-center mb-2">
                                      <div className="fw-bold small" style={{ color: isUser ? 'rgba(255,255,255,0.9)' : '#4a5568', fontSize: '12px' }}>
                                        {isUser ? 'You' : 'Assistant'}
                                      </div>
                                      {m.timestamp && (
                                        <div className="ms-auto small" style={{ color: isUser ? 'rgba(255,255,255,0.7)' : '#718096', fontSize: '11px' }}>
                                          {formatTime(m.timestamp)}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                                  </div>
                                </div>
                                {isUser && <div className="ms-2" style={{ fontSize: 16 }}>👤</div>}
                              </div>
                            );
                          })}

                          {item.chatLoading && (
                            <div className="d-flex justify-content-start mb-3">
                              <div 
                                className="p-3 rounded-3"
                                style={{ 
                                  maxWidth: '80%', 
                                  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
                                  border: '1px solid #cbd5e1',
                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                }}
                              >
                                <div className="d-flex align-items-center mb-2">
                                  <span className="me-2" style={{ fontSize: '16px' }}>🤖</span>
                                  <div className="fw-bold small" style={{ color: '#4a5568', fontSize: '12px' }}>
                                    Assistant
                                  </div>
                                </div>
                                <div className="d-flex align-items-center">
                                  <div className="spinner-border spinner-border-sm me-2" role="status" style={{ width: '16px', height: '16px' }}>
                                    <span className="visually-hidden">Loading...</span>
                                  </div>
                                  <div className="text-muted small">Thinking...</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <Card.Footer style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                          <div className="d-flex gap-2 align-items-end">
                            <div className="flex-grow-1">
                              <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Ask a follow-up question about the recommendations..."
                                value={item.chatInput}
                                onChange={(e) => updateChatInput(item.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendChatMessage(item.id);
                                  }
                                }}
                                disabled={item.chatLoading}
                                style={{ 
                                  resize: 'none',
                                  border: '2px solid #e2e8f0',
                                  borderRadius: '12px',
                                  fontSize: '14px'
                                }}
                              />
                              <div className="small text-muted mt-1">
                                Press Enter to send, Shift+Enter for new line
                              </div>
                            </div>
                            <Button 
                              variant="primary" 
                              onClick={() => sendChatMessage(item.id)} 
                              disabled={item.chatLoading || !String(item.chatInput || '').trim()}
                              style={{ 
                                borderRadius: '12px',
                                padding: '8px 16px',
                                fontWeight: '600',
                                minWidth: '80px'
                              }}
                            >
                              {item.chatLoading ? (
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              ) : (
                                <>
                                  <span role="img" aria-label="send" className="me-1">📤</span>
                                  Send
                                </>
                              )}
                            </Button>
                          </div>
                        </Card.Footer>
                      </Card>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {item.error && (
              <Alert variant="danger" className="mt-3">
                <div className="d-flex align-items-center">
                  <span role="img" aria-label="error" className="me-2">⚠️</span>
                  <strong>Error:</strong>
                </div>
                <div className="mt-1">{item.error}</div>
              </Alert>
            )}
          </Card.Body>
        </Card>
      ))}

      {globalError && (
        <Alert variant="danger" className="mt-3">
          <div className="d-flex align-items-center">
            <span role="img" aria-label="error" className="me-2">⚠️</span>
            <strong>System Error:</strong>
          </div>
          <div className="mt-1">{globalError}</div>
        </Alert>
      )}
    </Container>
  );
};

export default HeatIslandDetector;
