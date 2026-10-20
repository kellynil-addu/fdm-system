'use client';

import { useState } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parseFdmSoaCsv, type ParsedBillingAccountRecord } from '@/lib/billing/csv-importer';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';

interface BillingCsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingCsvImportModal({
  open,
  onOpenChange,
}: BillingCsvImportModalProps) {
  const { importCsv, isImportingCsv } = useBillingAccounts();
  const [csvContent, setCsvContent] = useState('');
  const [parsePreview, setParsePreview] = useState<ParsedBillingAccountRecord[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleTextChange = (text: string) => {
    setCsvContent(text);
    if (!text.trim()) {
      setParsePreview(null);
      setParseError(null);
      return;
    }

    try {
      const records = parseFdmSoaCsv(text);
      setParsePreview(records);
      setParseError(records.length === 0 ? 'No recognizable SOA records found' : null);
    } catch (err: unknown) {
      setParsePreview(null);
      const message = err instanceof Error ? err.message : String(err);
      setParseError(message || 'Failed to parse CSV');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleTextChange(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) return;
    await importCsv({ csv_content: csvContent });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Statement of Account (CSV)
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Ingest FDM Statement of Account spreadsheet exports to establish accounts and historical receipts.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border p-4 text-center">
            <div className="mx-auto flex flex-col items-center gap-1.5">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Select an FDM SOA CSV file or paste spreadsheet text below
              </p>
              <label htmlFor="csv-file" className="cursor-pointer">
                <Button variant="quiet" size="sm" className="mt-1 text-xs" asChild>
                  <span>Browse File</span>
                </Button>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="csv-text" className="text-xs font-medium text-foreground">
              CSV Content
            </label>
            <Textarea
              id="csv-text"
              placeholder="Paste raw CSV content here..."
              value={csvContent}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={5}
              className="font-mono text-xs"
            />
          </div>

          {parseError && (
            <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {parseError}
            </p>
          )}

          {parsePreview && parsePreview.length > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-2 bg-row-hover/50">
              <p className="text-xs font-semibold text-foreground">
                Detected {parsePreview.length} Statement Record{parsePreview.length === 1 ? '' : 's'}:
              </p>
              <div className="max-h-36 overflow-auto space-y-1.5">
                {parsePreview.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs rounded bg-card p-2 border border-border"
                  >
                    <div>
                      <span className="font-semibold text-foreground">
                        {rec.accountName}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {rec.projectArea} · Block {rec.blockNo} Lot {rec.lotNo}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-foreground">
                        ₱{rec.totalSellingPrice?.toLocaleString()}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {rec.payments?.length ?? 0} receipt(s)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="quiet"
            onClick={() => onOpenChange(false)}
            disabled={isImportingCsv}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!parsePreview || parsePreview.length === 0 || isImportingCsv}
            className="gap-1.5"
          >
            {isImportingCsv && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Ingestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
