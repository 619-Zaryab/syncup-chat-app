import { useEffect, useState } from "react";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { FiPlus } from "react-icons/fi";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import useProfiles from "../../hooks/useProfiles";
import AddStatus from "./AddStatus";
import StatusViewer from "./StatusViewer";
import Avatar from "../common/Avatar";

const DAY = 24 * 60 * 60 * 1000;

const ms = (s) => s.createdAt?.toMillis?.() || Date.now();

const timeText = (s) =>
  new Date(ms(s)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// segments: [true, false, ...] -> true = seen (grey), false = new (green)
function StatusRing({ name, photo, segments }) {
  const size = 56;
  const stroke = 3;
  const r = 26;
  const C = 2 * Math.PI * r;
  const total = segments.length;
  const gap = total > 1 ? 4 : 0;
  const seg = total > 0 ? C / total - gap : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {total > 0 && (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          {segments.map((seen, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              stroke={seen ? "#d1d5db" : "#22c55e"}
              strokeDasharray={`${seg} ${C - seg}`}
              strokeDashoffset={-(i * (C / total))}
            />
          ))}
        </svg>
      )}
      <div className="absolute inset-[6px]">
        <Avatar name={name} photo={photo} size={44} />
      </div>
    </div>
  );
}

export default function StatusList() {
  const { user, photo: myPhoto, contacts } = useAuth();
  const [statuses, setStatuses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [viewing, setViewing] = useState(null); // { uid, name }

  // Statuses from the last 24 hours (realtime)
  useEffect(() => {
    const since = Timestamp.fromMillis(Date.now() - DAY);
    const q = query(collection(db, "statuses"), where("createdAt", ">", since));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStatuses([...new Map(list.map((s) => [s.id, s])).values()]);
    });
    return unsub;
  }, []);

  // Profile photos of the people who posted
  const profiles = useProfiles([...new Set(statuses.map((s) => s.uid))]);

  // Group statuses by person
  const grouped = {};
  statuses.forEach((s) => {
    if (!grouped[s.uid]) grouped[s.uid] = [];
    grouped[s.uid].push(s);
  });
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => ms(a) - ms(b)));

  const mine = grouped[user.uid] || [];

  // Only my contacts' statuses are shown
  const others = Object.entries(grouped)
    .filter(([uid]) => uid !== user.uid && contacts.includes(uid))
    .map(([uid, items]) => ({
      uid,
      name: profiles[uid]?.name || items[0].name,
      items,
      allSeen: items.every((i) => i.viewerIds?.includes(user.uid)),
      last: items[items.length - 1],
    }))
    .sort((a, b) =>
      a.allSeen === b.allSeen ? ms(b.last) - ms(a.last) : a.allSeen ? 1 : -1
    );

  const viewingItems = viewing ? grouped[viewing.uid] || [] : [];

  const openMine = () =>
    mine.length > 0
      ? setViewing({ uid: user.uid, name: user.displayName })
      : setShowAdd(true);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* My status */}
      <div className="flex items-center gap-3 p-3 border-b">
        <div className="cursor-pointer" onClick={openMine}>
          <StatusRing
            name={user.displayName}
            photo={myPhoto}
            segments={mine.map(() => false)}
          />
        </div>

        <div className="flex-1 cursor-pointer" onClick={openMine}>
          <p className="font-medium">My status</p>
          <p className="text-xs text-gray-500">
            {mine.length > 0
              ? `${mine.length} status, ${timeText(mine[mine.length - 1])}`
              : "Tap + to add a status"}
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center"
          title="New status"
        >
          <FiPlus />
        </button>
      </div>

      {/* Contacts' statuses */}
      {others.length > 0 && (
        <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500">
          RECENT UPDATES
        </p>
      )}
      {others.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-6">
          No status updates from your contacts yet
        </p>
      )}
      {others.map((o) => (
        <div
          key={o.uid}
          onClick={() => setViewing({ uid: o.uid, name: o.name })}
          className="flex items-center gap-3 p-3 cursor-pointer border-b hover:bg-[#f5f6f6]"
        >
          <StatusRing
            name={o.name}
            photo={profiles[o.uid]?.photo}
            segments={o.items.map((i) => !!i.viewerIds?.includes(user.uid))}
          />
          <div>
            <p className="font-medium">{o.name}</p>
            <p className="text-xs text-gray-500">{timeText(o.last)}</p>
          </div>
        </div>
      ))}

      {showAdd && <AddStatus onClose={() => setShowAdd(false)} />}

      {viewing && viewingItems.length > 0 && (
        <StatusViewer
          key={viewing.uid}
          items={viewingItems}
          name={viewing.name}
          photo={viewing.uid === user.uid ? myPhoto : profiles[viewing.uid]?.photo}
          isMine={viewing.uid === user.uid}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}