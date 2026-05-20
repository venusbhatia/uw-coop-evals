import type { AuthConfig } from "convex/server";

const issuer =
  process.env.SESSION_ISSUER?.trim() || "https://employee-evals.vercel.app";

const jwksJson = process.env.JWKS?.trim();

function jwksDataUri(json: string): string {
  const base64 = btoa(json);
  return `data:text/plain;charset=utf-8;base64,${base64}`;
}

export default {
  providers: jwksJson
    ? [
        {
          type: "customJwt",
          issuer,
          applicationID: "employee-evals",
          algorithm: "RS256",
          jwks: jwksDataUri(jwksJson),
        },
      ]
    : [
        {
          domain: issuer,
          applicationID: "employee-evals",
        },
      ],
} satisfies AuthConfig;
