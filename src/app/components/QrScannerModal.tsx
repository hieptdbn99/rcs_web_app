import React from "react";
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
    <div className="modal-backdrop">
      <div className="scanner-modal">
        {/* Header */}
        <div className="scanner-header">
          <div>
            <h2 className="scanner-title">{getScanLabel(scanTarget)}</h2>
            <p className="muted-text">Đưa QR vào giữa khung camera.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Đóng quét QR">
            X
          </button>
        </div>

        {/* Camera feed */}
        <div className="camera-frame">
          <video ref={videoRef} className="camera-video" muted playsInline />
        </div>

        {/* Error */}
        {scannerError && (
          <div className="notice notice-error scanner-error">
            <span className="notice-mark" aria-hidden="true">!</span>
            <span>{scannerError}</span>
          </div>
        )}

        {/* Stop button */}
        <button
          type="button"
          onClick={onClose}
          className="primary-button scanner-stop"
        >
          Dừng quét
        </button>
      </div>
    </div>
  );
}
