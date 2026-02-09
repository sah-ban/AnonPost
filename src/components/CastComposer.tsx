"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import sdk, { type Context } from "@farcaster/miniapp-sdk";
import {
  Share2,
  Wallet2,
  Copy,
  Check,
  Lock,
  LogOut,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { FarcasterEmbed } from "react-farcaster-embed/dist/client";
import "react-farcaster-embed/dist/styles.css";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { base } from "viem/chains";
import { formatUnits } from "viem";
import { useConnect } from "wagmi";
import { config } from "./providers/WagmiProvider";

const TOKEN_ADDRESS = "0x4ed4e862860bed51a9570b96d89af5e1b0efefed" as const;// DEGEN for now
const TOKEN_NAME = "AnonPost";
const REQUIRED_TOKEN_AMOUNT = 69000;
const COOLDOWN_SECONDS = 60;

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
  const [username, setUsername] = useState<string>();
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Wagmi hooks
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();

  const {
    data: balance,
    refetch: refetchBalance,
    isRefetching: isRefetchingBalance,
  } = useBalance({
    address,
    token: TOKEN_ADDRESS,
    chainId: base.id,
  });

  const userBalance = balance ? Number(formatUnits(balance.value, 18)) : 0;

  // Initialize Farcaster SDK
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

  // Handle embeds
  useEffect(() => {
    const possibleEmbeds: EmbedInput[] = [];

    if (imageUrl.trim()) possibleEmbeds.push({ url: imageUrl.trim() });
    if (embedUrl1.trim()) possibleEmbeds.push({ url: embedUrl1.trim() });
    if (embedUrl2.trim()) possibleEmbeds.push({ url: embedUrl2.trim() });
    if (castType === "quote" && castIdFid && castIdHash) {
      possibleEmbeds.push({
        castId: { fid: Number(castIdFid), hash: castIdHash.trim() },
      });
    }

    if (possibleEmbeds.length > 2) {
      setWarning(
        "You can only include up to 2 attachments (links, casts, or images).\n Please remove one",
      );
    } else {
      setWarning("");
    }

    setEmbeds(possibleEmbeds.slice(0, 2));
  }, [imageUrl, embedUrl1, embedUrl2, castIdFid, castIdHash, castType]);

  // Handle form submission
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

  // Fetch username for reply/quote
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
      textRef.current.style.height = "auto";
      textRef.current.style.height = `${textRef.current.scrollHeight}px`;
    }
  }, [text]);

  // Handle image upload
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
        },
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
          "Upload failed: " + (data.error?.message || "Unknown error"),
        );
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error);
    }
  };

  // Reset form on successful post and start cooldown
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

      // Start cooldown timer
      setCooldownRemaining(COOLDOWN_SECONDS);

      const timer = setTimeout(() => {
        setResult({});
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [result.hash]);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Prompt to add mini app
  useEffect(() => {
    if (context && !context?.client.added && result.hash) {
      sdk.actions.addMiniApp();
    }
  }, [context, context?.client.added, result.hash]);

  // Handle wallet connection
  const handleConnect = () => {
    if (context) {
      connect({ connector: config.connectors[0] });
    } else {
      connect({ connector: config.connectors[1] });
    }
  };

  // Truncate address for display
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-[#0f1115] via-[#1b1e25] to-[#0c0e12] text-white px-4">
        <div className="flex flex-col items-center justify-center flex-1">
          {/* Logo */}
          <div className="relative w-24 h-24 mb-6">
            <Image
              src="/icon.png"
              alt="AnonPost"
              fill
              sizes="96px"
              className="rounded-full border-2 border-lime-400/40 object-cover shadow-lg shadow-lime-500/20"
              priority
            />
          </div>

          {/* App Name */}
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">
            AnonPost
          </h1>

          {/* Description */}
          <p className="text-gray-400 text-center mb-8 max-w-xs">
            Post anonymously on Farcaster. Your identity stays hidden, your
            voice gets heard.
          </p>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            className="flex items-center gap-3 bg-gradient-to-r from-lime-500 to-emerald-500 text-black font-semibold px-8 py-3 rounded-xl shadow-lg shadow-lime-500/30 hover:shadow-lime-500/50 hover:scale-105 transition-all duration-200"
          >
            <Wallet2 className="w-5 h-5" />
            Connect Wallet
          </button>

          {/* Token requirement notice */}
          <p className="text-gray-500 text-sm mt-6 text-center">
            Requires{" "}
            <span className="text-lime-400 font-medium">
              {REQUIRED_TOKEN_AMOUNT.toLocaleString()}
            </span>{" "}
            <span className="text-sky-400">${TOKEN_NAME}</span> on Base to post
          </p>
        </div>

        {/* Footer */}
        <ComposerFooter />
      </div>
    );
  }

  if (userBalance < REQUIRED_TOKEN_AMOUNT) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0f1115] via-[#1b1e25] to-[#0c0e12] text-gray-100 p-6 text-center select-none">
        {/* Header */}
        <div className="fixed top-0 left-0 w-full z-50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image
                src="/icon.png"
                alt="AnonPost"
                fill
                sizes="32px"
                className="rounded-full border border-white/20 object-cover"
                priority
              />
            </div>
            <span className="text-sm font-medium text-gray-300">AnonPost</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              {truncateAddress(address || "")}
            </span>
            <button
              onClick={() => disconnect()}
              className="p-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all"
              title="Disconnect wallet"
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <Lock size={64} className="text-red-400 mb-6" />
          <h1 className="text-3xl font-semibold mb-3">Access Restricted</h1>
          <p className="text-gray-400 mb-6">
            You need at least{" "}
            <span className="text-lime-400 font-semibold">
              {REQUIRED_TOKEN_AMOUNT.toLocaleString()}
            </span>{" "}
            <span className="text-sky-500 font-semibold">${TOKEN_NAME}</span> to
            post on @anonpost.eth
          </p>

          <p className="text-gray-400 mb-6">
            You currently have{" "}
            <span className="text-red-400 font-semibold">
              {userBalance.toLocaleString()}{" "}
            </span>
            <span className="text-sky-500 font-semibold">${TOKEN_NAME}</span>.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                context
                  ? sdk.actions.swapToken({
                      sellToken:
                        "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                      buyToken: `eip155:8453/erc20:${TOKEN_ADDRESS}`,
                    })
                  : window.open(
                      `https://app.uniswap.org/swap?outputCurrency=${TOKEN_ADDRESS}`,
                      "_blank",
                    )
              }
              className="flex items-center gap-2 bg-lime-500/10 border border-lime-400/30 text-lime-300 px-6 py-2.5 rounded-xl font-medium hover:bg-lime-500/20 hover:text-lime-200 transition-all"
            >
              <Wallet2 className="w-4 h-4" />
              Buy ${TOKEN_NAME}
            </button>

            <button
              onClick={() => refetchBalance()}
              className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-lime-400/30 text-gray-400 hover:text-lime-400 transition-all"
              title="Refresh Balance"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefetchingBalance ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <ComposerFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-[#0f1115] via-[#1b1e25] to-[#0c0e12] text-white px-2">
      <div
        className={`transition-opacity duration-500 ease-in-out ${
          isTyping ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <ComposerHeader
          context={context}
          address={address}
          disconnect={disconnect}
          truncateAddress={truncateAddress}
          userBalance={userBalance}
        />
      </div>

      <QuoteOrReply
        showPopup={showPopup}
        setShowPopup={setShowPopup}
        setCastType={setCastType}
      />

      <div className="w-full max-w-lg bg-[#111418]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl p-3 space-y-1 transition-transform hover:scale-[1.01] hover:border-lime-400/40">
        {castHash &&
          username &&
          (castType === "reply" || castType === "quote") && (
            <>
              {castType === "reply" ? "Replying to " : "Quoting "}@{username}
              <div className="bg-[#101110] text-white rounded-2xl shadow-lg max-w-xl w-full border border-[#2F3336] text-sm">
                <FarcasterEmbed
                  username={username}
                  hash={castHash}
                  options={{ hideFarcasterLogo: true }}
                />
              </div>
            </>
          )}

        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium mb-1">Text</label>
          <textarea
            ref={textRef}
            className="w-full p-3 bg-[#525760] text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-lime-500 resize-none"
            placeholder="Write something without a trace..."
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

        {/* Action Bar */}
        <div className="flex items-center justify-between mt-2 gap-4">
          {/* Image Upload */}
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

          {/* Post Button with Cooldown */}
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              cooldownRemaining > 0 ||
              (text.trim().length === 0 &&
                !embedUrl1 &&
                !embedUrl2 &&
                !imageUrl &&
                !castIdFid)
            }
            className="bg-gray-700 hover:bg-lime-600 text-white px-4 py-2 rounded-md transition disabled:opacity-50 w-[200px] disabled:cursor-not-allowed"
          >
            {loading
              ? "Posting..."
              : cooldownRemaining > 0
                ? `Wait ${cooldownRemaining}s`
                : result.hash
                  ? "Posted"
                  : "Post"}
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

        {/* Success Message */}
        {result.hash && (
          <div
            className="mt-3 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-green-300 font-medium flex justify-center gap-2 text-center cursor-pointer"
            onClick={
              context
                ? () => sdk.actions.viewProfile({ fid: 1009125 })
                : () =>
                    window.open("https://farcaster.xyz/anonpost.eth", "_blank")
            }
          >
            Posted, click here to view
          </div>
        )}

        {/* Error Message */}
        {result.error && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-400 font-medium flex justify-center items-center gap-2 text-center">
            ❌ {result.error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={`transition-opacity duration-500 ease-in-out ${
          isTyping ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <ComposerFooter context={context} showMobileBuy={true} />
      </div>
    </div>
  );
}

interface ComposerHeaderProps {
  context: Context.MiniAppContext | undefined;
  address: `0x${string}` | undefined;
  disconnect: () => void;
  truncateAddress: (addr: string) => string;
  userBalance: number;
}

function ComposerHeader({
  context,
  address,
  disconnect,
  truncateAddress,
  userBalance,
}: ComposerHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleBuy = () => {
    if (context) {
      sdk.actions.swapToken({
        sellToken:
          "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        buyToken: `eip155:8453/erc20:${TOKEN_ADDRESS}`,
      });
    } else {
      window.open(
        `https://app.uniswap.org/swap?outputCurrency=${TOKEN_ADDRESS}`,
        "_blank",
      );
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full z-50 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-[#0f1115]/90 to-transparent backdrop-blur-sm">
      {/* Left: Profile */}
      <button
        onClick={
          context
            ? () => sdk.actions.viewProfile({ fid: 1009125 })
            : () => window.open("https://farcaster.xyz/anonpost.eth", "_blank")
        }
        className="flex items-center gap-2 group"
      >
        <div className="relative w-9 h-9">
          <Image
            src="/icon.png"
            alt="Profile"
            fill
            sizes="36px"
            className="rounded-full border border-white/20 object-cover group-hover:border-lime-400/40 transition-all duration-200"
            priority
          />
        </div>
        <span className="text-sm font-medium text-gray-300 group-hover:text-lime-400 transition-colors hidden sm:block">
          AnonPost
        </span>
      </button>

      {/* Center: Balance + Buy (combined) */}
      <button
        onClick={handleBuy}
        className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-lime-500/10 border border-white/10 hover:border-lime-400/30 px-3 py-1.5 rounded-lg transition-all group"
      >
        <span className="text-lime-400 font-medium text-xs">
          {userBalance.toLocaleString()}
        </span>
        <span className="text-sky-400 text-xs">${TOKEN_NAME}</span>
        <span className="text-gray-500">|</span>
        <span className="text-lime-300 text-xs font-medium group-hover:text-lime-200 flex items-center gap-1">
          <Wallet2 className="w-3.5 h-3.5" />
          Buy
        </span>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Wallet Address + Disconnect (combined) */}
        <div className="flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          <span className="text-xs text-gray-400 px-3 py-1.5">
            {truncateAddress(address || "")}
          </span>
          <button
            onClick={() => disconnect()}
            className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 border-l border-white/10 transition-all"
            title="Disconnect wallet"
          >
            <LogOut className="w-4 h-4 text-red-400" />
          </button>
        </div>

        {/* Share/Copy */}
        {context ? (
          <button
            onClick={() =>
              sdk.actions.composeCast({
                text: `Post anonymously, on @anonpost.eth\n`,
                embeds: [`${process.env.NEXT_PUBLIC_URL}`],
              })
            }
            className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-lime-400/40 transition-all"
          >
            <Share2 className="w-4 h-4 text-gray-300" />
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
              <Check className="w-4 h-4 text-lime-400 transition-transform duration-300 scale-110" />
            ) : (
              <Copy className="w-4 h-4 text-gray-300 transition-transform duration-300 hover:scale-105" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface ComposerFooterProps {
  context?: Context.MiniAppContext;
  showMobileBuy?: boolean;
}

function ComposerFooter({
  context,
  showMobileBuy = false,
}: ComposerFooterProps) {
  const handleBuy = () => {
    if (context) {
      sdk.actions.swapToken({
        sellToken:
          "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        buyToken: `eip155:8453/erc20:${TOKEN_ADDRESS}`,
      });
    } else {
      window.open(
        `https://app.uniswap.org/swap?outputCurrency=${TOKEN_ADDRESS}`,
        "_blank",
      );
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-4 py-3 flex flex-col items-center gap-3 bg-gradient-to-t from-[#0f1115]/90 to-transparent">
      {/* Mobile Buy Button - only visible on small screens */}
      {showMobileBuy && (
        <button
          onClick={handleBuy}
          className="sm:hidden flex items-center gap-2 bg-lime-500/10 border border-lime-400/30 text-lime-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-lime-500/20 hover:text-lime-200 transition-all"
        >
          <Wallet2 className="w-4 h-4" />
          Buy ${TOKEN_NAME}
        </button>
      )}

      {/* Credits */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Built with 💜 by</span>

        <a
          href="https://farcaster.xyz/cashlessman.eth"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-lime-400 transition-colors"
        >
          @cashlessman.eth
          <ExternalLink className="w-3 h-3" />
        </a>
        <span className="text-gray-600">•</span>
        <a
          href="https://github.com/sah-ban/anonpost"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-lime-400 transition-colors"
        >
          GitHub
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

interface QuoteOrReplyProps {
  showPopup: boolean;
  setShowPopup: (show: boolean) => void;
  setCastType: (type: CastType) => void;
}

function QuoteOrReply({
  showPopup,
  setShowPopup,
  setCastType,
}: QuoteOrReplyProps) {
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
