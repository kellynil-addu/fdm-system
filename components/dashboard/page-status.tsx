export function PageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block animate-spin">
          <div className="w-8 h-8 border-4 border-[#E2E7EC] border-t-[#5BC4E7] rounded-full" />
        </div>
        <p className="mt-4 text-[#6C7E8E]">{label}</p>
      </div>
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 font-medium">{message}</p>
    </div>
  );
}

