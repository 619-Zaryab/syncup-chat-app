import { useLayoutEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const friendlyError = (err) => {
  switch (err.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is wrong";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please log in";
    case "auth/weak-password":
      return "Password should be at least 6 characters";
    case "auth/invalid-email":
      return "That email doesn't look right";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a bit";
    case "auth/network-request-failed":
      return "Network problem. Please check your internet";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the popup. Allow it and try again";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase (Authentication > Settings > Authorized domains)";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase";
    default:
      return err.message;
  }
};

/* ---------- Tailwind class groups ---------- */
const creatureCls = "absolute bottom-0 will-change-transform";
const rigCls = "origin-bottom";

const labelCls = "block text-[12px] font-semibold text-[#6b6a70] mb-1.5";
const inputCls =
  "w-full py-[11px] px-3.5 border-[1.5px] border-[#e4e3e8] rounded-[10px] text-[14px] outline-none bg-white text-[#1a1a1e] transition duration-200 focus:border-[#6C5CE7] focus:ring-[3px] focus:ring-[#6C5CE7]/15";

const btnBase =
  "w-full p-3 rounded-[10px] text-[14px] font-semibold cursor-pointer transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed";
const btnPrimary = `${btnBase} border-0 bg-[#1a1a1e] text-white mb-2.5 enabled:hover:bg-black enabled:active:scale-[0.98]`;
const btnGoogle = `${btnBase} bg-white text-[#1a1a1e] border-[1.5px] border-[#e4e3e8] flex items-center justify-center gap-2 enabled:hover:bg-[#fafafa]`;

export default function Login() {
  const rootRef = useRef(null);
  const engine = useRef(null);

  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [pwVisible, setPwVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const mood = (s) => engine.current?.setState(s);

  /* ---------------- Animation engine ---------------- */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Small screens: no character animation (the animated panel is hidden there)
    if (!window.matchMedia("(min-width: 720px)").matches) return;
    const q = (sel) => root.querySelector(sel);

    const canvas = q("#canvas");
    const caption = q("#caption");

    const O_SMILE = "M48,53 Q65,62 82,53";
    const O_WORRIED = "M48,58 Q65,52 82,58";
    const O_NEUTRAL = "M48,53 Q65,56 82,53";
    const PM_NEUTRAL = "M43,38 L43,44";
    const PM_WORRIED = "M40,40 Q43,36 47,41";
    const BM_NEUTRAL = "M18,44 L38,44";
    const BM_WORRIED = "M17,42 Q28,38 39,42";
    const YA_N = { x1: 33, y1: 36, x2: 49, y2: 32 };
    const YA_W = { x1: 33, y1: 34, x2: 47, y2: 39 };

    const P_NORMAL = "M0,218 L0,24 C0,11 11,0 24,0 L62,0 C75,0 86,11 86,24 L86,218 Z";
    const P_PANIC =
      "M0,218 L0,38 C0,26 6,20 16,14 C28,6 50,-4 66,6 C76,13 86,22 86,34 L86,218 Z";

    const pBody = q("#pBody");
    const pBrowL = q("#pBrowL");
    const pBrowR = q("#pBrowR");
    const pMouth = q("#pMouth");
    const oBrowL = q("#oBrowL");
    const oBrowR = q("#oBrowR");
    const oMouth = q("#oMouth");
    const bMouth = q("#bMouth");
    const yAnt = q("#yAntenna");
    const allEyes = Array.from(root.querySelectorAll(".eyedot"));

    let state = "idle";
    let hopTimer = 0;
    let raf = 0;
    let captionTimer = 0;

    const captions = {
      idle: "Four little shapes, minding their own business.",
      typing: "They're watching you type.",
      panic: "Don't look! It's a secret.",
      reveal: "Oh — okay, that was fine.",
      hop: "Go get em!",
    };
    caption.textContent = captions.idle;

    /* ----- Entrance animations (pehle CSS keyframes the) ----- */
    const EASE_OUT = "cubic-bezier(.22,1,.36,1)";
    const EASE_POP = "cubic-bezier(.34,1.56,.64,1)";

    const enterAnims = [
      q("#black").animate(
        [
          {
            transform: "translateY(-280px) translateX(60px) rotate(25deg) scale(0.9)",
            opacity: 0,
            easing: EASE_OUT,
          },
          {
            transform: "translateY(0) translateX(0) rotate(0deg) scale(1)",
            opacity: 1,
          },
        ],
        { duration: 700, delay: 0, fill: "both" }
      ),
      q("#purple").animate(
        [
          {
            transform: "translateY(40px) translateX(-80px) rotate(-45deg) scale(0.5,0.22)",
            opacity: 0,
            offset: 0,
            easing: EASE_OUT,
          },
          {
            transform: "translateY(10px) translateX(-20px) rotate(-20deg) scale(0.75,0.55)",
            opacity: 1,
            offset: 0.55,
            easing: EASE_OUT,
          },
          {
            transform: "translateY(0) translateX(0) rotate(0deg) scale(1,1)",
            opacity: 1,
            offset: 1,
          },
        ],
        { duration: 750, delay: 180, fill: "both" }
      ),
      q("#yellow").animate(
        [
          {
            transform: "translateY(180px) scale(0.7)",
            opacity: 0,
            easing: EASE_POP,
          },
          { transform: "translateY(0) scale(1)", opacity: 1 },
        ],
        { duration: 650, delay: 320, fill: "both" }
      ),
      q("#orange").animate(
        [
          {
            transform: "translateY(60px) translateX(-50px) scale(0.32,0.55) rotate(-8deg)",
            opacity: 0,
            offset: 0,
            easing: EASE_POP,
          },
          {
            transform: "translateY(10px) translateX(-10px) scale(0.7,0.8) rotate(-2deg)",
            opacity: 1,
            offset: 0.6,
            easing: EASE_POP,
          },
          {
            transform: "translateY(0) translateX(0) scale(1,1) rotate(0deg)",
            opacity: 1,
            offset: 1,
          },
        ],
        { duration: 600, delay: 460, fill: "both" }
      ),
    ];
    // Khatam hone par hata do, taaki normal state wapas aa jaye
    enterAnims.forEach((a) => {
      a.onfinish = () => a.cancel();
    });

    /* ----- Idle / reaction animation ----- */
    const creatures = [
      {
        id: "orange",
        rig: q("#orangeRig"),
        fl: { spd: 1 / 3.9, ph: 0.4, amp: 3.5 },
        s: {
          idle: { y: 0, x: 0, r: 0, sy: 1, sc: 1 },
          typing: { y: 0, x: 0, r: 3, sy: 1, sc: 1 },
          panic: { y: 0, x: 0, r: -3, sy: 0.92, sc: 1 },
          reveal: { y: -3, x: 0, r: 0, sy: 1.04, sc: 1 },
          hop: { y: -13, x: 0, r: 2, sy: 1, sc: 1.04 },
        },
      },
      {
        id: "purple",
        rig: q("#purpleRig"),
        fl: { spd: 1 / 4.5, ph: 0.0, amp: 4 },
        s: {
          idle: { y: 0, x: 0, r: 0, sy: 1, sc: 1 },
          typing: { y: 0, x: 0, r: 4, sy: 1, sc: 1 },
          panic: { y: 0, x: -4, r: -3, sy: 0.88, sc: 1 },
          reveal: { y: -8, x: 0, r: 0, sy: 1.08, sc: 1 },
          hop: { y: -20, x: 0, r: 0, sy: 1, sc: 1 },
        },
      },
      {
        id: "black",
        rig: q("#blackRig"),
        fl: { spd: 1 / 5.1, ph: 1.1, amp: 3.5 },
        s: {
          idle: { y: 0, x: 0, r: 0, sy: 1, sc: 1 },
          typing: { y: 0, x: 0, r: 4, sy: 1, sc: 1 },
          panic: { y: 0, x: 2, r: 0, sy: 0.13, sc: 1 },
          reveal: { y: -6, x: 0, r: 0, sy: 1.05, sc: 1 },
          hop: { y: -17, x: 0, r: 0, sy: 1, sc: 1 },
        },
      },
      {
        id: "yellow",
        rig: q("#yellowRig"),
        fl: { spd: 1 / 4.7, ph: 1.7, amp: 4 },
        s: {
          idle: { y: 0, x: 0, r: 0, sy: 1, sc: 1 },
          typing: { y: 0, x: 0, r: -5, sy: 1, sc: 1 },
          panic: { y: 0, x: 0, r: 5, sy: 0.94, sc: 1 },
          reveal: { y: -4, x: 0, r: 0, sy: 1.06, sc: 1 },
          hop: { y: -19, x: 0, r: -2, sy: 1, sc: 1 },
        },
      },
    ];

    const cur = {};
    creatures.forEach((c) => {
      cur[c.id] = { y: 0, x: 0, r: 0, sy: 1, sc: 1 };
    });

    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const tick = () => {
      const t = performance.now() / 1000;
      const isPanic = state === "panic";
      const isTyping = state === "typing";
      const isHop = state === "hop";
      if (isHop) hopTimer += 1 / 60;

      creatures.forEach((c, i) => {
        const tgt = c.s[state] || c.s.idle;
        const floatAmp = isTyping ? 0.4 : isPanic ? 0 : 1;
        const fy = Math.sin((t + c.fl.ph) * Math.PI * 2 * c.fl.spd) * c.fl.amp * floatAmp;

        let ty = tgt.y + (isHop ? 0 : fy);
        if (isHop) {
          const d = i * 0.07;
          const el = Math.max(0, hopTimer - d);
          ty = Math.min(0, Math.sin(el * Math.PI * 3.2) * -22);
        }

        const spd = isPanic ? 0.3 : isTyping ? 0.16 : 0.12;
        const cv = cur[c.id];
        cv.y = lerp(cv.y, ty, spd);
        cv.x = lerp(cv.x, tgt.x, spd);
        cv.r = lerp(cv.r, tgt.r, spd);
        cv.sc = lerp(cv.sc, tgt.sc, spd);
        cv.sy = lerp(cv.sy, tgt.sy, spd);

        c.rig.style.transform =
          `translate(${cv.x.toFixed(2)}px,${cv.y.toFixed(2)}px) ` +
          `rotate(${cv.r.toFixed(2)}deg) ` +
          `scale(${cv.sc.toFixed(3)},${(cv.sy * cv.sc).toFixed(3)})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const updateEyes = (cx, cy) => {
      if (state === "panic") return;
      const rect = canvas.getBoundingClientRect();
      const dx = clamp(((cx - rect.left - rect.width * 0.44) / (rect.width / 2)) * 5, -5, 5);
      const dy = clamp(((cy - rect.top - rect.height * 0.46) / (rect.height / 2)) * 5, -5, 5);
      allEyes.forEach((p) => {
        p.style.transform = `translate(${dx}px,${dy}px)`;
      });
    };
    const onMove = (e) => updateEyes(e.clientX, e.clientY);
    document.addEventListener("mousemove", onMove);

    const setCaption = (s) => {
      caption.style.opacity = 0;
      clearTimeout(captionTimer);
      captionTimer = setTimeout(() => {
        caption.textContent = captions[s] || captions.idle;
        caption.style.opacity = 1;
      }, 120);
    };

    const applyFace = (s) => {
      const worried = s === "panic";

      pBody.setAttribute("d", worried ? P_PANIC : P_NORMAL);
      pBrowL.setAttribute("opacity", worried ? "1" : "0");
      pBrowR.setAttribute("opacity", worried ? "1" : "0");
      pMouth.setAttribute("d", worried ? PM_WORRIED : PM_NEUTRAL);

      oBrowL.setAttribute("opacity", worried ? "1" : "0");
      oBrowR.setAttribute("opacity", worried ? "1" : "0");

      bMouth.setAttribute("opacity", worried ? "1" : "0");
      bMouth.setAttribute("d", worried ? BM_WORRIED : BM_NEUTRAL);

      if (worried) oMouth.setAttribute("d", O_WORRIED);
      else if (s === "typing") oMouth.setAttribute("d", O_NEUTRAL);
      else oMouth.setAttribute("d", O_SMILE);

      const ya = worried ? YA_W : YA_N;
      yAnt.setAttribute("x1", ya.x1);
      yAnt.setAttribute("y1", ya.y1);
      yAnt.setAttribute("x2", ya.x2);
      yAnt.setAttribute("y2", ya.y2);
    };

    const setState = (s) => {
      if (state === s) return;
      if (s === "hop") hopTimer = 0;
      state = s;
      applyFace(s);
      setCaption(s);
      if (s !== "panic") allEyes.forEach((p) => (p.style.transform = ""));
    };
    engine.current = { setState };

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(captionTimer);
      document.removeEventListener("mousemove", onMove);
      enterAnims.forEach((a) => a.cancel());
      engine.current = null;
    };
  }, []);

  /* ---------------- Firebase ---------------- */
  const applyPersistence = () =>
    setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    mood("hop");

    if (isSignup && !name.trim()) {
      setError("Please enter your name");
      return;
    }

    setBusy(true);
    try {
      await applyPersistence();

      if (isSignup) {
        const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(res.user, { displayName: name.trim() });
        await setDoc(
          doc(db, "users", res.user.uid),
          {
            uid: res.user.uid,
            name: name.trim(),
            email: email.trim(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(friendlyError(err));
    }
    setBusy(false);
  };

  const handleGoogle = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await applyPersistence();
      const res = await signInWithPopup(auth, new GoogleAuthProvider());
      const u = res.user;
      const userName = u.displayName || (u.email ? u.email.split("@")[0] : "User");

      if (!u.displayName) await updateProfile(u, { displayName: userName });

      // Pehli baar Google se aaye toh users collection mein save karo
      const userRef = doc(db, "users", u.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists() || !snap.data().name) {
        await setDoc(
          userRef,
          {
            uid: u.uid,
            name: userName,
            email: u.email,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      setError(friendlyError(err));
    }
    setBusy(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("Enter your email above first, then tap Forgot password");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("If an account exists for this email, a reset link has been sent");
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const toggleEye = () => {
    const next = !pwVisible;
    setPwVisible(next);
    mood(next ? "reveal" : "panic");
    document.getElementById("password")?.focus();
  };

  const switchMode = (e) => {
    e.preventDefault();
    setIsSignup(!isSignup);
    setError("");
    setInfo("");
  };

  /* ---------------- UI ---------------- */
  return (
    <div
      ref={rootRef}
      className="min-h-dvh flex items-center justify-center min-[720px]:p-6 bg-white min-[720px]:bg-[#d8d7db] font-sans"
    >
      <div className="flex w-full min-[720px]:w-[920px] max-w-full min-h-dvh min-[720px]:min-h-0 min-[720px]:h-[560px] min-[720px]:rounded-[22px] overflow-hidden min-[720px]:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)] bg-white">
        {/* LEFT CANVAS */}
        <div
          id="canvas"
          className="relative w-1/2 bg-[#e9e8ec] overflow-hidden hidden min-[720px]:block"
        >
                    <div className="absolute top-6 left-0 w-full flex items-center justify-center gap-2.5">
            <img src="/logo-icon.png" alt="" className="w-8 h-8 rounded-lg" />
            <span className="font-bold tracking-[0.02em] text-[#2a2a30] text-[17px]">
              SyncUp
            </span>
          </div>

          <div className="absolute bottom-[52px] left-0 w-full h-[280px] overflow-hidden">
            {/* Orange semicircle */}
            <div id="orange" className={`${creatureCls} left-[2%] z-[3]`}>
              <div id="orangeRig" className={rigCls}>
                <svg className="block" width="130" height="76" viewBox="0 0 130 76">
                  <path
                    d="M0,76 L0,46 C0,18 28,0 65,0 C102,0 130,18 130,46 L130,76 Z"
                    fill="#FF8A3D"
                  />
                  <circle cx="38" cy="56" r="7" fill="#e8723a" opacity="0.35" />
                  <circle cx="92" cy="56" r="7" fill="#e8723a" opacity="0.35" />
                  <circle id="oBrowL" cx="48" cy="32" r="2" fill="#1a1a1e" opacity="0" />
                  <circle id="oBrowR" cx="82" cy="32" r="2" fill="#1a1a1e" opacity="0" />
                  <circle className="eyedot" cx="48" cy="40" r="3.6" fill="#1a1a1e" />
                  <circle className="eyedot" cx="82" cy="40" r="3.6" fill="#1a1a1e" />
                  <path
                    id="oMouth"
                    d="M48,53 Q65,62 82,53"
                    stroke="#1a1a1e"
                    strokeWidth="3.2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Purple tall rectangle */}
            <div id="purple" className={`${creatureCls} left-[20%] z-[1]`}>
              <div id="purpleRig" className={rigCls}>
                <svg className="block" width="86" height="218" viewBox="0 0 86 218">
                  <path
                    id="pBody"
                    d="M0,218 L0,24 C0,11 11,0 24,0 L62,0 C75,0 86,11 86,24 L86,218 Z"
                    fill="#6C5CE7"
                  />
                  <path
                    id="pBrowL"
                    d="M24,24 L34,18"
                    stroke="#1a1a1e"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    opacity="0"
                  />
                  <path
                    id="pBrowR"
                    d="M52,18 L62,24"
                    stroke="#1a1a1e"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    opacity="0"
                  />
                  <circle className="eyedot" cx="33" cy="26" r="2.8" fill="#1a1a1e" />
                  <circle className="eyedot" cx="53" cy="26" r="2.8" fill="#1a1a1e" />
                  <path
                    id="pMouth"
                    d="M43,38 L43,44"
                    stroke="#1a1a1e"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Black rectangle */}
            <div id="black" className={`${creatureCls} left-[37%] z-[2]`}>
              <div id="blackRig" className={rigCls}>
                <svg className="block" width="56" height="232" viewBox="0 0 56 232">
                  <rect x="0" y="0" width="56" height="232" rx="12" fill="#1c1c1e" />
                  <ellipse cx="18" cy="26" rx="6" ry="7" fill="#fff" />
                  <ellipse cx="38" cy="26" rx="6" ry="7" fill="#fff" />
                  <circle className="eyedot" cx="18" cy="27" r="2.6" fill="#1a1a1e" />
                  <circle className="eyedot" cx="38" cy="27" r="2.6" fill="#1a1a1e" />
                  <path
                    id="bMouth"
                    d="M18,44 L38,44"
                    stroke="#fff"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    opacity="0"
                  />
                </svg>
              </div>
            </div>

            {/* Yellow pill */}
            <div id="yellow" className={`${creatureCls} left-[46%] z-[4]`}>
              <div id="yellowRig" className={rigCls}>
                <svg className="block" width="62" height="108" viewBox="0 0 62 108">
                  <rect x="0" y="0" width="62" height="108" rx="31" fill="#FFD23F" />
                  <circle className="eyedot" cx="26" cy="38" r="3.8" fill="#1a1a1e" />
                  <line
                    id="yAntenna"
                    x1="33"
                    y1="36"
                    x2="49"
                    y2="32"
                    stroke="#1a1a1e"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    id="yMouth"
                    d="M20,54 L42,54"
                    stroke="#1a1a1e"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div
            id="caption"
            className="absolute bottom-4 left-0 w-full text-center text-[13px] text-[#6b6a70] transition-opacity duration-150"
          />
        </div>

        {/* RIGHT FORM */}
                <div className="flex-1 flex items-center justify-center py-8 px-6 min-[720px]:py-12 min-[720px]:px-10 overflow-y-auto">
          <div className="w-full max-w-[360px] min-[720px]:max-w-[320px]">
            {/* Brand (phones only; the animated panel is hidden there) */}
            <div className="min-[720px]:hidden flex flex-col items-center mb-6">
              <img
                src="/logo-icon.png"
                alt="SyncUp"
                className="w-20 h-20 rounded-[22px] shadow-lg"
              />
              <p className="mt-3 text-2xl font-bold text-[#1a1a1e]">SyncUp</p>
            </div>
            <h1 className="text-[26px] font-bold mb-1 text-[#1a1a1e] text-center">
              {isSignup ? "Create account" : "Welcome back!"}
            </h1>
            <p className="text-center text-[#8b8a90] text-[13px] mb-7">
              {isSignup ? "Join in a few seconds" : "Please enter your details"}
            </p>

            <form onSubmit={handleSubmit}>
              {isSignup && (
                <div className="mb-4">
                  <label htmlFor="name" className={labelCls}>
                    Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      className={inputCls}
                      placeholder="Your name"
                      autoComplete="off"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        mood("typing");
                      }}
                      onFocus={() => mood("typing")}
                      onBlur={() => mood("idle")}
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="email" className={labelCls}>
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    className={inputCls}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      mood("typing");
                    }}
                    onFocus={() => mood("typing")}
                    onBlur={() => mood("idle")}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="password" className={labelCls}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={pwVisible ? "text" : "password"}
                    id="password"
                    className={`${inputCls} pr-[38px]`}
                    placeholder="••••••••"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => mood(pwVisible ? "reveal" : "panic")}
                    onBlur={() => mood("idle")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer p-1 text-[#9a99a0] flex hover:text-[#5a5960]"
                    aria-label={pwVisible ? "Hide password" : "Show password"}
                    onClick={toggleEye}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: pwVisible ? "none" : "block" }}
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: pwVisible ? "block" : "none" }}
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 4.22-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3.5 mb-[22px] text-[12.5px]">
                <label className="flex items-center gap-[7px] text-[#6b6a70] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-[15px] h-[15px] cursor-pointer accent-[#6C5CE7]"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <a
                  href="#"
                  className="text-[#9a99a0] no-underline cursor-pointer hover:text-[#1a1a1e]"
                  onClick={handleForgot}
                >
                  Forgot password?
                </a>
              </div>

              {error && (
                <div className="text-[12.5px] mb-3.5 px-3 py-[9px] rounded-lg bg-[#fdecec] text-[#c0392b]">
                  {error}
                </div>
              )}
              {info && (
                <div className="text-[12.5px] mb-3.5 px-3 py-[9px] rounded-lg bg-[#e8f7ee] text-[#1e8449]">
                  {info}
                </div>
              )}

              <button
                type="submit"
                className={btnPrimary}
                disabled={busy}
                onMouseEnter={() => mood("hop")}
                onMouseLeave={() => mood("idle")}
              >
                {busy ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
              </button>

              <button
                type="button"
                className={btnGoogle}
                disabled={busy}
                onClick={handleGoogle}
                onMouseEnter={() => mood("hop")}
                onMouseLeave={() => mood("idle")}
              >
                <svg width="16" height="16" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91A8.78 8.78 0 0 0 17.64 9.2z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.85.87-3.05.87-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.59 8.59 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
                  />
                </svg>
                {isSignup ? "Sign up with Google" : "Log in with Google"}
              </button>
            </form>

            <p className="text-center text-[13px] text-[#8b8a90] mt-[26px]">
              {isSignup ? "Already have an account? " : "Don't have an account? "}
              <a
                href="#"
                className="text-[#6C5CE7] font-semibold no-underline cursor-pointer"
                onClick={switchMode}
              >
                {isSignup ? "Log in" : "Sign up"}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}