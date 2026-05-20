import { NextResponse } from "next/server";
import { sessionIssuer } from "@/lib/sessionConstants";

export async function GET() {
  const issuer = sessionIssuer();
  return NextResponse.json({
    issuer,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ["id_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
  });
}
