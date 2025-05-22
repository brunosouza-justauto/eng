import React, { useState, useRef, useEffect } from 'react';
import { getFoodItemByBarcode } from '../../services/foodItemService';
import { FoodItem } from '../../types/mealPlanning';
import { FiX, FiRefreshCw } from 'react-icons/fi';

// Check if the BarcodeDetector API is available
const isBarcodeDetectorSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

// Define BarcodeDetector interface since TypeScript doesn't include it yet
interface BarcodeDetectorInterface {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
}

interface DetectedBarcode {
  boundingBox: DOMRectReadOnly;
  rawValue: string;
  format: string;
  cornerPoints: [number, number][];
}

// Extended interfaces for torch functionality since TypeScript doesn't include them yet
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

interface BarcodeScannerProps {
  onDetect: (foodItem: FoodItem | null, barcode: string) => void;
  onError?: (error: Error) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetect, onError, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [detectedBarcode, setDetectedBarcode] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanAttempts, setScanAttempts] = useState(0);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchError, setTorchError] = useState<string | null>(null);
  
  // Initialize camera and barcode detector
  useEffect(() => {
    let stream: MediaStream | null = null;
    let detector: BarcodeDetectorInterface | null = null;
    let frameId: number;
    let isActive = true;
    let scanTimeout: NodeJS.Timeout;

    const setupCamera = async () => {
      try {
        // Stop any existing stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        // Reset torch state when changing cameras
        setTorchAvailable(false);
        setTorchError(null);
        
        // Request camera access with preferred settings for barcode scanning
        const constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: 'continuous',
            exposureMode: 'continuous',
            frameRate: { ideal: 30 }
          }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          // Set canvas dimensions to match video
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          
          setIsScanning(true);
          
          // Check if torch is available
          if (facingMode === 'environment') {
            const track = stream.getVideoTracks()[0];
            try {
              // Check if torch is supported
              const capabilities = track.getCapabilities() as ExtendedMediaTrackCapabilities;
              if (capabilities.torch) {
                setTorchAvailable(true);
                // Only try to enable torch if user has toggled it on
                if (torchEnabled) {
                  try {
                    await track.applyConstraints({
                      advanced: [{ torch: true } as ExtendedMediaTrackConstraintSet]
                    });
                  } catch (torchErr) {
                    console.error('Failed to enable torch:', torchErr);
                    setTorchError('Could not enable flashlight');
                  }
                }
              } else {
                setTorchAvailable(false);
                if (torchEnabled) {
                  setTorchError('Flashlight not available on this device');
                }
              }
            } catch (err) {
              console.error('Error checking torch capability:', err);
              setTorchAvailable(false);
              if (torchEnabled) {
                setTorchError('Flashlight not supported');
              }
            }
          } else {
            // Front camera doesn't support torch
            setTorchAvailable(false);
            if (torchEnabled) {
              setTorchError('Flashlight only available with rear camera');
            }
          }
          
          // Initialize barcode detector
          if (isBarcodeDetectorSupported) {
            // @ts-expect-error BarcodeDetector API is not yet in TypeScript's lib
            detector = new BarcodeDetector({ 
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar', 'itf'] 
            });
            scanBarcode();
          } else {
            // Fallback to QuaggaJS or other library would go here
            setErrorMessage('Barcode detection is not supported in this browser.');
            if (onError) onError(new Error('Barcode detection not supported'));
          }
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setErrorMessage('Could not access camera. Please make sure camera permissions are granted.');
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    };
    
    const scanBarcode = async () => {
      if (!isActive || !canvasRef.current || !videoRef.current || !detector) return;
      
      try {
        // Detect barcodes in the current video frame
        const barcodes = await detector.detect(videoRef.current);
        
        if (barcodes.length > 0) {
          // Draw rectangle around detected barcode
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.strokeStyle = '#00FF00'; // Green for success
            ctx.lineWidth = 5;
            
            barcodes.forEach((barcode: DetectedBarcode) => {
              const { x, y, width, height } = barcode.boundingBox;
              ctx.strokeRect(x, y, width, height);
              
              // Display barcode value
              ctx.font = '24px Arial';
              ctx.fillStyle = '#FFFFFF';
              ctx.fillText(barcode.rawValue, x, y > 20 ? y - 10 : y + height + 30);
              
              setDetectedBarcode(barcode.rawValue);
              handleBarcodeDetected(barcode.rawValue);
              return; // Only process first barcode
            });
          }
        } else {
          // Clear canvas if no barcodes detected
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Draw the guide box for scanning
            drawScanningGuide(ctx, canvasRef.current.width, canvasRef.current.height);
          }
          
          // Continue scanning
          frameId = requestAnimationFrame(scanBarcode);
        }
      } catch (error) {
        console.error('Error scanning barcode:', error);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
        frameId = requestAnimationFrame(scanBarcode);
      }
    };
    
    // Draw a guide box to help with scanning
    const drawScanningGuide = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Calculate guide box dimensions (60% of the smaller dimension)
      const boxSize = Math.min(width, height) * 0.6;
      const x = (width - boxSize) / 2;
      const y = (height - boxSize) / 2;
      
      // Clear the canvas
      ctx.clearRect(0, 0, width, height);
      
      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);
      
      // Cut out the scanning box
      ctx.clearRect(x, y, boxSize, boxSize);
      
      // Draw the border of the scanning box
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, boxSize, boxSize);
      
      // Draw corner markers
      const cornerSize = boxSize * 0.1;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#4F46E5'; // Indigo color
      
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(x, y + cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerSize, y);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(x + boxSize - cornerSize, y);
      ctx.lineTo(x + boxSize, y);
      ctx.lineTo(x + boxSize, y + cornerSize);
      ctx.stroke();
      
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(x, y + boxSize - cornerSize);
      ctx.lineTo(x, y + boxSize);
      ctx.lineTo(x + cornerSize, y + boxSize);
      ctx.stroke();
      
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(x + boxSize - cornerSize, y + boxSize);
      ctx.lineTo(x + boxSize, y + boxSize);
      ctx.lineTo(x + boxSize, y + boxSize - cornerSize);
      ctx.stroke();
      
      // Add scan line animation
      const lineY = y + (boxSize * (Date.now() % 2000) / 2000);
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + boxSize, lineY);
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.8)'; // Semi-transparent indigo
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add guidance text for round items
      if (scanAttempts > 3) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        const textY = y + boxSize + 40;
        ctx.fillText('For round items, try to position the barcode flat in the box', width / 2, textY);
        ctx.fillText('or hold the item at a slight angle', width / 2, textY + 25);
      }
    };
    
    const handleBarcodeDetected = async (barcode: string) => {
      setIsScanning(false);
      setLoadingMessage(`Loading product information for barcode: ${barcode}...`);
      
      try {
        const foodItem = await getFoodItemByBarcode(barcode);

        if (foodItem) {
          onDetect(foodItem, barcode);
        } else {
          setLoadingMessage('No food item found with barcode: ' + barcode + '. Please try scanning again or close and add as a custom food item.');
          setIsScanning(true);
          // Increment scan attempts to show guidance for round items
          setScanAttempts(prev => prev + 1);
          // Add a short delay before resuming scanning
          scanTimeout = setTimeout(() => {
            frameId = requestAnimationFrame(scanBarcode);
          }, 1500);
        }
      } catch (error) {
        console.error('Error fetching product data:', error);
        setErrorMessage('Error fetching product data. Please try again.');
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
        setIsScanning(true);
        frameId = requestAnimationFrame(scanBarcode);
      }
    };
    
    setupCamera();
    
    // Cleanup function
    return () => {
      isActive = false;
      
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onDetect, onError, facingMode, torchEnabled]);
  
  const handleManualBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (detectedBarcode) {
      setIsScanning(false);
      setLoadingMessage(`Loading product information for barcode: ${detectedBarcode}...`);
      
      getFoodItemByBarcode(detectedBarcode)
        .then(foodItem => {
          onDetect(foodItem, detectedBarcode);
        })
        .catch(error => {
          console.error('Error fetching product data:', error);
          if (onDetect) onDetect(null, detectedBarcode);
          setIsScanning(false);
        });
    }
  };
  
  // Toggle camera between front and back
  const handleToggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    // Reset torch when switching cameras
    if (facingMode === 'user') {
      setTorchEnabled(false);
    }
  };
  
  // Toggle flashlight
  const handleToggleTorch = () => {
    if (!torchAvailable && !torchEnabled) {
      setTorchError('Flashlight not available on this device');
      return;
    }
    
    setTorchEnabled(prev => !prev);
    // Error message will be set/cleared in the useEffect
  };
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header with close button */}
      <div className="bg-gray-900 p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Scan Barcode</h2>
        <button 
          onClick={onClose}
          className="text-gray-300 hover:text-white p-2"
          aria-label="Close"
        >
          <FiX size={24} />
        </button>
      </div>
      
      {errorMessage && (
        <div className="absolute top-16 left-0 right-0 m-4 p-3 bg-red-900 text-red-100 rounded z-10">
          {errorMessage}
        </div>
      )}
      
      {loadingMessage && (
        <div className="absolute top-16 left-0 right-0 m-4 p-3 bg-blue-900 text-blue-100 rounded z-10">
          {loadingMessage}
        </div>
      )}
      
      {torchError && (
        <div className="absolute top-16 left-0 right-0 m-4 p-3 bg-yellow-900 text-yellow-100 rounded z-10 flex justify-between">
          <span>{torchError}</span>
          <button onClick={() => setTorchError(null)} className="text-yellow-100">✕</button>
        </div>
      )}
      
      {/* Main camera view - takes most of the screen */}
      <div className="relative flex-1 bg-black overflow-hidden">
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover" 
          muted 
          playsInline
        />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {!isScanning && !errorMessage && !loadingMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="text-white text-center p-4">
              <div className="mb-3">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
              <p>Camera initializing...</p>
            </div>
          </div>
        )}
        
        {/* Camera controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-6">
          <button 
            onClick={handleToggleCamera} 
            className="p-3 bg-gray-800 rounded-full text-white flex flex-col items-center"
            aria-label="Switch Camera"
          >
            <FiRefreshCw size={24} />
            <span className="text-xs mt-1">Flip</span>
          </button>
          
          <button 
            onClick={handleToggleTorch} 
            className={`p-3 rounded-full text-white flex flex-col items-center ${
              torchEnabled ? 'bg-yellow-600' : 'bg-gray-800'
            } ${!torchAvailable && !torchEnabled ? 'opacity-50' : ''}`}
            aria-label="Toggle Flashlight"
            disabled={!torchAvailable && !torchEnabled}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 2H15L17 8H7L9 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 8V14C7 16.7614 9.23858 19 12 19C14.7614 19 17 16.7614 17 14V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs mt-1">Light</span>
          </button>
        </div>
      </div>
      
      {/* Bottom input section */}
      <div className="bg-gray-900 p-4">
        <form onSubmit={handleManualBarcode} className="flex space-x-2">
          <input
            type="text"
            value={detectedBarcode}
            onChange={(e) => setDetectedBarcode(e.target.value)}
            placeholder="Enter barcode manually"
            className="flex-grow p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-base"
          />
          <button 
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium"
          >
            Search
          </button>
        </form>
        
        {/* Scrollable tips container */}
        <div className="mt-2">
          <p className="text-sm text-gray-400">
            1. Position the barcode in the scanning box<br />
            2. Hold the item at a slight angle to reduce glare<br />
            3. Make sure the entire barcode is visible and flat<br />
            4. Try rotating the item slowly<br />
            5. If flashlight is available, use it in low-light conditions
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 