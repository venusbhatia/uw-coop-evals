import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";

const TEST_JWKS = `{"keys":[{"use":"sig","kty":"RSA","n":"vujXK96DPk6NDSQKxXJDJarOVvC58qhocZLy-QqNXZJB0nlbkpk_GmMrEQKNQbyQQytstO_GHMGboSdaGlV_KK4htWhcPubqcKQwqqMuAwSCxcCYtIzliNrGywllbXM-3gemJl5Dqj7aRMWsrHPR0uX-Fi36o5H4FKM-LUR3hp-v0lGEmwi_346MhKe3tLykQv7-9xdyfvyBbXKofJ8KhhzxLcnxM5oPrWD-yIFe8vHzGsbNqFZxYn2vAV7SAMyhvyrgUXu-aRMkx38I0YSwtTqPCO-l6MshuY3U7ODpEgHaCeW4TapizddZgU1x1x9Bf1QYuSKDXmFjDFzuGZb3gQ","e":"AQAB","alg":"RS256"}]}`;

const TEST_PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY----- MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC+6Ncr3oM+To0N JArFckMlqs5W8LnyqGhxkvL5Co1dkkHSeVuSmT8aYysRAo1BvJBDK2y078YcwZuh J1oaVX8oriG1aFw+5upwpDCqoy4DBILFwJi0jOWI2sbLCWVtcz7eB6YmXkOqPtpE xaysc9HS5f4WLfqjkfgUoz4tRHeGn6/SUYSbCL/fjoyEp7e0vKRC/v73F3J+/IFt cqh8nwqGHPEtyfEzmg+tYP7IgV7y8fMaxs2oVnFifa8BXtIAzKG/KuBRe75pEyTH fwjRhLC1Oo8I76XoyyG5jdTs4OkSAdoJ5bhNqmLN11mBTXHXH0F/VBi5IoNeYWMM XO4ZlveBAgMBAAECggEADvCoVB/N/AyIJ9DcAe8q95HqI24j0yxgPhEesCQmA35c ZdUG+E5DXLSJjIN7W/tee880auV/xsTVAdPTTo/Fy4BzFWAFJgwKqUWEJHpwMZ7D AChOGwUSunbKi12hISNddmE5XLPQTkysZqjkljtbHorOq1wuSuoztKPAzCiZRQDs FOWkLXjJ4oqo8Q2+toKLRSdiolP4y2mxW631c0c6AVYHSQN9wnIx8jMW3KqXaHqE TBiiN5HB7E2mdYbAK2OQXqoKTNH4FZoSiMbL81nElBNupWSado73jPN6ZbzNzJ3h 6FHi/eK1lY558VtuNOiA5JOUyqNF3tqfO1sgklm+ZQKBgQDhq+YvWUA/ZKi1jbvj SZ4cv3kEvqpxGYmRhFFlkdA0yAvGunGYUNAbDGNkcf/cagD/3IYdVdrajjW6awes ZMQWenG/K3S7rfvbduLSCWaicqOvEvRbzkIglZXwTGmb2mCDTJwvaSKGlOCZHQeg +cw3l1DhPzm1bfwaK99exKeDTQKBgQDYkPncWG8GQoq4pKcItC55wJx2TDYxaFHX uIwPVL45YaxbZv1p+Op0lyfaRBCS/aVA1HZBrRd5IH9F07zNB2aVNw0QFa3q7jIf CD4J4EcW0NiAaGxtpbabyvTeShQeid47ybBX7N5wVMNqD1/H41DtYEVV1p9qvV7n XqHG0CWDBQKBgQDSFUb6eSnYWgq8yS9KTfRFavJsOltNYqqwru9fkLi1Ci38WQD6 /PBe3c+BaKb6OCyqBE9N6+kLYSwfWRgRotTw4BgYEYpgVX2LN0e8pEfJntNGXmzh MkhZMSgeReRi1I7YbG9Rq5wakWns4BuD/kfg0JrYthUxEyyH6KPPA1+2WQKBgQDM q48IGKeswdx6jlmyFx9JP6hfAL3CyfV3K1lq78rrTgznQRlEOtPRpj0qwWLsmDzC XUj53s0tU3IVGvv2xQTFBocY6XQ5cC38N/zxtn1Y6b2C9a1rns5KxG/RWS9UgTV/ SaiYICtE/EbGiIsbzRBhlrdQXYrCBQCZJ007KOIaxQKBgQDEZIJszXhfv+HvhYUV EbUclqM+u0xDnaX4GsnKqq1jYrmcgRR/wyYLXJO2pRrZu6a8pcDP14JGel8sL3/o dulcXNvhtqdhTzQjGQgXpSSKV3+lPNE5maQ5JedODrxh+ACc8/Xc4UN7kAWn7SVg bAL/6xsTYQyEFik2c7YhZqngxA== -----END PRIVATE KEY-----";

describe("session tokens", () => {
  const previousKey = process.env.JWT_PRIVATE_KEY;
  const previousJwks = process.env.JWKS;
  const previousIssuer = process.env.SESSION_ISSUER;

  beforeEach(() => {
    process.env.JWT_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.JWKS = TEST_JWKS;
    process.env.SESSION_ISSUER = "https://test.example.com";
  });

  afterEach(() => {
    process.env.JWT_PRIVATE_KEY = previousKey;
    process.env.JWKS = previousJwks;
    process.env.SESSION_ISSUER = previousIssuer;
  });

  it("signs and verifies a session", async () => {
    const token = await createSessionToken("supervisor@8090.inc");
    const payload = await verifySessionToken(token);
    expect(payload?.email).toBe("supervisor@8090.inc");
  });

  it("rejects invalid emails at sign time", async () => {
    await expect(createSessionToken("bad@gmail.com")).rejects.toThrow();
  });
});
