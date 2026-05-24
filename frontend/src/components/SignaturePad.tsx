import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string | null) => void;
  className?: string;
  label?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, className = '', label = 'Sign Here' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [savedSignature]); // Re-init when not saved

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (savedSignature) return; // Prevent drawing if already saved
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    canvas.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || savedSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasSignature(false);
    setSavedSignature(null);
    onSave(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSavedSignature(dataUrl);
    onSave(dataUrl);
  };

  if (savedSignature) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <img src={savedSignature} alt="Signature" className="h-20 object-contain bg-white rounded-lg border border-transparent" />
        <div className="flex gap-2 print:hidden">
          <button onClick={handleClear} className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full">Clear</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className} print:hidden`}>
      <div className="relative bg-white rounded-xl border-2 border-dashed border-gray-300 overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          width={300}
          height={80}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="cursor-crosshair touch-none"
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between w-full px-2">
        <button
          onClick={handleClear}
          disabled={!hasSignature}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          disabled={!hasSignature}
          className="text-xs font-bold text-primary hover:opacity-80 disabled:opacity-50"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
};
