"use client";

import { useRef, useCallback } from "react";
import { Paperclip, Camera, X, AlertCircle } from "lucide-react";

export interface AttachedImage {
  mimeType: string;
  data: string; // base64
  previewUrl: string; // object URL for thumbnail
  fileName: string;
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

interface ImageAttachProps {
  image: AttachedImage | null;
  onAttach: (img: AttachedImage) => void;
  onRemove: () => void;
  error: string;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export default function ImageAttach({
  image,
  onAttach,
  onRemove,
  error,
  onError,
  disabled,
}: ImageAttachProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      onError("");

      if (!ALLOWED_TYPES.includes(file.type)) {
        onError("Only PNG, JPG, and WebP images are allowed.");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        onError(
          `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 4 MB.`
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // result is "data:<mime>;base64,<data>"
        const base64Data = result.split(",")[1];
        if (!base64Data) {
          onError("Failed to read image data.");
          return;
        }
        onAttach({
          mimeType: file.type,
          data: base64Data,
          previewUrl: URL.createObjectURL(file),
          fileName: file.name,
        });
      };
      reader.onerror = () => onError("Failed to read image file.");
      reader.readAsDataURL(file);
    },
    [onAttach, onError]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="flex items-center gap-1">
      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {isMobile && (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* Attach button */}
      {!image && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="h-[42px] w-[42px] rounded-xl border border-border bg-background text-muted hover:text-accent-700 hover:border-accent-300 hover:bg-accent-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center shrink-0"
            title="Attach image"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {isMobile && (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={disabled}
              className="h-[42px] w-[42px] rounded-xl border border-border bg-background text-muted hover:text-accent-700 hover:border-accent-300 hover:bg-accent-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center shrink-0"
              title="Take photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* Thumbnail preview */}
      {image && (
        <div className="relative group">
          <img
            src={image.previewUrl}
            alt="Attached"
            className="h-[42px] w-[42px] rounded-xl object-cover border border-accent-300 shadow-sm"
          />
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(image.previewUrl);
              onRemove();
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100 animate-[fadeIn_0.2s_ease-out]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
