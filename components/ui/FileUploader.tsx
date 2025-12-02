
import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, FileText, CheckCircle } from 'lucide-react';
import { uploadMedia } from '../../services/dataService';
import { useToast } from './Toast';

interface FileUploaderProps {
  onUpload: (url: string) => void;
  initialUrl?: string;
  accept?: string;
  label?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, initialUrl, accept = "image/*", label = "Upload File" }) => {
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(initialUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size check (e.g. 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showToast('File too large (Max 5MB)', 'error');
        return;
    }

    setIsUploading(true);
    try {
        const url = await uploadMedia(file);
        setPreview(url);
        onUpload(url);
        showToast('Upload successful!', 'success');
    } catch (error) {
        console.error(error);
        showToast('Upload failed', 'error');
    } finally {
        setIsUploading(false);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
      e.stopPropagation();
      setPreview('');
      onUpload('');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerClick = () => {
      fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept={accept}
            onChange={handleFileChange}
        />
        
        {preview ? (
            <div className="relative group rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-2 flex items-center gap-3">
                {accept.includes('image') ? (
                    <div className="w-16 h-16 rounded overflow-hidden bg-stone-200 flex-shrink-0">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-16 h-16 rounded bg-stone-200 dark:bg-stone-700 flex items-center justify-center flex-shrink-0 text-stone-500">
                        <FileText size={24} />
                    </div>
                )}
                
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-stone-700 dark:text-stone-300 truncate">File Uploaded</p>
                    <p className="text-[10px] text-green-600 flex items-center"><CheckCircle size={10} className="mr-1"/> Ready to submit</p>
                </div>

                <button 
                    type="button"
                    onClick={clearFile}
                    className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        ) : (
            <div 
                onClick={triggerClick}
                className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                    ${isUploading 
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10 cursor-wait' 
                        : 'border-stone-300 dark:border-stone-700 hover:border-amber-500 hover:bg-stone-50 dark:hover:bg-stone-800'}
                `}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center text-amber-600">
                        <Loader2 size={24} className="animate-spin mb-2" />
                        <span className="text-xs font-bold">Uploading to Drive...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-stone-500 dark:text-stone-400">
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-[10px] mt-1 text-stone-400">Click to browse (Max 5MB)</span>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
