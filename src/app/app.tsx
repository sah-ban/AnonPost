"use client";

import dynamic from "next/dynamic";

const CastComposer = dynamic(() => import("~/components/CastComposer"), {
  ssr: false,
});

export default function App() {
  return <CastComposer />;
}
