import { ImageSourcePropType } from 'react-native';

/**
 * 64 authentic 1:1 square WebP food assets in assets/foods/.
 * Each asset is statically required exactly once for Metro bundler efficiency.
 */
const CANONICAL_FOOD_ASSETS = {
  // Breads & Rotis
  chapati: require('../../assets/foods/chapati.webp'),
  paratha: require('../../assets/foods/paratha.webp'),
  aloo_paratha: require('../../assets/foods/aloo_paratha.webp'),
  parotta: require('../../assets/foods/parotta.webp'),
  roti_with_dal: require('../../assets/foods/roti_with_dal.webp'),
  bread_omelette: require('../../assets/foods/bread_omelette.webp'),
  chole_bhature: require('../../assets/foods/chole_bhature.webp'),

  // Dals, Curries & Meals
  paneer_butter_masala: require('../../assets/foods/paneer_butter_masala.webp'),
  chicken_curry: require('../../assets/foods/chicken_curry.webp'),
  veg_thali: require('../../assets/foods/veg_thali.webp'),

  // South Indian
  idli: require('../../assets/foods/idli.webp'),
  dosa: require('../../assets/foods/dosa.webp'),
  uttapam: require('../../assets/foods/uttapam.webp'),
  upma: require('../../assets/foods/upma.webp'),
  pongal: require('../../assets/foods/pongal.webp'),
  curd_rice: require('../../assets/foods/curd_rice.webp'),
  lemon_rice: require('../../assets/foods/lemon_rice.webp'),

  // Rice & Grains
  chicken_biryani: require('../../assets/foods/chicken_biryani.webp'),
  mutton_biryani: require('../../assets/foods/mutton_biryani.webp'),
  chicken_fried_rice: require('../../assets/foods/chicken_fried_rice.webp'),
  vegetable_fried_rice: require('../../assets/foods/vegetable_fried_rice.webp'),
  vegetable_pulao: require('../../assets/foods/vegetable_pulao.webp'),
  jeera_rice: require('../../assets/foods/jeera_rice.webp'),
  dal_rice: require('../../assets/foods/dal_rice.webp'),
  chole_rice: require('../../assets/foods/chole_rice.webp'),
  rajma_chawal: require('../../assets/foods/rajma_chawal.webp'),
  khichdi: require('../../assets/foods/khichdi.webp'),
  poha: require('../../assets/foods/poha.webp'),

  // Fruits
  apple: require('../../assets/foods/apple.webp'),
  banana: require('../../assets/foods/banana.webp'),
  papaya: require('../../assets/foods/papaya.webp'),
  mango: require('../../assets/foods/mango.webp'),
  strawberry: require('../../assets/foods/strawberry.webp'),
  green_grapes: require('../../assets/foods/green_grapes.webp'),
  watermelon: require('../../assets/foods/watermelon.webp'),
  orange: require('../../assets/foods/orange.webp'),
  kiwi: require('../../assets/foods/kiwi.webp'),
  guava: require('../../assets/foods/guava.webp'),
  pineapple: require('../../assets/foods/pineapple.webp'),
  pomegranate: require('../../assets/foods/pomegranate.webp'),
  dragonfruit: require('../../assets/foods/dragonfruit.webp'),
  muskmelon: require('../../assets/foods/muskmelon.webp'),
  sweet_lime: require('../../assets/foods/sweet_lime.webp'),
  pear: require('../../assets/foods/pear.webp'),
  jackfruit: require('../../assets/foods/jackfruit.webp'),
  sapota: require('../../assets/foods/sapota.webp'),
  lychee: require('../../assets/foods/lychee.webp'),
  coconut: require('../../assets/foods/coconut.webp'),

  // Nuts, Seeds & Dry Fruits
  almonds: require('../../assets/foods/almonds.webp'),
  cashews: require('../../assets/foods/cashews.webp'),
  walnuts: require('../../assets/foods/walnuts.webp'),
  pistachios: require('../../assets/foods/pistachios.webp'),
  dates: require('../../assets/foods/dates.webp'),
  peanuts: require('../../assets/foods/peanuts.webp'),
  chia_seeds: require('../../assets/foods/chia_seeds.webp'),
  flax_seeds: require('../../assets/foods/flax_seeds.webp'),
  pumpkin_seeds: require('../../assets/foods/pumpkin_seeds.webp'),
  sunflower_seeds: require('../../assets/foods/sunflower_seeds.webp'),
  sesame_seeds: require('../../assets/foods/sesame_seeds.webp'),
  pine_nuts: require('../../assets/foods/pine_nuts.webp'),
  dried_figs: require('../../assets/foods/dried_figs.webp'),
  dried_apricots: require('../../assets/foods/dried_apricots.webp'),
  dried_cranberries: require('../../assets/foods/dried_cranberries.webp'),
  raisins: require('../../assets/foods/raisins.webp'),
} as const;

/**
 * Canonical Food Image Registry.
 * Preserves 100% backward-compatible keys and aliases for database records.
 */
export const LOCAL_FOOD_IMAGES: Record<string, ImageSourcePropType> = {
  ...CANONICAL_FOOD_ASSETS,

  // Canonical Aliases for legacy food IDs
  roti_chapati: CANONICAL_FOOD_ASSETS.chapati,
  malabar_parotta: CANONICAL_FOOD_ASSETS.parotta,
  idli_steamed: CANONICAL_FOOD_ASSETS.idli,
  plain_dosa: CANONICAL_FOOD_ASSETS.dosa,
  ven_pongal: CANONICAL_FOOD_ASSETS.pongal,
  moong_dal_khichdi: CANONICAL_FOOD_ASSETS.khichdi,
  apple_medium: CANONICAL_FOOD_ASSETS.apple,
  banana_medium: CANONICAL_FOOD_ASSETS.banana,
  papaya_cubes: CANONICAL_FOOD_ASSETS.papaya,
  raw_almonds: CANONICAL_FOOD_ASSETS.almonds,
};

export type FoodImageKey = keyof typeof LOCAL_FOOD_IMAGES;

interface FoodNameRule {
  readonly pattern: RegExp;
  readonly key: FoodImageKey;
}

/**
 * Declarative name matching rules.
 * Compiled with strict word boundaries (\b) to eliminate substring collisions.
 * Specific multi-word phrases are prioritized over generic single-word patterns.
 */
const FOOD_NAME_RULES: readonly FoodNameRule[] = [
  // 1. South Indian Specifics
  { pattern: /\b(curd\s+rice|thayir\s+sadam)\b/i, key: 'curd_rice' },
  { pattern: /\b(lemon\s+rice|chitranna)\b/i, key: 'lemon_rice' },
  { pattern: /\b(ven\s+pongal|pongal)\b/i, key: 'pongal' },
  { pattern: /\b(rava\s+upma|upma)\b/i, key: 'upma' },
  { pattern: /\buttapams?\b/i, key: 'uttapam' },
  { pattern: /\b(steamed\s+idlis?|idlis?)\b/i, key: 'idli' },
  { pattern: /\b(plain\s+dosas?|masala\s+dosas?|dosas?)\b/i, key: 'dosa' },

  // 2. Breads & Combination Dishes
  { pattern: /\broti\s+with\s+dal\b/i, key: 'roti_with_dal' },
  { pattern: /\bbread\s+omelette\b/i, key: 'bread_omelette' },
  { pattern: /\bchole\s+bhature\b/i, key: 'chole_bhature' },
  { pattern: /\baloo\s+parathas?\b/i, key: 'aloo_paratha' },
  { pattern: /\b(plain\s+parathas?|parathas?)\b/i, key: 'paratha' },
  { pattern: /\b(malabar\s+parottas?|parottas?)\b/i, key: 'parotta' },
  { pattern: /\b(rotis?|chapatis?|phulkas?)\b/i, key: 'chapati' },

  // 3. Dals, Curries & Meals
  { pattern: /\b(paneer\s+butter\s+masala|paneer\s+makhani)\b/i, key: 'paneer_butter_masala' },
  { pattern: /\b(chicken\s+curry|chicken\s+gravy)\b/i, key: 'chicken_curry' },
  { pattern: /\b(veg\s+thali|indian\s+thali)\b/i, key: 'veg_thali' },

  // 4. Rice & Grains Dishes
  { pattern: /\bchicken\s+biryani\b/i, key: 'chicken_biryani' },
  { pattern: /\bmutton\s+biryani\b/i, key: 'mutton_biryani' },
  { pattern: /\bchicken\s+fried\s+rice\b/i, key: 'chicken_fried_rice' },
  { pattern: /\b(vegetable|veg)\s+fried\s+rice\b/i, key: 'vegetable_fried_rice' },
  { pattern: /\b(vegetable|veg)\s+pulao\b/i, key: 'vegetable_pulao' },
  { pattern: /\bjeera\s+rice\b/i, key: 'jeera_rice' },
  { pattern: /\b(dal\s+rice|dal\s+chawal)\b/i, key: 'dal_rice' },
  { pattern: /\b(chole\s+rice|chole\s+chawal)\b/i, key: 'chole_rice' },
  { pattern: /\brajma\s+chawal\b/i, key: 'rajma_chawal' },
  { pattern: /\b(moong\s+dal\s+khichdi|khichdi)\b/i, key: 'khichdi' },
  { pattern: /\bpoha\b/i, key: 'poha' },

  // 5. Fresh Fruits (Compound fruit names MUST precede generic words)
  { pattern: /\bpineapples?\b/i, key: 'pineapple' },
  { pattern: /\b(sweet\s+limes?|mosambi)\b/i, key: 'sweet_lime' },
  { pattern: /\bdragon\s*fruits?\b/i, key: 'dragonfruit' },
  { pattern: /\bwatermelons?\b/i, key: 'watermelon' },
  { pattern: /\b(muskmelons?|cantaloupes?)\b/i, key: 'muskmelon' },
  { pattern: /\bjackfruits?\b/i, key: 'jackfruit' },
  { pattern: /\b(green\s+grapes?|grapes?)\b/i, key: 'green_grapes' },
  { pattern: /\bstrawberr(y|ies)\b/i, key: 'strawberry' },
  { pattern: /\b(pomegranates?|anar)\b/i, key: 'pomegranate' },
  { pattern: /\b(papayas?|papita)\b/i, key: 'papaya' },
  { pattern: /\bapples?\b/i, key: 'apple' },
  { pattern: /\bbananas?\b/i, key: 'banana' },
  { pattern: /\bmango(es)?\b/i, key: 'mango' },
  { pattern: /\boranges?\b/i, key: 'orange' },
  { pattern: /\bkiwis?\b/i, key: 'kiwi' },
  { pattern: /\bguavas?\b/i, key: 'guava' },
  { pattern: /\bpears?\b/i, key: 'pear' },
  { pattern: /\b(sapota|chikoo|chiku)\b/i, key: 'sapota' },
  { pattern: /\b(lychees?|litchis?)\b/i, key: 'lychee' },
  { pattern: /\bcoconuts?\b/i, key: 'coconut' },

  // 6. Nuts, Seeds & Dry Fruits
  { pattern: /\b(dried\s+cranberr(y|ies)|cranberr(y|ies))\b/i, key: 'dried_cranberries' },
  { pattern: /\b(dried\s+apricots?|apricots?|khubani)\b/i, key: 'dried_apricots' },
  { pattern: /\b(dried\s+figs?|figs?|anjeer)\b/i, key: 'dried_figs' },
  { pattern: /\bpumpkin\s+seeds?\b/i, key: 'pumpkin_seeds' },
  { pattern: /\bsunflower\s+seeds?\b/i, key: 'sunflower_seeds' },
  { pattern: /\bchia(\s+seeds?)?\b/i, key: 'chia_seeds' },
  { pattern: /\b(flax(\s+seeds?)?|alsi)\b/i, key: 'flax_seeds' },
  { pattern: /\b(sesame(\s+seeds?)?|til)\b/i, key: 'sesame_seeds' },
  { pattern: /\b(pine\s+nuts?|chilgoza)\b/i, key: 'pine_nuts' },
  { pattern: /\b(almonds?|badam)\b/i, key: 'almonds' },
  { pattern: /\b(cashews?|kaju)\b/i, key: 'cashews' },
  { pattern: /\b(walnuts?|akhrot)\b/i, key: 'walnuts' },
  { pattern: /\b(pistachios?|pista)\b/i, key: 'pistachios' },
  { pattern: /\b(dates?|khajoor)\b/i, key: 'dates' },
  { pattern: /\b(peanuts?|groundnuts?)\b/i, key: 'peanuts' },
  { pattern: /\b(raisins?|kismis|kishmish)\b/i, key: 'raisins' },
];

export interface FoodImageResolvable {
  id?: string;
  name?: string;
  imageUrl?: string | ImageSourcePropType | number | null;
}

/**
 * Resolves the canonical WebP asset for a food item.
 * Priority: exact ID -> custom user photo -> STRICT, word-boundary dish name match.
 * NEVER forces wrong dish photos onto unrepresented foods (e.g. Appam will never show an Idli photo).
 */
export function getFoodImageSource(
  item?: FoodImageResolvable | null
): ImageSourcePropType | undefined {
  if (!item) return undefined;

  // 1. Direct ID match in canonical registry
  if (item.id && LOCAL_FOOD_IMAGES[item.id]) {
    return LOCAL_FOOD_IMAGES[item.id];
  }

  // 2. User custom uploaded photo or camera scan URI
  if (item.imageUrl) {
    return typeof item.imageUrl === 'string' ? { uri: item.imageUrl } : item.imageUrl;
  }

  // 3. Strict, word-boundary dish name matching ONLY (no false substring collisions)
  const name = (item.name || '').toLowerCase().trim();
  if (!name) return undefined;

  for (let i = 0; i < FOOD_NAME_RULES.length; i++) {
    if (FOOD_NAME_RULES[i].pattern.test(name)) {
      return LOCAL_FOOD_IMAGES[FOOD_NAME_RULES[i].key];
    }
  }

  // When there is no genuine picture, return undefined so a proper fallback is shown.
  return undefined;
}
