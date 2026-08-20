"use client";

import { useEffect, useState } from "react";

interface AudioPreviewProps {
  blob: Blob;
  className?: string;
}

export default function AudioPreview({ blob, className }: AudioPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) return null;

  return <audio controls src={url} className={className ?? "w-full"} />;
}
