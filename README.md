# 🪶 AnonPost - Post anonymously on Farcaster

**AnonPost** is a lightweight, privacy-friendly **miniapp/webpage** built with **Next.js 14 (App Router)** and **TypeScript**, designed to create, reply to, or quote Farcaster casts **anonymously and for free**.

It integrates with the **Farcaster MiniApp SDK** and supports:

- 📝 Text casts
- 🌐 Link embeds (up to 2 per post)
- 🖼️ Image uploads
- 💬 Quote / Reply support
- 💜 Mentions with auto-FID resolution
- ⚡ Live character + attachment counters
- 📱 Farcaster-native actions for miniapp

---

## 🚀 Features

✅ **Three Cast Types**

- **Cast** — Standard standalone post
- **Reply** — Reply to another user’s cast
- **Quote** — Quote a cast while adding your own text

✅ **Embed Support**

- Up to **2 embeds max** per cast (link, image, or quoted cast)
- Auto-handling of embed order (image → URL1 → URL2 → cast)

✅ **Mentions**

- Type `@username` or `@username.eth` in your text — the API resolves FIDs automatically
- Invalid usernames return a readable error

✅ **Auto UI Enhancements**

- Character + embed counters with color indicators
- Fade-out header while typing
- Responsive layout with TailwindCSS
- Auto-reset after successful submission

✅ **Farcaster Integration**

- Works with **MiniApp SDK** for in-app interactions (`viewProfile`, `viewCast`, etc.)
- Uses the **Farcaster Hub API** for posting messages

---

## 🧱 Tech Stack

| Category          | Tools                                                                          |
| ----------------- | ------------------------------------------------------------------------------ |
| **Framework**     | [Next.js 14 (App Router)](https://nextjs.org/)                                 |
| **Language**      | TypeScript                                                                     |
| **Styling**       | Tailwind CSS                                                                   |
| **Blockchain**    | [@farcaster/core](https://www.npmjs.com/package/@farcaster/core)               |
| **MiniApp SDK**   | [@farcaster/miniapp-sdk](https://www.npmjs.com/package/@farcaster/miniapp-sdk) |
| **Embeds**        | [react-farcaster-embed](https://www.npmjs.com/package/react-farcaster-embed)   |
| **Image Hosting** | [ImgBB API](https://api.imgbb.com/)                                            |
| **UI Icons**      | [Lucide React](https://lucide.dev/)                                            |

---

## ⚙️ Project Structure

```

project/
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ create-cast/route.ts               # API route to create/submit cast
│  │  │  ├─ username/route.ts                  # Helper to fetch username by FID
│  │  │  ├─ send-notifications/route.ts        # API route to send notifications on farcaster
│  │  ├─ .well-known/farcaster.json/route.ts   # Manifest for miniapp
│  │  ├─ page.tsx                              # App entrypoint
│  ├─ components/
│  │  └─ CastComposer.tsx                      # Main UI component
├─ public/
│  ├─ icon.png
│  ├─ og.png
│  ├─ splash.png
│  └─ farcaster.png
├─ .env                                        # Environment variables
├─ package.json
├─ tailwind.config.js
├─ next.config.js
└─ README.md
```
---

## 🔧 Environment Variables

Rename a `.env.example` to `.env` in your root directory and fill in the following:

```bash

# Public site URL
NEXT_PUBLIC_URL=

# Private Farcaster signer key (hex string without 0x)
PRIVATE_KEY=your_ed25519_private_key_here

# Hub URL
HUB_URL=snapchain hub url

# Public image upload key from ImgBB
NEXT_PUBLIC_IMGBB_KEY=your_imgbb_api_key

```

> ⚠️ Make sure the `PRIVATE_KEY` **does not start with `0x`**.  
> Example: `KEY=f9a21b...` (not `0xf9a21b...`)

---

## 🧩 API Endpoints

### `POST /api/create-cast`

Creates a new cast, reply, or quote.

---

### `GET /api/username?fid=<fid>`

Fetches a user’s Farcaster username for display.

---

## 🧠 Logic Overview

### 🏗️ Cast Creation Flow

1. Client builds `CastAddBody` dynamically based on:
   - `text` (optional)
   - `embeds` (up to 2)
   - `castType` (cast/reply/quote)
   - `parentCastId` (if reply)
2. Server signs and serializes it using `NobleEd25519Signer`
3. Cast message is sent to hub
4. Returns the hash of the successfully created cast

---

## 🧪 Development

**Install dependencies**

```bash
yarn install
```

**Run locally**

```bash
yarn dev
```

**Build for production**

```bash
yarn build
```

**Run production build**

```bash
yarn start
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deployment

**Recommended:** [Vercel](https://vercel.com/)

1. Push your project to GitHub
2. Import into Vercel
3. Add all required environment variables
4. Deploy 🚀

---

## 🧑‍💻 Author

**[@cashlessman.eth](https://farcaster.xyz/cshlessman.eth)**  
Built for **Farcaster**

> “Post anonymously, for free.”

---

## 📜 License

Licensed under the **Apache License 2.0**  
Copyright © 2025 AnonPost

You may not use this project except in compliance with the License.  
You may obtain a copy of the License at: [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
