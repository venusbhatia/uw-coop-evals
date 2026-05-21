import type { AuthConfig } from "convex/server";

const issuer = process.env.SESSION_ISSUER?.trim() || "https://evals.com";

export default {
  providers: [
    {
      domain: issuer,
      applicationID: "evals-com",
    },
    /** Legacy audience from pre-rebrand deploys; remove after all sessions have rotated. */
    {
      domain: issuer,
      applicationID: "employee-evals",
    },
  ],
} satisfies AuthConfig;
