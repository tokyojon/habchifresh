import React, { useState, useRef } from 'react';
import { Camera, CheckCircle, Upload, X } from 'lucide-react';

interface CameraInputProps {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  description?: string;
}

const CameraInput: React.FC<CameraInputProps> = ({ label, file, onFileChange, description }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      onFileChange(selectedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const clearFile = () => {
    onFileChange(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      
      {!file ? (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-8 w-8 text-primary mb-2" />
          <span className="text-sm text-gray-600">Tap to capture or upload</span>
          <input 
            ref={inputRef}
            type="file" 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={handleFile}
          />
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center p-3">
            <div className="h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            <div className="ml-3 flex-1 truncate">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-green-600 flex items-center mt-0.5">
                <CheckCircle className="h-3 w-3 mr-1" /> Photo Captured
              </p>
            </div>
            <button 
              onClick={clearFile}
              className="p-2 text-gray-400 hover:text-red-500"
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
