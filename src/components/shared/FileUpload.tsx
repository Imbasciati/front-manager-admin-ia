import { UploadCloud, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "../ui/button";

export function FileUpload({
  files,
  onChange,
  progress,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  progress?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-dashed border-white/20 p-4">
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="w-full">
        <UploadCloud className="mr-2 h-4 w-4" />
        Selecionar documentos
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => onChange([...(e.target.files ?? [])])}
      />
      {typeof progress === "number" && (
        <div className="mt-3 h-2 rounded bg-white/10">
          <div className="h-2 rounded bg-primary" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="mt-3 space-y-2">
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded bg-white/5 px-3 py-2 text-sm">
            <span>{file.name}</span>
            <button
              type="button"
              onClick={() => onChange(files.filter((_, i) => i !== index))}
              className="text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

