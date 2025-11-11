import type { Metadata } from "next";
import "~/app/globals.css";

export const metadata: Metadata = {
  title: "AnonPost",
  description: "Post anonymously, for free",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="en">
      <body>
        <div>{children}</div>
      </body>
    </html>
  );
}
