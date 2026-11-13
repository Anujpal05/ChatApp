import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const kid = `quicktalk-${new Date().toISOString().slice(0, 10)}`;
const publicJwk = { kid, ...publicKey.export({ format: "jwk" }) };
const privateJwk = { kid, ...privateKey.export({ format: "jwk" }) };

console.log("Add this public JWK to the Relay console (custom-token / ES256):");
console.log(JSON.stringify(publicJwk, null, 2));
console.log(
  "\nStore this private JWK only in server/.env as SIGNAL_RELAY_PRIVATE_JWK:",
);
console.log(JSON.stringify(privateJwk));
console.log(
  "\nNever commit or share the private JWK. Keep a secure backup for key rotation.",
);
