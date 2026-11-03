import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

// Subscribes to individual user documents (listing all users is blocked by the rules)
export default function useProfiles(uids) {
  const [profiles, setProfiles] = useState({});
  const key = [...new Set(uids)].sort().join(",");

  useEffect(() => {
    const list = key ? key.split(",") : [];
    const unsubs = list.map((uid) =>
      onSnapshot(
        doc(db, "users", uid),
        (snap) =>
          setProfiles((p) => ({ ...p, [uid]: snap.exists() ? snap.data() : null })),
        () => {}
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [key]);

  return profiles;
}