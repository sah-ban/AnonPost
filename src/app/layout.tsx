import type { Metadata } from "next";
import "~/app/globals.css";
import { Providers } from "../app/providers";

export const metadata: Metadata = {
  title: "AnonPost",
  description: "Post anonymously on Farcaster",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
