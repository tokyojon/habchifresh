import React, { useState } from 'react';
import { analyzeImageWithGemini } from '../services/gemini';
import CameraInput from './CameraInput';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

const ImageAnalyzer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);
    
    const prompt = "Analyze this image. If it contains fresh produce, identify the item and assess its visible quality, looking for defects or ripeness. If it is a shipping label, extract the key text. Provide a concise summary suitable for a logistics report.";
    
    try {
      const analysis = await analyzeImageWithGemini(file, prompt);
      setResult(analysis);
    } catch (err) {
      setResult("Error analyzing image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <h2 className="font-bold text-lg">AI Image Inspector</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-4 text-sm">
            Upload a photo of produce or a label to get an instant AI assessment using Gemini 3 Pro.
          </p>

          <CameraInput 
            label="Upload Image for Analysis" 
            file={file} 
            onFileChange={(f) => { setFile(f); setResult(null); }}
            description="Select a clear photo of the product or document."
          />

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 text-indigo-700">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Analyzing image content...</p>
            </div>
          )}

          {result && !loading && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Analysis Result
              </h4>
              <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
                {result}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button 
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {loading ? 'Processing...' : 'Analyze Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyzer;
