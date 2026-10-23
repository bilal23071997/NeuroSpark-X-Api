/** The five official ecosystem destinations, in their fixed order. */
export const ECOSYSTEM_DESTINATION_SLUGS = [
  'youniversity',
  'soulmap',
  'studio',
  'digital-intelligence-labs',
  'pulse',
] as const;

/** Symbol art the website can draw on a product cover. */
export const PRODUCT_SYMBOLS = [
  'star',
  'wave',
  'nodes',
  'zodiac',
  'cards',
  'spark',
  'compass',
  'orbit',
] as const;

/**
 * The five fixed Vault categories, in their official order. They are seeded
 * into a static table and are not editable. No professional-services or
 * automation category — see Documentation/Backend-Phase-Plan.md.
 */
export const VAULT_CATEGORIES = [
  {
    slug: 'personal-growth',
    name: 'Personal Growth',
    description:
      'Resources for self-discovery, personal development, reflection, and intentional growth.',
  },
  {
    slug: 'astrology-numerology',
    name: 'Astrology & Numerology',
    description:
      'Digital resources exploring astrology, numerology, symbolic systems, and personal mapping.',
  },
  {
    slug: 'ai-tools',
    name: 'AI Tools',
    description: 'AI-powered creation tools, prompt resources, and custom GPT products.',
  },
  {
    slug: 'creator-resources',
    name: 'Creator Resources',
    description:
      'Templates, content resources, digital creation assets, and practical tools for creators.',
  },
  {
    slug: 'guides-frameworks',
    name: 'Guides & Frameworks',
    description:
      'Educational guides, workbooks, structured methodologies, and implementation resources.',
  },
] as const;
