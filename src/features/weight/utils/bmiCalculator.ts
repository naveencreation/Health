export interface BMICategoryItem {
  id: string;
  name: string;
  color: string;
  minBMI: number;
  maxBMI: number;
  span: number;
}

export const BMI_SPECTRUM_CATEGORIES: BMICategoryItem[] = [
  {
    id: 'very_underweight',
    name: 'Very severely underweight',
    color: '#0284C7',
    minBMI: 0,
    maxBMI: 16.0,
    span: 1.0,
  },
  {
    id: 'severely_underweight',
    name: 'Severely underweight',
    color: '#0EA5E9',
    minBMI: 16.0,
    maxBMI: 17.0,
    span: 1.0,
  },
  {
    id: 'underweight',
    name: 'Underweight',
    color: '#06B6D4',
    minBMI: 17.0,
    maxBMI: 18.5,
    span: 1.5,
  },
  { id: 'normal', name: 'Normal', color: '#22C55E', minBMI: 18.5, maxBMI: 25.0, span: 6.5 },
  { id: 'overweight', name: 'Overweight', color: '#EAB308', minBMI: 25.0, maxBMI: 30.0, span: 5.0 },
  { id: 'obese_1', name: 'Obese Class I', color: '#F97316', minBMI: 30.0, maxBMI: 35.0, span: 5.0 },
  {
    id: 'obese_2',
    name: 'Obese Class II',
    color: '#EF4444',
    minBMI: 35.0,
    maxBMI: 40.0,
    span: 5.0,
  },
  {
    id: 'obese_3',
    name: 'Obese Class III',
    color: '#DC2626',
    minBMI: 40.0,
    maxBMI: 100,
    span: 2.0,
  },
];

export function getTodayBMICategory(bmi: number): BMICategoryItem {
  if (bmi < 16.0) return BMI_SPECTRUM_CATEGORIES[0];
  if (bmi < 17.0) return BMI_SPECTRUM_CATEGORIES[1];
  if (bmi < 18.5) return BMI_SPECTRUM_CATEGORIES[2];
  if (bmi < 25.0) return BMI_SPECTRUM_CATEGORIES[3];
  if (bmi < 30.0) return BMI_SPECTRUM_CATEGORIES[4];
  if (bmi < 35.0) return BMI_SPECTRUM_CATEGORIES[5];
  if (bmi < 40.0) return BMI_SPECTRUM_CATEGORIES[6];
  return BMI_SPECTRUM_CATEGORIES[7];
}
