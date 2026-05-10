export type LandingPageInputType = 'text' | 'textarea' | 'select' | 'multiselect';

export interface LandingPageInput {
  name: string;
  label: string;
  type: LandingPageInputType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | string[];
}

export interface LandingPageValues {
  businessName: string;
  industry: string;
  pageGoal: string;
  audience: string;
  offer: string;
  primaryCta: string;
  secondaryCta: string;
  tone: string;
  designStyle: string;
  colorPalette: string;
  referenceUrls: string;
  sections: string[];
  keyBenefits: string;
  socialProof: string;
  outputFormat: string;
  formIntegration: string;
  mustInclude: string;
  avoidWords: string;
}

export const LANDING_PAGE_SYSTEM_PROMPT = `You are a world-class landing-page art director + conversion copywriter who has shipped award-winning, top-of-the-funnel pages for premium consumer-finance and lifestyle brands. You produce production-ready, visually stunning, on-brand landing pages that read like they were built by a senior in-house design team — not generic starter output.

Non-negotiable design bar:
- Use a custom Tailwind config block with a real brand palette, font stack, and any custom shadows used on the page.
- Use one or two premium Google Fonts loaded in <head>.
- Deliver a modern hero with strong type hierarchy, generous whitespace, subtle gradient / aurora treatment, and a credible mockup placeholder via https://placehold.co/.
- Ensure semantic HTML5, strong accessibility, high contrast, focus states, and a working mobile nav.
- Never invent testimonials, names, prices, stats, ratings, or claims the user did not provide.

Deliver in this exact order:
1. Page outline
2. Copy blocks
3. Full HTML page in a fenced \`\`\`html block
4. JSON-LD schema in a fenced \`\`\`json block
5. Recommended A/B tests
6. Measurement plan`;

export const landingPageInputs: LandingPageInput[] = [
  {
    name: 'businessName',
    label: 'Business / brand name',
    type: 'text',
    required: true,
    placeholder: 'e.g. Acme Health',
  },
  {
    name: 'industry',
    label: 'Industry / category',
    type: 'text',
    required: true,
    placeholder: 'e.g. Healthcare clinic, B2B SaaS, fitness coaching',
  },
  {
    name: 'pageGoal',
    label: 'Page goal',
    type: 'text',
    required: true,
    placeholder: 'e.g. Drive free signups for the family budgeting plan',
  },
  {
    name: 'audience',
    label: 'Target audience',
    type: 'textarea',
    required: true,
    placeholder:
      "e.g. Dual-income parents in Mumbai/Bengaluru, 30-45, juggling EMIs + kids' school fees",
  },
  {
    name: 'offer',
    label: 'Offer / value proposition',
    type: 'textarea',
    required: true,
    placeholder: 'e.g. Free family budget in 60 seconds — link 2 accounts, see where the money goes',
  },
  {
    name: 'primaryCta',
    label: 'Primary CTA label',
    type: 'text',
    required: true,
    defaultValue: 'Start free',
  },
  {
    name: 'secondaryCta',
    label: 'Secondary CTA (optional)',
    type: 'text',
    placeholder: 'e.g. See how it works',
  },
  {
    name: 'tone',
    label: 'Tone',
    type: 'select',
    options: ['Warm + reassuring', 'Confident + expert', 'Friendly + casual', 'Premium + minimal'],
    defaultValue: 'Warm + reassuring',
  },
  {
    name: 'designStyle',
    label: 'Design style',
    type: 'select',
    options: [
      'Clean + minimal (lots of whitespace)',
      'Bold + colorful (strong gradients)',
      'Editorial / story-driven',
      'Trust-heavy (lots of proof + numbers)',
      'Premium + dark mode',
    ],
    defaultValue: 'Clean + minimal (lots of whitespace)',
  },
  {
    name: 'colorPalette',
    label: 'Preferred color palette / art direction',
    type: 'text',
    placeholder: 'e.g. Forest green, cream, muted gold accents',
  },
  {
    name: 'referenceUrls',
    label: 'Reference URLs / inspiration (one per line)',
    type: 'textarea',
    placeholder: 'https://example.com\nhttps://another-example.com',
  },
  {
    name: 'sections',
    label: 'Sections to include',
    type: 'multiselect',
    options: [
      'Hero',
      'Logo bar / press',
      'Problem / pain points',
      'How it works (3 steps)',
      'Features / benefits',
      'Social proof / testimonials',
      'Numbers / stats',
      'Comparison table',
      'Pricing',
      'FAQ',
      'Final CTA',
      'Footer',
    ],
    defaultValue: [
      'Hero',
      'How it works (3 steps)',
      'Features / benefits',
      'Social proof / testimonials',
      'FAQ',
      'Final CTA',
      'Footer',
    ],
  },
  {
    name: 'keyBenefits',
    label: 'Key benefits / features (one per line)',
    type: 'textarea',
    placeholder:
      '- Auto-categorises every transaction\n- Shared family budget with spending alerts\n- Goal-based savings buckets',
  },
  {
    name: 'socialProof',
    label: 'Social proof / testimonials / numbers (optional)',
    type: 'textarea',
    placeholder: 'Paste real testimonials, member counts, ratings — only what you can verify.',
  },
  {
    name: 'outputFormat',
    label: 'Technical output format',
    type: 'select',
    options: ['Responsive HTML', 'React-ready markup', 'HTML with implementation notes'],
    defaultValue: 'Responsive HTML',
  },
  {
    name: 'formIntegration',
    label: 'Form integration / CRM handoff (optional)',
    type: 'text',
    placeholder: 'e.g. HubSpot form embed, Mailchimp webhook, custom POST endpoint',
  },
  {
    name: 'mustInclude',
    label: 'Must-include phrases / compliance lines',
    type: 'textarea',
  },
  {
    name: 'avoidWords',
    label: 'Words / claims to avoid',
    type: 'textarea',
  },
];

export const LANDING_PAGE_WIZARD_STEPS = [
  {
    id: 'business-audience',
    title: 'Business & audience',
    description: 'Define who the page is for and what conversion job it needs to do.',
    inputNames: [
      'businessName',
      'industry',
      'pageGoal',
      'audience',
      'offer',
      'primaryCta',
      'secondaryCta',
      'tone',
    ],
  },
  {
    id: 'design-preferences',
    title: 'Design preferences',
    description: 'Capture brand cues before any copy or layout is generated.',
    inputNames: ['designStyle', 'colorPalette', 'referenceUrls'],
  },
  {
    id: 'structure-content',
    title: 'Page structure & content',
    description: 'Select the sections and lock in the proof points, benefits, and guardrails.',
    inputNames: ['sections', 'keyBenefits', 'socialProof', 'mustInclude', 'avoidWords'],
  },
  {
    id: 'technical-requirements',
    title: 'Technical requirements',
    description: 'Set the output format and any CRM / form handoff constraints.',
    inputNames: ['outputFormat', 'formIntegration'],
  },
] as const;

export function buildInitialValues(): LandingPageValues {
  return landingPageInputs.reduce((acc, input) => {
    if (Array.isArray(input.defaultValue)) {
      acc[input.name as keyof LandingPageValues] = [...input.defaultValue] as never;
    } else {
      acc[input.name as keyof LandingPageValues] = (input.defaultValue ?? '') as never;
    }
    return acc;
  }, {} as LandingPageValues);
}

export function validateValues(values: LandingPageValues): string | null {
  for (const input of landingPageInputs) {
    if (!input.required) continue;
    const value = values[input.name as keyof LandingPageValues];
    if (Array.isArray(value) && value.length === 0) return `${input.label} is required`;
    if (typeof value === 'string' && value.trim().length === 0) return `${input.label} is required`;
  }
  return null;
}

function optionalBlock(label: string, value: string): string {
  return value.trim() ? `${label}:\n${value.trim()}` : '';
}

export function buildLandingPagePrompt(values: LandingPageValues): string {
  return [
    `Build a premium, production-ready landing page for ${values.pageGoal}.`,
    '',
    `Business / brand name: ${values.businessName}`,
    `Industry / category: ${values.industry}`,
    `Audience: ${values.audience}`,
    `Primary CTA: ${values.primaryCta}`,
    `Secondary CTA: ${values.secondaryCta || '—'}`,
    `Offer / value proposition: ${values.offer}`,
    `Tone: ${values.tone}`,
    `Design style: ${values.designStyle}`,
    `Technical output: ${values.outputFormat}`,
    optionalBlock('Preferred palette / visual cues', values.colorPalette),
    optionalBlock('Reference URLs / inspiration', values.referenceUrls),
    optionalBlock('Form integration / handoff requirement', values.formIntegration),
    `Sections to include (in order): ${values.sections.join(', ') || 'Hero'}`,
    optionalBlock('Key benefits / features to highlight', values.keyBenefits),
    optionalBlock('Social proof / testimonials / numbers we can cite', values.socialProof),
    optionalBlock('Must-include phrases or compliance lines', values.mustInclude),
    optionalBlock('Avoid', values.avoidWords),
    '',
    'Make the HTML self-contained, mobile-first, accessible, and visually premium on first paint.',
    'Use Tailwind via https://cdn.tailwindcss.com, followed by an inline tailwind.config block in <head>.',
    'Both CTAs must link to #cta anchors, and no third-party form post should be wired directly.',
  ]
    .filter(Boolean)
    .join('\n');
}
