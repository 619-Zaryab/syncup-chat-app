import { useState } from "react";
import { IoCheckmarkSharp, IoCheckmarkDoneSharp } from "react-icons/io5";
import { FiSlash, FiTrash2, FiX } from "react-icons/fi";

const NAME_COLORS = [
  "#d4571e",
  "#1f7aec",
  "#a0580d",
  "#7a3dc2",
  "#0e7490",
  "#b91c1c",
  "#4d7c0f",
  "#be185d",
];

const colorFor = (id = "") =>
  NAME_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % NAME_COLORS.length];

// status: "sent" (one tick) | "delivered" (two grey ticks) | "read" (two blue ticks)
function Ticks({ status }) {
  if (status === "sent") {
    return <IoCheckmarkSharp className="text-white/65 text-base" />;
  }
  return (
    <IoCheckmarkDoneSharp
      className={`text-base ${
        status === "read" ? "text-[#6ee0ff]" : "text-white/65"
      }`}
    />
  );
}

export default function MessageBubble({
  message,
  isMine,
  showName,
  first,
  status,
  onDelete,
}) {
  const [menu, setMenu] = useState(false);
  const [zoom, setZoom] = useState(false);
  const deleted = message.deleted;
  const isImage = message.type === "image" && message.mediaUrl;
  const isVideo = message.type === "video" && message.mediaUrl;
  const hasMedia = !deleted && (isImage || isVideo);

  const time = message.createdAt
    ? message.createdAt
        .toDate()
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} ${
        first ? "mt-2.5" : "mt-0.5"
      }`}
    >
      <div
        onClick={() => onDelete && !deleted && setMenu(!menu)}
        className={`max-w-[82%] md:max-w-[65%] ${
          hasMedia ? "w-72" : ""
        } px-3 py-1.5 rounded-2xl shadow-sm ${
          isMine
            ? "bg-gradient-to-br from-[#05b58f] to-[#00997a] text-white"
            : "bg-white text-[#111b21]"
        } ${first ? (isMine ? "rounded-tr-md" : "rounded-tl-md") : ""} ${
          onDelete && !deleted ? "cursor-pointer" : ""
        }`}
      >
        {showName && !isMine && first && (
          <p
            className="text-[13px] font-semibold mb-0.5"
            style={{ color: colorFor(message.senderId) }}
          >
            {message.senderName}
          </p>
        )}

        {deleted ? (
          <p
            className={`flex items-center gap-1.5 italic text-sm ${
              isMine ? "text-white/80" : "text-[#667781]"
            }`}
          >
            <FiSlash />
            {isMine ? "You deleted this message" : "This message was deleted"}
          </p>
        ) : (
          <>
            {isImage && (
              <img
                src={message.mediaUrl}
                alt="Photo"
                loading="lazy"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(true);
                }}
                className="rounded-xl max-h-72 w-full object-cover cursor-zoom-in mt-1 mb-1"
              />
            )}
            {isVideo && (
              <video
                src={message.mediaUrl}
                controls
                preload="metadata"
                onClick={(e) => e.stopPropagation()}
                className="rounded-xl max-h-72 w-full bg-black mt-1 mb-1"
              />
            )}
            {message.text && (
              <p className="wrap-break-word whitespace-pre-wrap text-[14.5px] leading-[1.4]">
                {message.text}
              </p>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-1 -mt-0.5">
          <span
            className={`text-[11px] ${
              isMine ? "text-white/75" : "text-[#667781]"
            }`}
          >
            {time}
          </span>
          {isMine && !deleted && <Ticks status={status} />}
        </div>

        {menu && !deleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenu(false);
              onDelete();
            }}
            className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-medium text-red-600 bg-white rounded-lg py-1.5 hover:bg-red-50"
          >
            <FiTrash2 /> Delete for everyone
          </button>
        )}

        {/* Full screen photo */}
        {zoom && isImage && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setZoom(false);
            }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              className="absolute top-4 right-4 text-white text-3xl"
              onClick={(e) => {
                e.stopPropagation();
                setZoom(false);
              }}
            >
              <FiX />
            </button>
            <img
              src={message.mediaUrl}
              alt="Photo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}