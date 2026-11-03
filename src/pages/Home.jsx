import { useEffect, useRef, useState } from "react";
import NavRail from "../components/sidebar/NavRail";
import Sidebar from "../components/sidebar/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";

export default function Home() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [tab, setTab] = useState("chats");
  const openRef = useRef(false);

  // Phone back button closes the open chat instead of leaving the app
  useEffect(() => {
    const onPop = () => {
      openRef.current = false;
      setSelectedChat(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const selectChat = (chat) => {
    if (!openRef.current) {
      window.history.pushState({ chat: true }, "");
      openRef.current = true;
    }
    setSelectedChat(chat);
  };

  const closeChat = () => {
    if (!openRef.current) return;
    openRef.current = false;
    if (window.history.state?.chat) window.history.back();
    else setSelectedChat(null);
  };

  return (
    <div className="h-dvh bg-gradient-to-br from-[#d8f1e8] via-[#eaf0f6] to-[#e4e0f5] md:p-3 lg:p-4">
      <div className="h-full max-w-[1700px] mx-auto flex flex-col md:flex-row md:gap-3 lg:gap-4">
        {/* Icon rail (bottom bar on phones, hidden while a chat is open) */}
        <NavRail
          tab={tab}
          setTab={setTab}
          className={selectedChat ? "hidden md:flex" : "flex"}
        />

        {/* Chat list card */}
        <div
          className={`${
            selectedChat ? "hidden md:flex" : "flex"
          } flex-1 md:flex-none md:w-[360px] lg:w-[400px] min-h-0 flex-col bg-white md:rounded-2xl md:shadow-sm overflow-hidden`}
        >
          <Sidebar
            tab={tab}
            selectedChat={selectedChat}
            onSelectChat={selectChat}
          />
        </div>

        {/* Chat window card */}
        <div
          className={`${
            selectedChat ? "flex" : "hidden md:flex"
          } flex-1 min-w-0 min-h-0 bg-white md:rounded-2xl md:shadow-sm overflow-hidden`}
        >
          {selectedChat ? (
            <ChatWindow
              key={selectedChat.id}
              chat={selectedChat}
              onBack={closeChat}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-[#f4f9f7] to-[#eef1f5] text-center px-8">
              <img
                src="/logo-icon.png"
                alt="SyncUp"
                className="w-28 h-28 rounded-3xl shadow-lg mb-7"
              />
              <h2 className="text-3xl font-semibold text-[#111b21]">
                Welcome to SyncUp
              </h2>
              <p className="mt-3 text-sm text-[#667781] max-w-sm leading-relaxed">
                Select a conversation from the list to start messaging, or
                create a group with your friends.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}