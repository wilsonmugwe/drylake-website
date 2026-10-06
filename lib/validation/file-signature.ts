/*
 * File content checks for admin document uploads. PURE: unit-tested in
 * tests/security-hardening.test.mjs.
 *
 * The upload route already requires a matching browser MIME type and extension, but both
 * are just labels the sender chooses. Clients download these files from the portal, so the
 * bytes must actually be the type we store and serve them as: a renamed HTML or executable
 * is refused here. DOCX is a ZIP container, so the check is the ZIP local-file header.
 */

const SIGNATURES: Record<string, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d], // "%PDF-"
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  docx: [0x50, 0x4b, 0x03, 0x04], // "PK\x03\x04"
};

/* True only when the first bytes match the expected format for this extension. */
export function hasExpectedSignature(extension: string, bytes: Uint8Array): boolean {
  const signature = SIGNATURES[extension];

  if (!signature || bytes.length < signature.length) {
    return false;
  }

  return signature.every((byte, index) => bytes[index] === byte);
}
