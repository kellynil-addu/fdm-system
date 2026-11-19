'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DOCUMENT_FILE_ACCEPT, MAX_DOCUMENT_BYTES } from '@/lib/validations/document';
import { cn } from '@/lib/utils';

export type OcrStage = 'idle' | 'ocr-processing' | 'ai-extracting' | 'complete' | 'error';

interface ClientIdUploadBinProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  stage: OcrStage;
  ocrProgress: number;
  stageMessage?: string;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ClientIdUploadBin({
  file,
  onFileSelect,
  onFileClear,
  stage,
  ocrProgress,
  stageMessage,
  className,
}: ClientIdUploadBinProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(picked: File | null) {
    if (!picked) return;
    if (picked.size > MAX_DOCUMENT_BYTES) {
      setSizeError('File exceeds 10MB limit.');
      return;
    }
    setSizeError(null);
    onFileSelect(picked);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    handleFile(dropped);
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          e.target.value = '';
          handleFile(picked);
        }}
      />

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))]'
              : 'border-border hover:border-primary/50 hover:bg-muted/40 bg-muted/15'
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border group-hover:scale-105 transition-transform">
            <Upload className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">
            Drop Valid ID here or <span className="text-primary underline">browse</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Scanned ID or photo (PDF, JPG, PNG up to 10MB) • OCR & AI auto-fill
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted border border-border">
                <FileText className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)} • {file.type || 'Document'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={stage === 'ocr-processing' || stage === 'ai-extracting'}
              >
                Change
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onFileClear}
                aria-label="Remove ID file"
                disabled={stage === 'ocr-processing' || stage === 'ai-extracting'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status strip */}
          <div className="pt-1 border-t border-border/60">
            {stage === 'ocr-processing' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    Reading document with OCR...
                  </span>
                  <span>{Math.round(ocrProgress * 100)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(5, Math.min(100, Math.round(ocrProgress * 100)))}%` }}
                  />
                </div>
              </div>
            )}

            {stage === 'ai-extracting' && (
              <div className="flex items-center gap-2 text-xs text-foreground py-0.5">
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span className="font-medium">Extracting client details with AI...</span>
              </div>
            )}

            {stage === 'complete' && (
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="flex items-center gap-1.5 text-success font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {stageMessage || 'Details auto-filled from ID'}
                </span>
                <Badge variant="success" shape="pill" className="text-[10px] py-0 px-2">
                  AI Extracted
                </Badge>
              </div>
            )}

            {stage === 'error' && (
              <div className="flex items-center gap-1.5 text-xs text-destructive py-0.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{stageMessage || 'Could not parse fields automatically. Please fill manually.'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {sizeError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {sizeError}
        </p>
      )}
    </div>
  );
}
