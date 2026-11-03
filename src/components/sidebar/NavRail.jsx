import { FiLogOut, FiMessageCircle } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { compressSquare } from "../../utils/image";
import Avatar from "../common/Avatar";

function StatusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" strokeDasharray="4.5 3" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RailButton({ active, label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-11 h-11 rounded-xl flex items-center justify-center text-[22px] transition ${
        active
          ? "bg-[#e7f6f1] text-[#00a884]"
          : "text-[#667781] hover:bg-[#f3f5f7]"
      }`}
    >
      {children}
    </button>
  );
}

export default function NavRail({ tab, setTab, className = "" }) {
  const { user, photo, setProfilePhoto, logout } = useAuth();

  const changePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressSquare(file, 200);
      await setProfilePhoto(dataUrl);
    } catch (err) {
      alert("Could not save photo: " + err.message);
    }
    e.target.value = "";
  };

  return (
    <nav
      className={`${className} order-last md:order-first h-14 md:h-auto md:w-[72px] shrink-0 flex-row md:flex-col items-center justify-around md:justify-start md:gap-2 md:py-4 bg-white border-t md:border-t-0 border-[#e9edef] md:rounded-2xl md:shadow-sm`}
    >
      <img
        src="/logo-icon.png"
        alt="SyncUp"
        className="hidden md:block w-11 h-11 mb-3 rounded-xl shadow-md"
      />

      <RailButton
        label="Chats"
        active={tab === "chats"}
        onClick={() => setTab("chats")}
      >
        <FiMessageCircle />
      </RailButton>

      <RailButton
        label="Status"
        active={tab === "status"}
        onClick={() => setTab("status")}
      >
        <StatusIcon />
      </RailButton>

      <div className="hidden md:block md:flex-1" />

      <RailButton label="Log out" onClick={logout}>
        <FiLogOut />
      </RailButton>

      <label className="cursor-pointer md:mt-1" title="Change profile photo">
        <Avatar name={user.displayName} photo={photo} size={40} />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={changePhoto}
        />
      </label>
    </nav>
  );
}