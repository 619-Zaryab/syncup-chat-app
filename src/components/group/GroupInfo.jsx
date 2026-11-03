import { useState } from "react";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { FiCamera, FiUserMinus, FiX } from "react-icons/fi";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import useProfiles from "../../hooks/useProfiles";
import { compressSquare } from "../../utils/image";
import Avatar from "../common/Avatar";

export default function GroupInfo({ chat, members, adminId, photo, onClose }) {
  const { user, contacts } = useAuth();
  const isAdmin = adminId === user.uid;

  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const memberProfiles = useProfiles(members);
  const contactProfiles = useProfiles(contacts);

  // Admin first, then me, then the rest
  const rank = (u) => (u.uid === adminId ? 0 : u.uid === user.uid ? 1 : 2);
  const currentMembers = members
    .map((uid) => ({ uid, ...memberProfiles[uid] }))
    .filter((u) => u.name)
    .sort((a, b) => rank(a) - rank(b));

  // Only my contacts who are not in the group yet
  const candidates = contacts
    .filter((uid) => !members.includes(uid))
    .map((uid) => contactProfiles[uid])
    .filter((p) => p?.name);

  const toggle = (uid) =>
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );

  const addMembers = async () => {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "groups", chat.id), {
        members: arrayUnion(...selected),
      });
      setSelected([]);
      setAdding(false);
    } catch (err) {
      alert("Could not add: " + err.message);
    }
    setBusy(false);
  };

  const removeMember = async (u) => {
    if (!window.confirm(`Remove ${u.name} from the group?`)) return;
    try {
      await updateDoc(doc(db, "groups", chat.id), {
        members: arrayRemove(u.uid),
      });
    } catch (err) {
      alert("Could not remove: " + err.message);
    }
  };

  const changePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressSquare(file, 200);
      await updateDoc(doc(db, "groups", chat.id), { photo: dataUrl });
    } catch (err) {
      alert("Could not save photo: " + err.message);
    }
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-xl">
            <FiX />
          </button>
        </div>

        {/* Group photo and name */}
        <div className="flex flex-col items-center gap-2">
          {isAdmin ? (
            <label
              className="relative cursor-pointer"
              title="Change group photo"
            >
              <Avatar name={chat.name} photo={photo} size={80} group />
              <span className="absolute bottom-0 right-0 bg-green-600 text-white p-1.5 rounded-full text-sm">
                <FiCamera />
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={changePhoto}
              />
            </label>
          ) : (
            <Avatar name={chat.name} photo={photo} size={80} group zoomable />
          )}
          <h2 className="text-lg font-bold text-green-600">{chat.name}</h2>
          <p className="text-sm text-gray-500">{currentMembers.length} members</p>
        </div>

        {!adding ? (
          <>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {currentMembers.map((u) => (
                <div
                  key={u.uid}
                  className="flex items-center gap-3 p-3 border-b"
                >
                  <Avatar name={u.name} photo={u.photo} size={36} zoomable />
                  <span className="flex-1 truncate">
                    {u.uid === user.uid ? "You" : u.name}
                  </span>

                  {u.uid === adminId && (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded">
                      Admin
                    </span>
                  )}

                  {isAdmin && u.uid !== user.uid && (
                    <button
                      onClick={() => removeMember(u)}
                      className="text-red-500 text-lg"
                      title="Remove from group"
                    >
                      <FiUserMinus />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin ? (
              <button
                onClick={() => setAdding(true)}
                className="w-full py-2 rounded-lg bg-green-600 text-white font-semibold"
              >
                Add members
              </button>
            ) : (
              <p className="text-center text-xs text-gray-400">
                Only the admin can add or remove members and change the group photo
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">Who do you want to add?</p>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {candidates.length === 0 && (
                <p className="p-4 text-center text-gray-500 text-sm">
                  No more contacts to add. Add people to your contacts first
                </p>
              )}
              {candidates.map((u) => (
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
              <button
                onClick={() => {
                  setAdding(false);
                  setSelected([]);
                }}
                className="px-4 py-2 rounded-lg bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={addMembers}
                disabled={busy || selected.length === 0}
                className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
              >
                {busy ? "Adding..." : "Add"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}