// CADET — ai/no-webhooks.js : a stand-in for the 'standardwebhooks' package in the built file (build.mjs: alias).
// The Anthropic SDK imports it only for its webhook verifier (client.beta.webhooks.unwrap), which a page never uses:
// with this, that library and its own dependencies (@stablelib/base64, fast-sha256) stay out of CADET.html.
export class Webhook {
  constructor() { throw new Error('webhooks are not used here'); }
}
