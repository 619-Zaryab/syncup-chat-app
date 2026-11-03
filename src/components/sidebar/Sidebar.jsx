import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onValue, ref, serverTimestamp, set } from "firebase/database";
import { FiSearch, FiUserPlus, FiUsers } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { IoCheckmarkSharp, IoCheckmarkDoneSharp } from "react-icons/io5";
import { db, rtdb } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import useProfiles from "../../hooks/useProfiles";
import CreateGroup from "../group/CreateGroup";
import StatusList from "../status/StatusList";
import AddContact from "../contacts/AddContact";
import ChooseUsername from "../contacts/ChooseUsername";
import Avatar from "../common/Avatar";

const formatTime = (ts) =>
  ts
    ? ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

const millis = (meta) => meta?.lastMessageAt?.toMillis?.() || 0;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "favourites", label: "Favourites" },
  { id: "groups", label: "Groups" },
  { id: "contacts", label: "Contacts" },
];

const EMPTY_TEXT = {
  all: "No chats yet. Add a contact by their username to start chatting",
  unread: "No unread chats",
  favourites: "No favourites yet. Open a chat and use the menu (⋮) to add it",
  groups: "No groups yet. Use the New group button to create one",
  contacts: "No contacts yet. Add someone by their username",
};

function SectionTitle({ label, count }) {
  return (
    <p className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-[#008069]">
      {label} <span className="font-medium text-[#8696a0]">({count})</span>
    </p>
  );
}

function ChatRow({
  name,
  photo,
  subtitle,
  time,
  unread,
  tick,
  isGroup,
  active,
  isFav,
  onToggleFav,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 mx-2 px-2.5 py-2.5 rounded-xl cursor-pointer transition ${
        active ? "bg-[#e7f6f1]" : "hover:bg-[#f5f7f9]"
      }`}
    >
      <Avatar name={name} photo={photo} size={48} group={isGroup} zoomable />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-[15.5px] text-[#111b21] ${
              unread > 0 ? "font-semibold" : "font-medium"
            }`}
          >
            {name}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {isFav && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFav();
                }}
                title="Remove from favourites"
                className="text-[13px] text-yellow-500"
              >
                <FaStar />
              </button>
            )}
            <span
              className={`text-xs ${
                unread > 0 ? "text-[#00a884] font-semibold" : "text-[#667781]"
              }`}
            >
              {time}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div
            className={`flex items-center gap-1 min-w-0 text-[14px] ${
              unread > 0 ? "text-[#111b21]" : "text-[#667781]"
            }`}
          >
            {tick === "read" && (
              <IoCheckmarkDoneSharp className="text-[#53bdeb] text-base shrink-0" />
            )}
            {tick === "delivered" && (
              <IoCheckmarkDoneSharp className="text-[#8696a0] text-base shrink-0" />
            )}
            {tick === "sent" && (
              <IoCheckmarkSharp className="text-[#8696a0] text-base shrink-0" />
            )}
            <span className="truncate">{subtitle}</span>
          </div>
          {unread > 0 && (
            <span className="bg-[#00a884] text-white text-xs font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ tab, selectedChat, onSelectChat }) {
  const {
    user,
    username,
    profileLoaded,
    favourites,
    toggleFavourite,
    cleared,
    contacts,
  } = useAuth();
  const [filter, setFilter] = useState("all");
  const [groups, setGroups] = useState([]);
  const [chatMeta, setChatMeta] = useState({});
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState(false);
  const [delivered, setDelivered] = useState({});
  const deliveredWritten = useRef({});

  // My groups
  useEffect(() => {
    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user.uid]);

  // 1-to-1 chats: unread count and last message
  useEffect(() => {
    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const otherId = data.members.find((id) => id !== user.uid);
        map[otherId] = data;
      });
      setChatMeta(map);
    });
    return unsub;
  }, [user.uid]);

  // Profiles of my contacts and of people who have a chat with me
  const profileUids = [...new Set([...contacts, ...Object.keys(chatMeta)])];
  const profiles = useProfiles(profileUids);

  const contactProfiles = contacts
    .map((uid) => profiles[uid])
    .filter((p) => p?.name);

  /* ---------- Delivery receipts ---------- */
  // 1) My app is open: tell the sender that their new message reached me
  useEffect(() => {
    const mark = (key, meta) => {
      const last = meta?.lastMessageAt?.toMillis?.();
      if (!last || meta.lastSenderId === user.uid) return;
      if (!(meta.unread?.[user.uid] > 0)) return;
      if (deliveredWritten.current[key] === last) return;
      deliveredWritten.current[key] = last;
      set(ref(rtdb, `delivered/${key}/${user.uid}`), serverTimestamp()).catch(
        () => {}
      );
    };

    Object.entries(chatMeta).forEach(([otherId, meta]) =>
      mark([user.uid, otherId].sort().join("_"), meta)
    );
    groups.forEach((g) => mark(g.id, g));
  }, [chatMeta, groups, user.uid]);

  // 2) Chats where my message is the last one: watch who received it
  const myLastKeys = [
    ...Object.entries(chatMeta)
      .filter(([, m]) => m.lastSenderId === user.uid)
      .map(([otherId]) => [user.uid, otherId].sort().join("_")),
    ...groups.filter((g) => g.lastSenderId === user.uid).map((g) => g.id),
  ];
  const keysStr = [...new Set(myLastKeys)].sort().join(",");

  useEffect(() => {
    const keys = keysStr ? keysStr.split(",") : [];
    const unsubs = keys.map((key) =>
      onValue(ref(rtdb, `delivered/${key}`), (snap) =>
        setDelivered((d) => ({ ...d, [key]: snap.val() || {} }))
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [keysStr]);

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText("@" + username);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const openCreate = () => {
    if (contactProfiles.length === 0) {
      alert("Add a contact first. Groups are created from your contacts.");
      return;
    }
    setShowCreate(true);
  };

  // My last message: "sent" (one tick), "delivered" (two grey) or "read" (two blue)
  const tickFor = (meta, otherIds, key) => {
    if (!meta || meta.lastSenderId !== user.uid) return null;
    if (otherIds.every((id) => (meta.unread?.[id] || 0) === 0)) return "read";
    const last = millis(meta);
    if (!last) return "sent";
    const allDelivered = otherIds.every(
      (id) => (delivered[key]?.[id] || 0) >= last
    );
    return allDelivered ? "delivered" : "sent";
  };

  // Did I clear this chat after its last message?
  const isCleared = (meta, chatKey) =>
    !!meta && (cleared[chatKey]?.toMillis?.() || 0) >= millis(meta);

  /* ---------- Build the full lists (before search / filter) ---------- */
  const allGroupItems = groups
    .slice()
    .sort((a, b) => millis(b) - millis(a))
    .map((g) => {
      const cl = isCleared(g, g.id);
      const hasLast = !cl && !!g.lastMessage;
      return {
        key: g.id,
        id: g.id,
        isGroup: true,
        name: g.name,
        username: "",
        photo: g.photo,
        subtitle: hasLast ? g.lastMessage : `${g.members.length} members`,
        time: hasLast ? formatTime(g.lastMessageAt) : "",
        unread:
          cl || selectedChat?.id === g.id ? 0 : g.unread?.[user.uid] || 0,
        tick: hasLast
          ? tickFor(
              g,
              g.members.filter((id) => id !== user.uid),
              g.id
            )
          : null,
        isFav: favourites.includes(g.id),
        chat: {
          type: "group",
          id: g.id,
          name: g.name,
          members: g.members,
          photo: g.photo || null,
          createdBy: g.createdBy,
        },
      };
    });

  const allContactItems = profileUids
    .filter((uid) => {
      const p = profiles[uid];
      if (!p?.name) return false;
      if (contacts.includes(uid)) return true;
      // Not in my contacts: show only if they really messaged me
      const meta = chatMeta[uid];
      const key = [user.uid, uid].sort().join("_");
      return !!meta?.lastMessage && !isCleared(meta, key);
    })
    .sort((a, b) => millis(chatMeta[b]) - millis(chatMeta[a]))
    .map((uid) => {
      const p = profiles[uid];
      const meta = chatMeta[uid];
      const key = [user.uid, uid].sort().join("_");
      const cl = isCleared(meta, key);
      const hasLast = !cl && !!meta?.lastMessage;
      return {
        key: uid,
        id: uid,
        isGroup: false,
        name: p.name,
        username: p.username || "",
        photo: p.photo,
        subtitle: hasLast
          ? meta.lastMessage
          : p.username
          ? `@${p.username}`
          : "Start a conversation",
        time: hasLast ? formatTime(meta.lastMessageAt) : "",
        unread: cl || selectedChat?.id === uid ? 0 : meta?.unread?.[user.uid] || 0,
        tick: hasLast ? tickFor(meta, [uid], key) : null,
        isFav: favourites.includes(uid),
        chat: { type: "user", id: uid, name: p.name, photo: p.photo || null },
      };
    });

  /* ---------- Chip counts ---------- */
  const everything = [...allGroupItems, ...allContactItems];
  const unreadCount = everything.filter((i) => i.unread > 0).length;
  const favCount = everything.filter((i) => i.isFav).length;

  /* ---------- Apply search + filter ---------- */
  const s = search.trim().toLowerCase().replace(/^@/, "");
  const matches = (i) =>
    i.name.toLowerCase().includes(s) || i.username.includes(s);
  const pass = (i) =>
    filter === "unread" ? i.unread > 0 : filter === "favourites" ? i.isFav : true;

  const shownGroups =
    filter === "contacts" ? [] : allGroupItems.filter((i) => matches(i) && pass(i));
  const shownContacts =
    filter === "groups" ? [] : allContactItems.filter((i) => matches(i) && pass(i));
  const nothing = shownGroups.length + shownContacts.length === 0;

  const renderRow = (i) => (
    <ChatRow
      key={i.key}
      name={i.name}
      photo={i.photo}
      subtitle={i.subtitle}
      time={i.time}
      unread={i.unread}
      tick={i.tick}
      isGroup={i.isGroup}
      isFav={i.isFav}
      active={selectedChat?.id === i.id}
      onToggleFav={() => toggleFavourite(i.id)}
      onClick={() => onSelectChat(i.chat)}
    />
  );

  return (
    <div className="relative flex flex-col h-full w-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 min-h-[64px] py-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/logo-icon.png"
            alt="SyncUp"
            className="md:hidden w-10 h-10 rounded-xl shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold text-[#111b21] leading-tight">
              {tab === "chats" ? "Chats" : "Status"}
            </h1>
            {username && (
              <button
                onClick={copyUsername}
                title="Copy your username"
                className="block text-xs text-[#667781] hover:text-[#00a884] truncate max-w-full"
              >
                {copied ? "Copied!" : `@${username}`}
              </button>
            )}
          </div>
        </div>

        {tab === "chats" && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowAdd(true)}
              title="Add contact"
              aria-label="Add contact"
              className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-lg text-[#008069] bg-[#e7f6f1] hover:bg-[#d6f0e8] transition"
            >
              <FiUserPlus />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 text-sm font-medium text-[#008069] bg-[#e7f6f1] px-3 py-1.5 rounded-full hover:bg-[#d6f0e8] transition"
            >
              <FiUsers />
              <span className="hidden min-[400px]:inline">New group</span>
            </button>
          </div>
        )}
      </div>

      {tab === "status" ? (
        <StatusList />
      ) : (
        <>
          {/* Search */}
          <div className="px-3 pb-2 shrink-0">
            <div className="flex items-center gap-3 bg-[#f3f5f7] rounded-xl px-3 h-10">
              <FiSearch className="text-[#667781] shrink-0" />
              <input
                className="w-full bg-transparent outline-none text-sm placeholder:text-[#667781]"
                placeholder="Search your chats"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 px-3 pb-2.5 overflow-x-auto shrink-0 [scrollbar-width:none]">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              const count =
                f.id === "unread" ? unreadCount : f.id === "favourites" ? favCount : 0;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium transition ${
                    active
                      ? "bg-[#00a884] text-white"
                      : "bg-[#f3f5f7] text-[#54656f] hover:bg-[#e9edef]"
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span
                      className={`text-[11px] font-bold px-1.5 rounded-full ${
                        active
                          ? "bg-white/25 text-white"
                          : f.id === "unread"
                          ? "bg-[#00a884] text-white"
                          : "bg-white text-[#54656f]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-2">
            {shownGroups.length > 0 && (
              <SectionTitle label="Groups" count={shownGroups.length} />
            )}
            {shownGroups.map(renderRow)}

            {shownContacts.length > 0 && (
              <SectionTitle label="Contacts" count={shownContacts.length} />
            )}
            {shownContacts.map(renderRow)}

            {nothing && (
              <div className="text-center text-[#8696a0] text-sm mt-10 px-6">
                <p>{s ? "No results found" : EMPTY_TEXT[filter]}</p>
                {!s && (filter === "all" || filter === "contacts") && (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white bg-[#00a884] px-4 py-2 rounded-full hover:bg-[#008f6f]"
                  >
                    <FiUserPlus /> Add contact
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating add-contact button (phones, chats tab) */}
      {tab === "chats" && (
        <button
          onClick={() => setShowAdd(true)}
          title="Add contact"
          aria-label="Add contact"
          className="md:hidden absolute bottom-4 right-4 z-20 w-14 h-14 rounded-2xl bg-[#00a884] text-white text-2xl flex items-center justify-center shadow-lg shadow-[#00a884]/40 active:scale-95 transition"
        >
          <FiUserPlus />
        </button>
      )}

      {showCreate && (
        <CreateGroup
          users={contactProfiles}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showAdd && (
        <AddContact
          onClose={() => setShowAdd(false)}
          onOpenChat={(chat) => {
            onSelectChat(chat);
            setShowAdd(false);
          }}
        />
      )}

      {/* New accounts (and old ones) must pick a username first */}
      {profileLoaded && !username && <ChooseUsername />}
    </div>
  );
}