import React from "react";
import { AlertCircle, Square, X } from "lucide-react";
import type { ScanTarget } from "@/lib/rcsTypes";
import { getScanLabel } from "@/lib/rcsFormSchemas";

type Props = {
  scanTarget: ScanTarget;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  scannerError: string;
  onClose: () => void;
};

export function QrScannerModal({ scanTarget, videoRef, scannerError, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 md:items-center md:justify-center md:p-6">
      <div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl md:max-w-lg md:rounded-2xl">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{getScanLabel(scanTarget)}</h2>
            <p className="text-sm text-slate-500">Đưa QR vào giữa khung camera.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Đóng quét QR">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera feed */}
        <div className="overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="aspect-[3/4] w-full object-cover md:aspect-video" muted playsInline />
        </div>

        {/* Error */}
        {scannerError && (
          <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{scannerError}</span>
          </div>
        )}

        {/* Stop button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white active:bg-slate-700"
        >
          <Square className="h-4 w-4" />
          Dừng quét
        </button>
      </div>
    </div>
  );
}
