import React, { useState, useRef, useEffect } from 'react';
import { getFoodItemByBarcode } from '../../services/foodItemService';
import { FoodItem } from '../../types/mealPlanning';

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
  
  // Initialize camera and barcode detector
  useEffect(() => {
    let stream: MediaStream | null = null;
    let detector: BarcodeDetectorInterface | null = null;
    let frameId: number;
    let isActive = true;

    const setupCamera = async () => {
      try {
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          // Set canvas dimensions to match video
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          
          setIsScanning(true);
          
          // Initialize barcode detector
          if (isBarcodeDetectorSupported) {
            // @ts-expect-error BarcodeDetector API is not yet in TypeScript's lib
            detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
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
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 5;
            
            barcodes.forEach((barcode: DetectedBarcode) => {
              const { x, y, width, height } = barcode.boundingBox;
              ctx.strokeRect(x, y, width, height);
              
              // Display barcode value
              ctx.font = '24px Arial';
              ctx.fillStyle = '#FF0000';
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
    
    const handleBarcodeDetected = async (barcode: string) => {
      setIsScanning(false);
      setLoadingMessage(`Loading product information for barcode: ${barcode}...`);
      
      try {
        const foodItem = await getFoodItemByBarcode(barcode);
        onDetect(foodItem, barcode);
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
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onDetect, onError]);
  
  const handleManualBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (detectedBarcode) {
      setIsScanning(false);
      setLoadingMessage(`Loading product information for barcode: ${detectedBarcode}...`);
      
      getFoodItemByBarcode(detectedBarcode)
        .then(foodItem => {
          onDetect(foodItem);
        })
        .catch(error => {
          console.error('Error fetching product data:', error);
          setErrorMessage('Error fetching product data. Please try again.');
          if (onError) onError(error);
          setIsScanning(true);
        });
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Scan Barcode</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded dark:bg-red-900 dark:text-red-100">
            {errorMessage}
          </div>
        )}
        
        {loadingMessage && (
          <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded dark:bg-blue-900 dark:text-blue-100">
            {loadingMessage}
          </div>
        )}
        
        <div className="relative aspect-video bg-black rounded overflow-hidden mb-4">
          <video 
            ref={videoRef} 
            className="absolute inset-0 w-full h-full object-contain" 
            muted 
            playsInline
          />
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full object-contain"
          />
          
          {!isScanning && !errorMessage && !loadingMessage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-white text-center p-4">
                <p>Camera initializing...</p>
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={handleManualBarcode} className="mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={detectedBarcode}
              onChange={(e) => setDetectedBarcode(e.target.value)}
              placeholder="Enter barcode manually"
              className="flex-grow p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button 
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
            >
              Search
            </button>
          </div>
        </form>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Point your camera at a product barcode to scan. Make sure the barcode is well-lit and clearly visible.
        </p>
      </div>
    </div>
  );
};

export default BarcodeScanner; 