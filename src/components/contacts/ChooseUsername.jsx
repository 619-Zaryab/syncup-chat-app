import { useState } from "react";
import { USERNAME_RE, useAuth } from "../../context/AuthContext";

export default function ChooseUsername() {
  const { user, claimUsername, logout } = useAuth();
  const suggestion = (user.displayName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);

  const [value, setValue] = useState(suggestion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const valid = USERNAME_RE.test(value);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await claimUsername(value);
    } catch (err) {
      setError(
        err.code === "permission-denied"
          ? "Could not save the username. Please check your Firestore rules"
          : err.message
      );
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
      >
        <div>
          <h2 className="text-xl font-bold text-[#111b21]">Choose a username</h2>
          <p className="text-sm text-[#667781] mt-1">
            Friends can find you by this username. Only people who search for
            it can add you.
          </p>
        </div>

        <div>
          <div className="flex items-center border-[1.5px] border-[#e4e3e8] rounded-xl px-3 focus-within:border-[#00a884]">
            <span className="text-[#667781]">@</span>
            <input
              autoFocus
              className="flex-1 py-2.5 px-1 outline-none text-[15px]"
              placeholder="your.username"
              value={value}
              onChange={(e) => {
                setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""));
                setError("");
              }}
              maxLength={20}
            />
          </div>
          <p className="text-xs text-[#8696a0] mt-1.5">
            3-20 characters: letters, numbers, dots and underscores
          </p>
        </div>

        {error && (
          <p className="text-sm text-[#c0392b] bg-[#fdecec] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          disabled={!valid || busy}
          className="w-full py-3 rounded-xl bg-[#00a884] text-white font-semibold disabled:opacity-50 enabled:hover:bg-[#008f6f] transition"
        >
          {busy ? "Saving..." : "Continue"}
        </button>

        <button
          type="button"
          onClick={logout}
          className="w-full text-sm text-[#667781] hover:text-[#111b21]"
        >
          Log out
        </button>
      </form>
    </div>
  );
}