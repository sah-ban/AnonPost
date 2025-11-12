"use client";

import { Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

export default function UnderMaintenance() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready({});
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#16101e] text-gray-100 p-6 text-center select-none">
      {/* Icon */}
      <div className="flex items-center justify-center mb-6 bg-[#1f1a2a] p-5 rounded-2xl shadow-lg animate-pulse">
        <Wrench size={60} className="text-lime-400" />
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-semibold mb-3">
        We&apos;re Under Maintenance 🛠️
      </h1>

      {/* Message */}
      <p className="text-gray-400 max-w-md mb-8">
        We&apos;re making some improvements to serve you better.
        <br />
        Please check back soon — this won’t take long!
      </p>
    </div>
  );
}
