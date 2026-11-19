'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, X } from 'lucide-react';
import { useClients } from '@/lib/hooks/use-clients-page';
import { useOcrQueue } from '@/lib/hooks/use-ocr-queue';
import { useMutation } from '@/lib/hooks/use-mutation';
import { uploadClientDocument } from '@/lib/actions/clients';
import { extractClientDetailsFromOcr } from '@/lib/actions/ocr-ai';
import { extractDocumentWithPaddle } from '@/lib/actions/ocr-paddle';
import { CIVIL_STATUSES, GENDERS, type CivilStatus, type Gender } from '@/lib/types/client';
import { clientSchema, type ClientFormData } from '@/lib/validations/client';
import { ClientIdUploadBin, type OcrStage } from './client-id-upload-bin';
import { ClientIdOcrViewer } from './client-id-ocr-viewer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CreateClientModal({ open }: { open: boolean }) {
  const router = useRouter();
  const { createClient, closeDialog } = useClients();
  const { enqueueFile } = useOcrQueue();

  const [idFile, setIdFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [stage, setStage] = useState<OcrStage>('idle');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [stageMessage, setStageMessage] = useState<string>('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [spouseContacts, setSpouseContacts] = useState<string[]>(['']);
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);

  const activeWorkerRef = useRef<boolean>(true);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: '',
      address: '',
      tin_number: '',
      civil_status: null,
      gender: null,
      spouse_name: '',
      spouse_contact: [],
      status: 'Active',
    },
  });

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = form;
  const currentCivilStatus = watch('civil_status');

  const { state, execute } = useMutation(createClient, {
    setError: form.setError,
    onSuccess: async (createdClient) => {
      // If Valid ID was provided, upload it as a client document and enqueue for search indexing.
      if (idFile) {
        setIsUploadingDoc(true);
        try {
          const formData = new FormData();
          formData.set('file', idFile);
          formData.set('document_type', 'Valid ID');
          formData.set('property_id', '');

          const uploadRes = await uploadClientDocument(createdClient.client_id, formData);
          if (uploadRes.success) {
            enqueueFile({
              attachmentId: uploadRes.data.document_id,
              file: idFile,
              fileName: uploadRes.data.file_name ?? idFile.name,
              entityType: 'client_document',
              keywords: `${createdClient.full_name} Valid ID`,
            });
            toast.success('Client created with Valid ID attached');
          } else {
            toast.warning(`Client created, but ID could not be attached: ${uploadRes.error}`);
          }
        } catch (uploadError) {
          console.error('Failed to upload Valid ID:', uploadError);
          toast.warning('Client created, but failed to upload Valid ID.');
        } finally {
          setIsUploadingDoc(false);
        }
      } else {
        toast.success('Client created successfully');
      }

      closeDialog();
      router.push(`/dashboard/clients/${createdClient.client_id}`);
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        full_name: '',
        address: '',
        tin_number: '',
        civil_status: null,
        gender: null,
        spouse_name: '',
        spouse_contact: [],
        status: 'Active',
      });
      setIdFile(null);
      setOcrText('');
      setStage('idle');
      setOcrProgress(0);
      setStageMessage('');
      setAiFields(new Set());
      setSpouseContacts(['']);
      setIsUploadingDoc(false);
      activeWorkerRef.current = true;
    } else {
      activeWorkerRef.current = false;
    }
  }, [open, reset]);

  async function handleFileSelect(file: File) {
    console.log(`[PaddleOCR Client] File selected: "${file.name}" (${file.type}, ${(file.size / 1024).toFixed(1)} KB)`);
    setIdFile(file);
    setOcrText('');
    setStage('ocr-processing');
    setOcrProgress(0);
    setStageMessage('Processing with PaddleOCR Cloud...');
    setAiFields(new Set());

    try {
      let rawText = '';
      let isPaddleSuccess = false;

      // 1. Process document with PaddleOCR Cloud API via Server Action
      try {
        console.log('[PaddleOCR Client] Calling extractDocumentWithPaddle server action...');
        const formData = new FormData();
        formData.append('file', file);
        const paddleRes = await extractDocumentWithPaddle(formData);
        console.log('[PaddleOCR Client] Server action returned:', paddleRes);

        if (!paddleRes.success) {
          console.warn('[PaddleOCR Client] PaddleOCR returned error:', paddleRes.error || paddleRes.fieldErrors);
          setStageMessage(paddleRes.error || 'PaddleOCR extraction failed');
        } else if (paddleRes.data.markdownText) {
          rawText = paddleRes.data.markdownText;
          isPaddleSuccess = true;
          console.log(`[PaddleOCR Client] PaddleOCR succeeded! Extracted ${rawText.length} characters.`);
        } else {
          console.warn('[PaddleOCR Client] PaddleOCR returned empty text.');
          setStageMessage('No text detected on document');
        }
      } catch (paddleErr) {
        console.warn('[PaddleOCR Client] Server action call threw an error:', paddleErr);
        setStageMessage('Failed to connect to OCR service');
      }

      if (!activeWorkerRef.current) return;

      setOcrText(rawText);

      if (!rawText) {
        console.warn('[PaddleOCR Client] No readable text found on document.');
        setStage('complete');
        return;
      }

      // 3. Call OpenRouter to parse structured fields
      console.log(`[PaddleOCR Client] Sending ${rawText.length} characters to OpenRouter AI extraction...`);
      setStage('ai-extracting');
      setStageMessage('Extracting client details with AI...');
      const aiResult = await extractClientDetailsFromOcr({ ocrText: rawText });
      console.log('[PaddleOCR Client] OpenRouter AI extraction result:', aiResult);

      if (!activeWorkerRef.current) return;

      if (aiResult.success && aiResult.data) {
        const fields = aiResult.data;
        const populated = new Set<string>();

        if (fields.full_name) {
          setValue('full_name', fields.full_name, { shouldValidate: true });
          populated.add('full_name');
        }
        if (fields.address) {
          setValue('address', fields.address);
          populated.add('address');
        }
        if (fields.tin_number) {
          setValue('tin_number', fields.tin_number);
          populated.add('tin_number');
        }
        if (fields.civil_status) {
          setValue('civil_status', fields.civil_status);
          populated.add('civil_status');
        }
        if (fields.gender) {
          setValue('gender', fields.gender);
          populated.add('gender');
        }
        if (fields.spouse_name) {
          setValue('spouse_name', fields.spouse_name);
          populated.add('spouse_name');
        }

        setAiFields(populated);
        setStage('complete');
        if (fields.warning) {
          setStageMessage(fields.warning);
        } else if (populated.size > 0) {
          setStageMessage(
            `${populated.size} ${populated.size === 1 ? 'field' : 'fields'} auto-filled ${
              isPaddleSuccess ? 'via PaddleOCR' : ''
            }`.trim()
          );
        } else {
          setStageMessage('Document text extracted');
        }
      } else {
        setStage('complete');
        setStageMessage('OCR completed. Please enter client details.');
      }
    } catch (err) {
      console.error('ID processing failed:', err);
      if (activeWorkerRef.current) {
        setStage('error');
        setStageMessage('Failed to process ID document.');
      }
    }
  }

  function handleFileClear() {
    setIdFile(null);
    setOcrText('');
    setStage('idle');
    setOcrProgress(0);
    setStageMessage('');
    setAiFields(new Set());
  }

  const onSubmit = handleSubmit(async (data) => {
    const validSpouseContacts =
      data.civil_status === 'Married'
        ? spouseContacts.filter((c) => c.trim().length > 0)
        : null;

    await execute({
      full_name: data.full_name,
      address: data.address?.trim() || null,
      tin_number: data.tin_number?.trim() || null,
      civil_status: data.civil_status || null,
      gender: data.gender || null,
      spouse_name: data.civil_status === 'Married' ? data.spouse_name?.trim() || null : null,
      spouse_contact: validSpouseContacts,
      status: 'Active',
    });
  });

  const isPending = state.status === 'pending' || isUploadingDoc;
  const isOcrRunning = stage === 'ocr-processing' || stage === 'ai-extracting';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent
        className={cn(
          'transition-all duration-200 max-h-[90vh] overflow-y-auto',
          idFile ? 'sm:max-w-4xl' : 'sm:max-w-lg'
        )}
      >
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
          <DialogDescription>
            Enter the client&apos;s details to create their record, or upload a Valid ID to auto-fill fields.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          {/* Top Upload Bin for Valid ID */}
          <ClientIdUploadBin
            file={idFile}
            onFileSelect={handleFileSelect}
            onFileClear={handleFileClear}
            stage={stage}
            ocrProgress={ocrProgress}
            stageMessage={stageMessage}
          />

          {/* Form Layout: 2-column split if ID attached, single column otherwise */}
          <div className={cn(idFile && 'grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2')}>
            {/* Left Column: Form Fields */}
            <div className="space-y-3.5">
              <FormField
                id="create-client-name"
                label="Full name"
                placeholder="Juan dela Cruz"
                hint={aiFields.has('full_name') ? '✨ Auto-filled by AI' : undefined}
                error={errors.full_name?.message}
                autoFocus={!idFile}
                {...register('full_name')}
              />

              <FormField
                id="create-client-address"
                label="Address"
                placeholder="Davao City, Philippines"
                hint={aiFields.has('address') ? '✨ Auto-filled by AI' : undefined}
                error={errors.address?.message}
                {...register('address')}
              />

              <FormField
                id="create-client-tin"
                label="TIN number"
                placeholder="123-456-789"
                hint={aiFields.has('tin_number') ? '✨ Auto-filled by AI (Format: XXX-XXX-XXX)' : 'Format: XXX-XXX-XXX (9 digits)'}
                error={errors.tin_number?.message}
                {...register('tin_number')}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="create-client-civil-status" className="text-sm font-medium text-foreground">
                      Civil status
                    </Label>
                    {aiFields.has('civil_status') && (
                      <span className="text-[10px] text-primary flex items-center gap-0.5">
                        <Sparkles className="h-2.5 w-2.5" /> AI
                      </span>
                    )}
                  </div>
                  <Controller
                    control={control}
                    name="civil_status"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? undefined}
                        onValueChange={(val) => field.onChange(val as CivilStatus)}
                      >
                        <SelectTrigger id="create-client-civil-status" className="w-full">
                          <SelectValue placeholder="Select civil status" />
                        </SelectTrigger>
                        <SelectContent>
                          {CIVIL_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.civil_status && (
                    <p className="text-[11px] text-destructive">{errors.civil_status.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="create-client-gender" className="text-sm font-medium text-foreground">
                      Gender
                    </Label>
                    {aiFields.has('gender') && (
                      <span className="text-[10px] text-primary flex items-center gap-0.5">
                        <Sparkles className="h-2.5 w-2.5" /> AI
                      </span>
                    )}
                  </div>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? undefined}
                        onValueChange={(val) => field.onChange(val as Gender)}
                      >
                        <SelectTrigger id="create-client-gender" className="w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.gender && (
                    <p className="text-[11px] text-destructive">{errors.gender.message}</p>
                  )}
                </div>
              </div>

              {currentCivilStatus === 'Married' && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <FormField
                    id="create-client-spouse"
                    label="Spouse name"
                    placeholder="Maria Santos"
                    hint={aiFields.has('spouse_name') ? '✨ Auto-filled by AI' : 'Required for married clients'}
                    error={errors.spouse_name?.message}
                    {...register('spouse_name')}
                  />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Spouse contact
                    </Label>
                    <div className="space-y-1.5">
                      {spouseContacts.map((contact, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Input
                            value={contact}
                            onChange={(e) => {
                              const updated = [...spouseContacts];
                              updated[idx] = e.target.value;
                              setSpouseContacts(updated);
                            }}
                            placeholder={idx === 0 ? 'e.g. 09171234567 or email' : `Contact ${idx + 1}`}
                            className="h-9 text-sm flex-1"
                            maxLength={100}
                            aria-label={`Spouse contact ${idx + 1}`}
                          />
                          {spouseContacts.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => {
                                setSpouseContacts(spouseContacts.filter((_, i) => i !== idx));
                              }}
                              aria-label={`Remove contact ${idx + 1}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {spouseContacts[spouseContacts.length - 1]?.trim().length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-full text-xs gap-1 border-dashed text-muted-foreground hover:text-foreground"
                        onClick={() => setSpouseContacts([...spouseContacts, ''])}
                      >
                        + Add another spouse contact
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: OCR Text Viewer (Beside) */}
            {idFile && (
              <ClientIdOcrViewer
                ocrText={ocrText}
                isLoading={stage === 'ocr-processing'}
                onSetField={(field, val) => {
                  setValue(field, val, { shouldValidate: true });
                }}
              />
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={isPending || isOcrRunning}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isPending}
              disabled={isOcrRunning}
              loadingText={isUploadingDoc ? 'Attaching ID...' : 'Creating...'}
            >
              {idFile ? 'Create & save ID' : 'Create client'}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
