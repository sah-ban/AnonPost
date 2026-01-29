export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjI2ODQzOCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDIxODA4RUUzMjBlREY2NGMwMTlBNmJiMEY3RTRiRkIzZDYyRjA2RWMifQ",
      payload: "eyJkb21haW4iOiJhbm9ucG9zdC54eXoifQ",
      signature:
        "GDTp59IbrapnfHRruEWCTpy/UkIaL5eMOfmdGhyOplsTxuVJv2S6oJf453IpuVKOdXtx8HQdk9LuxokFDBRENxw=",
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
      subtitle: "Post anonymously",
      description: "Post anonymously on Farcaster",
      primaryCategory: "social",
      ogImageUrl: `${appUrl}/og.png`,
      tags: ["anon", "post", "anoncast", "anonpost", "anononymous"],
      heroImageUrl: `${appUrl}/og.png`,
      tagline: "Post anonymously on Farcaster",
      ogTitle: "Post anonymously on Farcaster",
      ogDescription: "Post anonymously on Farcaster",
      baseBuilder: {
        allowedAddresses: ["0x06e5B0fd556e8dF43BC45f8343945Fb12C6C3E90"],
      },
    },
  };

  return Response.json(config);
}
