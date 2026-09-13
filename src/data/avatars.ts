export interface AvatarPreset {
  id: string;
  name: string;
  category: '3d_fitness' | 'athletes' | 'minimal' | 'mascots';
  categoryLabel: string;
  url: string;
  accentColor: string;
}

export const AVATAR_CATEGORIES = [
  { id: 'all', label: 'All Avatars' },
  { id: '3d_fitness', label: '⚡ 3D Lifestyle' },
  { id: 'athletes', label: '🏋️ Athletes' },
  { id: 'minimal', label: '✨ Modern' },
  { id: 'mascots', label: '🦁 Mascots' },
];

export const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80';

export const AVATAR_PRESETS: AvatarPreset[] = [
  // 1. 3D Fitness & Lifestyle
  {
    id: 'avatar_default',
    name: 'Akshay (Active Runner)',
    category: '3d_fitness',
    categoryLabel: '3D Lifestyle',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    accentColor: '#F47551',
  },
  {
    id: 'avatar_ria_coach',
    name: 'Ria (Nutritionist)',
    category: '3d_fitness',
    categoryLabel: '3D Lifestyle',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop&q=80',
    accentColor: '#10B981',
  },
  {
    id: 'avatar_tech_fit',
    name: 'Neo (Fitness Geek)',
    category: '3d_fitness',
    categoryLabel: '3D Lifestyle',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
    accentColor: '#2563EB',
  },
  {
    id: 'avatar_calm_zen',
    name: 'Aria (Mindful Living)',
    category: '3d_fitness',
    categoryLabel: '3D Lifestyle',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80',
    accentColor: '#8B5CF6',
  },

  // 2. Athletes & Training
  {
    id: 'avatar_runner',
    name: 'Sprint Master',
    category: 'athletes',
    categoryLabel: 'Athletes',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80',
    accentColor: '#EA580C',
  },
  {
    id: 'avatar_crossfit',
    name: 'Kavya (Strength Pro)',
    category: 'athletes',
    categoryLabel: 'Athletes',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80',
    accentColor: '#EF4444',
  },
  {
    id: 'avatar_yoga',
    name: 'Dev (Yoga & Mobility)',
    category: 'athletes',
    categoryLabel: 'Athletes',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&auto=format&fit=crop&q=80',
    accentColor: '#059669',
  },
  {
    id: 'avatar_cyclist',
    name: 'Rohan (Endurance)',
    category: 'athletes',
    categoryLabel: 'Athletes',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=240&auto=format&fit=crop&q=80',
    accentColor: '#0284C7',
  },

  // 3. Modern & Minimal
  {
    id: 'avatar_minimal_1',
    name: 'Siddharth (Clean Cut)',
    category: 'minimal',
    categoryLabel: 'Modern',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80',
    accentColor: '#1E293B',
  },
  {
    id: 'avatar_minimal_2',
    name: 'Meera (Executive)',
    category: 'minimal',
    categoryLabel: 'Modern',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&auto=format&fit=crop&q=80',
    accentColor: '#D97706',
  },
  {
    id: 'avatar_minimal_3',
    name: 'Vikram (Urban)',
    category: 'minimal',
    categoryLabel: 'Modern',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80',
    accentColor: '#475569',
  },
  {
    id: 'avatar_minimal_4',
    name: 'Ananya (Vibrant)',
    category: 'minimal',
    categoryLabel: 'Modern',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&auto=format&fit=crop&q=80',
    accentColor: '#EC4899',
  },

  // 4. Mascots & Playful
  {
    id: 'avatar_mascot_lion',
    name: 'Leo (Power Mascot)',
    category: 'mascots',
    categoryLabel: 'Mascots',
    url: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=240&auto=format&fit=crop&q=80',
    accentColor: '#F59E0B',
  },
  {
    id: 'avatar_mascot_fox',
    name: 'Blaze (Speed)',
    category: 'mascots',
    categoryLabel: 'Mascots',
    url: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=240&auto=format&fit=crop&q=80',
    accentColor: '#F97316',
  },
  {
    id: 'avatar_mascot_owl',
    name: 'Athena (Wisdom)',
    category: 'mascots',
    categoryLabel: 'Mascots',
    url: 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?w=240&auto=format&fit=crop&q=80',
    accentColor: '#6366F1',
  },
];
