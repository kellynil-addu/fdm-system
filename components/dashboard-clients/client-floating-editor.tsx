'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, X, Loader2 } from 'lucide-react';
import { CONTACT_TYPES, getContactValueError, PERSON_NAME_PATTERN } from '@/lib/validations/client';
import { CIVIL_STATUSES } from '@/lib/types/client';

interface TextModeProps {
  mode: 'text';
  title: string;
  initialValue: string;
  placeholder?: string;
  onSave: (value: string) => Promise<void>;
  trigger?: React.ReactNode;
}

interface ContactEditModeProps {
  mode: 'contact-edit';
  title?: string;
  initialType: string;
  initialValue: string;
  placeholder?: string;
  onSave: (type: string, value: string) => Promise<void>;
  trigger?: React.ReactNode;
}

interface ContactAddModeProps {
  mode: 'contact-add';
  title?: string;
  initialType?: string;
  placeholder?: string;
  onSave: (type: string, value: string) => Promise<void>;
  trigger: React.ReactNode;
}

interface SelectModeProps {
  mode: 'select';
  title: string;
  initialValue: string;
  options: readonly string[] | string[];
  placeholder?: string;
  onSave: (value: string) => Promise<void>;
  trigger?: React.ReactNode;
}

interface CivilStatusModeProps {
  mode: 'civil-status';
  title?: string;
  initialCivilStatus: string;
  initialSpouseName?: string;
  onSave: (civilStatus: string, spouseName?: string) => Promise<void>;
  trigger?: React.ReactNode;
}

export type ClientFloatingEditorProps =
  | TextModeProps
  | ContactEditModeProps
  | ContactAddModeProps
  | SelectModeProps
  | CivilStatusModeProps;

export function ClientFloatingEditor(props: ClientFloatingEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialVal =
    props.mode === 'contact-add' ? '' : props.mode === 'civil-status' ? '' : props.initialValue ?? '';
  const initialTyp =
    props.mode === 'contact-add' || props.mode === 'contact-edit'
      ? props.initialType ?? 'Phone'
      : '';
  const initialCivil =
    props.mode === 'civil-status' ? props.initialCivilStatus || 'Single' : 'Single';
  const initialSpouse =
    props.mode === 'civil-status' ? props.initialSpouseName || '' : '';

  const [value, setValue] = useState(initialVal);
  const [type, setType] = useState(initialTyp);
  const [civilStatus, setCivilStatus] = useState(initialCivil);
  const [spouseName, setSpouseName] = useState(initialSpouse);
  const [error, setError] = useState<string | null>(null);

  // Synchronize field inputs whenever the popover opens.
  function handleOpenChange(open: boolean) {
    if (open) {
      setValue(initialVal);
      setType(initialTyp);
      setCivilStatus(initialCivil);
      setSpouseName(initialSpouse);
      setError(null);
    }
    setIsOpen(open);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (isSaving) return;

    if (props.mode === 'contact-add' || props.mode === 'contact-edit') {
      const message = getContactValueError(type, value);
      if (message) {
        setError(message);
        return;
      }
    }

    if (props.mode === 'civil-status' && civilStatus === 'Married') {
      const trimmedSpouse = spouseName.trim();
      if (!trimmedSpouse) {
        setError('Spouse name is required for married clients');
        return;
      }
      if (trimmedSpouse.length > 100) {
        setError('Spouse name must be 100 characters or fewer');
        return;
      }
      if (!PERSON_NAME_PATTERN.test(trimmedSpouse)) {
        setError('Spouse name can only contain letters, spaces, periods, commas, apostrophes, and hyphens');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (props.mode === 'civil-status') {
        await props.onSave(
          civilStatus,
          civilStatus === 'Married' ? spouseName.trim() : undefined
        );
      } else if (props.mode === 'text' || props.mode === 'select') {
        await props.onSave(value);
      } else {
        await props.onSave(type, value);
      }
      setIsOpen(false);
    } catch {
      // Error feedback is handled by caller toast
    } finally {
      setIsSaving(false);
    }
  }

  const title =
    props.title ??
    (props.mode === 'contact-add'
      ? 'Add contact'
      : props.mode === 'civil-status'
        ? 'Edit civil status'
        : 'Edit contact');

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {props.trigger ?? (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label={title}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-72 space-y-3 p-3"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <PopoverClose asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              aria-label="Close editor"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </PopoverClose>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {props.mode === 'civil-status' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Civil status
                </label>
                <Select
                  value={civilStatus}
                  onValueChange={(next) => {
                    setCivilStatus(next);
                    setError(null);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select civil status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CIVIL_STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="text-xs">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {civilStatus === 'Married' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Spouse name
                  </label>
                  <Input
                    autoFocus
                    value={spouseName}
                    onChange={(e) => {
                      setSpouseName(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. Maria Santos"
                    className="h-8 text-xs"
                    maxLength={100}
                    aria-invalid={Boolean(error)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  {error && <p className="text-[11px] text-destructive">{error}</p>}
                </div>
              )}
            </div>
          ) : props.mode === 'select' ? (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Option
              </label>
              <Select
                value={value}
                onValueChange={(next) => {
                  setValue(next);
                  setError(null);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={props.placeholder ?? 'Select option...'} />
                </SelectTrigger>
                <SelectContent>
                  {props.options.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              {(props.mode === 'contact-add' || props.mode === 'contact-edit') && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Type
                  </label>
                  <Select
                    value={type}
                    onValueChange={(next) => {
                      setType(next);
                      setError(null);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {props.mode === 'text' ? 'Value' : 'Contact value'}
                </label>
                <Input
                  autoFocus
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  placeholder={props.placeholder ?? 'Enter value...'}
                  className="h-8 text-xs"
                  maxLength={200}
                  inputMode={
                    type === 'Email' ? 'email' : type === 'Phone' || type === 'Mobile' ? 'tel' : undefined
                  }
                  aria-invalid={Boolean(error)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                {error && <p className="text-[11px] text-destructive">{error}</p>}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <PopoverClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={isSaving}
              >
                Cancel
              </Button>
            </PopoverClose>
            <Button
              type="submit"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
