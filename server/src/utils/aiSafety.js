/**
 * Conservative response filter: this demo may repeat only the portfolio-wide
 * indicative range from the supplied brief. Any other monetary amount, discount
 * or guarantee claim is sent to a human instead of being displayed.
 */
export function stripUnsafeClaims(reply) {
  const text = String(reply || '');
  const allowedRangePattern = /(?:INR\s*|₹\s*)?65\s*(?:lakh|lac|लाख|લાખ)\s*(?:to|[-–]|से|થી)\s*(?:INR\s*|₹\s*)?1\.2\s*(?:crore|cr|करोड़|કરોડ)/ig;
  const withoutAllowedRange = text.replace(allowedRangePattern, ' ');
  const unsupportedPrice = /₹|\bINR\b|\brupees?\b|\bRs\.?\s*\d/i.test(withoutAllowedRange)
    || /\b\d+(?:\.\d+)?\s*(?:lakh|lac|crore|cr|लाख|करोड़|લાખ|કરોડ)\b/i.test(withoutAllowedRange)
    || /\b\d+(?:\.\d+)?\s*(?:L|Lakhs?|Lac|Cr)\b/i.test(withoutAllowedRange);
  const discountClaim = /\b(?:discount|off)\b.{0,28}\b\d{1,2}\s?%|\b\d{1,2}\s?%\s?(?:discount|off)\b|छूट|ડિસ્કાઉન્ટ/i.test(text);
  const guaranteeClaim = /\b(guaranteed|assured|confirmed possession|fixed return)\b|गारंटी|निश्चित रूप से मिलेगा|ખાતરી/i.test(text);
  return unsupportedPrice || discountClaim || guaranteeClaim;
}
