const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","😉",
  "😍","🥰","😘","😋","😛","😜","🤪","😎","🤩","🥳","😏","😒",
  "😞","😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭",
  "😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥",
  "🤗","🤔","🤭","🤫","😶","😐","😑","😬","🙄","😯","😮","😲",
  "🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒",
  "👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇",
  "👋","✋","👏","🙌","🤝","🙏","💪","❤️","🧡","💛","💚","💙",
  "💜","🖤","🤍","💔","💕","💖","💯","🔥","✨","🎉","🎂","🌹",
];

export default function EmojiPicker({ onPick }) {
  return (
    <div className="absolute bottom-full left-2 mb-2 w-72 max-w-[calc(100vw_-_24px)] max-h-56 overflow-y-auto bg-white border rounded-xl shadow-lg p-2 grid grid-cols-8 gap-1 z-30">
      {EMOJIS.map((e, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(e)}
          className="text-2xl hover:bg-gray-100 rounded"
        >
          {e}
        </button>
      ))}
    </div>
  );
}