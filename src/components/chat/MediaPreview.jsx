import { useEffect, useState } from "react";
import { FiSend, FiX } from "react-icons/fi";

export default function MediaPreview({
  file,
  uploading,
  progress,
  onCancel,
  onSend,
}) {
  const [caption, setCaption] = useState("");
  const [url, setUrl] = useState(null);
  const isVideo = file.type.startsWith("video/");

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="p-3 flex justify-end">
        <button
          onClick={onCancel}
          disabled={uploading}
          className="text-white text-2xl disabled:opacity-30"
        >
          <FiX />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {url &&
          (isVideo ? (
            <video
              src={url}
              controls
              className="max-h-full max-w-full rounded-lg"
            />
          ) : (
            <img
              src={url}
              alt="preview"
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          ))}
      </div>

      <div className="p-3 bg-black/60">
        {uploading && (
          <div className="mb-3">
            <div className="h-2 bg-white/20 rounded overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white text-xs mt-1 text-center">
              Uploading... {progress}%
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-white rounded-full px-4 py-2 outline-none disabled:opacity-60"
            placeholder="Add a caption (optional)"
            value={caption}
            disabled={uploading}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            onClick={() => onSend(caption)}
            disabled={uploading}
            className="bg-green-600 text-white p-3 rounded-full disabled:opacity-50"
          >
            <FiSend />
          </button>
        </div>
      </div>
    </div>
  );
}