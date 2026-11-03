import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp as fsServerTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
} from "firebase/database";
import { auth, db, rtdb } from "../firebase/config";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const USERNAME_RE = /^[a-z0-9][a-z0-9_.]{2,19}$/;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [username, setUsername] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [favourites, setFavourites] = useState([]);
  const [cleared, setCleared] = useState({});
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  // My profile, private settings and contacts (realtime)
  useEffect(() => {
    if (!user) {
      setPhoto(null);
      setUsername(null);
      setProfileLoaded(false);
      setFavourites([]);
      setCleared({});
      setContacts([]);
      return;
    }

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      setPhoto(data?.photo || null);
      setUsername(data?.username || null);
      setProfileLoaded(true);
    });

    const unsubSettings = onSnapshot(
      doc(db, "users", user.uid, "private", "settings"),
      (snap) => {
        const data = snap.data({ serverTimestamps: "estimate" });
        setFavourites(data?.favourites || []);
        setCleared(data?.cleared || {});
      }
    );

    const unsubContacts = onSnapshot(
      collection(db, "users", user.uid, "contacts"),
      (snap) => setContacts(snap.docs.map((d) => d.id))
    );

    return () => {
      unsubProfile();
      unsubSettings();
      unsubContacts();
    };
  }, [user]);

  // Online presence: one record per connection.
  // As long as any connection is open, the user is online.
  useEffect(() => {
    if (!user) return;

    const connectedRef = ref(rtdb, ".info/connected");
    const connectionsRef = ref(rtdb, `status/${user.uid}/connections`);
    const lastOnlineRef = ref(rtdb, `status/${user.uid}/lastOnline`);
    let myCon = null;

    const unsub = onValue(connectedRef, async (snap) => {
      if (snap.val() !== true) return;
      try {
        myCon = push(connectionsRef);
        await onDisconnect(myCon).remove();
        await onDisconnect(lastOnlineRef).set(serverTimestamp());
        await set(myCon, true);
      } catch (err) {
        console.error("Presence error:", err.code, err.message);
      }
    });

    return () => {
      unsub();
      if (myCon) remove(myCon).catch(() => { });
    };
  }, [user]);

  const setProfilePhoto = (dataUrl) =>
    setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photo: dataUrl,
      },
      { merge: true }
    );

  // Claim a unique username (also used to change it later)
  const claimUsername = async (raw) => {
    const name = raw.trim().toLowerCase();
    if (!USERNAME_RE.test(name)) {
      throw new Error(
        "Use 3-20 characters: letters, numbers, dots or underscores (start with a letter or number)"
      );
    }

    await runTransaction(db, async (tx) => {
      const claimRef = doc(db, "usernames", name);
      const userRef = doc(db, "users", user.uid);

      const claim = await tx.get(claimRef);
      if (claim.exists() && claim.data().uid !== user.uid) {
        throw new Error("That username is already taken");
      }

      const me = await tx.get(userRef);
      const old = me.data()?.username;
      if (old && old !== name) tx.delete(doc(db, "usernames", old));

      tx.set(claimRef, { uid: user.uid });
      tx.set(
        userRef,
        {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          username: name,
        },
        { merge: true }
      );
    });
  };

  // Add someone to my private contacts
  const addContact = (uid) =>
    setDoc(doc(db, "users", user.uid, "contacts", uid), {
      uid,
      addedAt: fsServerTimestamp(),
    });

  // Remove someone from my private contacts
  const removeContact = (uid) =>
    deleteDoc(doc(db, "users", user.uid, "contacts", uid));

  // Favourites and cleared chats live in a private document
  const settingsRef = () => doc(db, "users", user.uid, "private", "settings");

  const toggleFavourite = (id) =>
    setDoc(
      settingsRef(),
      {
        favourites: favourites.includes(id) ? arrayRemove(id) : arrayUnion(id),
      },
      { merge: true }
    );

  // Clear a chat for me only (messages before this moment are hidden)
  const clearChat = (chatId) =>
    setDoc(
      settingsRef(),
      { cleared: { [chatId]: fsServerTimestamp() } },
      { merge: true }
    );

  const logout = async () => {
    if (user) {
      try {
        await remove(ref(rtdb, `status/${user.uid}/connections`));
        await set(ref(rtdb, `status/${user.uid}/lastOnline`), serverTimestamp());
      } catch (err) {
        console.error(err);
      }
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        photo,
        username,
        profileLoaded,
        favourites,
        toggleFavourite,
        cleared,
        clearChat,
        contacts,
        addContact,
        removeContact,
        claimUsername,
        setProfilePhoto,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}