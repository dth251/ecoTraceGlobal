import { useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

const MAX_BYTES = 20 * 1024 * 1024; // 20MB

export interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  disabled?: boolean;
}

const DEFAULT_ACCEPT: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

export function FileDropzone({
  onFilesAccepted,
  accept = DEFAULT_ACCEPT,
  maxSize = MAX_BYTES,
  disabled = false,
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const [rejections, setRejections] = useState<FileRejection[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize,
    disabled,
    onDrop: (acceptedFiles, fileRejections) => {
      setRejections(fileRejections);
      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
    },
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={clsx(
          "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          isDragActive
            ? "border-brand bg-brand-50/60"
            : "border-slate-300 bg-white hover:border-brand hover:bg-slate-50",
        )}
      >
        <input {...getInputProps()} aria-label={t("documents.dropzoneTitle")} />
        <p className="text-sm font-medium text-slate-700">{t("documents.dropzoneTitle")}</p>
      </div>
      {rejections.length > 0 && (
        <ul role="alert" className="space-y-1 text-xs text-danger">
          {rejections.map(({ file, errors }) => (
            <li key={file.name}>
              {file.name}: {errors.map((e) => e.message).join(", ")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
