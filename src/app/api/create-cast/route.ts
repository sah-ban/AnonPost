import { NextRequest, NextResponse } from "next/server";
import {
  Message,
  NobleEd25519Signer,
  CastAddBody,
  makeCastAdd,
  Embed,
  CastId,
} from "@farcaster/core";
import { hexToBytes } from "@noble/hashes/utils";
import axios from "axios";

const fid = 1009125;
const SIGNER = process.env.PRIVATE_KEY || "";

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

export async function POST(req: NextRequest) {
  const hubUrl = process.env.HUB_URL || "";
  try {
    const body: CastRequestBody = await req.json();
    const { text, castType, embeds = [], parentCastId } = body;

    const hasText = !!text && text.trim().length > 0;
    const hasEmbeds = Array.isArray(embeds) && embeds.length > 0;

    if (!hasText && !hasEmbeds) {
      return NextResponse.json(
        { error: "Either text or embeds must be provided" },
        { status: 400 }
      );
    }

    if (!["cast", "reply", "quote"].includes(castType)) {
      return NextResponse.json({ error: "Invalid castType" }, { status: 400 });
    }

    const privateKeyBytes = hexToBytes(SIGNER);
    const ed25519Signer = new NobleEd25519Signer(privateKeyBytes);
    const dataOptions = { fid, network: 1 };

    let formattedEmbeds: Embed[] = [];
    if (hasEmbeds) {
      formattedEmbeds = embeds
        .filter((e): e is EmbedInput => !!e.url || !!e.castId)
        .map((e) =>
          e.castId
            ? {
                castId: {
                  fid: e.castId.fid,
                  hash: hexToBytes(e.castId.hash.replace(/^0x/, "")),
                },
              }
            : { url: e.url! }
        );
    }

    let parentCast: CastId | undefined;
    if (castType === "reply" && parentCastId) {
      parentCast = {
        fid: parentCastId.fid,
        hash: hexToBytes(parentCastId.hash.replace(/^0x/, "")),
      };
    }

    const rawtext = text || "";
    let finalText = rawtext;
    const mentionsPositions: number[] = [];
    let mentions: number[] = [];

    if (rawtext.includes("@")) {
      const regex = /@\w+(\.eth)?/g;
      const matches = [...rawtext.matchAll(/@([\w.]+)/g)];
      const usernames = matches.map((match) => match[1]);

      const textWithAt = rawtext.replace(regex, "!");
      for (let i = 0; i < textWithAt.length; i++) {
        if (textWithAt[i] === "!") {
          mentionsPositions.push(i);
        }
      }

      finalText = rawtext.replace(regex, "");

      try {
        const responses = await Promise.all(
          usernames.map(async (name) => {
            try {
              const res = await axios.get(
                `${hubUrl}/v1/userNameProofByName?name=${name}`
              );
              return res.data;
            } catch {
              throw new Error(name);
            }
          })
        );

        mentions = responses.map((r) => r.fid);
      } catch (error) {
        const invalid = (error as Error).message || "unknown";
        return NextResponse.json(
          { error: `Invalid username: @${invalid}` },
          { status: 400 }
        );
      }
    }

    const castBody: CastAddBody = {
      text: finalText,
      embeds: formattedEmbeds,
      embedsDeprecated: [],
      mentions,
      mentionsPositions,
      type: finalText.length < 320 ? 0 : 1,
      parentCastId: parentCast,
    };

    const castAddReq = await makeCastAdd(castBody, dataOptions, ed25519Signer);
    const castAdd = castAddReq._unsafeUnwrap();
    const messageBytes = Buffer.from(Message.encode(castAdd).finish());

    const response = await fetch(`${hubUrl}/v1/submitMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: messageBytes,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      castType,
      hash: result.hash,
    });
  } catch (error) {
    console.error("Error sending cast:", error);
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
