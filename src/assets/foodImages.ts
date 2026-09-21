import { ImageSourcePropType } from 'react-native';

/**
 * Canonical Food Image Registry
 * Every entry points to an authentic 1:1 square WebP asset in assets/foods/.
 * Exactly 64 canonical food images.
 */
export const LOCAL_FOOD_IMAGES: Record<string, ImageSourcePropType> = {
  // Breads & Rotis
  roti_chapati:         require('../../assets/foods/chapati.webp'),
  chapati:              require('../../assets/foods/chapati.webp'),
  paratha:              require('../../assets/foods/paratha.webp'),
  aloo_paratha:         require('../../assets/foods/aloo_paratha.webp'),
  malabar_parotta:      require('../../assets/foods/parotta.webp'),
  parotta:              require('../../assets/foods/parotta.webp'),
  roti_with_dal:        require('../../assets/foods/roti_with_dal.webp'),
  bread_omelette:       require('../../assets/foods/bread_omelette.webp'),
  chole_bhature:        require('../../assets/foods/chole_bhature.webp'),

  // Dals, Curries & Meals
  paneer_butter_masala: require('../../assets/foods/paneer_butter_masala.webp'),
  chicken_curry:        require('../../assets/foods/chicken_curry.webp'),
  veg_thali:            require('../../assets/foods/veg_thali.webp'),

  // South Indian
  idli_steamed:         require('../../assets/foods/idli.webp'),
  idli:                 require('../../assets/foods/idli.webp'),
  plain_dosa:           require('../../assets/foods/dosa.webp'),
  dosa:                 require('../../assets/foods/dosa.webp'),
  uttapam:              require('../../assets/foods/uttapam.webp'),
  upma:                 require('../../assets/foods/upma.webp'),
  ven_pongal:           require('../../assets/foods/pongal.webp'),
  pongal:               require('../../assets/foods/pongal.webp'),
  curd_rice:            require('../../assets/foods/curd_rice.webp'),
  lemon_rice:           require('../../assets/foods/lemon_rice.webp'),

  // Rice & Grains
  chicken_biryani:      require('../../assets/foods/chicken_biryani.webp'),
  mutton_biryani:       require('../../assets/foods/mutton_biryani.webp'),
  chicken_fried_rice:   require('../../assets/foods/chicken_fried_rice.webp'),
  vegetable_fried_rice: require('../../assets/foods/vegetable_fried_rice.webp'),
  vegetable_pulao:      require('../../assets/foods/vegetable_pulao.webp'),
  jeera_rice:           require('../../assets/foods/jeera_rice.webp'),
  dal_rice:             require('../../assets/foods/dal_rice.webp'),
  chole_rice:           require('../../assets/foods/chole_rice.webp'),
  rajma_chawal:         require('../../assets/foods/rajma_chawal.webp'),
  moong_dal_khichdi:    require('../../assets/foods/khichdi.webp'),
  khichdi:              require('../../assets/foods/khichdi.webp'),

  // Snacks & Breakfast
  poha:                 require('../../assets/foods/poha.webp'),

  // Fruits
  apple_medium:         require('../../assets/foods/apple.webp'),
  apple:                require('../../assets/foods/apple.webp'),
  banana_medium:        require('../../assets/foods/banana.webp'),
  banana:               require('../../assets/foods/banana.webp'),
  papaya_cubes:         require('../../assets/foods/papaya.webp'),
  papaya:               require('../../assets/foods/papaya.webp'),
  mango:                require('../../assets/foods/mango.webp'),
  strawberry:           require('../../assets/foods/strawberry.webp'),
  green_grapes:         require('../../assets/foods/green_grapes.webp'),
  watermelon:           require('../../assets/foods/watermelon.webp'),
  orange:               require('../../assets/foods/orange.webp'),
  kiwi:                 require('../../assets/foods/kiwi.webp'),
  guava:                require('../../assets/foods/guava.webp'),
  pineapple:            require('../../assets/foods/pineapple.webp'),
  pomegranate:          require('../../assets/foods/pomegranate.webp'),
  dragonfruit:          require('../../assets/foods/dragonfruit.webp'),
  muskmelon:            require('../../assets/foods/muskmelon.webp'),
  sweet_lime:           require('../../assets/foods/sweet_lime.webp'),
  pear:                 require('../../assets/foods/pear.webp'),
  jackfruit:            require('../../assets/foods/jackfruit.webp'),
  sapota:               require('../../assets/foods/sapota.webp'),
  lychee:               require('../../assets/foods/lychee.webp'),
  coconut:              require('../../assets/foods/coconut.webp'),

  // Nuts, Seeds & Dry Fruits
  raw_almonds:          require('../../assets/foods/almonds.webp'),
  almonds:              require('../../assets/foods/almonds.webp'),
  cashews:              require('../../assets/foods/cashews.webp'),
  walnuts:              require('../../assets/foods/walnuts.webp'),
  pistachios:           require('../../assets/foods/pistachios.webp'),
  dates:                require('../../assets/foods/dates.webp'),
  peanuts:              require('../../assets/foods/peanuts.webp'),
  chia_seeds:           require('../../assets/foods/chia_seeds.webp'),
  flax_seeds:           require('../../assets/foods/flax_seeds.webp'),
  pumpkin_seeds:        require('../../assets/foods/pumpkin_seeds.webp'),
  sunflower_seeds:      require('../../assets/foods/sunflower_seeds.webp'),
  sesame_seeds:         require('../../assets/foods/sesame_seeds.webp'),
  pine_nuts:            require('../../assets/foods/pine_nuts.webp'),
  dried_figs:           require('../../assets/foods/dried_figs.webp'),
  dried_apricots:       require('../../assets/foods/dried_apricots.webp'),
  dried_cranberries:    require('../../assets/foods/dried_cranberries.webp'),
  raisins:              require('../../assets/foods/raisins.webp'),
};

/**
 * Resolves the canonical WebP asset for a food item.
 * Priority: exact ID -> custom user photo -> STRICT, exact dish name match.
 * NEVER forces wrong dish photos onto unrepresented foods (e.g. Appam will never show an Idli photo).
 */
export function getFoodImageSource(
  item?: { id?: string; name?: string; imageUrl?: any } | null
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

  // 3. Strict, exact dish name matching ONLY (no loose multi-dish guessing)
  const name = (item.name || '').toLowerCase().trim();
  if (!name) return undefined;

  // Specific South Indian dishes
  if (name === 'idli' || name.includes('steamed idli') || name.startsWith('idli ')) return LOCAL_FOOD_IMAGES.idli_steamed;
  if (name === 'dosa' || name.includes('plain dosa') || name.startsWith('dosa ')) return LOCAL_FOOD_IMAGES.plain_dosa;
  if (name.includes('uttapam')) return LOCAL_FOOD_IMAGES.uttapam;
  if (name.includes('upma') || name.includes('rava upma')) return LOCAL_FOOD_IMAGES.upma;
  if (name.includes('pongal') || name.includes('ven pongal')) return LOCAL_FOOD_IMAGES.ven_pongal;
  if (name.includes('curd rice') || name.includes('thayir sadam')) return LOCAL_FOOD_IMAGES.curd_rice;
  if (name.includes('lemon rice') || name.includes('chitranna')) return LOCAL_FOOD_IMAGES.lemon_rice;

  // Breads & Rotis
  if (name.includes('aloo paratha')) return LOCAL_FOOD_IMAGES.aloo_paratha;
  if (name === 'paratha' || name.includes('plain paratha')) return LOCAL_FOOD_IMAGES.paratha;
  if (name.includes('parotta') || name.includes('malabar parotta')) return LOCAL_FOOD_IMAGES.malabar_parotta;
  if (name.includes('roti with dal')) return LOCAL_FOOD_IMAGES.roti_with_dal;
  if (name.includes('bread omelette')) return LOCAL_FOOD_IMAGES.bread_omelette;
  if (name.includes('chole bhature')) return LOCAL_FOOD_IMAGES.chole_bhature;
  if (name.includes('roti') || name.includes('chapati') || name.includes('phulka')) return LOCAL_FOOD_IMAGES.roti_chapati;

  // Dals, Curries & Meals
  if (name.includes('paneer butter masala') || name.includes('paneer makhani')) return LOCAL_FOOD_IMAGES.paneer_butter_masala;
  if (name.includes('chicken curry') || name.includes('chicken gravy')) return LOCAL_FOOD_IMAGES.chicken_curry;
  if (name.includes('veg thali') || name.includes('indian thali')) return LOCAL_FOOD_IMAGES.veg_thali;

  // Rice & Grains
  if (name.includes('chicken biryani')) return LOCAL_FOOD_IMAGES.chicken_biryani;
  if (name.includes('mutton biryani')) return LOCAL_FOOD_IMAGES.mutton_biryani;
  if (name.includes('chicken fried rice')) return LOCAL_FOOD_IMAGES.chicken_fried_rice;
  if (name.includes('vegetable fried rice') || name.includes('veg fried rice')) return LOCAL_FOOD_IMAGES.vegetable_fried_rice;
  if (name.includes('vegetable pulao') || name.includes('veg pulao')) return LOCAL_FOOD_IMAGES.vegetable_pulao;
  if (name.includes('jeera rice')) return LOCAL_FOOD_IMAGES.jeera_rice;
  if (name.includes('dal rice') || name.includes('dal chawal')) return LOCAL_FOOD_IMAGES.dal_rice;
  if (name.includes('chole rice') || name.includes('chole chawal')) return LOCAL_FOOD_IMAGES.chole_rice;
  if (name.includes('rajma chawal')) return LOCAL_FOOD_IMAGES.rajma_chawal;
  if (name.includes('khichdi') || name.includes('moong dal khichdi')) return LOCAL_FOOD_IMAGES.moong_dal_khichdi;
  if (name.includes('poha')) return LOCAL_FOOD_IMAGES.poha;

  // Fresh Fruits
  if (name.includes('apple')) return LOCAL_FOOD_IMAGES.apple_medium;
  if (name.includes('banana')) return LOCAL_FOOD_IMAGES.banana_medium;
  if (name.includes('mango')) return LOCAL_FOOD_IMAGES.mango;
  if (name.includes('strawberry') || name.includes('strawberries')) return LOCAL_FOOD_IMAGES.strawberry;
  if (name.includes('grape')) return LOCAL_FOOD_IMAGES.green_grapes;
  if (name.includes('watermelon')) return LOCAL_FOOD_IMAGES.watermelon;
  if (name.includes('orange')) return LOCAL_FOOD_IMAGES.orange;
  if (name.includes('kiwi')) return LOCAL_FOOD_IMAGES.kiwi;
  if (name.includes('guava')) return LOCAL_FOOD_IMAGES.guava;
  if (name.includes('papaya')) return LOCAL_FOOD_IMAGES.papaya_cubes;
  if (name.includes('pineapple')) return LOCAL_FOOD_IMAGES.pineapple;
  if (name.includes('pomegranate') || name.includes('anar')) return LOCAL_FOOD_IMAGES.pomegranate;
  if (name.includes('dragonfruit') || name.includes('dragon fruit')) return LOCAL_FOOD_IMAGES.dragonfruit;
  if (name.includes('muskmelon') || name.includes('cantaloupe')) return LOCAL_FOOD_IMAGES.muskmelon;
  if (name.includes('sweet lime') || name.includes('mosambi')) return LOCAL_FOOD_IMAGES.sweet_lime;
  if (name.includes('pear')) return LOCAL_FOOD_IMAGES.pear;
  if (name.includes('jackfruit')) return LOCAL_FOOD_IMAGES.jackfruit;
  if (name.includes('sapota') || name.includes('chikoo')) return LOCAL_FOOD_IMAGES.sapota;
  if (name.includes('lychee') || name.includes('litchi')) return LOCAL_FOOD_IMAGES.lychee;
  if (name.includes('coconut')) return LOCAL_FOOD_IMAGES.coconut;

  // Nuts, Seeds & Dry Fruits
  if (name.includes('almond') || name.includes('badam')) return LOCAL_FOOD_IMAGES.raw_almonds;
  if (name.includes('cashew') || name.includes('kaju')) return LOCAL_FOOD_IMAGES.cashews;
  if (name.includes('walnut') || name.includes('akhrot')) return LOCAL_FOOD_IMAGES.walnuts;
  if (name.includes('pistachio') || name.includes('pista')) return LOCAL_FOOD_IMAGES.pistachios;
  if (name.includes('date') || name.includes('khajoor')) return LOCAL_FOOD_IMAGES.dates;
  if (name.includes('peanut')) return LOCAL_FOOD_IMAGES.peanuts;
  if (name.includes('chia')) return LOCAL_FOOD_IMAGES.chia_seeds;
  if (name.includes('flax') || name.includes('alsi')) return LOCAL_FOOD_IMAGES.flax_seeds;
  if (name.includes('pumpkin seed')) return LOCAL_FOOD_IMAGES.pumpkin_seeds;
  if (name.includes('sunflower seed')) return LOCAL_FOOD_IMAGES.sunflower_seeds;
  if (name.includes('sesame') || name.includes('til')) return LOCAL_FOOD_IMAGES.sesame_seeds;
  if (name.includes('pine nut') || name.includes('chilgoza')) return LOCAL_FOOD_IMAGES.pine_nuts;
  if (name.includes('fig') || name.includes('anjeer')) return LOCAL_FOOD_IMAGES.dried_figs;
  if (name.includes('apricot') || name.includes('khubani')) return LOCAL_FOOD_IMAGES.dried_apricots;
  if (name.includes('cranberr')) return LOCAL_FOOD_IMAGES.dried_cranberries;
  if (name.includes('raisin') || name.includes('kismis')) return LOCAL_FOOD_IMAGES.raisins;

  // When there is no genuine picture, return undefined so a proper fallback is shown.
  return undefined;
}
