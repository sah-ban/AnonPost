export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header: "",
      payload: "",
      signature: "",
    },
    frame: {
      version: "1",
      name: "AnonPost",
      iconUrl: `${appUrl}/icon.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/og.png`,
      buttonTitle: "write AnonPost",
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#000000",
      castShareUrl: appUrl,
      webhookUrl: `${appUrl}/api/webhook`,
      subtitle: "Post anonymously, for free",
      description: "Post anonymously, for free",
      primaryCategory: "social",
      ogImageUrl: `${appUrl}/og.png`,
      tags: ["anon", "post", "anoncast", "anonpost", "anononymous"],
      heroImageUrl: `${appUrl}/og.png`,
      tagline: "Post anonymously, for free",
      ogTitle: "Post anonymously, for free",
      ogDescription: "Post anonymously, for free",
      baseBuilder: {
        allowedAddresses: ["0x06e5B0fd556e8dF43BC45f8343945Fb12C6C3E90"],
      },
    },
  };

  return Response.json(config);
}
