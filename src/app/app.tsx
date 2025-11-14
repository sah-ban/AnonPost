"use client";

import dynamic from "next/dynamic";

// const UnderMaintenance = dynamic(() => import("~/components/UnderMaintenance"), {
const CastComposer = dynamic(() => import("~/components/CastComposer"), {

  ssr: false,
});

export default function App() {
  // return <UnderMaintenance />;
    return <CastComposer />;

}
