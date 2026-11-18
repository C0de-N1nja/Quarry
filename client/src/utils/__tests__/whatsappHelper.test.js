import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  normalizeWhatsAppPhone, 
  generateWhatsAppMessage, 
  getWhatsAppWebUrl, 
  getUniversalWhatsAppUrl 
} from '../whatsappHelper.js';

describe('WhatsApp Helper (client/src/utils/whatsappHelper.js)', () => {
  it('1. Normalizes US phone numbers with and without +1', () => {
    assert.strictEqual(normalizeWhatsAppPhone('+1 813-835-8733', 'US'), '18138358733');
    assert.strictEqual(normalizeWhatsAppPhone('(813) 835-8733', 'US'), '18138358733');
    assert.strictEqual(normalizeWhatsAppPhone('8138358733', 'US'), '18138358733');
  });

  it('2. Normalizes Australian phone numbers with and without +61', () => {
    assert.strictEqual(normalizeWhatsAppPhone('+61 451 899 683', 'AU'), '61451899683');
    assert.strictEqual(normalizeWhatsAppPhone('0451 899 683', 'AU'), '61451899683');
    assert.strictEqual(normalizeWhatsAppPhone('0451899683', 'AU'), '61451899683');
  });

  it('3. Generates correct direct WhatsApp Web URLs with prefilled messages', () => {
    const url = getWhatsAppWebUrl('+1 813-835-8733', 'Hello Patrick', 'US');
    assert(url.startsWith('https://web.whatsapp.com/send?phone=18138358733&text=Hello%20Patrick'));
  });

  it('4. Generates universal wa.me URLs', () => {
    const url = getUniversalWhatsAppUrl('+61 451 899 683', 'Hi Mc Laminate', 'AU');
    assert(url.startsWith('https://wa.me/61451899683?text=Hi%20Mc%20Laminate'));
  });

  it('5. Generates high-converting business-language WhatsApp copy based on lead data', () => {
    const leadNoWebsite = {
      business_name: 'Gulf Coast Trees',
      decision_maker_name: 'Patrick Planthaber',
      city: 'Tampa',
      rating: 4.9,
      reviews_count: 275,
      has_no_website: 1
    };

    const msg = generateWhatsAppMessage(leadNoWebsite);
    assert(msg.includes('Hi Patrick Planthaber'));
    assert(msg.includes('Gulf Coast Trees'));
    assert(msg.includes('Tampa'));
    assert(msg.includes('Google Maps'));
    // Strictly zero emojis check
    assert(!/[\p{Extended_Pictographic}]/u.test(msg), 'Message must contain zero emojis');
  });

  it('6. Supports AI search, competitor leakage, and speed audit business hooks', () => {
    const lead = {
      business_name: 'Acme Roofers',
      city: 'Austin',
      website: 'https://acmeroofers.com'
    };

    const aiMsg = generateWhatsAppMessage(lead, 'ai_search');
    assert(aiMsg.includes('ChatGPT'));
    assert(aiMsg.includes('Acme Roofers'));
    assert(!/[\p{Extended_Pictographic}]/u.test(aiMsg));

    const leakMsg = generateWhatsAppMessage(lead, 'competitor_leak');
    assert(leakMsg.includes('losing calls'));
    assert(!/[\p{Extended_Pictographic}]/u.test(leakMsg));

    const speedMsg = generateWhatsAppMessage(lead, 'speed_audit');
    assert(speedMsg.includes('phone') || speedMsg.includes('mobile'));
    assert(!/[\p{Extended_Pictographic}]/u.test(speedMsg));
  });
});
