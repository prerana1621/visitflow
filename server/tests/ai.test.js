import { describe, expect, it, afterEach } from 'vitest';
import { generateAssistantDecision } from '../src/services/ai.js';
import { stripUnsafeClaims } from '../src/utils/aiSafety.js';

afterEach(() => { delete process.env.GEMINI_API_KEY; });

describe('AI safety boundary', () => {
  it('allows the portfolio-wide indicative range but not a unit price', () => {
    expect(stripUnsafeClaims('The portfolio-wide indicative range is INR 65 lakh to INR 1.2 crore.')).toBe(false);
    expect(stripUnsafeClaims('Your 2 BHK will cost ₹78 lakh.')).toBe(true);
    expect(stripUnsafeClaims('The portfolio range is INR 65 lakh to INR 1.2 crore. Your unit price is ₹78 lakh.')).toBe(true);
    expect(stripUnsafeClaims('The portfolio-wide indicative range is INR 65 lakh to INR 1.2 crore.')).toBe(false);
    expect(stripUnsafeClaims('कुल पोर्टफोलियो की सीमा 65 लाख से 1.2 करोड़ है।')).toBe(false);
    expect(stripUnsafeClaims('કુલ પોર્ટફોલિયો રેન્જ 65 લાખથી 1.2 કરોડ છે.')).toBe(false);
    expect(stripUnsafeClaims('This 2 BHK is priced at 78L.')).toBe(true);
  });
  it('flags unsupported discounts and guarantees', () => {
    expect(stripUnsafeClaims('We can guarantee a 10% discount.')).toBe(true);
    expect(stripUnsafeClaims('Possession is guaranteed.')).toBe(true);
    expect(stripUnsafeClaims('10% ડિસ્કાઉન્ટ મળી શકે છે.')).toBe(true);
    expect(stripUnsafeClaims('Possession की गारंटी है.')).toBe(true);
  });
  it('hands off rather than pretending the AI is available without a key', async () => {
    const result = await generateAssistantDecision({ message: 'What amenities are included?', project: { name: 'Project 1', city: 'Ahmedabad', configurations: ['2 BHK'], priceRangeText: '', totalApartments: 420 }, history: [], currentLead: { language: 'English', wants: '2 BHK' } });
    expect(result.aiAvailable).toBe(false);
    expect(result.requestedAction).toBe('HANDOFF');
    expect(result.needsHuman).toBe(true);
  });
});
