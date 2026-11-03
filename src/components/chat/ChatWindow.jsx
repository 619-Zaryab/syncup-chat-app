import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { onDisconnect, onValue, ref, remove, set } from "firebase/database";
import {
  FiArrowLeft,
  FiInfo,
  FiLogOut,
  FiMinusCircle,
  FiMoreVertical,
  FiPaperclip,
  FiSend,
  FiSmile,
  FiStar,
  FiTrash2,
  FiUserMinus,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { db, rtdb } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { MAX_IMAGE_MB, MAX_VIDEO_MB, uploadMedia } from "../../utils/cloudinary";
import MessageBubble from "./MessageBubble";
import EmojiPicker from "./EmojiPicker";
import MediaPreview from "./MediaPreview";
import GroupInfo from "../group/GroupInfo";
import Avatar from "../common/Avatar";

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// "last seen today at 3:45 PM" / "yesterday" / "12 Oct"
const formatLastSeen = (ms) => {
  if (!ms) return "";
  const d = new Date(ms);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);

  if (diffDays === 0) return `last seen today at ${time}`;
  if (diffDays === 1) return `last seen yesterday at ${time}`;
  const date = d.toLocaleDateString([], { day: "numeric", month: "short" });
  return `last seen ${date} at ${time}`;
};

// Date separator helpers
const msgDate = (m) => (m.createdAt ? m.createdAt.toDate() : new Date());

const dayLabel = (d) => {
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[#f5f7f9] ${
        danger ? "text-red-600" : "text-[#111b21]"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}

export default function ChatWindow({ chat, onBack }) {
  const {
    user,
    favourites,
    toggleFavourite,
    cleared,
    clearChat,
    contacts,
    addContact,
    removeContact,
  } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [menu, setMenu] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  // Media upload
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const isGroup = chat.type === "group";
  const isFav = favourites.includes(chat.id);
  const isContact = !isGroup && contacts.includes(chat.id);

  // Main chat document (groups/{id} or chats/{chatId})
  const chatId = isGroup ? chat.id : [user.uid, chat.id].sort().join("_");
  const metaRef = doc(db, isGroup ? "groups" : "chats", chatId);
  const messagesRef = collection(metaRef, "messages");

  // Live group data: members, photo, admin
  const [members, setMembers] = useState(chat.members || []);
  const [groupPhoto, setGroupPhoto] = useState(chat.photo || null);
  const [adminId, setAdminId] = useState(chat.createdBy || null);
  const [showInfo, setShowInfo] = useState(false);
  const isAdmin = isGroup && adminId === user.uid;

  useEffect(() => {
    if (!isGroup) return;
    return onSnapshot(
      doc(db, "groups", chat.id),
      (snap) => {
        // Group deleted by the admin
        if (!snap.exists()) {
          onBack();
          return;
        }
        const data = snap.data();
        // If I was removed from the group, close the chat
        if (!(data.members || []).includes(user.uid)) {
          onBack();
          return;
        }
        setMembers(data.members || []);
        setGroupPhoto(data.photo || null);
        setAdminId(data.createdBy || null);
      },
      () => onBack()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, isGroup]);

  // Other user's online / last seen (1-to-1 chats only)
  const [presence, setPresence] = useState({ online: false, lastSeen: null });

  useEffect(() => {
    if (isGroup) return;
    const unsub = onValue(ref(rtdb, `status/${chat.id}`), (snap) => {
      const v = snap.val();
      setPresence({
        online: !!v?.connections,
        lastSeen: v?.lastOnline || v?.lastSeen || null,
      });
    });
    return unsub;
  }, [chat.id, isGroup]);

  // Delivery receipts: when did each person's app last receive this chat's messages
  const [deliveredAt, setDeliveredAt] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(rtdb, `delivered/${chatId}`), (snap) =>
      setDeliveredAt(snap.val() || {})
    );
    return unsub;
  }, [chatId]);

  // Typing indicator
  const [typingNames, setTypingNames] = useState([]);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const unsub = onValue(ref(rtdb, `typing/${chatId}`), (snap) => {
      const v = snap.val() || {};
      setTypingNames(
        Object.entries(v)
          .filter(([uid]) => uid !== user.uid)
          .map(([, name]) => name)
      );
    });
    return unsub;
  }, [chatId, user.uid]);

  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      remove(ref(rtdb, `typing/${chatId}/${user.uid}`));
    }
  };

  const notifyTyping = () => {
    const myRef = ref(rtdb, `typing/${chatId}/${user.uid}`);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      set(myRef, user.displayName || "Someone");
      onDisconnect(myRef).remove();
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  };

  // Stop typing when the chat is closed or changed
  useEffect(() => stopTyping, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const typingText =
    typingNames.length === 0
      ? ""
      : isGroup
      ? `${typingNames.join(", ")} typing...`
      : "typing...";

  // The other people (for ticks and unread counts)
  const recipients = isGroup
    ? members.filter((id) => id !== user.uid)
    : [chat.id];

  // Reset my unread count
  const markRead = () =>
    setDoc(
      metaRef,
      {
        ...(isGroup ? {} : { members: [user.uid, chat.id] }),
        unread: { [user.uid]: 0 },
      },
      { merge: true }
    ).catch(() => {});

  useEffect(() => {
    markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  // Messages (realtime)
  useEffect(() => {
    const q = query(messagesRef, orderBy("createdAt"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  // New message: scroll down, reset unread, mark messages as read
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    const last = messages[messages.length - 1];
    if (last && last.senderId !== user.uid) markRead();

    const unseen = messages.filter(
      (m) => m.senderId !== user.uid && !m.readBy?.includes(user.uid)
    );
    if (unseen.length > 0) {
      const batch = writeBatch(db);
      unseen.forEach((m) => {
        batch.update(doc(messagesRef, m.id), {
          readBy: arrayUnion(user.uid),
        });
      });
      batch.commit().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Messages I have not cleared
  const clearedAt = cleared[chatId]?.toMillis?.() || 0;
  const visibleMessages = messages.filter(
    (m) => !m.createdAt || m.createdAt.toMillis() > clearedAt
  );

  const handleChange = (e) => {
    setText(e.target.value);
    if (e.target.value.trim()) notifyTyping();
    else stopTyping();
  };

  // Insert emoji at the cursor
  const addEmoji = (emoji) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    notifyTyping();
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  // Update last message info + other people's unread count
  const updateMeta = (preview) => {
    const unread = {};
    recipients.forEach((id) => (unread[id] = increment(1)));

    return setDoc(
      metaRef,
      {
        ...(isGroup ? {} : { members: [user.uid, chat.id] }),
        lastMessage: preview,
        lastSenderId: user.uid,
        lastMessageAt: serverTimestamp(),
        unread,
      },
      { merge: true }
    );
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    setText("");
    setShowEmoji(false);
    stopTyping();

    await addDoc(messagesRef, {
      text: msg,
      senderId: user.uid,
      senderName: user.displayName,
      readBy: [user.uid],
      createdAt: serverTimestamp(),
    });

    await updateMeta(msg);
  };

  // Pick a photo or video
  const pickFile = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const mb = file.size / 1024 / 1024;

    if (!isImage && !isVideo) {
      alert("Please choose a photo or a video");
      return;
    }
    if (isImage && mb > MAX_IMAGE_MB) {
      alert(`Photos must be under ${MAX_IMAGE_MB} MB`);
      return;
    }
    if (isVideo && mb > MAX_VIDEO_MB) {
      alert(`Videos must be under ${MAX_VIDEO_MB} MB`);
      return;
    }
    setPendingFile(file);
  };

  // Upload the photo/video and send it as a message
  const sendMedia = async (file, caption) => {
    setUploading(true);
    setProgress(0);
    try {
      const { url, kind } = await uploadMedia(file, setProgress);
      const cap = caption.trim();
      stopTyping();

      await addDoc(messagesRef, {
        type: kind,
        mediaUrl: url,
        text: cap,
        senderId: user.uid,
        senderName: user.displayName,
        readBy: [user.uid],
        createdAt: serverTimestamp(),
      });

      const label = kind === "image" ? "📷 Photo" : "🎥 Video";
      await updateMeta(cap ? `${label}: ${cap}` : label);
      setPendingFile(null);
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  // Delete my message for everyone
  const deleteMessage = async (m) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await updateDoc(doc(messagesRef, m.id), {
        deleted: true,
        text: "",
        mediaUrl: null,
      });
      const last = messages[messages.length - 1];
      if (last?.id === m.id) {
        await setDoc(
          metaRef,
          { lastMessage: "This message was deleted" },
          { merge: true }
        );
      }
    } catch (err) {
      alert("Could not delete the message: " + err.message);
    }
  };

  /* ---------- Header menu actions ---------- */
  const handleFavourite = async () => {
    setMenu(false);
    await toggleFavourite(chat.id);
  };

  const handleClearChat = async () => {
    setMenu(false);
    if (!window.confirm("Clear all messages in this chat? This only affects you.")) {
      return;
    }
    try {
      await clearChat(chatId);
    } catch (err) {
      alert("Could not clear the chat: " + err.message);
    }
  };

  // Just close the chat window (nothing is deleted)
  const handleCloseChat = () => {
    setMenu(false);
    onBack();
  };

  // 1-to-1: add this person to my contacts
  const handleAddContact = async () => {
    setMenu(false);
    try {
      await addContact(chat.id);
    } catch (err) {
      alert("Could not add the contact: " + err.message);
    }
  };

  // 1-to-1: remove from my contacts (and delete the chat for me)
  const handleRemoveContact = async () => {
    setMenu(false);
    if (
      !window.confirm(
        `Remove ${chat.name} from your contacts? This also deletes the chat for you only.`
      )
    ) {
      return;
    }
    try {
      await removeContact(chat.id);
      await clearChat(chatId);
      if (isFav) await toggleFavourite(chat.id);
      onBack();
    } catch (err) {
      alert("Could not remove the contact: " + err.message);
    }
  };

  // Group (admin): delete the whole group and all its messages for everyone
  const handleDeleteGroup = async () => {
    setMenu(false);
    if (
      !window.confirm(
        `Delete the group "${chat.name}" for everyone? All its messages will be permanently deleted.`
      )
    ) {
      return;
    }
    try {
      // Delete the messages first (the rules need the group to still exist)
      const snap = await getDocs(collection(db, "groups", chat.id, "messages"));
      for (let i = 0; i < snap.docs.length; i += 400) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, "groups", chat.id));
      if (isFav) await toggleFavourite(chat.id);
      onBack();
    } catch (err) {
      alert("Could not delete the group: " + err.message);
    }
  };

  // Group (member): leave the group
  const handleLeaveGroup = async () => {
    setMenu(false);
    if (!window.confirm(`Leave the group "${chat.name}"?`)) return;
    try {
      await updateDoc(doc(db, "groups", chat.id), {
        members: arrayRemove(user.uid),
      });
      if (isFav) await toggleFavourite(chat.id);
      onBack();
    } catch (err) {
      alert("Could not leave the group: " + err.message);
    }
  };

  // Tick status of my message: sent / delivered / read
  const messageStatus = (m) => {
    const ts = m.createdAt?.toMillis?.() || 0;
    if (!ts) return "sent"; // still being sent
    if (recipients.every((id) => m.readBy?.includes(id))) return "read";
    const delivered = recipients.every(
      (id) => m.readBy?.includes(id) || (deliveredAt[id] || 0) >= ts
    );
    return delivered ? "delivered" : "sent";
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 h-[64px] shrink-0 px-3 md:px-4 bg-white border-b border-[#eef1f4]">
        <button
          onClick={onBack}
          className="md:hidden text-xl text-[#54656f] p-1"
          aria-label="Back"
        >
          <FiArrowLeft />
        </button>

        <div
          className={`flex items-center gap-3 flex-1 min-w-0 ${
            isGroup ? "cursor-pointer" : ""
          }`}
          onClick={() => isGroup && setShowInfo(true)}
        >
          <Avatar
            name={chat.name}
            photo={isGroup ? groupPhoto : chat.photo}
            size={42}
            group={isGroup}
            zoomable
          />
          <div className="min-w-0">
            <p className="font-semibold text-[16px] text-[#111b21] leading-tight truncate">
              {chat.name}
            </p>
            {typingText ? (
              <p className="text-[13px] text-[#00a884] italic">{typingText}</p>
            ) : isGroup ? (
              <p className="text-[13px] text-[#667781]">
                {members.length} members
              </p>
            ) : presence.online ? (
              <p className="text-[13px] text-[#00a884]">online</p>
            ) : presence.lastSeen ? (
              <p className="text-[13px] text-[#667781]">
                {formatLastSeen(presence.lastSeen)}
              </p>
            ) : null}
          </div>
        </div>

        {/* Three-dots menu */}
        <div className="relative">
          <button
            onClick={() => setMenu(!menu)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#54656f] text-xl hover:bg-[#f3f5f7]"
            title="Menu"
            aria-label="Menu"
          >
            <FiMoreVertical />
          </button>

          {menu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenu(false)}
              />
              <div className="absolute right-0 top-11 z-30 w-60 bg-white rounded-xl shadow-xl border border-[#e9edef] py-1.5">
                <MenuItem
                  icon={
                    isFav ? (
                      <FaStar className="text-yellow-500" />
                    ) : (
                      <FiStar />
                    )
                  }
                  label={isFav ? "Remove from favourites" : "Add to favourites"}
                  onClick={handleFavourite}
                />

                {isGroup && (
                  <MenuItem
                    icon={<FiInfo />}
                    label="Group info"
                    onClick={() => {
                      setMenu(false);
                      setShowInfo(true);
                    }}
                  />
                )}

                {!isGroup &&
                  (isContact ? (
                    <MenuItem
                      icon={<FiUserMinus />}
                      label="Remove contact"
                      onClick={handleRemoveContact}
                    />
                  ) : (
                    <MenuItem
                      icon={<FiUserPlus />}
                      label="Add to contacts"
                      onClick={handleAddContact}
                    />
                  ))}

                <div className="my-1 border-t border-[#eef1f4]" />

                <MenuItem
                  icon={<FiMinusCircle />}
                  label="Clear chat"
                  onClick={handleClearChat}
                />

                <MenuItem
                  icon={<FiX />}
                  label="Close chat"
                  onClick={handleCloseChat}
                />

                {isGroup &&
                  (isAdmin ? (
                    <MenuItem
                      icon={<FiTrash2 />}
                      label="Delete group"
                      danger
                      onClick={handleDeleteGroup}
                    />
                  ) : (
                    <MenuItem
                      icon={<FiLogOut />}
                      label="Leave group"
                      danger
                      onClick={handleLeaveGroup}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-[4%] md:px-[6%] py-4 bg-[#eef1f5] bg-[radial-gradient(#dde3ea_1px,transparent_1px)] [background-size:22px_22px]">
        {visibleMessages.length === 0 && (
          <div className="flex justify-center mt-6">
            <span className="bg-white text-[#667781] text-xs px-3 py-1.5 rounded-full shadow-sm">
              No messages yet. Say hello 👋
            </span>
          </div>
        )}

        {visibleMessages.map((m, idx) => {
          const prev = visibleMessages[idx - 1];
          const showDay =
            !prev || msgDate(prev).toDateString() !== msgDate(m).toDateString();
          const first = showDay || prev.senderId !== m.senderId;

          return (
            <div key={m.id}>
              {showDay && (
                <div className="flex justify-center my-3">
                  <span className="bg-white text-[#667781] text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                    {dayLabel(msgDate(m))}
                  </span>
                </div>
              )}
              <MessageBubble
                message={m}
                isMine={m.senderId === user.uid}
                showName={isGroup}
                first={first}
                status={messageStatus(m)}
                onDelete={
                  m.senderId === user.uid ? () => deleteMessage(m) : undefined
                }
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 bg-[#eef1f5] px-3 pb-3 md:px-4 md:pb-4 pt-1">
        <form
          onSubmit={sendMessage}
          className="relative flex items-center gap-1 bg-white rounded-2xl shadow-md px-2 py-1.5"
        >
          {showEmoji && <EmojiPicker onPick={addEmoji} />}

          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-2xl text-[#667781] hover:bg-[#f3f5f7]"
            title="Emoji"
          >
            <FiSmile />
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-2xl text-[#667781] hover:bg-[#f3f5f7]"
            title="Attach photo or video"
          >
            <FiPaperclip />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={pickFile}
          />

          <input
            ref={inputRef}
            className="flex-1 h-10 bg-transparent px-2 text-[15px] outline-none placeholder:text-[#8696a0]"
            placeholder="Type a message"
            value={text}
            onChange={handleChange}
          />

          <button
            disabled={!text.trim()}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#05b58f] to-[#00997a] text-white flex items-center justify-center transition disabled:from-[#c5ccd0] disabled:to-[#c5ccd0] enabled:hover:opacity-90"
            title="Send"
          >
            <FiSend />
          </button>
        </form>
      </div>

      {/* Photo/video preview + upload */}
      {pendingFile && (
        <MediaPreview
          file={pendingFile}
          uploading={uploading}
          progress={progress}
          onCancel={() => !uploading && setPendingFile(null)}
          onSend={(caption) => sendMedia(pendingFile, caption)}
        />
      )}

      {/* Group info popup (members, admin, photo) */}
      {showInfo && (
        <GroupInfo
          chat={chat}
          members={members}
          adminId={adminId}
          photo={groupPhoto}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}