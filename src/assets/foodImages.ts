import { ImageSourcePropType } from 'react-native';

/**
 * 100% Verified Local Food Asset Registry
 * Bundled offline assets for all 45 standard database items.
 * Provides instant 0ms rendering with zero network latency or broken links.
 */
export const LOCAL_FOOD_IMAGES: Record<string, ImageSourcePropType> = {
  // --- INDIAN BREADS ---
  roti_chapati: require('../../assets/foods/roti_chapati.jpg'),
  butter_roti: require('../../assets/foods/butter_roti.jpg'),
  aloo_paratha: require('../../assets/foods/aloo_paratha.jpg'),
  paneer_paratha: require('../../assets/foods/paneer_paratha.jpg'),
  plain_naan: require('../../assets/foods/plain_naan.jpg'),
  brown_bread_slice: require('../../assets/foods/brown_bread_slice.jpg'),

  // --- DALS & CURRIES ---
  dal_tadka: require('../../assets/foods/dal_tadka.jpg'),
  dal_makhani: require('../../assets/foods/dal_makhani.jpg'),
  paneer_butter_masala: require('../../assets/foods/paneer_butter_masala.jpg'),
  palak_paneer: require('../../assets/foods/palak_paneer.jpg'),
  rajma_masala: require('../../assets/foods/rajma_masala.jpg'),
  chole_masala: require('../../assets/foods/chole_masala.jpg'),
  chicken_curry: require('../../assets/foods/chicken_curry.jpg'),
  egg_curry: require('../../assets/foods/egg_curry.jpg'),
  mix_veg_sabzi: require('../../assets/foods/mix_veg_sabzi.jpg'),

  // --- SOUTH INDIAN ---
  idli_steamed: require('../../assets/foods/idli_steamed.jpg'),
  plain_dosa: require('../../assets/foods/plain_dosa.jpg'),
  masala_dosa: require('../../assets/foods/masala_dosa.jpg'),
  sambar: require('../../assets/foods/sambar.jpg'),
  coconut_chutney: require('../../assets/foods/coconut_chutney.jpg'),
  upma: require('../../assets/foods/upma.jpg'),

  // --- RICE & GRAINS ---
  cooked_white_rice: require('../../assets/foods/cooked_white_rice.jpg'),
  brown_rice: require('../../assets/foods/brown_rice.jpg'),
  veg_biryani: require('../../assets/foods/veg_biryani.jpg'),
  chicken_biryani: require('../../assets/foods/chicken_biryani.jpg'),
  moong_dal_khichdi: require('../../assets/foods/moong_dal_khichdi.jpg'),
  oatmeal_water: require('../../assets/foods/oatmeal_water.jpg'),

  // --- SNACKS & PROTEINS ---
  boiled_egg: require('../../assets/foods/boiled_egg.jpg'),
  egg_white: require('../../assets/foods/egg_white.jpg'),
  paneer_raw: require('../../assets/foods/paneer_raw.jpg'),
  sprouts_salad: require('../../assets/foods/sprouts_salad.jpg'),
  roasted_chana: require('../../assets/foods/roasted_chana.jpg'),
  poha: require('../../assets/foods/poha.jpg'),
  samosa: require('../../assets/foods/samosa.jpg'),

  // --- DAIRY & BEVERAGES ---
  masala_chai: require('../../assets/foods/masala_chai.jpg'),
  chai_without_sugar: require('../../assets/foods/chai_without_sugar.jpg'),
  filter_coffee: require('../../assets/foods/filter_coffee.jpg'),
  green_tea: require('../../assets/foods/green_tea.jpg'),
  buttermilk_chaas: require('../../assets/foods/buttermilk_chaas.jpg'),
  curd_dahi: require('../../assets/foods/curd_dahi.jpg'),
  whey_protein: require('../../assets/foods/whey_protein.jpg'),

  // --- FRUITS & NUTS ---
  banana_medium: require('../../assets/foods/banana_medium.jpg'),
  apple_medium: require('../../assets/foods/apple_medium.jpg'),
  papaya_cubes: require('../../assets/foods/papaya_cubes.jpg'),
  raw_almonds: require('../../assets/foods/raw_almonds.jpg'),
};
