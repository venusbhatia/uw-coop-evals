/**
 * Generate RS256 keys for Convex OIDC auth.
 * Run: node scripts/generate-jwt-keys.mjs
 * Set JWT_PRIVATE_KEY and JWKS on Vercel; SESSION_ISSUER must match your app URL.
 */
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
const pkcs8 = await exportPKCS8(privateKey);
const jwk = await exportJWK(publicKey);
const jwks = JSON.stringify({
  keys: [{ use: "sig", ...jwk, alg: "RS256", kid: "employee-evals-1" }],
});
const oneLineKey = pkcs8.trimEnd().replace(/\n/g, " ");

console.log(`JWKS=${jwks}`);
console.log(`JWT_PRIVATE_KEY=${oneLineKey}`);
