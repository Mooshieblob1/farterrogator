import React, { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClear: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, selectedImage, onClear }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      processFile(event.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageSelect(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onImageSelect]);

  const handleClear = () => {
    setPreviewUrl(null);
    onClear();
  };

  if (selectedImage && previewUrl) {
    return (
      <div className="relative group w-full h-full min-h-[300px] bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center transition-colors duration-300">
        <img 
          src={previewUrl} 
          alt="Preview" 
          className="max-w-full max-h-[600px] object-contain"
        />
        <button 
          onClick={handleClear}
          className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-200 rounded-full hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors border border-slate-200 dark:border-slate-700 backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`
        relative w-full h-[400px] rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-4
        ${isDragging 
          ? 'border-red-500 bg-red-500/10 dark:bg-red-500/10' 
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-600'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      
      <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
        <Upload className={`w-8 h-8 ${isDragging ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`} />
      </div>
      
      <div className="text-center space-y-1">
        <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
          Drop image here or click to upload
        </p>
        <p className="text-sm text-slate-500">
          Supports JPG, PNG, WEBP (Max 10MB)
        </p>
      </div>
    </div>
  );
};