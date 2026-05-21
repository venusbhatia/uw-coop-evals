import type { AuthConfig } from "convex/server";

const issuer = process.env.SESSION_ISSUER?.trim() || "https://evals.com";

export default {
  providers: [
    {
      domain: issuer,
      applicationID: "evals-com",
    },
  ],
} satisfies AuthConfig;
