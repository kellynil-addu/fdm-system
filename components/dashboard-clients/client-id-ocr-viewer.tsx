'use client';

import { useState } from 'react';
import { Copy, Check, FileText, UserCheck, MapPin, Hash, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClientIdOcrViewerProps {
  ocrText: string;
  isLoading: boolean;
  onSetField?: (field: 'full_name' | 'address' | 'tin_number', value: string) => void;
  className?: string;
}

export function ClientIdOcrViewer({
  ocrText,
  isLoading,
  onSetField,
  className,
}: ClientIdOcrViewerProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const lines = ocrText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  async function handleCopyAll() {
    if (!ocrText) return;
    try {
      await navigator.clipboard.writeText(ocrText);
      setCopiedAll(true);
      toast.success('All extracted text copied to clipboard');
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }

  async function handleCopyLine(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      toast.error('Failed to copy line');
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-lg border border-border bg-card p-4 space-y-3 min-h-[360px] max-h-[560px]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Extracted ID Text</h3>
          {lines.length > 0 && !isLoading && (
            <Badge variant="outline-warm" shape="pill" className="text-[10px] py-0 px-2">
              {lines.length} {lines.length === 1 ? 'line' : 'lines'}
            </Badge>
          )}
        </div>

        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="h-7 text-xs gap-1.5 shrink-0"
          onClick={handleCopyAll}
          disabled={isLoading || !ocrText}
        >
          {copiedAll ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copiedAll ? 'Copied' : 'Copy all'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2.5 py-4 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
            <span>Scanning and recognizing text from document...</span>
          </div>
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : !ocrText ? (
        <div className="flex flex-col items-center justify-center flex-1 py-10 text-center text-muted-foreground space-y-1">
          <FileText className="h-8 w-8 stroke-[1.5] text-muted-foreground/60 mb-1" />
          <p className="text-sm font-medium text-foreground">No text extracted yet</p>
          <p className="text-xs max-w-[220px]">
            Upload or drop a Valid ID above to automatically extract and view copyable text.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="lines" className="flex flex-col flex-1 min-h-0">
          <TabsList className="grid grid-cols-2 h-7 w-full mb-2">
            <TabsTrigger value="lines" className="text-xs py-1">
              Lines (Quick copy)
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs py-1">
              Raw Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lines" className="flex-1 overflow-y-auto space-y-1 pr-1 mt-0">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="group flex items-center justify-between gap-2 rounded-md p-1.5 text-xs hover:bg-muted/60 transition-colors border border-transparent hover:border-border/60"
              >
                <span className="truncate flex-1 select-all font-mono text-foreground" title={line}>
                  {line}
                </span>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                  {onSetField && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => onSetField('full_name', line)}
                      title="Use as Full Name"
                      aria-label={`Use "${line}" as Full Name`}
                    >
                      <UserCheck className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopyLine(line, idx)}
                    title="Copy this line"
                    aria-label={`Copy line: ${line}`}
                  >
                    {copiedIndex === idx ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="raw" className="flex-1 mt-0 min-h-0">
            <textarea
              readOnly
              value={ocrText}
              className="w-full h-full min-h-[200px] resize-none rounded-md border border-border bg-muted/20 p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary select-all"
              aria-label="Raw OCR Extracted Text"
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
