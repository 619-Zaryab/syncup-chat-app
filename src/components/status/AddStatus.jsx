import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

const COLORS = ["#128c7e", "#7c3aed", "#db2777", "#ea580c", "#2563eb", "#1f2937"];

// Photo ko chhota karo taaki Firestore mein save ho sake
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas
          .getContext("2d")
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function AddStatus({ onClose }) {
  const { user } = useAuth();
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [bg, setBg] = useState(COLORS[0]);
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pickImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setImage(await compressImage(file));
      setError("");
    } catch {
      setError("Could not load the photo, try another one");
    }
  };

  const canPost = mode === "text" ? text.trim() : image;

  const post = async () => {
    if (!canPost) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "statuses"), {
        uid: user.uid,
        name: user.displayName,
        type: mode,
        text: text.trim(),
        bg,
        image: mode === "image" ? image : null,
        viewers: [],
        viewerIds: [],
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4">
        <h2 className="text-lg font-bold text-green-600">Add Status</h2>

        {/* Mode toggle */}
        <div className="flex gap-2">
          {["text", "image"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                mode === m ? "bg-green-600 text-white" : "bg-gray-200"
              }`}
            >
              {m === "text" ? "Text" : "Photo"}
            </button>
          ))}
        </div>

        {mode === "text" ? (
          <>
            <div
              className="h-56 rounded-lg flex items-center justify-center p-4"
              style={{ backgroundColor: bg }}
            >
              <textarea
                className="w-full h-full bg-transparent text-white text-xl text-center outline-none resize-none placeholder-white/60 flex items-center"
                placeholder="Type a status..."
                maxLength={200}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBg(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    bg === c ? "border-black" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {image ? (
              <img
                src={image}
                alt="preview"
                className="h-56 w-full object-contain bg-black rounded-lg"
              />
            ) : (
              <label className="h-56 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-500 cursor-pointer">
                Select a photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={pickImage}
                />
              </label>
            )}
            <input
              className="w-full border rounded-lg p-2 outline-none focus:border-green-500"
              placeholder="Caption (optional)"
              maxLength={100}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200">
            Cancel
          </button>
          <button
            onClick={post}
            disabled={busy || !canPost}
            className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
          >
            {busy ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}