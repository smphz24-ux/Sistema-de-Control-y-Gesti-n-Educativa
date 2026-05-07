import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Maximize2, Minimize2, FileText, Smartphone, Laptop } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ExamType } from '../types';

interface OpticalSheetPreviewProps {
  examType: ExamType;
  siteName: string;
  slogan: string;
  logo: string | null;
  primaryColor: string;
  onClose: () => void;
}

const OpticalSheetPreview: React.FC<OpticalSheetPreviewProps> = ({ examType, siteName, slogan, logo, primaryColor, onClose }) => {
  const [orientation, setOrientation] = useState<'p' | 'l'>('p');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormatPrompt, setShowFormatPrompt] = useState(false);

  const [zoom, setZoom] = useState(1);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 248, g: 250, b: 252 };
  };

  const rgb = hexToRgb(primaryColor);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  const contrastTextColor = brightness > 125 ? 'black' : 'white';
  const contrastSubtextColor = brightness > 125 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';

  // Helper for generating PDF (used only for download)
  const handleDownload = (format: 'single' | 'double') => {
    const isDouble = format === 'double';
    
    // Determine PDF orientation based on sheet orientation and format
    // Double portrait sheets go on Landscape A4
    // Double landscape sheets go on Portrait A4
    let pdfOrientation: 'p' | 'l' = orientation;
    if (isDouble) {
      pdfOrientation = orientation === 'p' ? 'l' : 'p';
    }

    const doc = new jsPDF({
      orientation: pdfOrientation,
      unit: 'mm',
      format: 'a4'
    });
    
    const circleRadiusTarget = isDouble ? 2.5 : 3.0; // 5mm or 6mm diameter

    const drawSheet = (pdf: jsPDF, xOrigin: number, yOrigin: number, width: number, height: number) => {
      // Draw watermark logo in center
      if (logo) {
        try {
          const watermarkSize = Math.min(width, height) * 0.4;
          const centerX = xOrigin + (width / 2) - (watermarkSize / 2);
          const centerY = yOrigin + (height / 2) - (watermarkSize / 2);
          
          // Save state and set opacity
          pdf.saveGraphicsState();
          const gState = new (pdf as any).GState({ opacity: 0.1 });
          pdf.setGState(gState);
          
          pdf.addImage(logo, 'PNG', centerX, centerY, watermarkSize, watermarkSize);
          
          // Restore state
          pdf.restoreGraphicsState();
        } catch (e) {
          console.error("Error drawing watermark", e);
        }
      }

      // Draw background/border reference for clarity if needed, or just follow margins
      const rgb = hexToRgb(primaryColor);
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(xOrigin + 10, yOrigin + 8, width - 20, 38, 'F');
      
      // Determine if text should be white or black based on brightness (simple check)
      const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
      const textColor = brightness > 125 ? 0 : 255;
      
      pdf.setTextColor(textColor, textColor, textColor);
      pdf.setFontSize(isDouble ? 12 : 16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(siteName.toUpperCase(), xOrigin + 15, yOrigin + 18);
      
      pdf.setFontSize(isDouble ? 7 : 8);
      pdf.setFont('helvetica', 'normal');
      // Subtext in header: slight transparency effect using contrast color
      if (textColor === 255) {
        pdf.setTextColor(220, 220, 220); // Off-white for dark bg
      } else {
        pdf.setTextColor(80, 80, 80); // Gray for light bg
      }
      pdf.text(slogan, xOrigin + 15, yOrigin + 24, { maxWidth: (width * 0.55) });
      
      pdf.setTextColor(textColor, textColor, textColor);
      pdf.setFontSize(isDouble ? 9 : 12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FICHA ÓPTICA DE EVALUACIÓN', xOrigin + width - 15, yOrigin + 30, { align: 'right' });
      
      pdf.setFontSize(isDouble ? 8 : 10);
      pdf.text(examType.name.toUpperCase(), xOrigin + width - 15, yOrigin + 36, { align: 'right' });
      
      // Reset for body
      pdf.setFontSize(isDouble ? 7 : 8);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      const dataY = yOrigin + 55;
      const lineSpacing = isDouble ? 8 : 10;
      
      pdf.text('INSTITUCIÓN:', xOrigin + 15, dataY);
      pdf.line(xOrigin + 38, dataY + 1, xOrigin + (width / 2) - 5, dataY + 1);
      
      pdf.text('DNI / CÓDIGO:', xOrigin + (width / 2) + 5, dataY);
      const dniLabelWidth = pdf.getTextWidth('DNI / CÓDIGO:');
      pdf.line(xOrigin + (width / 2) + 5 + dniLabelWidth + 2, dataY + 1, xOrigin + width - 15, dataY + 1);
      
      pdf.text('ESTUDIANTE:', xOrigin + 15, dataY + lineSpacing);
      const studentLabelWidth = pdf.getTextWidth('ESTUDIANTE:');
      pdf.line(xOrigin + 15 + studentLabelWidth + 2, dataY + lineSpacing + 1, xOrigin + width - 15, dataY + lineSpacing + 1);
      
      pdf.text('GRADO/SECC:', xOrigin + 15, dataY + (lineSpacing * 2));
      const gradeLabelWidth = pdf.getTextWidth('GRADO/SECC:');
      pdf.line(xOrigin + 15 + gradeLabelWidth + 2, dataY + (lineSpacing * 2) + 1, xOrigin + width * 0.65, dataY + (lineSpacing * 2) + 1);
      
      pdf.text('OTROS:', xOrigin + (width * 0.65) + 5, dataY + (lineSpacing * 2));
      const otherLabelWidth = pdf.getTextWidth('OTROS:');
      pdf.line(xOrigin + (width * 0.65) + 5 + otherLabelWidth + 2, dataY + (lineSpacing * 2) + 1, xOrigin + width - 15, dataY + (lineSpacing * 2) + 1);
      
      const startGridY = yOrigin + (isDouble ? 80 : 90);
      const numQuestions = examType.numQuestions;
      
      let totalCols = orientation === 'p' ? 3 : 4;
      if (orientation === 'p') {
        if (numQuestions > 40) totalCols = 4;
        if (numQuestions > 80) totalCols = 5;
        if (numQuestions > 120) totalCols = 6;
      } else {
        if (numQuestions > 50) totalCols = 5;
        if (numQuestions > 100) totalCols = 6;
        if (numQuestions > 150) totalCols = 8;
      }
      
      const questionsPerCol = Math.ceil(numQuestions / totalCols);
      const margin = 12;
      const gridWidth = width - (margin * 2);
      const colWidth = gridWidth / totalCols;
      
      const maxAvailableHeight = height - (startGridY - yOrigin) - 25; 
      let rowHeight = Math.min(isDouble ? 8 : 9.5, maxAvailableHeight / questionsPerCol);
      if (rowHeight < (orientation === 'l' ? 6 : 5)) rowHeight = (orientation === 'l' ? 6 : 5);
      
      const minGap = 1.5;
      let circleRadius = Math.min(circleRadiusTarget, rowHeight * 0.42);
      let optionSpacing = 2 * circleRadius + minGap;

      if (optionSpacing * 5 + 8 > colWidth) {
        const availableSpacing = (colWidth - 8) / 5;
        optionSpacing = Math.max(isDouble ? 4.5 : 5.5, availableSpacing);
        circleRadius = (optionSpacing - minGap) / 2;
        if (circleRadius < 1.2) circleRadius = 1.2;
      }
      
      for (let i = 0; i < numQuestions; i++) {
        const colIndex = Math.floor(i / questionsPerCol);
        const rowIndex = i % questionsPerCol;
        const x = xOrigin + margin + (colIndex * colWidth);
        const y = startGridY + (rowIndex * rowHeight);

        pdf.setFontSize(isDouble ? 7 : 9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${(i + 1).toString().padStart(2, '0')}.`, x, y + (rowHeight * 0.7));

        const options = ['A', 'B', 'C', 'D', 'E'];
        options.forEach((opt, idx) => {
          const optX = x + (isDouble ? 6 : 10) + (idx * optionSpacing);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.2);
          pdf.circle(optX, y + (rowHeight * 0.6), circleRadius, 'S');
          
          pdf.setFontSize(circleRadius * 2.8);
          pdf.text(opt, optX - (circleRadius * 0.35), y + (rowHeight * 0.6) + (circleRadius * 0.4));
        });
      }
      
      pdf.setFillColor(248, 250, 252);
      pdf.rect(xOrigin + 10, yOrigin + height - 20, width - 20, 12, 'F');
      pdf.setFontSize(isDouble ? 6 : 7.5);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(80, 80, 80);
      pdf.text('INSTRUCCIONES: Use lápiz 2B. Rellene completamente el círculo.', xOrigin + 15, yOrigin + height - 14);
      pdf.text('NO ARRUGAR ESTA HOJA.', xOrigin + 15, yOrigin + height - 10);
    };

    const pageWidthTotal = doc.internal.pageSize.getWidth();
    const pageHeightTotal = doc.internal.pageSize.getHeight();

    if (isDouble) {
      if (orientation === 'p') {
        // Double Portrait on Landscape A4 (Side-by-Side)
        const sheetWidth = pageWidthTotal / 2;
        const sheetHeight = pageHeightTotal;
        drawSheet(doc, 0, 0, sheetWidth, sheetHeight);
        drawSheet(doc, sheetWidth, 0, sheetWidth, sheetHeight);
        // Add a cutting line in the middle
        doc.setDrawColor(200, 200, 200);
        (doc as any).setLineDash([2, 2]);
        doc.line(sheetWidth, 0, sheetWidth, pageHeightTotal);
      } else {
        // Double Landscape on Portrait A4 (Top-Bottom)
        const sheetWidth = pageWidthTotal;
        const sheetHeight = pageHeightTotal / 2;
        drawSheet(doc, 0, 0, sheetWidth, sheetHeight);
        drawSheet(doc, 0, sheetHeight, sheetWidth, sheetHeight);
        // Add a cutting line in the middle
        doc.setDrawColor(200, 200, 200);
        (doc as any).setLineDash([2, 2]);
        doc.line(0, sheetHeight, pageWidthTotal, sheetHeight);
      }
    } else {
      // Single sheet
      drawSheet(doc, 0, 0, pageWidthTotal, pageHeightTotal);
    }
    
    doc.save(`Ficha_Optica_${examType.name}_${format}_${orientation}.pdf`);
    setShowFormatPrompt(false);
  };
  
  // Helper for HTML preview calculations (Sync with PDF thresholds)
  const numQuestions = examType.numQuestions;
  let totalCols = orientation === 'p' ? 3 : 4;
  if (orientation === 'p') {
    if (numQuestions > 40) totalCols = 4;
    if (numQuestions > 80) totalCols = 5;
    if (numQuestions > 120) totalCols = 6;
  } else {
    if (numQuestions > 50) totalCols = 5;
    if (numQuestions > 100) totalCols = 6;
    if (numQuestions > 150) totalCols = 8;
  }
  const questionsPerCol = Math.ceil(numQuestions / totalCols);
  
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 md:p-10 animate-fade-in">
      <div className="bg-white rounded-[2rem] w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up border border-slate-200">
        {/* Header */}
        <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-center bg-slate-50 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tight">Vista Previa Profesional</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{examType.name} • {examType.numQuestions} Preguntas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 p-1 rounded-xl">
              <button 
                onClick={() => setOrientation('p')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${orientation === 'p' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Smartphone size={14} /> Vertical
              </button>
              <button 
                onClick={() => setOrientation('l')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${orientation === 'l' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Laptop size={14} /> Horizontal
              </button>
            </div>
            
            <div className="hidden lg:flex items-center gap-2 bg-slate-200 p-1 rounded-xl ml-2">
               <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-2 hover:bg-white/50 rounded-lg text-slate-600"><Minimize2 size={16} /></button>
               <span className="text-[10px] font-black w-10 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="p-2 hover:bg-white/50 rounded-lg text-slate-600"><Maximize2 size={16} /></button>
            </div>

            <button 
              onClick={onClose}
              className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
  
        {/* Content - HTML PREVIEW */}
        <div className="flex-1 bg-slate-200 overflow-auto p-4 md:p-8 flex justify-center no-scrollbar">
          <div 
            className={`bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] origin-top transition-all duration-300 relative print:shadow-none mb-10`}
            style={{ 
              width: orientation === 'p' ? '210mm' : '297mm',
              minHeight: orientation === 'p' ? '297mm' : '210mm',
              padding: '12mm',
              transform: `scale(${zoom})`,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Watermark HTML */}
            {logo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] p-20">
                <img src={logo} alt="Watermark" className="w-1/2 max-w-[300px] grayscale" referrerPolicy="no-referrer" />
              </div>
            )}

            {/* Header Mirror */}
            <div 
              className="p-6 rounded-lg mb-8 flex justify-between items-start border border-slate-100 shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
               <div className="space-y-1">
                 <h1 className="text-xl font-black tracking-tight leading-none" style={{ color: contrastTextColor }}>{siteName.toUpperCase()}</h1>
                 <p className="text-[9px] font-medium max-w-[250px] uppercase tracking-wider" style={{ color: contrastSubtextColor }}>{slogan}</p>
               </div>
               <div className="text-right">
                 <h2 className="text-base font-black leading-none" style={{ color: contrastTextColor }}>FICHA ÓPTICA DE EVALUACIÓN</h2>
                 <p className="font-black text-xs mt-1 uppercase tracking-widest" style={{ color: contrastTextColor }}>{examType.name}</p>
               </div>
            </div>
  
            {/* Input Data Mirror */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-6 mb-8">
               <div className="space-y-1">
                 <div className="flex items-end gap-2">
                   <span className="text-[9px] font-black text-black whitespace-nowrap">INSTITUCIÓN:</span>
                   <div className="flex-1 border-b-2 border-black h-5"></div>
                 </div>
               </div>
               <div className="space-y-1">
                 <div className="flex items-end gap-2">
                   <span className="text-[9px] font-black text-black whitespace-nowrap">DNI / CÓDIGO:</span>
                   <div className="flex-1 border-b-2 border-black h-5"></div>
                 </div>
               </div>
               <div className="col-span-2 space-y-1">
                 <div className="flex items-end gap-2">
                   <span className="text-[9px] font-black text-black whitespace-nowrap">ESTUDIANTE (Apellidos y Nombres):</span>
                   <div className="flex-1 border-b-2 border-black h-5"></div>
                 </div>
               </div>
               <div className="space-y-1">
                 <div className="flex items-end gap-2">
                   <span className="text-[9px] font-black text-black whitespace-nowrap">GRADO / SECC. / BLOQUE:</span>
                   <div className="flex-1 border-b-2 border-black h-5"></div>
                 </div>
               </div>
               <div className="space-y-1">
                 <div className="flex items-end gap-2">
                   <span className="text-[9px] font-black text-black whitespace-nowrap">OTROS:</span>
                   <div className="flex-1 border-b-2 border-black h-5"></div>
                 </div>
               </div>
            </div>
  
            {/* Questions Grid Mirror */}
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${totalCols}, 1fr)`, gap: orientation === 'p' ? '10mm' : '5mm' }}>
                {Array.from({ length: totalCols }).map((_, colIdx) => (
                  <div key={colIdx} className="space-y-1">
                    {Array.from({ length: questionsPerCol }).map((_, rowIdx) => {
                      const qIndex = colIdx * questionsPerCol + rowIdx;
                      if (qIndex >= numQuestions) return null;
                      return (
                        <div key={rowIdx} className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-black w-6">{String(qIndex + 1).padStart(2, '0')}.</span>
                          <div className="flex gap-2">
                            {['A', 'B', 'C', 'D', 'E'].map(opt => (
                              <div key={opt} 
                                className="rounded-full border-[1.5px] border-black flex items-center justify-center text-[8px] font-black text-black select-none"
                                style={{ width: '6mm', height: '6mm' }}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
  
            {/* Footer Mirror */}
            <div className="mt-auto pt-8 border-t-4 border-slate-100 space-y-2">
               <p className="text-[8px] font-black text-black uppercase tracking-widest leading-relaxed">
                 INSTRUCCIONES: Use lápiz 2B. Marque solo una opción por pregunta rellenando completamente el círculo. Evite borrones y tachaduras que puedan invalidar su respuesta.
               </p>
               <p className="text-[8px] font-black text-rose-600 uppercase tracking-[0.2em]">
                 ESTA HOJA SERÁ PROCESADA ÓPTICAMENTE POR EL SISTEMA. MANTÉNGALA LIMPIA, PLANA Y SIN ARRUGAS.
               </p>
            </div>
          </div>
        </div>
  
        {/* Footer Actions */}
        <div className="p-6 md:p-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
          <div className="flex items-center gap-4 text-emerald-600 bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">
              Vista previa lista para descarga
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={onClose}
              className="flex-1 md:flex-none px-10 py-5 rounded-2xl bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
            >
              Volver
            </button>
            <button 
              onClick={() => setShowFormatPrompt(true)}
              className="flex-1 md:flex-none px-10 py-5 rounded-2xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Download size={18} /> Descargar PDF
            </button>
          </div>
        </div>
  
        {/* Format Selection Modal */}
        {showFormatPrompt && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-[600]">
            <div className="bg-white p-8 rounded-3xl shadow-2xl space-y-6 max-w-sm">
              <h3 className="text-lg font-black uppercase tracking-tight text-center">Seleccionar Formato</h3>
              <div className="grid grid-cols-1 gap-4">
                 <button onClick={() => handleDownload('single')} className="px-6 py-4 rounded-xl bg-indigo-50 text-indigo-700 font-bold">1 Cara (A4 Normal - 6mm)</button>
                 <button onClick={() => handleDownload('double')} className="px-6 py-4 rounded-xl bg-indigo-50 text-indigo-700 font-bold">2 por cara (Doble - 5mm)</button>
                 <button onClick={() => setShowFormatPrompt(false)} className="px-6 py-4 rounded-xl bg-slate-100 text-slate-700 font-bold">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
  
export default OpticalSheetPreview;
