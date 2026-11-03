import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiUsers, FiX } from "react-icons/fi";

export default function Avatar({
  name = "?",
  photo,
  size = 48,
  group = false,
  zoomable = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const style = { width: size, height: size, minWidth: size };
  const canZoom = zoomable && !!photo;

  // Esc dabane par band
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (photo) {
    return (
      <>
        <img
          src={photo}
          alt={name}
          style={style}
          onClick={
            canZoom
              ? (e) => {
                  e.stopPropagation();
                  setOpen(true);
                }
              : undefined
          }
          className={`rounded-full object-cover shrink-0 ${
            canZoom ? "cursor-zoom-in hover:opacity-90 transition" : ""
          } ${className}`}
        />

        {open &&
          createPortal(
            <div
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-6 cursor-zoom-out"
            >
              <button
                className="absolute top-4 right-4 text-white text-3xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                aria-label="Close"
              >
                <FiX />
              </button>
              <img
                src={photo}
                alt={name}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl cursor-default"
              />
              <p className="mt-4 text-white text-lg font-medium">{name}</p>
            </div>,
            document.body
          )}
      </>
    );
  }

  return (
    <div
      style={{ ...style, fontSize: size * 0.4 }}
      className={`rounded-full shrink-0 text-white flex items-center justify-center font-bold ${
        group ? "bg-[#00a884]" : "bg-[#9aa7b0]"
      } ${className}`}
    >
      {group ? <FiUsers /> : name[0]?.toUpperCase()}
    </div>
  );
}