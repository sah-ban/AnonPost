"use client";

import { useEffect, useState, useRef } from "react";

import { useSearchParams } from "next/navigation";

import sdk, { type Context } from "@farcaster/miniapp-sdk";
import { Share2, Wallet2, Copy, Check, Globe } from "lucide-react";
import Image from "next/image";
import { FarcasterEmbed } from "react-farcaster-embed/dist/client";
import "react-farcaster-embed/dist/styles.css";

type CastType = "cast" | "reply" | "quote";

interface EmbedInput {
  url?: string;
  castId?: {
    fid: number;
    hash: string;
  };
}

interface CastRequestBody {
  text?: string;
  castType: CastType;
  embeds?: EmbedInput[];
  parentCastId?: {
    fid: number;
    hash: string;
  };
}

interface CastResult {
  success?: boolean;
  hash?: string;
  error?: string;
  castType?: CastType;
}

export default function CastComposer() {
  const [context, setContext] = useState<Context.MiniAppContext>();

  const [showPopup, setShowPopup] = useState(false);

  const [castType, setCastType] = useState<CastType>("cast");
  const [text, setText] = useState("");
  const [embedUrl1, setEmbedUrl1] = useState("");
  const [embedUrl2, setEmbedUrl2] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [castIdFid, setCastIdFid] = useState("");
  const [castIdHash, setCastIdHash] = useState("");
  const [parentFid, setParentFid] = useState("");
  const [parentHash, setParentHash] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CastResult>({});
  const maxChars = 1024;
  const [embeds, setEmbeds] = useState<EmbedInput[]>([]);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const load = async () => {
      setContext(await sdk.context);
      sdk.actions.ready({});
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  useEffect(() => {
    const possibleEmbeds: EmbedInput[] = [];

    // Collect embeds in first-come-first-serve order
    if (imageUrl.trim()) possibleEmbeds.push({ url: imageUrl.trim() });
    if (embedUrl1.trim()) possibleEmbeds.push({ url: embedUrl1.trim() });
    if (embedUrl2.trim()) possibleEmbeds.push({ url: embedUrl2.trim() });
    if (castType === "quote" && castIdFid && castIdHash) {
      possibleEmbeds.push({
        castId: { fid: Number(castIdFid), hash: castIdHash.trim() },
      });
    }

    // Warn if more than 2 embeds
    if (possibleEmbeds.length > 2) {
      setWarning(
        "You can only include up to 2 attachments (links, casts, or images).\n Please remove one link"
      );
    } else {
      setWarning("");
    }

    // Always store only up to 2 embeds
    setEmbeds(possibleEmbeds.slice(0, 2));
  }, [imageUrl, embedUrl1, embedUrl2, castIdFid, castIdHash, castType]);

  const handleSubmit = async () => {
    setWarning("");
    setLoading(true);
    setResult({});

    try {
      const parentCastId =
        castType === "reply" && parentFid && parentHash
          ? { fid: Number(parentFid), hash: parentHash.trim() }
          : undefined;

      const body: CastRequestBody = {
        text,
        castType,
        embeds: embeds.length > 0 ? embeds : undefined,
        parentCastId,
      };

      const res = await fetch("/api/create-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data: CastResult = await res.json();
      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setResult({ error: err.message });
      } else {
        setResult({ error: "Unknown error occurred" });
      }
    } finally {
      setLoading(false);
    }
  };
  const [username, setUsername] = useState<string>();

  async function fetchUsername(fid: string) {
    try {
      const res = await fetch(`/api/username?fid=${fid}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsername(data.username);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }

  const searchParams = useSearchParams();
  const castFid = searchParams.get("castFid");
  const castHash = searchParams.get("castHash");

  useEffect(() => {
    if (castFid && castHash) {
      fetchUsername(castFid);
      setShowPopup(true);
      setCastIdFid(castFid);
      setParentFid(castFid);
      setCastIdHash(castHash);
      setParentHash(castHash);
    }
  }, [castFid, castHash]);

  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = "auto"; // Reset height
      textRef.current.style.height = `${textRef.current.scrollHeight}px`; // Adjust height
    }
  }, [text]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const image = e.target.files[0];
      if (image.type.startsWith("image/")) {
        await uploadImage(image);
      } else {
        setWarning("Invalid file type. Please upload an image or GIF.");
      }
    }
  };

  const uploadImage = async (image: File) => {
    const formData = new FormData();
    formData.append("image", image);
    try {
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_KEY}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data: {
        success: boolean;
        data?: { url: string };
        error?: { message: string };
      } = await response.json();

      if (data.success && data.data) {
        setImageUrl(data.data.url);
      } else {
        setWarning(
          "Upload failed: " + (data.error?.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error);
    }
  };

  useEffect(() => {
    if (result.hash) {
      setCastType("cast");
      setText("");
      setEmbedUrl1("");
      setEmbedUrl2("");
      setImageUrl("");
      setCastIdFid("");
      setCastIdHash("");
      setParentFid("");
      setParentHash("");
      setWarning("");
      sdk.haptics.notificationOccurred("success");

      const timer = setTimeout(() => {
        setResult({});
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [result.hash]);

  useEffect(() => {
    if (!context?.client.added && result.hash) {
      sdk.actions.addMiniApp();
    }
  }, [context?.client.added, result.hash]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-[#0f1115] via-[#1b1e25] to-[#0c0e12] text-white px-2">
      <div
        className={`transition-opacity duration-500 ease-in-out ${
          isTyping ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <ComposerHeader />
      </div>
      <QuoteOrReply />{" "}
      <div className="w-full max-w-lg bg-[#111418]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl p-3 space-y-1 transition-transform hover:scale-[1.01] hover:border-lime-400/40">
        {castHash &&
          username &&
          (castType === "reply" || castType === "quote") && (
            <>
              {castType === "reply" ? "Replying to " : "Quoting "}@{username}
              <div className="bg-[#192734] text-white rounded-2xl shadow-lg max-w-xl w-full border border-[#2F3336]">
                <FarcasterEmbed
                  username={username}
                  hash={castHash}
                  options={{ hideFarcasterLogo: true }}
                />
              </div>
            </>
          )}{" "}
        <div>
          <label className="block text-sm font-medium mb-1">Text</label>
          <textarea
            ref={textRef}
            className="w-full p-3 bg-[#525760] text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-lime-500 resize-none"
            placeholder="Start writing..."
            maxLength={maxChars}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
            style={{ whiteSpace: "pre-wrap" }}
          ></textarea>
        </div>
        {/* Embed URLs */}
        <div>
          <label className="block text-sm font-medium mb-1">URLs</label>
          <input
            value={embedUrl1}
            onChange={(e) => setEmbedUrl1(e.target.value)}
            placeholder="https://example.com"
            disabled={embeds.length >= 2 && !embedUrl1}
            className={`w-full p-2 bg-[#525760] text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-lime-500 resize-none ${
              embeds.length >= 2 && !embedUrl1.trim()
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          />

          <input
            value={embedUrl2}
            onChange={(e) => setEmbedUrl2(e.target.value)}
            placeholder="https://another-site.com"
            disabled={embeds.length >= 2 && !embedUrl2}
            className={`w-full p-2 bg-[#525760] text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-lime-500 resize-none mt-1 ${
              embeds.length >= 2 && !embedUrl2.trim()
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          />
        </div>
        <div className="flex items-center justify-between mt-2 gap-4">
          <label className="cursor-pointer flex items-center gap-2">
            {imageUrl ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path
                  fillRule="evenodd"
                  d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={embeds.length >= 2 && !imageUrl.trim()}
            />
          </label>

          {/* Embed Counter */}
          <div className="flex flex-col text-xs text-gray-400 mt-1">
            <span className="text-gray-400">attachments</span>
            <span
              className={`font-mono text-center ${
                embeds.length >= 2 ? "text-red-500" : "text-gray-300"
              }`}
            >
              {embeds.length}/2
            </span>
          </div>

          {/* Character Counter */}
          <div className="flex flex-col text-xs text-gray-400 mt-1">
            <span className="text-gray-400">characters</span>
            <span
              className={`font-mono text-center ${
                text.length >= maxChars ? "text-red-500" : "text-gray-300"
              }`}
            >
              {text.length}/{maxChars}
            </span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              (text.trim().length === 0 &&
                !embedUrl1 &&
                !embedUrl2 &&
                !imageUrl &&
                !castIdFid)
            }
            className="bg-gray-700 hover:bg-lime-600 text-white px-4 py-2 rounded-md transition disabled:opacity-50 w-[200px] disabled:cursor-not-allowed"
          >
            {loading ? "Posting..." : result.hash ? "Posted" : "Post"}
          </button>
        </div>
        {/* Warning */}
        {warning && (
          <div
            className="mt-3 rounded-xl border border-yellow-400/30 bg-yellow-500/10 
  p-3 text-yellow-300 font-medium flex justify-center items-center gap-2 text-center"
          >
            ⚠️ {warning}
          </div>
        )}
        {result.hash && (
          <div
            className="mt-3 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-green-300 font-medium flex justify-center gap-2 text-center cursor-pointer"
            onClick={
              context
                ? () =>
                    sdk.actions.viewCast({
                      hash: result.hash!,
                    })
                : () =>
                    window.open(
                      `https://farcaster.xyz/~/conversations/${result.hash}`,
                      "_blank"
                    )
            }
          >
            Posted, click here to view
          </div>
        )}
        {result.error && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-400 font-medium flex justify-center items-center gap-2 text-center">
            ❌ {result.error}
          </div>
        )}
      </div>{" "}
      <div
        className={`fixed bottom-4 transition-opacity duration-500 ease-in-out ${
          isTyping ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <button
          onClick={
            context
              ? () => sdk.actions.openUrl(`${process.env.NEXT_PUBLIC_URL}`)
              : () => window.open("", "_blank")
          }
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white transition-all duration-300 border shadow-md
          ${
            context
              ? "bg-blue-500/20 border-blue-400/40 hover:bg-blue-500/30 hover:shadow-blue-500/30"
              : "bg-purple-500/20 border-purple-400/40 hover:bg-purple-500/30 hover:shadow-purple-500/30"
          }`}
        >
          {context ? (
            <Globe className="w-4 h-4 text-blue-300" />
          ) : (
            <Image
              src="/farcaster.png"
              alt="Farcaster"
              width={28}
              height={28}
              className=""
            />
          )}

          <span className="text-sm">
            {context ? "Open in Browser" : "Open in Farcaster"}
          </span>
        </button>
      </div>
    </div>
  );

  function QuoteOrReply() {
    const handleSelect = (choice: CastType) => {
      setCastType(choice);
      setShowPopup(false);
    };
    return (
      <div className="text-white">
        {showPopup && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-[#1a1a1a]/90 to-[#2a2a2a]/90 border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.6)] rounded-2xl p-8 w-[90%] max-w-sm text-white relative animate-[fadeIn_0.25s_ease-out]">
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold text-center mb-6">
                Choose an Action
              </h2>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleSelect("quote")}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-3 rounded-xl font-medium hover:scale-105 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200"
                >
                  Quote Cast
                </button>
                <button
                  onClick={() => handleSelect("reply")}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-3 rounded-xl font-medium hover:scale-105 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-200"
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function ComposerHeader() {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_URL}`);
        setCopied(true);

        // reset after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    };
    return (
      <div className="fixed top-0 left-0 w-full z-50 px-6 py-3 flex items-center justify-between">
        <button
          onClick={
            context
              ? () => sdk.actions.viewProfile({ fid: 1009125 })
              : () =>
                  window.open("https://farcaster.xyz/anonpost.eth", "_blank")
          }
          className="flex items-center gap-2 group"
        >
          <div className="relative w-10 h-10">
            <Image
              src="/icon.png"
              alt="Profile"
              fill
              sizes="40px"
              className="rounded-full border border-white/20 object-cover group-hover:border-lime-400/40 transition-all duration-200"
              priority
            />
          </div>
        </button>

        <button
          onClick={
            context
              ? () =>
                  sdk.actions.swapToken({
                    sellToken:
                      "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    buyToken: "eip155:8453/erc20:CA",
                  })
              : () => window.open("https://dexscreener.com/base/CA", "_blank")
          }
          className="hidden items-center gap-2 bg-lime-500/10 border border-lime-400/30 text-lime-300 px-4 py-1.5 rounded-xl font-medium hover:bg-lime-500/20 hover:text-lime-200 transition-all"
        >
          <Wallet2 className="w-4 h-4" />
          Buy $AnonPost
        </button>

        {context ? (
          <button
            onClick={() =>
              sdk.actions.composeCast({
                text: `Post anonymously, for free on @anonpost.eth via website(anonpost.xyz) or the miniapp below`,
                embeds: [`${process.env.NEXT_PUBLIC_URL}`],
              })
            }
            className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-lime-400/40 transition-all"
          >
            <Share2 className="w-5 h-5 text-gray-300" />
          </button>
        ) : (
          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg border transition-all duration-300 ${
              copied
                ? "border-lime-400/40 bg-lime-500/10 shadow-[0_0_8px_rgba(163,255,125,0.3)]"
                : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-lime-400/40"
            }`}
          >
            {copied ? (
              <Check className="w-5 h-5 text-lime-400 transition-transform duration-300 scale-110" />
            ) : (
              <Copy className="w-5 h-5 text-gray-300 transition-transform duration-300 hover:scale-105" />
            )}
          </button>
        )}
      </div>
    );
  }
}
