import { useEffect, useRef, useState } from "react";
import { arrayUnion, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { FiEye, FiTrash2, FiX } from "react-icons/fi";
import { db } from "../../firebase/config";
import Avatar from "../common/Avatar";
import { useAuth } from "../../context/AuthContext";

const DURATION = 5000;

const timeText = (ts) =>
  ts
    ? ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

function Bar({ state }) {
  const [go, setGo] = useState(false);

  useEffect(() => {
    if (state !== "active") {
      setGo(false);
      return;
    }
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, [state]);

  const width = state === "done" || (state === "active" && go) ? "100%" : "0%";

  return (
    <div className="h-1 flex-1 bg-white/30 rounded overflow-hidden">
      <div
        className="h-full bg-white"
        style={{
          width,
          transition: state === "active" ? `width ${DURATION}ms linear` : "none",
        }}
      />
    </div>
  );
}

export default function StatusViewer({ items, name, photo, isMine, onClose }) {
  const { user } = useAuth();

  // Pehla na-dekha hua status se shuru karo (apna ho toh pehle se)
  const [index, setIndex] = useState(() =>
    isMine
      ? 0
      : Math.max(0, items.findIndex((i) => !i.viewerIds?.includes(user.uid)))
  );
  const [showViewers, setShowViewers] = useState(false);
  const [paused, setPaused] = useState(false);
  const markedRef = useRef(new Set());

  const safeIndex = Math.min(index, items.length - 1);
  const current = items[safeIndex];

  // Same banda 2 baar ho toh ek hi dikhao
  const viewers = [
    ...new Map((current?.viewers || []).map((v) => [v.uid, v])).values(),
  ];

  const next = () => {
    if (safeIndex < items.length - 1) setIndex(safeIndex + 1);
    else onClose();
  };
  const prev = () => setIndex(Math.max(0, safeIndex - 1));

  // Status delete hone ke baad index sahi rakho
  useEffect(() => {
    if (items.length > 0 && index > items.length - 1) {
      setIndex(items.length - 1);
    }
  }, [items.length, index]);

  // Dekha toh "viewed" mark karo
  useEffect(() => {
    if (!current || isMine) return;
    if (current.viewerIds?.includes(user.uid)) return;
    if (markedRef.current.has(current.id)) return;
    markedRef.current.add(current.id);
    updateDoc(doc(db, "statuses", current.id), {
      viewerIds: arrayUnion(user.uid),
      viewers: arrayUnion({
        uid: user.uid,
        name: user.displayName,
        at: Date.now(),
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // 5 second baad auto next
  useEffect(() => {
    if (showViewers || paused) return;
    const t = setTimeout(next, DURATION);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, showViewers, paused]);

  // Apna status delete karo
  const handleDelete = async () => {
    setPaused(true);
    const ok = window.confirm("Delete this status?");
    if (!ok) {
      setPaused(false);
      return;
    }
    try {
      await deleteDoc(doc(db, "statuses", current.id));
    } catch (err) {
      alert("Could not delete: " + err.message);
    }
    setShowViewers(false);
    setPaused(false);
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 p-2 z-20">
        {items.map((it, i) => (
          <Bar
            key={it.id}
            state={i < safeIndex ? "done" : i === safeIndex ? "active" : "todo"}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 pb-2 text-white z-20">
        <div className="flex items-center gap-3">
            <Avatar name={name} photo={photo} size={40} />
          <div>
            <p className="font-semibold leading-tight">
              {isMine ? "My status" : name}
            </p>
            <p className="text-xs text-white/70">{timeText(current.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-2xl">
          {isMine && (
            <button onClick={handleDelete} title="Delete status">
              <FiTrash2 />
            </button>
          )}
          <button onClick={onClose} title="Close">
            <FiX />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {current.type === "text" ? (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: current.bg }}
          >
            <p className="text-white text-3xl text-center font-semibold wrap-break-word">
              {current.text}
            </p>
          </div>
        ) : (
          <>
            <img
              src={current.image}
              alt="status"
              className="max-h-full max-w-full object-contain"
            />
            {current.text && (
              <p className="absolute bottom-6 left-0 right-0 text-center text-white bg-black/50 py-2 px-4">
                {current.text}
              </p>
            )}
          </>
        )}

        {/* Tap zones: left = peeche, right = aage */}
        <div className="absolute inset-0 flex z-10">
          <div className="w-1/3 h-full" onClick={prev} />
          <div className="w-2/3 h-full" onClick={next} />
        </div>
      </div>

      {/* Seen list (sirf apne status par) */}
      {isMine && (
        <div className="z-20 text-white">
          <button
            onClick={() => setShowViewers(!showViewers)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-black/70"
          >
            <FiEye /> Seen by {viewers.length}
          </button>

          {showViewers && (
            <div className="bg-white text-black max-h-64 overflow-y-auto rounded-t-xl">
              {viewers.length === 0 && (
                <p className="p-4 text-center text-gray-500 text-sm">
                  	No views yet
                </p>
              )}
              {[...viewers]
                .sort((a, b) => b.at - a.at)
                .map((v) => (
                  <div
                    key={v.uid}
                    className="flex items-center gap-3 p-3 border-b"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold">
                      {v.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{v.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(v.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}