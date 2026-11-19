const axios = require('axios');

/**
 * JevService - TypeSafe AI (Jev System One) Decision Layer
 * 
 * Optional probabilistic verification layer for Quarry.
 * - If TYPESAFE_API_KEY (or JEV_API_KEY) is provided in .env:
 *     Jev evaluates search snippets, candidate URLs, and profile matches
 *     with calibrated confidence probabilities, eliminating false-positive hallucinations.
 * - If NO key is provided:
 *     Quarry operates 100% normally using its built-in local heuristics & regex engine.
 */
class JevService {
  constructor() {
    this.apiUrl = 'https://api.typesafe.ai/v1/systemone';
    this.model = 'jev-latest';
  }

  getApiKey() {
    return (process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY || '').trim();
  }

  isConfigured() {
    const key = this.getApiKey();
    return Boolean(key && key.length > 10);
  }

  /**
   * Core System One Decision Caller
   * @param {string|object} state - Context document / state
   * @param {object} questions - Typed questions (noul, choice, score)
   * @param {number} timeoutMs - Timeout in milliseconds (default 5000)
   * @returns {Promise<object|null>} Response answers object or null if not configured/failed
   */
  async askDecision(state, questions, timeoutMs = 5000) {
    if (!this.isConfigured()) return null;

    const apiKey = this.getApiKey();
    const formattedState = typeof state === 'string' ? state : JSON.stringify(state);

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          state: formattedState,
          questions: questions
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: timeoutMs
        }
      );

      return response.data?.answers || null;
    } catch (err) {
      if (err.response?.status === 401) {
        console.warn('[Jev AI] Invalid API Key (HTTP 401). Falling back to local heuristics.');
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        console.warn('[Jev AI] Request timed out. Falling back to local heuristics.');
      } else {
        console.warn('[Jev AI] System One error:', err.response?.data?.message || err.message);
      }
      return null;
    }
  }

  /**
   * Verify whether a candidate web search result or URL belongs to the authentic standalone website
   * @param {object} lead - Lead record (business_name, city, phone)
   * @param {string} candidateUrl - Candidate website URL
   * @param {string} snippetOrTitle - Web search snippet or page summary
   * @returns {Promise<{ isRealWebsite: boolean, confidence: number }|null>}
   */
  async verifyBusinessWebsite(lead, candidateUrl, snippetOrTitle) {
    if (!this.isConfigured()) return null;

    const businessName = lead?.business_name || 'Target Business';
    const location = lead?.city ? `${lead.city}, ${lead.country || ''}` : (lead?.country || '');
    const phone = lead?.phone || lead?.phone_e164 || '';

    const state = `Business: "${businessName}" located in "${location}". Known Phone: "${phone}".
Scraped Search Candidate URL: "${candidateUrl}".
Search Snippet / Description: "${snippetOrTitle || ''}"`;

    const answers = await this.askDecision(state, {
      is_authentic_website: {
        type: 'noul',
        instructions: `Does this candidate URL and snippet confirm that "${businessName}" owns and operates an active, standalone commercial website (and NOT an online phonebook, social profile, job board, or review aggregator like Yelp/YellowPages)?`
      }
    });

    if (!answers?.is_authentic_website) return null;

    const prob = Number(answers.is_authentic_website.noul);
    return {
      isRealWebsite: prob >= 0.75,
      confidence: prob
    };
  }

  /**
   * Verify whether a social profile (Facebook, Instagram) matches the local business
   * @param {object} lead - Lead record
   * @param {string} platform - 'facebook' | 'instagram' | 'linkedin'
   * @param {string} profileUrl - Candidate social profile URL
   * @param {string} profileBio - Scraped bio or page text
   * @returns {Promise<{ isMatch: boolean, confidence: number }|null>}
   */
  async verifySocialMatch(lead, platform, profileUrl, profileBio) {
    if (!this.isConfigured()) return null;

    const businessName = lead?.business_name || '';
    const city = lead?.city || '';

    const state = `Local Business: "${businessName}" in "${city}".
Candidate ${platform} URL: "${profileUrl}".
Profile Bio / Content: "${profileBio || ''}"`;

    const answers = await this.askDecision(state, {
      is_correct_business: {
        type: 'noul',
        instructions: `Does this ${platform} profile belong to the authentic local business "${businessName}" in or around "${city}"?`
      }
    });

    if (!answers?.is_correct_business) return null;

    const prob = Number(answers.is_correct_business.noul);
    return {
      isMatch: prob >= 0.70,
      confidence: prob
    };
  }

  /**
   * Get Current Status for System Logs & UI
   */
  getStatus() {
    const configured = this.isConfigured();
    const key = this.getApiKey();
    return {
      configured,
      provider: 'TypeSafe AI (Jev System One)',
      model: this.model,
      keyPreview: configured ? `${key.slice(0, 10)}...${key.slice(-4)}` : null
    };
  }
}

module.exports = new JevService();
