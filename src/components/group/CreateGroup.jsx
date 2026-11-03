import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

export default function CreateGroup({ users, onClose }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const toggle = (uid) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const createGroup = async () => {
    if (!name.trim() || selected.length === 0) return;
    setBusy(true);
    await addDoc(collection(db, "groups"), {
      name: name.trim(),
      members: [user.uid, ...selected],
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4">
        <h2 className="text-lg font-bold text-green-600">New Group</h2>

        <input
          className="w-full border rounded-lg p-3 outline-none focus:border-green-500"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <p className="text-sm text-gray-600">	Select members:</p>
        <div className="max-h-60 overflow-y-auto border rounded-lg">
          {users.map((u) => (
            <label
              key={u.uid}
              className="flex items-center gap-3 p-3 border-b cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(u.uid)}
                onChange={() => toggle(u.uid)}
              />
              <span>{u.name}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200">
            Cancel
          </button>
          <button
            onClick={createGroup}
            disabled={busy || !name.trim() || selected.length === 0}
            className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
          >
            {busy ? "	Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}