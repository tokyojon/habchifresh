import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface CameraInputProps {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  description?: string;
}

// Utility to compress image
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // Release memory immediately
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      // Target dimensions (max 1024px is sufficient for reports/AI and safe for memory)
      const MAX_DIMENSION = 1024;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Compress to JPEG with 0.5 quality (Aggressive compression for memory safety)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Compression failed'));
          }
        },
        'image/jpeg',
        0.5
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
};

const CameraInput: React.FC<CameraInputProps> = ({ label, file, onFileChange, description }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Cleanup preview URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // If file is passed from props (e.g., re-render), create preview
  useEffect(() => {
    if (file && !preview) {
       const objectUrl = URL.createObjectURL(file);
       setPreview(objectUrl);
    } else if (!file && preview) {
       setPreview(null);
    }
  }, [file]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      setIsCompressing(true);

      try {
        // Compress the image before storing in state
        const compressedFile = await compressImage(originalFile);
        
        // Clean up old preview if exists
        if (preview && preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }

        const objectUrl = URL.createObjectURL(compressedFile);
        setPreview(objectUrl);
        onFileChange(compressedFile);
      } catch (error) {
        console.error("Image compression failed:", error);
        // Fallback to original if compression fails, but warn about size
        onFileChange(originalFile);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const clearFile = () => {
    onFileChange(null);
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      
      {!file && !isCompressing ? (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100"
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex gap-2 mb-2 text-primary">
            <Camera className="h-8 w-8" />
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
          <span className="text-sm text-gray-600 font-medium">Take Photo or Upload</span>
          <span className="text-xs text-gray-400 mt-1">Images auto-compressed</span>
          <input 
            ref={inputRef}
            type="file" 
            accept="image/*"
            // capture="environment" removed to allow Gallery upload option
            className="hidden" 
            onChange={handleFile}
          />
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center p-3">
            <div className="h-16 w-16 flex-shrink-0 rounded overflow-hidden bg-gray-100 relative">
              {isCompressing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              {isCompressing ? (
                <p className="text-sm font-medium text-gray-600">Compressing...</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-900 truncate">{file?.name}</p>
                  <p className="text-xs text-green-600 flex items-center mt-0.5">
                    <CheckCircle className="h-3 w-3 mr-1" /> Ready
                  </p>
                </>
              )}
            </div>
            <button 
              onClick={clearFile}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              disabled={isCompressing}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraInput;