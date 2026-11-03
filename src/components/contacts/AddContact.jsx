import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { FiCheck, FiMessageCircle, FiSearch, FiUserPlus, FiX } from "react-icons/fi";
import { db } from "../../firebase/config";
import { USERNAME_RE, useAuth } from "../../context/AuthContext";
import Avatar from "../common/Avatar";

export default function AddContact({ onClose, onOpenChat }) {
  const { user, contacts, addContact } = useAuth();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const isContact = result && contacts.includes(result.uid);
  const isMe = result && result.uid === user.uid;

  const search = async (e) => {
    e.preventDefault();
    const name = query.trim().replace(/^@/, "").toLowerCase();
    setResult(null);
    setMessage("");

    if (!USERNAME_RE.test(name)) {
      setMessage("Enter a valid username (3-20 letters, numbers, dots or underscores)");
      return;
    }

    setBusy(true);
    try {
      const claim = await getDoc(doc(db, "usernames", name));
      const profile = claim.exists()
        ? await getDoc(doc(db, "users", claim.data().uid))
        : null;

      if (profile?.exists()) setResult(profile.data());
      else setMessage("No user found with that username");
    } catch (err) {
      setMessage("Search failed: " + err.message);
    }
    setBusy(false);
  };

  const add = async () => {
    setBusy(true);
    try {
      await addContact(result.uid);
    } catch (err) {
      setMessage("Could not add the contact: " + err.message);
    }
    setBusy(false);
  };

  const openChat = () =>
    onOpenChat({
      type: "user",
      id: result.uid,
      name: result.name,
      photo: result.photo || null,
    });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#111b21]">Add contact</h2>
          <button onClick={onClose} className="text-xl text-[#54656f]" aria-label="Close">
            <FiX />
          </button>
        </div>

        <form onSubmit={search} className="flex gap-2">
          <div className="flex-1 flex items-center border-[1.5px] border-[#e4e3e8] rounded-xl px-3 focus-within:border-[#00a884]">
            <span className="text-[#667781]">@</span>
            <input
              autoFocus
              className="flex-1 py-2.5 px-1 outline-none text-[15px]"
              placeholder="username"
              value={query}
              onChange={(e) =>
                setQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_.@]/g, ""))
              }
            />
          </div>
          <button
            disabled={busy || !query.trim()}
            className="w-11 rounded-xl bg-[#00a884] text-white flex items-center justify-center disabled:opacity-50"
            title="Search"
          >
            <FiSearch />
          </button>
        </form>

        {message && (
          <p className="text-sm text-[#667781] bg-[#f3f5f7] rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        {result && (
          <div className="flex items-center gap-3 border border-[#e9edef] rounded-xl p-3">
            <Avatar name={result.name} photo={result.photo} size={48} zoomable />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#111b21] truncate">{result.name}</p>
              <p className="text-sm text-[#667781] truncate">@{result.username}</p>
            </div>

            {isMe ? (
              <span className="text-xs text-[#667781]">This is you</span>
            ) : isContact ? (
              <button
                onClick={openChat}
                className="flex items-center gap-1.5 text-sm font-medium text-[#008069] bg-[#e7f6f1] px-3 py-1.5 rounded-full"
              >
                <FiMessageCircle /> Message
              </button>
            ) : (
              <button
                onClick={add}
                disabled={busy}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#00a884] px-3 py-1.5 rounded-full disabled:opacity-60"
              >
                <FiUserPlus /> Add
              </button>
            )}
          </div>
        )}

        {isContact && !isMe && (
          <p className="flex items-center gap-1.5 text-sm text-[#008069]">
            <FiCheck /> In your contacts
          </p>
        )}
      </div>
    </div>
  );
}