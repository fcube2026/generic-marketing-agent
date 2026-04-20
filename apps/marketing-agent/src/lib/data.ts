// ─── Business Profile ────────────────────────────────────────────────────────

export interface BusinessProfile {
  primaryGrowthFocus: 'patients' | 'providers' | 'both';
  biggestBottleneck: 'supply' | 'demand' | 'activation';
  monthlyBudget: number;
  allocatedBudget: number;
  targetCities: string[];
  bestPerforming: string;
  topPatientPersona: string;
  topReasonPatientChooses: string;
  topReasonProviderJoins: string;
  competitors: string[];
  founderLedBrand: boolean;
}

export const defaultBusinessProfile: BusinessProfile = {
  primaryGrowthFocus: 'both',
  biggestBottleneck: 'demand',
  monthlyBudget: 500000,
  allocatedBudget: 200000,
  targetCities: ['Mumbai', 'Delhi', 'Bengaluru'],
  bestPerforming: 'Word-of-mouth and referrals',
  topPatientPersona: 'Urban Busy Professional (25–40)',
  topReasonPatientChooses: 'Speed and convenience of home visits',
  topReasonProviderJoins: 'Steady patient flow without marketing effort',
  competitors: ['Practo', 'PharmEasy', 'DocsApp'],
  founderLedBrand: true,
};

// ─── KPI Data ────────────────────────────────────────────────────────────────

export interface KpiMetric {
  label: string;
  value: string | number;
  target: string;
  trend: string;
  status: 'on-track' | 'at-risk' | 'behind';
  icon: string;
}

export const northStarKpis: KpiMetric[] = [
  { label: 'GMV (Completed Bookings)', value: '₹8,24,000', target: '₹10,00,000/mo', trend: '+18% MoM', status: 'on-track', icon: '💰' },
  { label: 'Monthly Active Patients', value: 1240, target: '2,000/mo', trend: '+22% MoM', status: 'on-track', icon: '🧑‍⚕️' },
  { label: 'Active Provider Count', value: 148, target: '200 verified', status: 'at-risk', trend: '+8% MoM', icon: '👨‍⚕️' },
];

export const acquisitionKpis: KpiMetric[] = [
  { label: 'Blended CAC (Patient)', value: '₹285', target: '< ₹300', trend: '↓ ₹30 MoM', status: 'on-track', icon: '📉' },
  { label: 'Blended CAC (Provider)', value: '₹460', target: '< ₹500', trend: '↓ ₹40 MoM', status: 'on-track', icon: '📉' },
  { label: 'Channel ROAS (Paid)', value: '2.3x', target: '> 2.0x', trend: '+0.3x MoM', status: 'on-track', icon: '📈' },
  { label: 'Organic Traffic Growth', value: '+14%', target: '+20% MoM', trend: 'MoM', status: 'at-risk', icon: '🌱' },
  { label: 'Referral % of Signups', value: '9%', target: '> 15%', trend: '+2% MoM', status: 'behind', icon: '🔗' },
];

export const activationKpis: KpiMetric[] = [
  { label: 'Signup → First Booking (7d)', value: '28%', target: '> 35%', trend: '+3% MoM', status: 'at-risk', icon: '🎯' },
  { label: 'Provider Onboarding Completion', value: '64%', target: '> 70%', trend: '+4% MoM', status: 'at-risk', icon: '✅' },
  { label: 'Profile Completeness Rate', value: '81%', target: '> 80%', trend: '+1% MoM', status: 'on-track', icon: '📋' },
];

export const retentionKpis: KpiMetric[] = [
  { label: 'D30 Patient Retention', value: '22%', target: '> 25%', trend: '+2% MoM', status: 'at-risk', icon: '🔄' },
  { label: 'D90 Patient Retention', value: '13%', target: '> 15%', trend: '+1% MoM', status: 'at-risk', icon: '🔄' },
  { label: 'Repeat Booking Rate (60d)', value: '26%', target: '> 30%', trend: '+3% MoM', status: 'at-risk', icon: '📅' },
];

// ─── Intake Questions ────────────────────────────────────────────────────────

export interface IntakeQuestion {
  id: string;
  tier: 1 | 2 | 3;
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'textarea';
  options?: string[];
  placeholder?: string;
}

export const intakeQuestions: IntakeQuestion[] = [
  // Tier 1
  {
    id: 'primaryGrowthFocus',
    tier: 1,
    question: 'Who is the primary customer you are growing right now?',
    type: 'select',
    options: ['Patients', 'Providers', 'Both simultaneously'],
  },
  {
    id: 'biggestBottleneck',
    tier: 1,
    question: 'What is your current biggest bottleneck?',
    type: 'select',
    options: ['Supply (not enough providers)', 'Demand (not enough patients)', 'Activation (users sign up but don\'t transact)'],
  },
  {
    id: 'monthlyBudget',
    tier: 1,
    question: 'What is your monthly marketing budget (₹)?',
    type: 'number',
    placeholder: 'e.g. 500000',
  },
  {
    id: 'targetCities',
    tier: 1,
    question: 'Which 2-3 cities are you focusing on for the next 90 days?',
    type: 'multiselect',
    options: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'],
  },
  {
    id: 'bestPerforming',
    tier: 1,
    question: 'What has worked best for acquisition so far, even if small?',
    type: 'textarea',
    placeholder: 'e.g. word-of-mouth referrals, specific ad campaign, etc.',
  },
  // Tier 2
  {
    id: 'topPatientPersona',
    tier: 2,
    question: 'Who is your most valuable patient persona (age, condition, income, digital fluency)?',
    type: 'textarea',
    placeholder: 'e.g. Urban professional, 28-38, minor acute conditions, high income, tech-savvy',
  },
  {
    id: 'topReasonPatientChooses',
    tier: 2,
    question: 'What is the #1 reason a patient chooses curex24 over a direct call to a clinic?',
    type: 'textarea',
    placeholder: 'e.g. Speed of booking, home visit option, verified providers',
  },
  {
    id: 'topReasonProviderJoins',
    tier: 2,
    question: 'What is the #1 reason a provider joins and stays on curex24?',
    type: 'textarea',
    placeholder: 'e.g. Steady patient flow, no upfront cost, easy payment processing',
  },
  {
    id: 'topCompetitors',
    tier: 2,
    question: 'Who are your top 3 competitors and how do you beat them?',
    type: 'textarea',
    placeholder: 'e.g. Practo — we beat them on home visit speed; PharmEasy — we offer real-time tracking',
  },
  {
    id: 'founderLedBrand',
    tier: 2,
    question: 'Is there a founder who can be a visible face of the brand?',
    type: 'boolean',
  },
  // Tier 3
  {
    id: 'marketChanges',
    tier: 3,
    question: 'What changed in the market, product, or competitive landscape last quarter?',
    type: 'textarea',
    placeholder: 'e.g. New competitor launched in Mumbai, we added diagnostics feature',
  },
  {
    id: 'lastExperiments',
    tier: 3,
    question: 'Which experiments ran last quarter and what did we learn?',
    type: 'textarea',
    placeholder: 'e.g. Tested Google PMax vs Search — PMax had 40% lower CVR',
  },
  {
    id: 'retentionRates',
    tier: 3,
    question: 'What is the current retention rate at Day 7, Day 30, Day 90?',
    type: 'textarea',
    placeholder: 'e.g. D7: 45%, D30: 22%, D90: 13%',
  },
];

// ─── Content Calendar ────────────────────────────────────────────────────────

export type ContentPillar =
  | 'patient-education'
  | 'provider-spotlight'
  | 'product-education'
  | 'social-proof'
  | 'local-health';

export interface ContentItem {
  id: string;
  week: number;
  day: string;
  platform: string;
  pillar: ContentPillar;
  title: string;
  format: string;
  status: 'planned' | 'in-progress' | 'ready' | 'published';
}

export const contentPillarMeta: Record<ContentPillar, { label: string; color: string; icon: string }> = {
  'patient-education': { label: 'Patient Education', color: 'bg-blue-100 text-blue-700', icon: '📚' },
  'provider-spotlight': { label: 'Provider Spotlight', color: 'bg-purple-100 text-purple-700', icon: '⭐' },
  'product-education': { label: 'Product Education', color: 'bg-green-100 text-green-700', icon: '📱' },
  'social-proof': { label: 'Social Proof', color: 'bg-yellow-100 text-yellow-700', icon: '🏆' },
  'local-health': { label: 'Local Health', color: 'bg-red-100 text-red-700', icon: '🏙️' },
};

export const contentCalendar: ContentItem[] = [
  { id: '1', week: 1, day: 'Mon', platform: 'Instagram', pillar: 'patient-education', title: '5 signs you need to see a doctor today', format: 'Carousel', status: 'published' },
  { id: '2', week: 1, day: 'Wed', platform: 'LinkedIn', pillar: 'provider-spotlight', title: 'Meet Dr. Sharma — 200+ bookings on curex24', format: 'Article', status: 'published' },
  { id: '3', week: 1, day: 'Thu', platform: 'Instagram', pillar: 'social-proof', title: '"Got a doctor home in 30 mins" — Priya, Mumbai', format: 'Reel', status: 'published' },
  { id: '4', week: 1, day: 'Sat', platform: 'Blog', pillar: 'patient-education', title: 'Home doctor visits: what to expect', format: 'Long-form article', status: 'published' },
  { id: '5', week: 2, day: 'Mon', platform: 'Instagram', pillar: 'product-education', title: 'How to book a home visit in 3 steps', format: 'Reel', status: 'ready' },
  { id: '6', week: 2, day: 'Tue', platform: 'LinkedIn', pillar: 'local-health', title: 'Monsoon health guide: Mumbai 2026', format: 'Article', status: 'in-progress' },
  { id: '7', week: 2, day: 'Thu', platform: 'Instagram', pillar: 'patient-education', title: 'When fever crosses 102°F — act now', format: 'Carousel', status: 'in-progress' },
  { id: '8', week: 2, day: 'Sat', platform: 'Blog', pillar: 'provider-spotlight', title: 'How independent doctors are growing with curex24', format: 'Long-form article', status: 'planned' },
  { id: '9', week: 3, day: 'Mon', platform: 'Instagram', pillar: 'social-proof', title: '500 bookings milestone 🎉', format: 'Graphic post', status: 'planned' },
  { id: '10', week: 3, day: 'Wed', platform: 'LinkedIn', pillar: 'product-education', title: 'Real-time provider tracking — a curex24 exclusive', format: 'Post', status: 'planned' },
  { id: '11', week: 3, day: 'Thu', platform: 'Instagram', pillar: 'local-health', title: 'Delhi air quality health tips', format: 'Carousel', status: 'planned' },
  { id: '12', week: 3, day: 'Sat', platform: 'Blog', pillar: 'patient-education', title: 'Diagnostic tests you should do annually', format: 'Long-form article', status: 'planned' },
  { id: '13', week: 4, day: 'Mon', platform: 'Instagram', pillar: 'provider-spotlight', title: 'Dr. Kapoor: 5-star home visit provider', format: 'Reel', status: 'planned' },
  { id: '14', week: 4, day: 'Wed', platform: 'LinkedIn', pillar: 'social-proof', title: 'Curex24: 1,000 completed bookings', format: 'Milestone post', status: 'planned' },
  { id: '15', week: 4, day: 'Fri', platform: 'Instagram', pillar: 'product-education', title: 'How payment works on curex24', format: 'Carousel', status: 'planned' },
  { id: '16', week: 4, day: 'Sat', platform: 'Blog', pillar: 'local-health', title: 'Best paediatric doctors for home visits in Bengaluru', format: 'Long-form article', status: 'planned' },
];

// ─── Campaigns ───────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  channel: string;
  audience: string;
  budget: string;
  duration: string;
  kpi: string;
  status: 'active' | 'planned' | 'completed' | 'paused';
  headline: string[];
  description: string[];
}

export const campaigns: Campaign[] = [
  {
    id: 'c1',
    name: 'Google Search — Home Visit Mumbai',
    objective: 'Acquire high-intent patients searching for home doctor visits',
    channel: 'Google Search',
    audience: 'Users searching "doctor home visit mumbai", "book doctor online mumbai"',
    budget: '₹80,000/mo',
    duration: 'Ongoing',
    kpi: 'Booking completions, CAC < ₹300',
    status: 'active',
    headline: [
      'Doctor at Home in 30 Minutes',
      'Book Verified Home Visit Doctors',
      'Skip the Waiting Room — Book Now',
    ],
    description: [
      'Curex24: trusted doctors at your doorstep. Book in 2 min, real-time tracking, verified providers.',
      'Home visits by verified doctors in Mumbai. Transparent pricing. Book online in minutes.',
      'Get a qualified doctor home in under an hour. Book on curex24. Rated 4.8★ by patients.',
    ],
  },
  {
    id: 'c2',
    name: 'Meta Awareness — Patient Story',
    objective: 'Build brand awareness among urban families in target cities',
    channel: 'Meta (Instagram + Facebook)',
    audience: 'Women 25–45, metro cities, interest: family health, parenting, wellness',
    budget: '₹40,000/mo',
    duration: '8 weeks',
    kpi: 'CPM < ₹80, Video view rate > 30%, Website visits',
    status: 'active',
    headline: [
      'Your family deserves care at home',
      '"I got a doctor to my door in 35 minutes"',
      'Healthcare, on your terms.',
    ],
    description: [
      'Watch how Priya booked a doctor home for her sick toddler in under 3 minutes. curex24 — healthcare, anytime.',
      'Verified doctors. Real-time tracking. Transparent pricing. Book a home visit in 2 min.',
      'Join 5,000+ families who trust curex24 for on-demand home healthcare.',
    ],
  },
  {
    id: 'c3',
    name: 'Meta Retargeting — Non-Completions',
    objective: 'Re-engage users who started but did not complete a booking',
    channel: 'Meta Retargeting',
    audience: 'Custom audience: app/web visitors who viewed booking flow but did not complete',
    budget: '₹15,000/mo',
    duration: 'Ongoing',
    kpi: 'Booking completion rate > 25% from retargeted users',
    status: 'active',
    headline: [
      'Your doctor is still waiting',
      'Complete your booking — takes 60 seconds',
      'Don\'t wait, book your home visit today',
    ],
    description: [
      'You were close! Complete your booking in one click. Verified doctors ready now.',
      'Your home visit booking is incomplete. Finish now and get care today.',
      'Curex24 — hundreds of verified doctors available now. Complete your booking.',
    ],
  },
  {
    id: 'c4',
    name: 'LinkedIn — Provider Recruitment',
    objective: 'Attract independent doctors and clinic owners to join curex24',
    channel: 'LinkedIn',
    audience: 'Doctors, medical professionals, clinic owners in target cities',
    budget: '₹20,000/mo',
    duration: 'Ongoing',
    kpi: 'Provider signups, Cost per provider < ₹500',
    status: 'planned',
    headline: [
      'Grow your practice with curex24',
      'We bring patients to you — you focus on care',
      'Join 150+ doctors earning more with curex24',
    ],
    description: [
      'Curex24 helps independent doctors fill their schedule with verified patient bookings. Zero upfront cost.',
      'Stop chasing patients. Join curex24 and let patients find you. Flexible scheduling, instant payments.',
      '150+ doctors in Mumbai, Delhi, and Bengaluru are growing their practice on curex24. Join them.',
    ],
  },
  {
    id: 'c5',
    name: 'Google Performance Max — Bookings',
    objective: 'Drive high-volume booking completions across all Google surfaces',
    channel: 'Google Performance Max',
    audience: 'All Google surfaces, optimised for booking completion conversions',
    budget: '₹60,000/mo',
    duration: 'Q2 onwards',
    kpi: 'Booking completions, ROAS > 2.5x',
    status: 'planned',
    headline: [
      'Book a Doctor Home Today',
      'Verified Doctors, Real-Time Tracking',
      'Healthcare at Your Doorstep',
    ],
    description: [
      'Get a trusted doctor home in minutes. Transparent pricing, real-time tracking. Book now.',
      'Curex24: India\'s fastest home healthcare booking platform. Available in Mumbai, Delhi, Bengaluru.',
      '5,000+ completed home visits. 150+ verified doctors. Book your appointment in 2 minutes.',
    ],
  },
];

// ─── SEO ──────────────────────────────────────────────────────────────────────

export interface KeywordCluster {
  cluster: string;
  type: 'transactional' | 'informational' | 'comparison' | 'provider-side';
  priority: 'high' | 'medium' | 'low';
  keywords: Array<{ keyword: string; volume: string; difficulty: string }>;
}

export const keywordClusters: KeywordCluster[] = [
  {
    cluster: 'Home Doctor Visit',
    type: 'transactional',
    priority: 'high',
    keywords: [
      { keyword: 'doctor home visit mumbai', volume: '5,400/mo', difficulty: 'Medium' },
      { keyword: 'book doctor home visit delhi', volume: '4,200/mo', difficulty: 'Medium' },
      { keyword: 'home visit doctor near me', volume: '8,100/mo', difficulty: 'High' },
      { keyword: 'on demand doctor home', volume: '2,900/mo', difficulty: 'Low' },
      { keyword: 'doctor at home bangalore', volume: '3,600/mo', difficulty: 'Medium' },
    ],
  },
  {
    cluster: 'Online Doctor Booking',
    type: 'transactional',
    priority: 'high',
    keywords: [
      { keyword: 'book doctor online india', volume: '12,000/mo', difficulty: 'High' },
      { keyword: 'online doctor consultation booking', volume: '6,600/mo', difficulty: 'High' },
      { keyword: 'same day doctor appointment', volume: '3,100/mo', difficulty: 'Medium' },
      { keyword: 'instant doctor booking app', volume: '2,400/mo', difficulty: 'Low' },
    ],
  },
  {
    cluster: 'Diagnostics at Home',
    type: 'transactional',
    priority: 'high',
    keywords: [
      { keyword: 'blood test at home delhi', volume: '4,800/mo', difficulty: 'Medium' },
      { keyword: 'home diagnostic test mumbai', volume: '3,200/mo', difficulty: 'Medium' },
      { keyword: 'lab test home collection bangalore', volume: '2,900/mo', difficulty: 'Low' },
    ],
  },
  {
    cluster: 'Healthcare Guides',
    type: 'informational',
    priority: 'medium',
    keywords: [
      { keyword: 'how to find good doctor', volume: '9,900/mo', difficulty: 'Medium' },
      { keyword: 'what to expect home doctor visit', volume: '1,600/mo', difficulty: 'Low' },
      { keyword: 'best diagnostic centers mumbai', volume: '3,300/mo', difficulty: 'Medium' },
      { keyword: 'when to call doctor home', volume: '2,200/mo', difficulty: 'Low' },
    ],
  },
  {
    cluster: 'Comparison & Brand',
    type: 'comparison',
    priority: 'medium',
    keywords: [
      { keyword: 'best doctor booking apps india', volume: '5,500/mo', difficulty: 'High' },
      { keyword: 'curex24 vs practo', volume: '880/mo', difficulty: 'Low' },
      { keyword: 'practo alternative home visit', volume: '1,100/mo', difficulty: 'Low' },
    ],
  },
  {
    cluster: 'Provider Growth',
    type: 'provider-side',
    priority: 'medium',
    keywords: [
      { keyword: 'how to list clinic online india', volume: '2,100/mo', difficulty: 'Low' },
      { keyword: 'grow patient base as doctor', volume: '1,800/mo', difficulty: 'Low' },
      { keyword: 'telemedicine platform for doctors india', volume: '2,600/mo', difficulty: 'Medium' },
    ],
  },
];

export interface SeoPage {
  url: string;
  type: 'city-specialty' | 'condition' | 'blog' | 'comparison';
  title: string;
  status: 'live' | 'in-progress' | 'planned';
  targetKeyword: string;
}

export const seoPages: SeoPage[] = [
  { url: '/cardiologist-home-visit-mumbai', type: 'city-specialty', title: 'Cardiologist Home Visit Mumbai', status: 'planned', targetKeyword: 'cardiologist home visit mumbai' },
  { url: '/doctor-home-visit-delhi', type: 'city-specialty', title: 'Doctor Home Visit Delhi', status: 'in-progress', targetKeyword: 'doctor home visit delhi' },
  { url: '/blood-test-at-home-delhi', type: 'condition', title: 'Blood Test at Home Delhi', status: 'in-progress', targetKeyword: 'blood test at home delhi' },
  { url: '/paediatrician-home-visit-bangalore', type: 'city-specialty', title: 'Paediatrician Home Visit Bangalore', status: 'planned', targetKeyword: 'paediatrician home visit bangalore' },
  { url: '/blog/what-to-expect-home-doctor-visit', type: 'blog', title: 'What to Expect from a Home Doctor Visit', status: 'live', targetKeyword: 'what to expect home doctor visit' },
  { url: '/blog/home-visit-vs-clinic-which-is-better', type: 'blog', title: 'Home Visit vs Clinic: Which Is Better?', status: 'live', targetKeyword: 'home visit vs clinic' },
  { url: '/blog/diagnostic-tests-to-do-annually', type: 'blog', title: '10 Diagnostic Tests to Do Every Year', status: 'in-progress', targetKeyword: 'annual diagnostic tests india' },
  { url: '/curex24-vs-practo', type: 'comparison', title: 'Curex24 vs Practo: Which Is Better for Home Visits?', status: 'planned', targetKeyword: 'curex24 vs practo' },
];

// ─── Lifecycle Flows ─────────────────────────────────────────────────────────

export interface LifecycleFlow {
  id: string;
  name: string;
  segment: 'patient' | 'provider';
  trigger: string;
  steps: Array<{ day: number; channel: string; message: string; goal: string }>;
  status: 'active' | 'draft' | 'paused';
}

export const lifecycleFlows: LifecycleFlow[] = [
  {
    id: 'lf1',
    name: 'Patient Onboarding',
    segment: 'patient',
    trigger: 'User signs up',
    status: 'active',
    steps: [
      { day: 0, channel: 'Email', message: 'Welcome to curex24 — your health, on your terms', goal: 'Activate account, set up profile' },
      { day: 1, channel: 'Push + SMS', message: 'Complete your profile to get personalised doctor recommendations', goal: 'Profile completeness > 80%' },
      { day: 3, channel: 'Email', message: 'Your first booking is on us — ₹100 off today', goal: 'Drive first booking within 7 days' },
    ],
  },
  {
    id: 'lf2',
    name: 'Post-First-Booking',
    segment: 'patient',
    trigger: 'First booking completed',
    status: 'active',
    steps: [
      { day: 1, channel: 'Email + Push', message: 'How was your visit? Rate Dr. [Name]', goal: 'Collect review within 24h' },
      { day: 3, channel: 'Email', message: 'Follow-up care — book a review consultation', goal: 'Encourage repeat booking' },
      { day: 7, channel: 'Push + Email', message: 'Love curex24? Share with a friend — earn ₹100 credit', goal: 'Referral program activation' },
    ],
  },
  {
    id: 'lf3',
    name: 'Re-engagement (30d inactive)',
    segment: 'patient',
    trigger: '30 days no booking',
    status: 'active',
    steps: [
      { day: 0, channel: 'Email', message: 'Time for a checkup? Doctors are ready in your area', goal: 'Re-engage dormant users' },
      { day: 3, channel: 'Push', message: '[City] doctors available now — book in 2 min', goal: 'Drive return visit' },
      { day: 7, channel: 'Email', message: 'Your ₹150 credit expires in 3 days — use it today', goal: 'Urgency-driven reactivation' },
    ],
  },
  {
    id: 'lf4',
    name: 'Win-Back (60d inactive)',
    segment: 'patient',
    trigger: '60 days no booking',
    status: 'draft',
    steps: [
      { day: 0, channel: 'Email', message: 'We miss you, [Name]. Here\'s ₹200 to come back', goal: 'High-value win-back' },
      { day: 5, channel: 'SMS', message: '₹200 credit waiting — book a home visit today', goal: 'SMS as final nudge' },
      { day: 14, channel: 'Email', message: 'Last chance: your credit expires soon', goal: 'Final urgency push' },
    ],
  },
  {
    id: 'lf5',
    name: 'Provider Onboarding',
    segment: 'provider',
    trigger: 'Provider signs up',
    status: 'active',
    steps: [
      { day: 0, channel: 'Email', message: 'Welcome to curex24 — let\'s get you your first patient', goal: 'Activation and profile setup' },
      { day: 1, channel: 'Email', message: 'Complete your profile to appear in search results', goal: 'Profile completeness' },
      { day: 3, channel: 'Email + SMS', message: '3 patients in your area are looking for a [specialty] doctor', goal: 'Urgency for activation' },
      { day: 7, channel: 'Email', message: 'Your first booking checklist — are you ready?', goal: 'Ensure readiness for first booking' },
    ],
  },
  {
    id: 'lf6',
    name: 'Provider Retention',
    segment: 'provider',
    trigger: 'Monthly (all active providers)',
    status: 'active',
    steps: [
      { day: 0, channel: 'Email', message: 'Your monthly performance report — [X] bookings, ₹[Y] earned', goal: 'Demonstrate value, retain providers' },
      { day: 2, channel: 'Push', message: 'You have [X] pending reviews — respond to build trust', goal: 'Review engagement' },
      { day: 7, channel: 'Email', message: 'Refer a colleague and earn commission reduction for 3 months', goal: 'Provider referral program' },
    ],
  },
];

// ─── Experiments ─────────────────────────────────────────────────────────────

export type ExperimentStatus = 'running' | 'completed' | 'planned' | 'paused';

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  channel: string;
  control: string;
  variant: string;
  metric: string;
  startDate: string;
  endDate: string;
  result?: string;
  winner?: 'control' | 'variant' | 'no-difference';
  status: ExperimentStatus;
  lift?: string;
}

export const experiments: Experiment[] = [
  {
    id: 'e1',
    name: 'Landing Page Hero Copy',
    hypothesis: 'Benefit-led headline outperforms feature-led headline on booking conversion',
    channel: 'Landing Page',
    control: '"Book a Doctor at Home" (feature-led)',
    variant: '"Get care in 30 minutes, without leaving home" (benefit-led)',
    metric: 'Booking start rate',
    startDate: '2026-03-01',
    endDate: '2026-03-21',
    result: 'Variant increased booking starts by 14%',
    winner: 'variant',
    status: 'completed',
    lift: '+14%',
  },
  {
    id: 'e2',
    name: 'Email Subject Line — Onboarding Day 3',
    hypothesis: 'Discount-led subject line drives higher open rates than FOMO subject',
    channel: 'Email',
    control: '"Your ₹100 credit is waiting"',
    variant: '"Only 3 doctors left in your area today"',
    metric: 'Email open rate',
    startDate: '2026-03-10',
    endDate: '2026-03-24',
    result: 'Control had 31% open rate; Variant had 27%',
    winner: 'control',
    status: 'completed',
    lift: '+4pp',
  },
  {
    id: 'e3',
    name: 'Google Ads Match Type — Broad vs Exact',
    hypothesis: 'Exact match keywords will drive lower CAC despite lower volume',
    channel: 'Google Ads',
    control: 'Broad match keywords',
    variant: 'Exact match keywords',
    metric: 'CAC, Booking completion rate',
    startDate: '2026-04-01',
    endDate: '2026-04-21',
    status: 'running',
  },
  {
    id: 'e4',
    name: 'Meta Creative — Static vs Video',
    hypothesis: 'Patient story video will outperform static provider card on click-through rate',
    channel: 'Meta Ads',
    control: 'Static provider card with rating',
    variant: '30-second patient testimonial video',
    metric: 'CTR, Cost per booking start',
    startDate: '2026-04-08',
    endDate: '2026-04-28',
    status: 'running',
  },
  {
    id: 'e5',
    name: 'Referral Reward — Credit vs Discount',
    hypothesis: 'Booking credit drives higher referral activation than percentage discount',
    channel: 'Referral Program',
    control: '10% discount on next booking',
    variant: '₹100 booking credit (no expiry)',
    metric: 'Referral link click rate, Referred user booking rate',
    startDate: '2026-05-01',
    endDate: '2026-05-28',
    status: 'planned',
  },
  {
    id: 'e6',
    name: 'Provider Profile — Video Bio vs Text Bio',
    hypothesis: 'Providers with video bio will have higher booking conversion',
    channel: 'Product / SEO',
    control: 'Text-only provider bio',
    variant: '60-second video introduction by provider',
    metric: 'Profile view to booking rate',
    startDate: '2026-05-15',
    endDate: '2026-06-15',
    status: 'planned',
  },
];

// ─── 90-Day Plan ─────────────────────────────────────────────────────────────

export interface PlanItem {
  phase: '1-30' | '31-60' | '61-90';
  category: string;
  task: string;
  owner: string;
  done: boolean;
}

export const ninetyDayPlan: PlanItem[] = [
  // Phase 1
  { phase: '1-30', category: 'Foundation', task: 'Complete business intake questionnaire (Tier 1 + 2)', owner: 'Founder', done: true },
  { phase: '1-30', category: 'Foundation', task: 'Audit current state (channels, assets, analytics, CRM)', owner: 'Marketing Lead', done: true },
  { phase: '1-30', category: 'Brand', task: 'Finalise brand positioning and messaging framework', owner: 'Founder + Marketing', done: true },
  { phase: '1-30', category: 'Analytics', task: 'Set up GA4 goals and booking conversion tracking', owner: 'Engineering + Marketing', done: true },
  { phase: '1-30', category: 'Paid', task: 'Launch city-specific landing pages for top 3 cities', owner: 'Engineering + Marketing', done: false },
  { phase: '1-30', category: 'Paid', task: 'Set up Google Search campaigns (top 10 transactional keywords)', owner: 'Paid Marketing', done: false },
  { phase: '1-30', category: 'Lifecycle', task: 'Build onboarding + post-booking email flows', owner: 'CRM / Lifecycle', done: false },
  { phase: '1-30', category: 'Content', task: 'Create first 30-day social content calendar', owner: 'Content Lead', done: false },
  { phase: '1-30', category: 'Analytics', task: 'Establish weekly reporting cadence', owner: 'Marketing Lead', done: false },
  // Phase 2
  { phase: '31-60', category: 'Paid', task: 'Expand paid campaigns based on Week 2–4 data', owner: 'Paid Marketing', done: false },
  { phase: '31-60', category: 'Paid', task: 'Launch Meta retargeting for non-completions', owner: 'Paid Marketing', done: false },
  { phase: '31-60', category: 'SEO', task: 'Publish first 4 SEO articles', owner: 'Content Lead', done: false },
  { phase: '31-60', category: 'Growth', task: 'Launch patient referral program', owner: 'Product + Growth', done: false },
  { phase: '31-60', category: 'CRO', task: 'Run first A/B test (landing page hero vs benefit-led headline)', owner: 'Marketing + Engineering', done: false },
  { phase: '31-60', category: 'Partnerships', task: 'Initiate first 2 partnership conversations', owner: 'Founder + BD', done: false },
  { phase: '31-60', category: 'Reviews', task: 'Activate post-booking review collection workflow', owner: 'Product + Lifecycle', done: false },
  { phase: '31-60', category: 'Analytics', task: 'Monthly performance review + reforecast', owner: 'Marketing Lead', done: false },
  // Phase 3
  { phase: '61-90', category: 'Paid', task: 'Double down on top-performing paid channels', owner: 'Paid Marketing', done: false },
  { phase: '61-90', category: 'Growth', task: 'Launch provider referral program', owner: 'Product + Growth', done: false },
  { phase: '61-90', category: 'SEO', task: 'Publish 5 more SEO articles; track early ranking signals', owner: 'Content Lead', done: false },
  { phase: '61-90', category: 'Partnerships', task: 'Activate first corporate partner or pilot', owner: 'BD + Founder', done: false },
  { phase: '61-90', category: 'Lifecycle', task: 'Launch re-engagement campaign for Day 30+ inactive users', owner: 'CRM / Lifecycle', done: false },
  { phase: '61-90', category: 'Strategy', task: 'Q1 review + Q2 plan finalized', owner: 'Founder + Marketing Lead', done: false },
  { phase: '61-90', category: 'Influencer', task: 'Begin influencer/creator outreach (5–10 micro-influencers)', owner: 'Content Lead', done: false },
  { phase: '61-90', category: 'PR', task: 'Share milestone announcement (press, social, LinkedIn)', owner: 'Founder + Marketing', done: false },
];

// ─── Marketing Skills Catalog ────────────────────────────────────────────────
//
// Full catalogue of agent skills modelled on the marketingskills spec
// (https://agentskills.io). Each skill represents a specialised marketing
// workflow the AI Marketing Agent can execute.

export type MarketingSkillCategory =
  | 'Conversion Optimization'
  | 'Content & Copy'
  | 'SEO & Discovery'
  | 'Paid & Distribution'
  | 'Measurement & Testing'
  | 'Retention'
  | 'Growth Engineering'
  | 'Strategy & Monetization'
  | 'Sales & RevOps';

export interface MarketingSkill {
  id: string;
  name: string;
  category: MarketingSkillCategory;
  icon: string;
  description: string;
  examplePrompt: string;
}

export const marketingSkills: MarketingSkill[] = [
  // Measurement & Testing
  {
    id: 'ab-test-setup',
    name: 'A/B Test Setup',
    category: 'Measurement & Testing',
    icon: '🧪',
    description: 'Plan, design, or implement an A/B test or experiment, or build a growth experimentation program.',
    examplePrompt: 'Design an A/B test for the curex24 home-page hero — give me the hypothesis, variants, sample size, and success metric.',
  },
  {
    id: 'analytics-tracking',
    name: 'Analytics Tracking',
    category: 'Measurement & Testing',
    icon: '📊',
    description: 'Set up, improve, or audit analytics tracking and measurement (events, conversions, attribution).',
    examplePrompt: 'Set up GA4 + Meta Pixel event tracking for the curex24 booking funnel — list every event, parameter, and where to fire it.',
  },

  // Paid & Distribution
  {
    id: 'ad-creative',
    name: 'Ad Creative',
    category: 'Paid & Distribution',
    icon: '🎯',
    description: 'Generate, iterate, or scale ad creative — headlines, descriptions, primary text, or full ad sets.',
    examplePrompt: 'Generate 10 Meta ad creative variations for curex24 patient acquisition — headlines, primary text, and visual direction.',
  },
  {
    id: 'paid-ads',
    name: 'Paid Ads',
    category: 'Paid & Distribution',
    icon: '💸',
    description: 'Help with paid advertising campaigns on Google Ads, Meta, LinkedIn, Twitter/X, and more.',
    examplePrompt: 'Plan a ₹3L Google Search campaign for curex24 — campaign structure, keyword themes, bidding, and negatives.',
  },

  // SEO & Discovery
  {
    id: 'ai-seo',
    name: 'AI SEO',
    category: 'SEO & Discovery',
    icon: '🤖',
    description: 'Optimize content for AI search engines, get cited by LLMs, or appear in AI-generated answers (AEO/GEO/LLMO).',
    examplePrompt: 'Optimize the curex24 "home doctor visit" page so it gets cited by ChatGPT and Perplexity for healthcare queries.',
  },
  {
    id: 'seo-audit',
    name: 'SEO Audit',
    category: 'SEO & Discovery',
    icon: '🔍',
    description: 'Audit, review, or diagnose SEO issues on a site — technical, on-page, and content.',
    examplePrompt: 'Run an SEO audit on curex24.com and rank the top 10 fixes by impact and effort.',
  },
  {
    id: 'programmatic-seo',
    name: 'Programmatic SEO',
    category: 'SEO & Discovery',
    icon: '🧬',
    description: 'Create SEO-driven pages at scale using templates and structured data.',
    examplePrompt: 'Design a programmatic SEO template for "[doctor type] in [city]" landing pages for curex24.',
  },
  {
    id: 'site-architecture',
    name: 'Site Architecture',
    category: 'SEO & Discovery',
    icon: '🗺️',
    description: 'Plan, map, or restructure page hierarchy, navigation, URL structure, and internal linking.',
    examplePrompt: 'Propose an information architecture for curex24.com that supports patients, providers, and SEO long-tail.',
  },
  {
    id: 'competitor-alternatives',
    name: 'Competitor / Alternatives',
    category: 'SEO & Discovery',
    icon: '⚔️',
    description: 'Create competitor comparison or alternative pages for SEO and sales enablement.',
    examplePrompt: 'Write a "curex24 vs Practo" comparison page optimised for SEO and bottom-of-funnel conversion.',
  },
  {
    id: 'schema-markup',
    name: 'Schema Markup',
    category: 'SEO & Discovery',
    icon: '🏷️',
    description: 'Add, fix, or optimize schema markup and structured data on a site.',
    examplePrompt: 'Generate JSON-LD schema for a curex24 doctor profile page (Physician + Service + AggregateRating).',
  },
  {
    id: 'aso-audit',
    name: 'ASO Audit',
    category: 'SEO & Discovery',
    icon: '📱',
    description: 'Audit or optimize an App Store or Google Play listing.',
    examplePrompt: 'Audit the curex24 Play Store listing — title, subtitle, screenshots, keywords, and conversion improvements.',
  },

  // Retention
  {
    id: 'churn-prevention',
    name: 'Churn Prevention',
    category: 'Retention',
    icon: '🛡️',
    description: 'Reduce churn, build cancellation flows, set up save offers, recover failed payments, or run dunning.',
    examplePrompt: 'Design a 4-step cancellation save-flow for curex24 patients with personalised offers and surveys.',
  },

  // Content & Copy
  {
    id: 'cold-email',
    name: 'Cold Email',
    category: 'Content & Copy',
    icon: '📧',
    description: 'Write B2B cold emails and follow-up sequences that get replies.',
    examplePrompt: 'Write a 4-step cold email sequence to corporate HR teams pitching curex24 employee health benefits.',
  },
  {
    id: 'copywriting',
    name: 'Copywriting',
    category: 'Content & Copy',
    icon: '✍️',
    description: 'Write, rewrite, or improve marketing copy for any page — homepage, landing pages, features, pricing.',
    examplePrompt: 'Rewrite the curex24 homepage hero section using a problem-agitation-solution framework.',
  },
  {
    id: 'copy-editing',
    name: 'Copy Editing',
    category: 'Content & Copy',
    icon: '📝',
    description: 'Edit, review, or improve existing marketing copy, or refresh outdated content.',
    examplePrompt: 'Edit this draft of our LinkedIn provider recruitment post for clarity, brevity, and tone.',
  },
  {
    id: 'email-sequence',
    name: 'Email Sequence',
    category: 'Content & Copy',
    icon: '📬',
    description: 'Create or optimize an email sequence, drip campaign, automated email flow, or lifecycle email.',
    examplePrompt: 'Build a 7-email patient onboarding sequence for curex24 — goal: first booking within 14 days.',
  },
  {
    id: 'social-content',
    name: 'Social Content',
    category: 'Content & Copy',
    icon: '📲',
    description: 'Create, schedule, or optimize social content for LinkedIn, Twitter/X, Instagram, and more.',
    examplePrompt: 'Draft 5 LinkedIn posts about curex24’s home-doctor model — mix of education, story, and CTA.',
  },

  // Conversion Optimization
  {
    id: 'page-cro',
    name: 'Page CRO',
    category: 'Conversion Optimization',
    icon: '📈',
    description: 'Optimize, improve, or increase conversions on any marketing page — homepage, landing pages, etc.',
    examplePrompt: 'Audit the curex24 booking landing page and propose 8 prioritised CRO experiments.',
  },
  {
    id: 'signup-flow-cro',
    name: 'Signup Flow CRO',
    category: 'Conversion Optimization',
    icon: '🚪',
    description: 'Optimize signup, registration, account creation, or trial activation flows.',
    examplePrompt: 'Reduce friction in the curex24 patient signup flow — current drop-off is 38% on phone-OTP step.',
  },
  {
    id: 'onboarding-cro',
    name: 'Onboarding CRO',
    category: 'Conversion Optimization',
    icon: '🧭',
    description: 'Optimize post-signup onboarding, user activation, first-run experience, or time-to-value.',
    examplePrompt: 'Redesign curex24 first-run onboarding to lift signup→first-booking from 28% to 40%.',
  },
  {
    id: 'form-cro',
    name: 'Form CRO',
    category: 'Conversion Optimization',
    icon: '🧾',
    description: 'Optimize lead capture, contact, or non-signup forms for higher completion rates.',
    examplePrompt: 'Improve the curex24 corporate-enquiry form — 12 fields today, 4% completion rate.',
  },
  {
    id: 'popup-cro',
    name: 'Popup CRO',
    category: 'Conversion Optimization',
    icon: '🪟',
    description: 'Create or optimize popups, modals, overlays, slide-ins, or banners for conversion.',
    examplePrompt: 'Design an exit-intent popup for the curex24 pricing page that captures email + offers ₹100 off.',
  },
  {
    id: 'paywall-upgrade-cro',
    name: 'Paywall / Upgrade CRO',
    category: 'Conversion Optimization',
    icon: '🔓',
    description: 'Create or optimize in-app paywalls, upgrade screens, upsell modals, or feature gates.',
    examplePrompt: 'Design an in-app upgrade screen prompting curex24 patients to subscribe to the annual care plan.',
  },

  // Customer & Strategy
  {
    id: 'customer-research',
    name: 'Customer Research',
    category: 'Strategy & Monetization',
    icon: '🧠',
    description: 'Conduct, analyze, or synthesize customer research — interviews, surveys, JTBD.',
    examplePrompt: 'Plan 8 customer interviews with curex24 active patients — recruitment script, questions, and synthesis template.',
  },
  {
    id: 'content-strategy',
    name: 'Content Strategy',
    category: 'Strategy & Monetization',
    icon: '🧱',
    description: 'Plan a content strategy, decide what content to create, or figure out what topics to cover.',
    examplePrompt: 'Build a 90-day content strategy for the curex24 blog — pillars, topics, and distribution plan.',
  },
  {
    id: 'launch-strategy',
    name: 'Launch Strategy',
    category: 'Strategy & Monetization',
    icon: '🚀',
    description: 'Plan a product launch, feature announcement, or release strategy.',
    examplePrompt: 'Plan a launch for curex24’s new mental-health home-visit service — channels, sequence, and assets.',
  },
  {
    id: 'marketing-ideas',
    name: 'Marketing Ideas',
    category: 'Strategy & Monetization',
    icon: '💡',
    description: 'Get marketing ideas, inspiration, or strategies for a SaaS or software product.',
    examplePrompt: 'Give me 20 unconventional growth ideas for curex24 — specifically for the Mumbai market.',
  },
  {
    id: 'marketing-psychology',
    name: 'Marketing Psychology',
    category: 'Strategy & Monetization',
    icon: '🧬',
    description: 'Apply psychological principles, mental models, or behavioural science to marketing.',
    examplePrompt: 'Apply behavioural-science principles to lift curex24 referral participation from 9% to 15%.',
  },
  {
    id: 'pricing-strategy',
    name: 'Pricing Strategy',
    category: 'Strategy & Monetization',
    icon: '🏷️',
    description: 'Help with pricing decisions, packaging, or monetization strategy.',
    examplePrompt: 'Propose a 3-tier pricing/packaging model for curex24 home-visit subscriptions.',
  },
  {
    id: 'product-marketing-context',
    name: 'Product Marketing Context',
    category: 'Strategy & Monetization',
    icon: '🧩',
    description: 'Create or update the product marketing context document — positioning, ICP, audience, messaging.',
    examplePrompt: 'Build the product marketing context doc for curex24 — ICP, positioning, value props, and key messages.',
  },

  // Growth Engineering
  {
    id: 'free-tool-strategy',
    name: 'Free Tool Strategy',
    category: 'Growth Engineering',
    icon: '🛠️',
    description: 'Plan, evaluate, or build a free tool for marketing — lead generation, SEO value, or virality.',
    examplePrompt: 'Design a free "BMI + home health risk" tool for curex24 to drive organic traffic and email signups.',
  },
  {
    id: 'lead-magnets',
    name: 'Lead Magnets',
    category: 'Growth Engineering',
    icon: '🧲',
    description: 'Create, plan, or optimize a lead magnet for email capture or lead generation.',
    examplePrompt: 'Create a downloadable "Family Health Calendar" lead magnet for curex24 — outline + landing page copy.',
  },
  {
    id: 'referral-program',
    name: 'Referral Program',
    category: 'Growth Engineering',
    icon: '🔗',
    description: 'Create, optimize, or analyze a referral program, affiliate program, or word-of-mouth strategy.',
    examplePrompt: 'Design a 2-sided referral program for curex24 patients — incentives, mechanics, and launch plan.',
  },
  {
    id: 'community-marketing',
    name: 'Community Marketing',
    category: 'Growth Engineering',
    icon: '🫂',
    description: 'Build and leverage online communities to drive product growth and brand loyalty.',
    examplePrompt: 'Launch a curex24 patient community on WhatsApp + Reddit — name, content plan, and 30-day calendar.',
  },

  // Sales & RevOps
  {
    id: 'revops',
    name: 'RevOps',
    category: 'Sales & RevOps',
    icon: '🧮',
    description: 'Help with revenue operations, lead lifecycle, scoring, routing, and pipeline management.',
    examplePrompt: 'Design a lead-scoring + routing model for curex24’s corporate (B2B) pipeline.',
  },
  {
    id: 'sales-enablement',
    name: 'Sales Enablement',
    category: 'Sales & RevOps',
    icon: '📑',
    description: 'Create sales collateral — pitch decks, one-pagers, objection handling docs, demo scripts.',
    examplePrompt: 'Create a 10-slide pitch deck for curex24 corporate-wellness sales calls.',
  },
];

export const marketingSkillCategories: MarketingSkillCategory[] = [
  'Conversion Optimization',
  'Content & Copy',
  'SEO & Discovery',
  'Paid & Distribution',
  'Measurement & Testing',
  'Retention',
  'Growth Engineering',
  'Strategy & Monetization',
  'Sales & RevOps',
];

// ─── Agent Messages ───────────────────────────────────────────────────────────

export interface AgentMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  imagePrompt?: string;
}

export const sampleConversation: AgentMessage[] = [
  {
    role: 'agent',
    content: `👋 Hello! I'm your curex24 Marketing Agent — your AI CMO and hands-on marketing operator.

I can help you with:
• **Strategy** — brand positioning, GTM, audience targeting
• **Campaigns** — briefs, ad copy, landing page copy
• **Content** — calendar, blog ideas, social posts, SEO
• **Lifecycle** — email flows, re-engagement, retention
• **Analytics** — KPI tracking, experiment design, reporting
• **Growth** — referral programs, partnerships, influencer outreach

To get started, I recommend completing the **Business Intake** form so I can tailor all recommendations to your specific stage, budget, and goals.

What would you like to work on today?`,
    timestamp: '09:00',
  },
  {
    role: 'user',
    content: "What should I focus on this week?",
    timestamp: '09:01',
  },
  {
    role: 'agent',
    content: `Based on your current data, here are this week's **top 3 priorities**:

**🔴 Priority 1: Provider Supply (Critical)**
Your active provider count is at 148 vs a target of 200. This is the #1 constraint on your growth — you cannot acquire more patients if supply can't absorb demand.
→ **Action:** Launch LinkedIn provider recruitment campaign this week. Use the brief in the Campaigns section. Budget: ₹20,000.

**🟡 Priority 2: Booking Completion Rate (At Risk)**
Only 28% of signups book within 7 days vs your 35% target. The Day 3 incentive email in your onboarding flow has the highest leverage here.
→ **Action:** A/B test the Day 3 email subject line (discount-led vs urgency-led). The experiment is already set up — activate it today.

**🟢 Quick Win: Referral Program**
Referrals are only 9% of new signups vs 15% target. The post-booking referral ask is the easiest lever.
→ **Action:** Add a referral CTA to your post-booking screen. This is a 1-day engineering task with high ROI.

Want me to draft the provider recruitment ad copy or the referral screen copy?`,
    timestamp: '09:01',
  },
];
