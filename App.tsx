import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  ChevronRight, 
  ChevronLeft, 
  Thermometer, 
  Box, 
  Truck, 
  CheckCircle2, 
  Mail,
  ScanLine,
  AlertTriangle,
  FileSearch,
  FileDown,
  Loader2
} from 'lucide-react';
import { jsPDF } from "jspdf";
import CameraInput from './components/CameraInput';
import ChatAssistant from './components/ChatAssistant';
import ImageAnalyzer from './components/ImageAnalyzer';
import { ReportData, StepType } from './types';

const INITIAL_DATA: ReportData = {
  containerNumber: '',
  sealPhoto: null,
  containerNumPhoto: null,
  cartonLabelPhoto: null,
  producePhoto: null,
  temperature: '',
  temperaturePhoto: null,
  temperatureLogCollected: false,
};

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<StepType>(StepType.CONTAINER_DETAILS);
  const [data, setData] = useState<ReportData>(INITIAL_DATA);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  // 6-minute reminder after taking the first carton photo
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (data.cartonLabelPhoto) {
      // 6 minutes = 360,000 ms
      timer = setTimeout(() => {
        const text = "Reminder: It has been 6 minutes. Please pick a box by random and take a photo.";
        
        // Audio Prompt
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          // Ensure voice is loaded (sometimes needed on mobile)
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            utterance.voice = voices[0];
          }
          window.speechSynthesis.speak(utterance);
        }
        
        // Visual Alert
        alert("⏰ " + text);
      }, 360000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [data.cartonLabelPhoto]);

  const updateData = (key: keyof ReportData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case StepType.CONTAINER_DETAILS:
        return data.containerNumber.length > 3;
      case StepType.SEAL_CHECK:
        return !!data.sealPhoto;
      case StepType.INTERNAL_CHECK:
        return !!data.containerNumPhoto;
      case StepType.CARTON_CHECK:
        return !!data.cartonLabelPhoto && !!data.producePhoto;
      case StepType.TEMP_CHECK:
        return !!data.temperaturePhoto && data.temperature.length > 0;
      default:
        return true;
    }
  };

  const steps = [
    { id: StepType.CONTAINER_DETAILS, title: "Start Report", icon: Truck },
    { id: StepType.SEAL_CHECK, title: "Seal Check", icon: CheckCircle2 },
    { id: StepType.INTERNAL_CHECK, title: "Inside View", icon: ScanLine },
    { id: StepType.CARTON_CHECK, title: "Carton Check", icon: Box },
    { id: StepType.TEMP_CHECK, title: "Temperature", icon: Thermometer },
    { id: StepType.REVIEW, title: "Review & Send", icon: Mail },
  ];

  const handleNext = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Header from Instruction Document
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("HABCHI TRADING PTY LTD", margin, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("ABN 15660439403 www.habchi.com.au", margin, yPos);
      yPos += 15;

      // Report Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 101, 52); // Green color matching brand
      doc.text("UNLOADING CONTAINER INSTRUCTION REPORT", margin, yPos);
      yPos += 15;

      // Meta Data
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      
      const dateStr = new Date().toLocaleDateString();
      doc.text(`Date: ${dateStr}`, margin, yPos);
      yPos += 7;
      doc.text(`Container Number: ${data.containerNumber}`, margin, yPos);
      yPos += 7;
      doc.text(`Temperature Reading: ${data.temperature}°C`, margin, yPos);
      yPos += 7;
      doc.text(`Temperature Log Collected: ${data.temperatureLogCollected ? 'Yes' : 'No'}`, margin, yPos);
      yPos += 15;

      // Helper to add image
      const addImageSection = async (title: string, file: File | null) => {
        // Check for page break for title
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(title, margin, yPos);
        yPos += 8;

        if (!file) {
           doc.setFontSize(10);
           doc.setTextColor(150, 0, 0);
           doc.setFont("helvetica", "italic");
           doc.text("[NO IMAGE CAPTURED]", margin, yPos);
           yPos += 10;
           return;
        }

        try {
          const base64 = await readFileAsBase64(file);
          
          // Load image to get dimensions with safety timeout to prevent hanging
          const img = new Image();
          img.src = base64;
          
          await new Promise((resolve, reject) => { 
            const timeoutId = setTimeout(() => {
                img.src = ""; // Stop loading
                reject(new Error("Image load timeout"));
            }, 5000); // 5 second timeout

            img.onload = () => {
              clearTimeout(timeoutId);
              resolve(true);
            };
            img.onerror = (e) => {
              clearTimeout(timeoutId);
              reject(e);
            };
          });

          // Calculate dimensions to fit width, max height 100mm
          const aspectRatio = img.height / img.width;
          let imgWidth = 120; // Fixed width for consistency
          let imgHeight = imgWidth * aspectRatio;
          
          if (imgHeight > 120) {
             imgHeight = 120;
             imgWidth = imgHeight / aspectRatio;
          }

          // Check if image fits on current page
          if (yPos + imgHeight > 280) {
            doc.addPage();
            yPos = 20;
            doc.text(`${title} (cont.)`, margin, yPos);
            yPos += 8;
          }

          // Detect format
          const format = base64.includes('image/png') ? 'PNG' : 'JPEG';

          doc.addImage(base64, format, margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 10;
        } catch (e) {
          console.error("Error adding image to PDF", e);
          doc.setFontSize(10);
          doc.setTextColor(150, 0, 0);
          doc.text(`[Error loading image: ${file.name}]`, margin, yPos);
          yPos += 10;
        }
      };

      await addImageSection("1. Seal on Container Door", data.sealPhoto);
      await addImageSection("2. Inside Container Number & Produce", data.containerNumPhoto);
      await addImageSection("3. Carton Label", data.cartonLabelPhoto);
      await addImageSection("4. Produce Inside Carton", data.producePhoto);
      await addImageSection("5. Temperature Probe Reading", data.temperaturePhoto);

      // Sanitize filename
      const safeContainerNum = data.containerNumber.replace(/[^a-zA-Z0-9]/g, '_') || 'report';
      doc.save(`unpack_container_log_${safeContainerNum}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getEmailBody = () => {
    return `UNLOADING CONTAINER INSTRUCTION REPORT

Container Number: ${data.containerNumber}
Date: ${new Date().toLocaleDateString()}

REPORT DETAILS:

1. Picture of seal while on container door
   Status: ${data.sealPhoto ? 'ATTACHED' : 'MISSING'}

2. Picture of container number on the inside (Right Hand Side)
   Status: ${data.containerNumPhoto ? 'ATTACHED' : 'MISSING'}

3. Carton with labelling (Random selection)
   Status: ${data.cartonLabelPhoto ? 'ATTACHED' : 'MISSING'}

4. Open carton picture of produce
   Status: ${data.producePhoto ? 'ATTACHED' : 'MISSING'}

5. Temperature probe in the product
   Status: ${data.temperaturePhoto ? 'ATTACHED' : 'MISSING'}
   Reading: ${data.temperature}°C

6. Temperature Log located and removed
   Status: ${data.temperatureLogCollected ? 'YES' : 'NO'}

------------------------------------------------
NOTE: Please find the full PDF report and all original photos attached to this email.
`;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case StepType.CONTAINER_DETAILS:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Container Details</h2>
              <p className="text-gray-600 mb-6">Enter the container number to begin the unloading report.</p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Container Number</label>
                <input
                  type="text"
                  value={data.containerNumber}
                  onChange={(e) => updateData('containerNumber', e.target.value.toUpperCase())}
                  placeholder="ABCD 123456 7"
                  className="w-full p-4 text-lg border-0 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white uppercase tracking-wider bg-black/15 placeholder-gray-600 font-semibold text-gray-900 transition-colors"
                />
                <p className="text-xs text-gray-500">This will be used as the email subject line.</p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-800 text-sm">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>Please ensure you identify the correct container number before proceeding.</p>
            </div>
          </div>
        );

      case StepType.SEAL_CHECK:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Seal Verification</h2>
              <CameraInput
                label="Container Seal Photo"
                description="Take a clear picture of the seal while it is still on the container door."
                file={data.sealPhoto}
                onFileChange={(f) => updateData('sealPhoto', f)}
              />
            </div>
          </div>
        );

      case StepType.INTERNAL_CHECK:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Internal Inspection</h2>
              <CameraInput
                label="Interior Photo"
                description="Open door. Take picture of container number on the inside (Right Hand Side) with produce showing in background."
                file={data.containerNumPhoto}
                onFileChange={(f) => updateData('containerNumPhoto', f)}
              />
            </div>
          </div>
        );

      case StepType.CARTON_CHECK:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Random Carton Selection</h2>
              <p className="text-sm text-gray-500 mb-4">Select a carton at random as goods are being removed.</p>
              
              <CameraInput
                label="1. Label Photo"
                description="Picture of the carton with labelling clearly visible."
                file={data.cartonLabelPhoto}
                onFileChange={(f) => updateData('cartonLabelPhoto', f)}
              />
              
              <div className="border-t border-gray-100 my-4"></div>

              <CameraInput
                label="2. Produce Photo"
                description="Open the carton and take a picture of the produce inside."
                file={data.producePhoto}
                onFileChange={(f) => updateData('producePhoto', f)}
              />
            </div>
          </div>
        );

      case StepType.TEMP_CHECK:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Temperature Check</h2>
              
              <div className="mb-6">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Temperature Reading (°C)</label>
                 <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={data.temperature}
                    onChange={(e) => updateData('temperature', e.target.value)}
                    className="w-full p-3 pl-10 border-0 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white bg-black/15 placeholder-gray-600 font-semibold text-gray-900 transition-colors"
                    placeholder="e.g. 4.5"
                  />
                  <Thermometer className="absolute left-3 top-3.5 h-5 w-5 text-gray-600" />
                 </div>
              </div>

              <CameraInput
                label="Probe Photo"
                description="Put temperature probe in the product and take picture of the temperature reading."
                file={data.temperaturePhoto}
                onFileChange={(f) => updateData('temperaturePhoto', f)}
              />

              <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-start gap-3">
                <input
                  type="checkbox"
                  id="log-check"
                  checked={data.temperatureLogCollected}
                  onChange={(e) => updateData('temperatureLogCollected', e.target.checked)}
                  className="mt-1 h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <label htmlFor="log-check" className="text-sm text-gray-700">
                  <strong>Temperature Log collected?</strong>
                  <br />
                  <span className="text-gray-500 text-xs">Usually attached to last pallet. Locate and remove for collection.</span>
                </label>
              </div>
            </div>
          </div>
        );

      case StepType.REVIEW:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Report Ready</h2>
              <p className="text-gray-500 mt-2">Generate PDF and Email the report.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Summary</h3>
              </div>
              <dl className="divide-y divide-gray-100">
                <div className="px-4 py-3 grid grid-cols-3 gap-4 hover:bg-gray-50">
                  <dt className="text-sm font-medium text-gray-500">Container</dt>
                  <dd className="text-sm text-gray-900 col-span-2 font-mono">{data.containerNumber || 'N/A'}</dd>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-4 hover:bg-gray-50">
                  <dt className="text-sm font-medium text-gray-500">Temp</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{data.temperature ? `${data.temperature}°C` : 'N/A'}</dd>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-4 hover:bg-gray-50">
                  <dt className="text-sm font-medium text-gray-500">Log Found</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{data.temperatureLogCollected ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <h3 className="font-medium text-gray-900">Actions</h3>
              
              <button 
                onClick={generatePDF}
                disabled={isGeneratingPdf}
                className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-700 font-medium transition-colors shadow-sm disabled:opacity-70"
              >
                {isGeneratingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
                {isGeneratingPdf ? 'Generating PDF...' : '1. Download PDF Report'}
              </button>

              <div className="border-t border-gray-100 my-2"></div>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>To: <span className="font-mono text-gray-900">admin@hfresh.com.au</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>CC: <span className="font-mono text-gray-900">admin@hphfresh.com</span></span>
                </div>
              </div>
              
              <a
                href={`mailto:admin@hfresh.com.au?cc=admin@hphfresh.com&subject=${encodeURIComponent(`unpack container log - (${data.containerNumber})`)}&body=${encodeURIComponent(getEmailBody())}`}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-lg hover:bg-secondary font-medium transition-colors shadow-md"
              >
                <Mail className="h-5 w-5" />
                2. Generate Email
              </a>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800">
                <strong>Important:</strong> Please manually attach:
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li>The downloaded PDF report</li>
                  <li>All 5 photos from your gallery</li>
                </ul>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-surface md:max-w-2xl md:border-x md:border-gray-200 shadow-xl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight">HABCHI FRESH</h1>
            <p className="text-xs text-gray-500">Container Inspection Tool</p>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={() => setShowAnalyzer(true)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="AI Image Analysis"
             >
               <FileSearch className="h-6 w-6" />
             </button>
             <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">
               v1.2.1
             </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="flex justify-between px-2 pb-2">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isPast = steps.findIndex(s => s.id === currentStep) > index;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div 
                  className={`h-1.5 w-full rounded-full mx-0.5 mb-1 transition-colors ${
                    isActive ? 'bg-primary' : isPast ? 'bg-primary/40' : 'bg-gray-200'
                  }`} 
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-gray-300'}`}>
                  {step.title.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24">
        {renderStepContent()}
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 w-full max-w-md md:max-w-2xl bg-white border-t border-gray-200 p-4 flex justify-between z-30">
        <button
          onClick={handleBack}
          disabled={steps.findIndex(s => s.id === currentStep) === 0}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            steps.findIndex(s => s.id === currentStep) === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back
        </button>

        {currentStep !== StepType.REVIEW ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center px-6 py-2 rounded-lg font-medium shadow-sm transition-all ${
              canProceed()
                ? 'bg-primary text-white hover:bg-secondary transform hover:translate-y-[-1px]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next
            <ChevronRight className="h-5 w-5 ml-1" />
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="flex items-center px-6 py-2 rounded-lg font-medium bg-gray-800 text-white hover:bg-gray-700 shadow-sm"
          >
            Start New
          </button>
        )}
      </footer>

      {/* AI Chat Assistant */}
      <ChatAssistant />

      {/* AI Image Analyzer Modal */}
      {showAnalyzer && <ImageAnalyzer onClose={() => setShowAnalyzer(false)} />}
    </div>
  );
};

export default App;