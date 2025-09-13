import { useEffect, useState, useCallback, useRef } from 'react';
import { Row, Col, Button, message, Card, Typography, Space, Statistic, Input, Upload, Image, List, Divider } from 'antd';
import { 
    RobotOutlined, 
    EnvironmentOutlined, 
    AimOutlined, 
    PlayCircleOutlined, 
    StopOutlined,
    CompassOutlined,
    DashboardOutlined,
    WifiOutlined,
    UploadOutlined,
    PictureOutlined,
    CameraOutlined,
    DeleteOutlined,
    FireOutlined,
} from '@ant-design/icons';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

const { Title, Text } = Typography;

// Utility function to convert Firestore timestamp to JavaScript timestamp
const getTimestampValue = (timestamp) => {
  if (!timestamp) return 0;
  
  // If it's already a number (JavaScript timestamp), return it
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  // If it's a Firestore timestamp object
  if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
    // Convert Firestore timestamp to JavaScript timestamp (milliseconds)
    return timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000);
  }
  
  return 0;
};

const AutonomousNavigation = ({ 
    selectedImage,
    setSelectedImage,
    socketReady, 
    isReconnecting,
    logMessages, 
    setLogMessages,
    gpsData, 
    gyroData, // Add gyroData prop
    sendCommand, 
    scrollViewRef,
    autonomousMode,
    targetCoords,
    navigationData,
    setTargetCoords,
    setAutonomousMode,
    setIsNavigating,
    switchButton,
    temperature,
    setTemperature,
    isCollecting,
    setIsCollecting,
    manualReconnect,
    camIP, // Add camIP prop for live feed
    // GPS Simulation props
    useGpsSimulation,
    // simulatedGpsData,
    // startGpsSimulation,
    // stopGpsSimulation,
    // resetGpsPosition
}) => {
    // State for image management
    const [uploadedImages, setUploadedImages] = useState([]);
    const [backendImages, setBackendImages] = useState([]);
    const [temperatureRecords, setTemperatureRecords] = useState([]);

    // Auto camera alignment state
    const [isAutoAligning, setIsAutoAligning] = useState(false);
    const [targetFound, setTargetFound] = useState(false);
    const [matchQuality, setMatchQuality] = useState(0);
    const [numMatches, setNumMatches] = useState(0);
    const searchPattern = useRef({ step: 0, direction: 1 });
    const frameCheckInterval = useRef(null);
    const centeringAttempts = useRef(0);
    const isAutoAligningRef = useRef(false);
    const [alignmentStatus, setAlignmentStatus] = useState('idle'); // 'idle', 'searching', 'centering', 'confirmed'
    // eslint-disable-next-line no-unused-vars
    const [camAngle, setCamAngle] = useState({V_TURN_CAM: 90, H_TURN_CAM: 90});

    const [frameImg, setFrameImg] = useState(null);

    // Function to fetch segmented images from backend
    const fetchImages = async () => {
        try {
            // Get the current session ID from localStorage (same as CaptureImages)
            const sessionId = localStorage.getItem("heatscape_session_id");
            
            if (!sessionId) {
                console.warn('No active session found');
                setBackendImages([]);
                return;
            }
            
            // Fetch images from the session's images subcollection
            const imagesCollection = collection(db, "sessions", sessionId, "images");
            const snapshot = await getDocs(imagesCollection);
            
            const segmentedImages = [];
            
            // Process each image document and fetch its segments
            const imagePromises = snapshot.docs.map(async (doc) => {
                const imageData = doc.data();
                const parentGps = imageData.gps;
                const parentGyro = imageData.gyro;
                const parentTimestamp = imageData.timestamp;
                
                try {
                    // Fetch segments subcollection for this image
                    const segmentsRef = collection(db, "sessions", sessionId, "images", doc.id, "segments");
                    const segmentsSnapshot = await getDocs(segmentsRef);
                    
                    // If the image has segments in subcollection, extract them
                    if (!segmentsSnapshot.empty) {
                        segmentsSnapshot.forEach((segDoc) => {
                            const segment = segDoc.data();
                            console.log(segment);
                            
                            segmentedImages.push({
                                uid: `${doc.id}_segment_${segDoc.id}`, // Unique ID for each segment
                                id: `${doc.id}_segment_${segDoc.id}`,
                                parentImageId: doc.id,
                                segmentId: segDoc.id,
                                
                                // Segment specific data
                                imageUrl: segment.segmentImageUrl,
                                surfaceArea: segment.surfaceArea,
                                material: segment.material,
                                temperature: segment.temperature,
                                humidity: segment.humidity,
                                
                                // Inherited from parent image
                                gps: parentGps,
                                gyro: parentGyro,
                                timestamp: parentTimestamp,
                                
                                // For compatibility with existing code
                                coordinates: parentGps || null,
                                alt: `${segment.material || 'Unknown material'} - ${segment.surfaceArea || 'N/A'} m²`,
                                src: segment.segmentImageUrl,
                                url: segment.segmentImageUrl
                            });
                        });
                    } else if (imageData.segments && Array.isArray(imageData.segments)) {
                        // Fallback: If segments are stored as array in the main document
                        imageData.segments.forEach((segment, index) => {
                            segmentedImages.push({
                                uid: `${doc.id}_segment_${index}`, // Unique ID for each segment
                                id: `${doc.id}_segment_${index}`,
                                parentImageId: doc.id,
                                segmentIndex: index,
                                
                                // Segment specific data
                                imageUrl: segment.segmentImageUrl,
                                surfaceArea: segment.surfaceArea,
                                material: segment.material,
                                temperature: segment.temperature,
                                humidity: segment.humidity,
                                
                                // Inherited from parent image
                                gps: parentGps,
                                gyro: parentGyro,
                                timestamp: parentTimestamp,
                                
                                // For compatibility with existing code
                                coordinates: parentGps || null,
                                alt: `Segment ${index + 1} - ${segment.material || 'Unknown material'}`,
                                src: segment.segmentImageUrl,
                                url: segment.segmentImageUrl
                            });
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching segments for image ${doc.id}:`, error);
                    // If segments fetch fails, check if segments are in the main document
                    if (imageData.segments && Array.isArray(imageData.segments)) {
                        imageData.segments.forEach((segment, index) => {
                            segmentedImages.push({
                                uid: `${doc.id}_segment_${index}`,
                                id: `${doc.id}_segment_${index}`,
                                parentImageId: doc.id,
                                segmentIndex: index,
                                imageUrl: segment.segmentImageUrl,
                                surfaceArea: segment.surfaceArea,
                                material: segment.material,
                                temperature: segment.temperature,
                                humidity: segment.humidity,
                                gps: parentGps,
                                gyro: parentGyro,
                                timestamp: parentTimestamp,
                                coordinates: parentGps || null,
                                alt: `Segment ${index + 1} - ${segment.material || 'Unknown material'}`,
                                src: segment.segmentImageUrl,
                                url: segment.segmentImageUrl
                            });
                        });
                    }
                }
            });
            
            await Promise.all(imagePromises);
            
            // Sort by timestamp (newest first) - handle both Firestore and JS timestamps
            segmentedImages.sort((a, b) => getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp));
            
            setBackendImages(segmentedImages);
            console.log(`Fetched ${segmentedImages.length} segmented images from session ${sessionId}`, segmentedImages);
            
        } catch (error) {
            console.error('Failed to fetch backend images:', error);
            setBackendImages([]);
        }
    };

    // Handle image upload
    const handleImageUpload = ({ file, onSuccess, onError }) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const newImage = {
                uid: file.uid,
                name: file.name,
                url: e.target.result,
                file, // Store the actual file object for backend upload
                coordinates: null, // Will be set when user clicks on image
                timestamp: new Date().toISOString()
            };
            setUploadedImages(prev => [...prev, newImage]);
            setSelectedImage(newImage); // Set as current processing image
            onSuccess();
            message.success(`${file.name} uploaded successfully`);
        };
        reader.onerror = () => {
            onError();
            message.error(`Failed to upload ${file.name}`);
        };
        reader.readAsDataURL(file);
    };

    // Handle image selection and coordinate setting
    const handleImageSelect = (image) => {
        setSelectedImage(image);
        if (image.coordinates) {
            setTargetCoords({
                lat: image.coordinates.lat,
                lng: image.coordinates.lng
            });
            message.success('Target coordinates set from image');
        }
    };

    // Handle image deletion
    const handleImageDelete = (imageUid) => {
        const allImages = [...backendImages, ...uploadedImages];
        // const imageToDelete = allImages.find(img => img.uid === imageUid);
        
        // Remove from uploaded images
        setUploadedImages(prev => prev.filter(img => img.uid !== imageUid));
        
        // If deleted image was the current processing image, set next available image
        if (selectedImage?.uid === imageUid) {
            const remainingImages = allImages.filter(img => img.uid !== imageUid);
            setSelectedImage(remainingImages.length > 0 ? remainingImages[0] : null);
        }
        
        message.success('Image deleted');
    };

    // Handle coordinate setting for image
    const handleSetImageCoordinates = (imageUid, coordinates) => {
        const parsedLat = parseFloat(coordinates.lat);
        const parsedLng = parseFloat(coordinates.lng);

        if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
            message.error('Please enter valid numbers for latitude and longitude.');
            return;
        }
        
        setUploadedImages(prev => prev.map(img => 
            img.uid === imageUid ? { ...img, coordinates: {lat: parsedLat, lng: parsedLng} } : img
        ));
        
        // Update backend images (if needed)
        setBackendImages(prev => prev.map(img => 
            img.uid === imageUid ? { ...img, coordinates: {lat: parsedLat, lng: parsedLng} } : img
        ));
        
        // Update current processing image if it's the same image
        if (selectedImage?.uid === imageUid) {
            setSelectedImage(prev => ({ ...prev, coordinates: {lat: parsedLat, lng: parsedLng} }));
        }
        
        message.success('Coordinates set for image');
    };

    // Function to send reference image to backend
    const sendReferenceImage = async (imageObject) => {
        if (!imageObject) {
            message.error('No image selected to send as reference');
            return;
        }

        try {
            const formData = new FormData();
            
            // Check if we have the actual file object (for uploaded images)
            if (imageObject.file) {
                formData.append('image', imageObject.file);
            } else {
                // For backend images or images without file object, convert data URL to blob
                console.log(imageObject);
                
                try {
                    let blob;
                    if (imageObject.url.startsWith('data:')) {
                        // Convert data URL to blob
                        const response = await fetch(imageObject.url);
                        blob = await response.blob();
                    } else {
                        // Fetch from URL
                        const response = await fetch(imageObject.url);
                        if (!response.ok) {
                            throw new Error(`Failed to fetch image: ${response.statusText}`);
                        }
                        blob = await response.blob();
                    }
                    formData.append('image', blob, imageObject.name || 'reference_image.jpg');
                } catch (fetchError) {
                    console.error('Error processing image:', fetchError);
                    message.error('Failed to process image for upload');
                    return;
                }
            }

            const iotBaseUrl = process.env.REACT_APP_IOT_BASE_URL || 'localhost:5000';
            const response = await fetch(`http://${iotBaseUrl}/api/set_reference`, {
                method: 'POST',
                body: formData,
            });

            const responseData = await response.json();
            if (responseData.status !== 'error') {
                message.success('Reference target sent successfully! Navigating...');
                if (imageObject.coordinates) {
                    sendCommand(`SET_TARGET:${imageObject.coordinates.lat},${imageObject.coordinates.lng}`);
                }
                console.log('Backend response:', responseData);
            } else {
                message.error(`Failed to send reference target: ${responseData.message}`);
            }
        } catch (error) {
            console.error('Error sending reference image:', error);
            message.error(`Error sending reference image: ${error.message}`);
        }
    };

    // Function to start video stream
    const startVideoStream = async () => {
        if (!camIP) {
            message.error('Camera IP not available');
            return;
        }
        setAutonomousMode(true);

        try {
            const iotBaseUrl = process.env.REACT_APP_IOT_BASE_URL || 'localhost:5000';
            const response = await fetch(`http://${iotBaseUrl}/api/start_stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    stream_source: `http://${camIP}:81/stream`
                })
            });

            const responseData = await response.json();
            if (responseData.status !== 'error') {
                message.success('Video stream started successfully');
                console.log('Stream start response:', responseData);
                
                // Set autonomous mode and navigation state
                setIsNavigating(true);
                // setIsStreamLoading(true);

            } else {
                message.error(`Failed to start video stream: ${responseData.message}`);
            }
        } catch (error) {
            console.error('Error starting video stream:', error);
            message.error(`Error starting video stream: ${error.message}`);
            setAutonomousMode(false);
        }
    };

    // Function to stop video stream
    const stopVideoStream = async () => {
        try {
            const iotBaseUrl = process.env.REACT_APP_IOT_BASE_URL || 'localhost:5000';
            const response = await fetch(`http://${iotBaseUrl}/api/stop_stream`, {
                method: 'POST'
            });

            const responseData = await response.json();
            if (responseData.status !== 'error') {
                message.success('Video stream stopped successfully');
                console.log('Stream stop response:', responseData);
                setAutonomousMode(false);
                setIsNavigating(false);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error stopping video stream:', error);
            message.error(`Error stopping video stream: ${error.message}`);
            return false;
        }
    };

    // Auto camera alignment functions
    const checkFrameMatches = useCallback(async () => {
        try {
            const iotBaseUrl = process.env.REACT_APP_IOT_BASE_URL || 'localhost:5000';
            const response = await fetch(`http://${iotBaseUrl}/api/next_frame`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success' && data.matches) {
                const { matches, num_matches: numMatchesLocal, visualization_base64: base64Img } = data;
                const { keypoints_query: keypointsQuery, confidence } = matches;
                
                // Calculate average confidence score
                const avgConfidence = confidence && confidence.length > 0 
                    ? confidence.reduce((sum, conf) => sum + conf, 0) / confidence.length 
                    : 0;
                
                setMatchQuality(avgConfidence);
                setNumMatches(numMatchesLocal || 0);
                setFrameImg(base64Img)
                
                // Calculate if target is centered (image center assumed to be 320, 240 for 640x480)
                const imageCenterX = 320;
                const imageCenterY = 240;
                const centerThreshold = 50; // pixels
                
                
                if (numMatchesLocal > 10 && avgConfidence > 0.4) { // Good matches found
                    console.log(avgConfidence, numMatchesLocal);
                    
                    setTargetFound(true);
                    
                    // Calculate average position of matched keypoints in query image
                    if (keypointsQuery && confidence) {
                        const goodMatches = keypointsQuery
                            .map((kp, i) => ({ x: kp[0], y: kp[1], conf: confidence[i] }))
                            .filter(m => m.conf >= 0.7);

                        if (goodMatches.length >= 20) {
                            const totalConf = goodMatches.reduce((s, m) => s + m.conf, 0);
                            const avgX = goodMatches.reduce((s, m) => s + m.x * m.conf, 0) / totalConf;
                            const avgY = goodMatches.reduce((s, m) => s + m.y * m.conf, 0) / totalConf;

                            const offsetX = avgX - imageCenterX;
                            const offsetY = avgY - imageCenterY;
                            const distanceFromCenter = Math.sqrt(offsetX ** 2 + offsetY ** 2);

                            return {
                                found: true,
                                centered: distanceFromCenter < centerThreshold,
                                offsetX, offsetY,
                                confidence: avgConfidence,
                                matches: numMatchesLocal
                            };
                        }
                    }
                    // Matches found but no keypoint data
                    return {
                        found: true,
                        centered: false, // Can't determine position without keypoints
                        offsetX: 0,
                        offsetY: 0,
                        confidence: avgConfidence,
                        matches: numMatchesLocal
                    };                    
                }
                setTargetFound(false);
                return { found: false, centered: false, confidence: avgConfidence, matches: numMatchesLocal || 0 };                
            }
            setTargetFound(false);
            return { found: false, centered: false, confidence: 0, matches: 0 };            
        } catch (error) {
            console.error(`Error checking frame matches: ${error.message}`);
            return { found: false, centered: false, confidence: 0, matches: 0 };
        }
    }, []);

    const moveCameraToCenter = useCallback((offsetX, offsetY) => {
        const moveThreshold = 20; // Minimum offset to trigger movement
        const moveStep = 5; // Degrees per movement step
        
        if (Math.abs(offsetX) > moveThreshold) {
            setCamAngle(prev => {
                const newHAngle = offsetX > 0 
                    ? Math.max(0, prev.H_TURN_CAM - moveStep)   // Move left if target is right of center
                    : Math.min(180, prev.H_TURN_CAM + moveStep); // Move right if target is left of center
                sendCommand(`H_TURN_CAM:${newHAngle}`);
                return { ...prev, H_TURN_CAM: newHAngle };
            });
        }
        
        if (Math.abs(offsetY) > moveThreshold) {
            setCamAngle(prev => {
                const newVAngle = offsetY > 0 
                    ? Math.min(180, prev.V_TURN_CAM + moveStep)  // Move down if target is below center
                    : Math.max(0, prev.V_TURN_CAM - moveStep);   // Move up if target is above center
                sendCommand(`V_TURN_CAM:${newVAngle}`);
                return { ...prev, V_TURN_CAM: newVAngle };
            });
        }
    }, [sendCommand]);

    const performSearchPattern = useCallback(() => {
        const { step, direction } = searchPattern.current;
        const maxSteps = 8; // Complete search pattern
        const searchStep = 15; // Degrees per search step
        
        if (step >= maxSteps) {
            // Reset search pattern and try different approach
            if(direction < 0) return false; // Indicate search pattern completed
            searchPattern.current = ({ step: 0, direction: -direction });
            console.log('🔍 Completed search pattern, trying different direction...');
            return true; 
        }
        
        // Horizontal sweep pattern
        setCamAngle(prev => {
            const newHAngle = Math.max(0, Math.min(180, 
                90 + (direction * searchStep * Math.floor((step + 1) / 2))
            ));
            sendCommand(`H_TURN_CAM:${newHAngle}`);
            searchPattern.current = {
                ...searchPattern.current,
                step: step + 1,
            };
            return { ...prev, H_TURN_CAM: newHAngle };
        });
        
        return true; // Continue searching
    }, [sendCommand]);

    const startAutoAlignment = useCallback(async () => {
        if (isAutoAligning) return;
        
        setIsAutoAligning(true);
        isAutoAligningRef.current = true;
        setAlignmentStatus('searching');
        setTargetFound(false);
        setMatchQuality(0);
        setNumMatches(0);
        searchPattern.current = ({ step: 0, direction: 1 });
        centeringAttempts.current = 0;
        
        message.info('🎯 Starting automatic camera alignment...');
        
        // First check if target is already in view
        const initialCheck = await checkFrameMatches();
        
        if (initialCheck.found) {
            if (initialCheck.centered) {
                setAlignmentStatus('confirmed');
                setIsAutoAligning(false);
                isAutoAligningRef.current = false;
                message.success('✅ Target already centered!');
                return;
            } 
            setAlignmentStatus('centering');
            message.info('🎯 Target found, centering...');            
        }
        
        // Start the alignment process with recursive checking
        const performAlignmentCheck = async () => {
            if (!isAutoAligningRef.current) return;
            console.log('🔄 Checking frame for target...');
            
            try {
                const result = await checkFrameMatches();
                
                if (result.found) {
                    if (alignmentStatus === 'searching') {
                        setAlignmentStatus('centering');
                        message.info(`🎯 Target found! Matches: ${result.matches}, Confidence: ${(result.confidence * 100).toFixed(1)}%`);
                    }
                    
                    if (result.centered) {
                        centeringAttempts.current += 1;
                        if (centeringAttempts.current >= 3) { // Confirm centering over multiple frames
                            setAlignmentStatus('confirmed');
                            setIsAutoAligning(false);
                            isAutoAligningRef.current = false;
                            message.success('✅ Target successfully centered and confirmed!');
                            return;
                        } 
                        console.log(`🎯 Target centered (${centeringAttempts.current}/3 confirmations)`);
                    } else {
                        centeringAttempts.current = 0; // Reset confirmation counter
                        moveCameraToCenter(result.offsetX, result.offsetY);
                        console.log(`🔧 Adjusting camera: offset(${result.offsetX.toFixed(1)}, ${result.offsetY.toFixed(1)}) | Matches: ${result.matches}`);
                    }
                } else {
                    if (alignmentStatus === 'centering') {
                        // Lost target while centering, go back to searching
                        setAlignmentStatus('searching');
                        console.log('🔍 Target lost, resuming search...');
                    }
                    
                    // Continue search pattern
                    const continueSearch = performSearchPattern();
                    if (!continueSearch) {
                        // Search pattern completed without finding target
                        setIsAutoAligning(false);
                        isAutoAligningRef.current = false;
                        setAlignmentStatus('idle');
                        message.error('❌ Auto-alignment failed: Target not found after complete search');
                        
                        // Return camera to center position
                        sendCommand('V_TURN_CAM:90');
                        sendCommand('H_TURN_CAM:90');
                        setCamAngle({ V_TURN_CAM: 90, H_TURN_CAM: 90 });
                        return;
                    } 
                    console.log(`🔍 Searching... Matches: ${result.matches || 0}, Confidence: ${(result.confidence * 100).toFixed(1)}%`);
                }
            } catch (error) {
                console.error('Error during alignment check:', error);
            }
            
            // Schedule next check after current one completes (with a small delay)
            if (isAutoAligningRef.current) {
                frameCheckInterval.current = setTimeout(performAlignmentCheck, 1000);
            }
        };
        
        // Start the first check
        performAlignmentCheck();
        
    }, [isAutoAligning, alignmentStatus, checkFrameMatches, moveCameraToCenter, performSearchPattern, sendCommand]);

    const stopAutoAlignment = useCallback(() => {
        if (frameCheckInterval.current) {
            clearTimeout(frameCheckInterval.current); // Now using clearTimeout instead of clearInterval
            frameCheckInterval.current = null;
        }
        
        setIsAutoAligning(false);
        isAutoAligningRef.current = false;
        setAlignmentStatus('idle');
        setTargetFound(false);
        setMatchQuality(0);
        setNumMatches(0);
        centeringAttempts.current = 0;
        
        message.info('🛑 Auto-alignment stopped');
    }, []);


    // Add CSS animation for pulse effect
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Fetch backend images on component mount
    useEffect(() => {
        fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Set initial current processing image when images are available
    useEffect(() => {
        const allImages = [...backendImages, ...uploadedImages];
        if (allImages.length > 0 && !selectedImage) {
            setSelectedImage(allImages[0]);
        }
    }, [backendImages, uploadedImages, selectedImage, setSelectedImage]);

    // Cleanup auto-alignment on unmount
    useEffect(() => () => {
            if (frameCheckInterval.current) {
                clearTimeout(frameCheckInterval.current);
            }
    }, []);

    useEffect(() => {
        const sessionId = localStorage.getItem("heatscape_session_id");
        
        if (!sessionId) return undefined;
    
        let segmentUnsubscribers = [];
        const segmentedImages = [];
    
        const unsub = onSnapshot(
          collection(db, "sessions", sessionId, "images"),
          (snapshot) => {
            // Clean up previous segment listeners
            segmentUnsubscribers.forEach(unsubFn => unsubFn());
            segmentUnsubscribers = [];
            segmentedImages.length = 0; // Clear the array
            
            snapshot.forEach((imageDoc) => {
              const imageData = { id: imageDoc.id, ...imageDoc.data() };
              const parentGps = imageData.gps;
              const parentGyro = imageData.gyro;
              const parentTimestamp = imageData.timestamp;
              console.log("Listening to images in session:", imageData);
    
              // Set up real-time listener for segments of this image
              const segmentUnsub = onSnapshot(
                collection(db, "sessions", sessionId, "images", imageDoc.id, "segments"),
                (segmentsSnapshot) => {
                  // Remove existing segments for this image
                  const filteredSegments = segmentedImages.filter(img => img.parentImageId !== imageDoc.id);
                  segmentedImages.length = 0;
                  segmentedImages.push(...filteredSegments);
                  
                  
                  // Add updated segments for this image
                  segmentsSnapshot.forEach((segDoc) => {
                      const segment = segDoc.data();
                      console.log(`Listening to segments for image`, segment);
                      segmentedImages.push({
                      uid: `${imageDoc.id}_segment_${segDoc.id}`,
                      id: `${imageDoc.id}_segment_${segDoc.id}`,
                      parentImageId: imageDoc.id,
                      segmentId: segDoc.id,
                      
                      // Segment specific data
                      imageUrl: segment.segmentImageUrl,
                      surfaceArea: segment.surfaceArea,
                      material: segment.material,
                      temperature: segment.temperature,
                      humidity: segment.humidity,
                      
                      // Inherited from parent image
                      gps: parentGps,
                      gyro: parentGyro,
                      timestamp: parentTimestamp,
                      
                      // For compatibility with existing code
                      coordinates: parentGps || null,
                      alt: `${segment.material || 'Unknown material'}${segment.temperature ? ` - ${segment.temperature}°C` : ''}`,
                      src: segment.segmentImageUrl,
                      url: segment.segmentImageUrl,
                      name: `${segment.material || 'Segment'} (${segment.surfaceArea || 'N/A'} m²)`
                    });
                  });
    
                  // Sort by timestamp (newest first) and update state
                  // Filter out segments without humidity and temperature
                  const filteredTemperatures = segmentedImages.filter(
                    seg => (seg.humidity !== undefined || seg.humidity === 0) && (seg.temperature === undefined || seg.temperature !== 0)
                  );
                  filteredTemperatures.sort((a, b) => getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp));
                  setTemperatureRecords([...filteredTemperatures]);
                },
                (segError) => {
                  console.error(`Error listening to segments for image ${imageDoc.id}:`, segError);
                }
              );
    
              segmentUnsubscribers.push(segmentUnsub);
            });
          },
          (error) => {
            console.error("Error listening to images:", error);
            message.error("Failed to load images");
          }
        );
    
        // Cleanup function
        return () => {
          unsub();
          segmentUnsubscribers.forEach(unsubFn => unsubFn());
        };
    }, []);

    useEffect(() => {console.log("Selected image changedxxxxxxxxxxxxxxxxxxxxxx:", selectedImage);
    }, [selectedImage]);

    // Handle temperature data updates and create temperature records
    // useEffect(() => {
    //     if (temperature && Array.isArray(temperature) && temperature.length > 0 && selectedImage) {
    //         // Calculate average temperature
    //         const avgTemperature = temperature.reduce((sum, temp) => sum + temp, 0) / temperature.length;
    //         const avgHumidity = 45 + Math.random() * 20; // Simulated humidity (25-65%)
            
    //         // Create a temperature record with segment information
    //         const newRecord = {
    //             id: Date.now(),
    //             timestamp: new Date().toISOString(),
    //             temperature: parseFloat(avgTemperature.toFixed(1)),
    //             humidity: parseFloat(avgHumidity.toFixed(1)),
    //             rawData: temperature,
                
    //             // Include segment information
    //             material: selectedImage.material,
    //             surfaceArea: selectedImage.surfaceArea,
    //             url: selectedImage.url,
    //             segmentId: selectedImage.segmentId,
    //             parentImageId: selectedImage.parentImageId,
                
    //             location: {
    //                 latitude: gpsData.latitude,
    //                 longitude: gpsData.longitude
    //             }
    //         };
            
    //         setTemperatureRecords(prev => [newRecord, ...prev].slice(0, 10)); // Keep only latest 10 records
    //     }
    // }, [temperature, selectedImage, gpsData]);

    return (
        <div style={{ 
            minHeight: 'calc(100vh - 500px)', 
            backgroundColor: '#f0f2f5',
            padding: '20px 20px',
        }}>
            <Row justify="center" gutter={[12, 12]}>
                <Col xs={24} xxl={18}>
                    <Row gutter={[12, 12]}>
                        <Col span={24}>
                            {/* Header */}
                            <Card style={{ textAlign: 'center' }}>
                                <Row justify='space-evenly'>
                                    <Col>
                                        <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                                            <RobotOutlined style={{ marginRight: '12px' }} />
                                            Autonomous Navigation System
                                        </Title>
                                        <Text type="secondary">Intelligent vehicle navigation with real-time GPS tracking</Text>
                                    </Col>
                                    <Col>
                                        {switchButton}
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                        <Col span={24}>
                            {/* Status Dashboard */}
                            <Row gutter={[12, 12]}>
                                {/* Connection Status */}
                                <Col xs={24} sm={12} lg={6}>
                                    <Card size="small">
                                        <Statistic
                                            title="Connection"
                                            value={
                                                isReconnecting ? "Connecting..." : 
                                                socketReady ? "Connected" : "Disconnected"
                                            }
                                            prefix={
                                                <WifiOutlined style={{ 
                                                    color: isReconnecting ? '#faad14' : 
                                                           socketReady ? '#52c41a' : '#ff4d4f' 
                                                }} />
                                            }
                                            valueStyle={{ 
                                                color: isReconnecting ? '#faad14' : 
                                                       socketReady ? '#52c41a' : '#ff4d4f',
                                                fontSize: '14px'
                                            }}
                                        />
                                        {(!socketReady && !isReconnecting) && (
                                            <Button 
                                                size="small" 
                                                type="primary" 
                                                onClick={manualReconnect}
                                                style={{ marginTop: '8px', width: '100%' }}
                                            >
                                                Reconnect
                                            </Button>
                                        )}
                                    </Card>
                                </Col>

                                {/* Navigation Status */}
                                <Col xs={24} sm={12} lg={6}>
                                    <Card size="small">
                                        <Statistic
                                            title="Navigation"
                                            value={autonomousMode ? "Active" : "Idle"}
                                            prefix={<CompassOutlined style={{ color: autonomousMode ? '#1890ff' : '#d9d9d9' }} />}
                                            valueStyle={{ 
                                                color: autonomousMode ? '#1890ff' : '#8c8c8c',
                                                fontSize: '16px'
                                            }}
                                        />
                                    </Card>
                                </Col>

                                {/* GPS Status */}
                                <Col xs={24} sm={12} lg={6}>
                                    <Card size="small">
                                        <Statistic
                                            title="GPS Satellites"
                                            value={gpsData.satellites}
                                            prefix={<EnvironmentOutlined style={{ color: gpsData.satellites > 3 ? '#52c41a' : '#faad14' }} />}
                                            suffix="sats"
                                            valueStyle={{ 
                                                color: gpsData.satellites > 3 ? '#52c41a' : '#faad14',
                                                fontSize: '16px'
                                            }}
                                        />
                                        {useGpsSimulation && (
                                            <div style={{ marginTop: '8px' }}>
                                                <Text type="warning" style={{ fontSize: '12px' }}>
                                                    🔄 Simulated GPS
                                                </Text>
                                            </div>
                                        )}
                                    </Card>
                                </Col>

                                {/* Speed */}
                                <Col xs={24} sm={12} lg={6}>
                                    <Card size="small">
                                        <Statistic
                                            title="Speed"
                                            value={gpsData.speed?.toFixed(1)}
                                            prefix={<DashboardOutlined />}
                                            suffix="km/h"
                                            valueStyle={{ fontSize: '16px' }}
                                        />
                                    </Card>
                                </Col>
                            </Row>
                        </Col>
                        <Col span={24}>
                            <Row gutter={[12, 12]}>
                                {/* Navigation Control Panel */}
                                <Col xs={24} lg={14}>
                                    <Card 
                                        title={
                                            <Space>
                                                <AimOutlined />
                                                <span>Navigation Target</span>
                                                {autonomousMode && <Text type="success">(ACTIVE)</Text>}
                                            </Space>
                                        }
                                        extra={
                                            autonomousMode && (
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <div style={{ 
                                                        width: '8px', 
                                                        height: '8px', 
                                                        backgroundColor: '#52c41a', 
                                                        borderRadius: '50%', 
                                                        marginRight: '8px',
                                                        animation: 'pulse 1.5s infinite'
                                                    }} />
                                                    <Text type="success">Navigating</Text>
                                                </div>
                                            )
                                        }
                                    >
                                        <Row gutter={[16, 16]}>
                                            {autonomousMode &&
                                            <Col span={24}>
                                                <Image src={`data:image/png;base64,${frameImg}`} />
                                            </Col>
                                            }
                                            {/* Left Side: Image Gallery and Upload */}
                                            <Col xs={24} lg={12}>
                                                <div style={{ textAlign: 'center' }}>
                                                    {!autonomousMode &&
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
                                                            <PictureOutlined /> Target Image
                                                        </Text>
                                                    </div>
                                                    }
                                                    
                                                    {/* Show upload only if no images exist */}
                                                    {backendImages.length === 0 && uploadedImages.length === 0 && (
                                                        <Upload.Dragger
                                                            customRequest={handleImageUpload}
                                                            accept="image/*"
                                                            showUploadList={false}
                                                            style={{ marginBottom: '16px', height: '120px' }}
                                                            disabled={autonomousMode}
                                                        >
                                                            <div style={{ padding: '16px' }}>
                                                                <UploadOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
                                                                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                                                    Upload Target Image
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                                                    Click or drag image to upload
                                                                </div>
                                                            </div>
                                                        </Upload.Dragger>
                                                    )}

                                                    {/* Current Processing Image (Large Display) */}
                                                    {(selectedImage && !autonomousMode) && (
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <div style={{
                                                                border: '2px solid #1890ff',
                                                                borderRadius: '8px',
                                                                overflow: 'hidden',
                                                                position: 'relative',
                                                                backgroundColor: '#f0f2f5',
                                                                height: '200px'
                                                            }}>
                                                                <Image
                                                                    src={selectedImage.url}
                                                                    alt={selectedImage.name}
                                                                    style={{ 
                                                                        width: '100%', 
                                                                        height: '100%', 
                                                                        objectFit: 'cover',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    onClick={() => {
                                                                        setSelectedImage(selectedImage);
                                                                    }}
                                                                    preview={false}
                                                                />
                                                                <div
                                                                    style={{
                                                                        position: 'absolute',
                                                                        bottom: 0,
                                                                        left: 0,
                                                                        right: 0,
                                                                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                                                        color: 'white',
                                                                        padding: '8px 12px',
                                                                        fontSize: '12px',
                                                                    }}
                                                                    >
                                                                    <div style={{ fontWeight: 'bold' }}>{selectedImage.name}</div>

                                                                    {selectedImage.coordinates ? (
                                                                        <div style={{ fontSize: '10px', opacity: 0.9 }}>
                                                                        📍 {selectedImage.coordinates.lat.toFixed(4)}, {selectedImage.coordinates.lng.toFixed(4)}
                                                                        </div>
                                                                    ) : (
                                                                        <Space size="small" style={{ marginTop: 4 }}>
                                                                            <Input
                                                                                placeholder="Lat"
                                                                                value={targetCoords.lat}
                                                                                onChange={(e) => setTargetCoords((prev) => ({ ...prev, lat: e.target.value }))}
                                                                                style={{ width: 100 }}
                                                                                size="small"
                                                                            />
                                                                            <Input
                                                                                placeholder="Lng"
                                                                                value={targetCoords.lng}
                                                                                onChange={(e) => setTargetCoords((prev) => ({ ...prev, lng: e.target.value }))}
                                                                                style={{ width: 100 }}
                                                                                size="small"
                                                                            />
                                                                            <Button type="primary" size="small" onClick={() => handleSetImageCoordinates(selectedImage.uid, targetCoords)}>
                                                                                Set
                                                                            </Button>
                                                                        </Space>
                                                                    )}
                                                                    </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Horizontal Image List */}
                                                    {(backendImages.length > 0 || uploadedImages.length > 0) && (
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ 
                                                                display: 'flex', 
                                                                justifyContent: 'space-between', 
                                                                alignItems: 'center', 
                                                                marginBottom: '8px' 
                                                            }}>
                                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                    Available Images ({backendImages.length + uploadedImages.length})
                                                                </Text>
                                                                {uploadedImages.length === 0 && (
                                                                    <Upload
                                                                        customRequest={handleImageUpload}
                                                                        accept="image/*"
                                                                        showUploadList={false}
                                                                        disabled={autonomousMode}
                                                                    >
                                                                        <Button 
                                                                            size="small" 
                                                                            icon={<UploadOutlined />}
                                                                            type="dashed"
                                                                            disabled={autonomousMode}
                                                                        >
                                                                            Add
                                                                        </Button>
                                                                    </Upload>
                                                                )}
                                                            </div>
                                                            
                                                            <div style={{
                                                                display: 'flex',
                                                                gap: '8px',
                                                                overflowX: 'auto',
                                                                padding: '8px 0',
                                                                border: '1px solid #d9d9d9',
                                                                borderRadius: '6px',
                                                                backgroundColor: '#fafafa'
                                                            }}>
                                                                {/* Backend Images */}
                                                                {backendImages.map((item) => (
                                                                    <div
                                                                        key={item.uid}
                                                                        style={{
                                                                            position: 'relative',
                                                                            height: '60px',
                                                                            width: '60px',
                                                                            border: selectedImage?.uid === item.uid ? '2px solid #1890ff' : '2px solid transparent',
                                                                            borderRadius: '6px',
                                                                            overflow: 'hidden',
                                                                            cursor: 'pointer',
                                                                            backgroundColor: '#fff',
                                                                        }}
                                                                        onClick={() => handleImageSelect(item)}
                                                                    >
                                                                        <Image
                                                                            src={item.url}
                                                                            alt={item.name}
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                objectFit: 'cover'
                                                                            }}
                                                                            preview={false}
                                                                        />
                                                                        {item.coordinates && (
                                                                            <div style={{
                                                                                position: 'absolute',
                                                                                top: '2px',
                                                                                right: '2px',
                                                                                background: 'rgba(82, 196, 26, 0.8)',
                                                                                borderRadius: '50%',
                                                                                width: '12px',
                                                                                height: '12px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}>
                                                                                <div style={{ 
                                                                                    width: '6px', 
                                                                                    height: '6px', 
                                                                                    background: '#fff', 
                                                                                    borderRadius: '50%' 
                                                                                }} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}

                                                                {/* Uploaded Images */}
                                                                {uploadedImages.map((item) => (
                                                                    <div
                                                                        key={item.uid}
                                                                        style={{
                                                                            position: 'relative',
                                                                            width: '60px',
                                                                            height: '60px',
                                                                            border: selectedImage?.uid === item.uid ? '2px solid #1890ff' : '2px solid transparent',
                                                                            borderRadius: '6px',
                                                                            overflow: 'hidden',
                                                                            cursor: 'pointer',
                                                                            backgroundColor: '#fff'
                                                                        }}
                                                                        onClick={() => handleImageSelect(item)}
                                                                    >
                                                                        <Image
                                                                            src={item.url}
                                                                            alt={item.name}
                                                                            style={{ 
                                                                                width: '100%', 
                                                                                height: '100%', 
                                                                                objectFit: 'cover' 
                                                                            }}
                                                                            preview={false}
                                                                        />
                                                                        {item.coordinates && (
                                                                            <div style={{
                                                                                position: 'absolute',
                                                                                top: '2px',
                                                                                right: '2px',
                                                                                background: 'rgba(82, 196, 26, 0.8)',
                                                                                borderRadius: '50%',
                                                                                width: '12px',
                                                                                height: '12px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}>
                                                                                <div style={{ 
                                                                                    width: '6px', 
                                                                                    height: '6px', 
                                                                                    background: '#fff', 
                                                                                    borderRadius: '50%' 
                                                                                }} />
                                                                            </div>
                                                                        )}
                                                                        <Button
                                                                            type="text"
                                                                            size="small"
                                                                            danger
                                                                            icon={<DeleteOutlined />}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleImageDelete(item.uid);
                                                                            }}
                                                                            disabled={autonomousMode}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                top: '2px',
                                                                                left: '2px',
                                                                                minWidth: '20px',
                                                                                height: '20px',
                                                                                padding: 0,
                                                                                background: 'rgba(255, 77, 79, 0.8)',
                                                                                color: 'white',
                                                                                fontSize: '10px'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Col>

                                            {/* Right Side: Live Camera Feed */}
                                            <Col xs={24} lg={12}>
                                                <div style={{ textAlign: 'center' }}>
                                                    {!autonomousMode &&
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                                                                <CameraOutlined /> Live Camera Feed
                                                            </Text>
                                                        </div>
                                                    }
                                                    
                                                    {(camIP) ? (
                                                        <>
                                                            {!autonomousMode &&
                                                            <div style={{
                                                                width: '100%',
                                                                maxWidth: 300,
                                                                aspectRatio: '4/3',
                                                                border: '3px solid #52c41a',
                                                                borderRadius: 12,
                                                                overflow: 'hidden',
                                                                position: 'relative',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                                backgroundColor: '#f0f2f5',
                                                                marginBottom: '16px'
                                                            }}>
                                                                <iframe
                                                                    src={`http://${camIP}:81/stream`}
                                                                    title="Camera Stream"
                                                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                                                    allow="camera"
                                                                />
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: 8,
                                                                    left: 8,
                                                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                                                    color: 'white',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '10px'
                                                                }}>
                                                                    LIVE
                                                                </div>
                                                            </div>
                                                            }

                                                            {/* Auto-Alignment Controls */}
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                                                    <div style={{
                                                                        padding: '8px',
                                                                        backgroundColor: alignmentStatus === 'idle' ? '#f5f5f5' : 
                                                                                        alignmentStatus === 'searching' ? '#fff7e6' :
                                                                                        alignmentStatus === 'centering' ? '#e6f7ff' : '#f6ffed',
                                                                        border: `1px solid ${alignmentStatus === 'idle' ? '#d9d9d9' : 
                                                                                                alignmentStatus === 'searching' ? '#ffd591' :
                                                                                                alignmentStatus === 'centering' ? '#91d5ff' : '#b7eb8f'}`,
                                                                        borderRadius: '6px'
                                                                    }}>
                                                                        <Text strong style={{ fontSize: '12px' }}>
                                                                            Auto-Align: {alignmentStatus.toUpperCase()}
                                                                        </Text>
                                                                        {(targetFound || true) && (
                                                                            <div style={{ marginTop: '4px' }}>
                                                                                <Text style={{ fontSize: '10px', color: '#52c41a' }}>
                                                                                    Target: ✓ | Matches: {numMatches} | Quality: {(matchQuality * 100).toFixed(0)}%
                                                                                </Text>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {!isAutoAligning ? (
                                                                        <Button
                                                                            type="primary"
                                                                            size="small"
                                                                            onClick={startAutoAlignment}
                                                                            disabled={!socketReady || !autonomousMode}
                                                                            style={{ 
                                                                                width: '100%',
                                                                                backgroundColor: '#722ed1',
                                                                                borderColor: '#722ed1'
                                                                            }}
                                                                        >
                                                                            🎯 Auto-Align Camera
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            danger
                                                                            size="small"
                                                                            onClick={stopAutoAlignment}
                                                                            style={{ width: '100%' }}
                                                                        >
                                                                            🛑 Stop Auto-Align
                                                                        </Button>
                                                                    )}
                                                                </Space>
                                                            </div>

                                                            <div style={{ marginTop: '12px' }}>
                                                                <Button 
                                                                    type="primary"
                                                                    size="small"
                                                                    icon={<PictureOutlined />}
                                                                    onClick={() => selectedImage && sendReferenceImage(selectedImage)}
                                                                    disabled={!selectedImage || autonomousMode}
                                                                    style={{ marginRight: '8px' }}
                                                                >
                                                                    Set Reference
                                                                </Button>
                                                                <Button 
                                                                    type={autonomousMode ? "default" : "primary"}
                                                                    danger={autonomousMode}
                                                                    size="small"
                                                                    icon={autonomousMode ? <StopOutlined /> : <PlayCircleOutlined />}
                                                                    onClick={autonomousMode ? stopVideoStream : startVideoStream}
                                                                    disabled={!camIP}
                                                                    style={{ marginRight: '8px' }}
                                                                >
                                                                    {autonomousMode ? 'Stop Stream' : 'Start Stream'}
                                                                </Button>
                                                                {selectedImage && (
                                                                    <Text 
                                                                        type="success" 
                                                                        style={{ fontSize: '12px' }}
                                                                    >
                                                                        ✓ Ready
                                                                    </Text>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div style={{ textAlign: 'center', padding: '20px' }}>
                                                            <div style={{
                                                                width: '150px',
                                                                height: '120px',
                                                                backgroundColor: '#f5f5f5',
                                                                border: '2px dashed #d9d9d9',
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                margin: '0 auto 16px'
                                                            }}>
                                                                <Text type="secondary">Camera Loading...</Text>
                                                            </div>
                                                            <Button 
                                                                type="primary" 
                                                                size="small"
                                                                onClick={() => sendCommand('GET_CAM_IP')}
                                                                loading={!socketReady}
                                                            >
                                                                Refresh Camera
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={10}>
                                    <Card 
                                        title={<><EnvironmentOutlined /> Temperature Data Collection</>} 
                                        style={{ height: '100%' }}
                                    >
                                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    loading={isCollecting}
                                                    onClick={() => {
                                                        setIsCollecting(true);
                                                        sendCommand('get_temp');
                                                        setTemperature([]);
                                                    }}
                                                    style={{ 
                                                        width: '100%', 
                                                        height: '60px', 
                                                        fontSize: '18px',
                                                        backgroundColor: '#fa8c16',
                                                        borderColor: '#fa8c16'
                                                    }}
                                                >
                                                    {isCollecting ? 'Collecting...' : 'Collect Temperature'}
                                                </Button>
                                            </div>
                                            
                                            <div>
                                                {/* Current Temperature Reading */}
                                                {temperature > 25 ? (
                                                    <Card size="small" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', marginBottom: '16px' }}>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#52c41a', marginBottom: '8px' }}>
                                                                {(temperature)?.toFixed(2)}°C
                                                            </div>
                                                            <div>
                                                                <Text strong style={{ fontSize: '14px' }}>Latest Temperature Reading</Text><br />
                                                                <Text type="secondary">Based on {temperature.length} data points</Text>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ) : null}

                                                {/* Temperature Records List */}
                                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                    {temperatureRecords && temperatureRecords.length > 0 ? (
                                                        <>
                                                            <Divider orientation="left" style={{ margin: '8px 0' }}>
                                                                <Text strong style={{ fontSize: '12px' }}>Records ({temperatureRecords.length})</Text>
                                                            </Divider>
                                                            <List
                                                                size="small"
                                                                dataSource={temperatureRecords}
                                                                renderItem={(record) => (
                                                                    <List.Item style={{ padding: '6px 0' }}>
                                                                        <Card size="small" style={{ width: '100%', backgroundColor: '#f0f9ff', border: '1px solid #91d5ff' }}>
                                                                            <Row gutter={[8, 4]} align='middle'>
                                                                                {/* Segment Image */}
                                                                                {record.url && (
                                                                                    <Col span={6}>
                                                                                        <Image
                                                                                            src={record.url}
                                                                                            alt={record.material || 'Segment'}
                                                                                            style={{
                                                                                                width: '100%',
                                                                                                height: '50px',
                                                                                                objectFit: 'cover',
                                                                                                borderRadius: '4px'
                                                                                            }}
                                                                                            preview={false}
                                                                                        />
                                                                                    </Col>
                                                                                )}
                                                                                
                                                                                {/* Temperature and Humidity Data */}
                                                                                <Col span={record.url ? 18 : 24}>
                                                                                    <Row gutter={[4, 2]}>
                                                                                        <Col span={12}>
                                                                                            <Space size="small">
                                                                                                <FireOutlined style={{ color: '#fa8c16' }} />
                                                                                                <Text strong style={{ color: '#fa8c16', fontSize: '14px' }}>
                                                                                                    {record.temperature}°C
                                                                                                </Text>
                                                                                            </Space>
                                                                                        </Col>
                                                                                        <Col span={12}>
                                                                                            <Space size="small">
                                                                                                <EnvironmentOutlined style={{ color: '#1890ff' }} />
                                                                                                <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
                                                                                                    {record.humidity}% RH
                                                                                                </Text>
                                                                                            </Space>
                                                                                        </Col>
                                                                                    </Row>
                                                                                </Col>
                                                                            </Row>
                                                                        </Card>
                                                                    </List.Item>
                                                                )}
                                                            />
                                                            {temperatureRecords.length > 3 && (
                                                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                                                    ... and {temperatureRecords.length - 3} more records
                                                                </Text>
                                                            )}
                                                        </>
                                                    ) : (
                                                        Array.isArray(temperature) && temperature.length === 0 && (
                                                            <div style={{ 
                                                                padding: '30px 15px', 
                                                                textAlign: 'center', 
                                                                backgroundColor: '#fafafa', 
                                                                borderRadius: '8px',
                                                                border: '2px dashed #d9d9d9'
                                                            }}>
                                                                <Text type="secondary" style={{ fontSize: '14px' }}>No temperature data collected yet</Text>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Col>
                <Col xs={24} xxl={6}>
                    <Row gutter={[12, 12]}>
                        {/* System Logs */}
                        <Col span={24}>
                            <Card 
                                title="System Logs" 
                                style={{ width: '100%' }}
                                extra={
                                    <Button size="small" onClick={() => setLogMessages([])}>
                                        Clear Logs
                                    </Button>
                                }
                                size="small"
                            >
                                <div
                                    ref={scrollViewRef}
                                    style={{
                                        height: '105px',
                                        overflowY: 'auto',
                                        backgroundColor: '#001529',
                                        color: '#52c41a',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        border: '1px solid #d9d9d9',
                                        textAlign: 'left',
                                    }}
                                >
                                    {logMessages.map((msg) => (
                                        <div key={msg.key} style={{ marginBottom: '2px' }}>
                                            {msg.messageTxt}
                                        </div>
                                    ))}
                                    {logMessages.length === 0 && (
                                        <Text type="secondary">No logs yet...</Text>
                                    )}
                                </div>
                            </Card>
                        </Col>
                        
                        {/* GPS Data */}
                        <Col span={24}>
                            <Card title={<><EnvironmentOutlined /> Current Location</>} size="small">
                                <Row gutter={[8, 12]}>
                                    <Col span={24}>
                                        <div style={{ padding: '6px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #91d5ff' }}>
                                            <Row gutter={[8, 8]}>
                                                <Col span={12}>
                                                    <Text type="secondary">Latitude</Text><br />
                                                    <Text strong style={{ fontSize: '16px' }}>{gpsData.latitude?.toFixed(6)}</Text>
                                                </Col>
                                                <Col span={12}>
                                                    <Text type="secondary">Longitude</Text><br />
                                                    <Text strong style={{ fontSize: '16px' }}>{gpsData.longitude?.toFixed(6)}</Text>
                                                </Col>
                                            </Row>
                                        </div>
                                    </Col>
                                    <Col span={7}>
                                        <Text type="secondary">Altitude</Text><br />
                                        <Text strong>{gpsData.altitude?.toFixed(1)} m</Text>
                                    </Col>
                                    <Col span={7}>
                                        <Text type="secondary">HDOP</Text><br />
                                        <Text strong>{gpsData.hdop?.toFixed(2)}</Text>
                                    </Col>
                                    <Col span={10}>
                                        <Text type="secondary">Time (UTC)</Text><br />
                                        <Text strong>{gpsData.time}</Text>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>

                        {/* GPS Simulation Controls */}
                        {/* <Col span={24}>
                            <Card 
                                title={
                                    <Space>
                                        <RobotOutlined />
                                        <span>GPS Simulation</span>
                                        {useGpsSimulation && <Text type="warning">(ACTIVE)</Text>}
                                    </Space>
                                } 
                                size="small"
                                extra={
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        Use when GPS sensor is not working
                                    </Text>
                                }
                            >
                                <Row gutter={[8, 12]}>
                                    <Col span={24}>
                                        <Space wrap>
                                            <Button
                                                type={useGpsSimulation ? "default" : "primary"}
                                                size="small"
                                                onClick={useGpsSimulation ? stopGpsSimulation : startGpsSimulation}
                                                disabled={!targetCoords.lat || !targetCoords.lng}
                                                icon={useGpsSimulation ? <StopOutlined /> : <PlayCircleOutlined />}
                                            >
                                                {useGpsSimulation ? 'Stop Simulation' : 'Start Simulation'}
                                            </Button>
                                            <Button
                                                size="small"
                                                onClick={resetGpsPosition}
                                                disabled={useGpsSimulation}
                                            >
                                                Reset Position
                                            </Button>
                                            {!targetCoords.lat || !targetCoords.lng ? (
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Set target coordinates first
                                                </Text>
                                            ) : null}
                                        </Space>
                                    </Col>
                                    {useGpsSimulation && (
                                        <Col span={24}>
                                            <div style={{ 
                                                padding: '8px', 
                                                backgroundColor: '#fff7e6', 
                                                borderRadius: '6px', 
                                                border: '1px solid #ffd591',
                                                fontSize: '12px'
                                            }}>
                                                <Row gutter={[8, 4]}>
                                                    <Col span={12}>
                                                        <Text type="secondary">Start Position:</Text><br />
                                                        <Text code style={{ fontSize: '10px' }}>
                                                            {simulatedGpsData.latitude?.toFixed(6)}, {simulatedGpsData.longitude?.toFixed(6)}
                                                        </Text>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Text type="secondary">Target Position:</Text><br />
                                                        <Text code style={{ fontSize: '10px' }}>
                                                            {targetCoords.lat}, {targetCoords.lng}
                                                        </Text>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Text type="secondary">Simulation Speed:</Text><br />
                                                        <Text>0.5 m/s</Text>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Text type="secondary">Update Rate:</Text><br />
                                                        <Text>Every 2 seconds</Text>
                                                    </Col>
                                                </Row>
                                            </div>
                                        </Col>
                                    )}
                                </Row>
                            </Card>
                        </Col> */}

                        {/* Navigation Details - Only show when autonomous mode is active */}
                        {autonomousMode && (
                            <Col span={24}>
                                <Card title={<><CompassOutlined /> Navigation Details</>} size="small">
                                    <Row gutter={[8, 8]}>
                                        <Col span={12}>
                                            <Text type="secondary">Target Bearing</Text><br />
                                            <Text strong>{navigationData.targetBearing?.toFixed(1)}°</Text>
                                        </Col>
                                        <Col span={12}>
                                            <Text type="secondary">Current Heading</Text><br />
                                            <Text strong>{navigationData.currentHeading?.toFixed(1)}°</Text>
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>
                        )}

                        {/* IMU Data */}
                        <Col span={24}>
                            <Card title={<><DashboardOutlined /> IMU Sensor</>} size="small">
                                <Row gutter={[8, 8]}>
                                    <Col span={8}>
                                        <Text strong>Gyro X:</Text><br />
                                        {gyroData.gyro_x?.toFixed(2)}°/s
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Gyro Y:</Text><br />
                                        {gyroData.gyro_y?.toFixed(2)}°/s
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Gyro Z:</Text><br />
                                        {gyroData.gyro_z?.toFixed(2)}°/s
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Accel X:</Text><br />
                                        {gyroData.accel_x?.toFixed(2)}g
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Accel Y:</Text><br />
                                        {gyroData.accel_y?.toFixed(2)}g
                                    </Col>
                                    <Col span={8}>
                                        <Text strong>Accel Z:</Text><br />
                                        {gyroData.accel_z?.toFixed(2)}g
                                    </Col>
                                    <Col span={12}>
                                        <Text strong>Tilt:</Text> {Math.sqrt(gyroData.angle_x ** 2 + gyroData.angle_y ** 2)?.toFixed(1)}°
                                    </Col>
                                    <Col span={12}>
                                        <Text strong>IMU Temp:</Text> {gyroData.temp?.toFixed(1)}°C
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
};

export default AutonomousNavigation;
