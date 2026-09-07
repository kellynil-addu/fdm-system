import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

interface FormFieldProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  hint?: string;
  labelClassName?: string;
}

export function FormField({ id, label, hint, labelClassName, className, ...inputProps }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={cn('text-[#1A1D20] font-medium text-sm', labelClassName)}>
        {label}
      </Label>
      <Input
        id={id}
        className={cn(
          'bg-[#F5F3EC] border-[#E2E7EC] text-[#1A1D20] placeholder:text-[#A0A8B0] focus:border-[#5BC4E7] focus:ring-[#5BC4E7] rounded-lg',
          className
        )}
        {...inputProps}
      />
      {hint && <p className="text-xs text-[#6C7E8E]">{hint}</p>}
    </div>
  );
}
