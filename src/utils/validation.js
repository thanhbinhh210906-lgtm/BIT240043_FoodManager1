// MSSV: BIT240043
import { f } from '../models/models';

export function validateDish(dish, allDishes, categories) {
  const errors = {};
  const name = (dish[f('Name')] || '').trim();
  const price = Number(dish[f('Price')]);
  const prepTime = Number(dish[f('PreparationTime')]);
  const catId = Number(dish[f('DishCategoryId')]);

  if (!name) errors[f('Name')] = 'validation_name_required';
  if (!(price > 0)) errors[f('Price')] = 'validation_price_positive';
  if (!(prepTime > 0)) errors[f('PreparationTime')] = 'validation_prep_positive';

  const catExists = categories.some((c) => c[f('DishCategoryId')] === catId);
  if (!catExists) errors[f('DishCategoryId')] = 'validation_category_invalid';

  const duplicate = allDishes.some(
    (d) =>
      d[f('DishId')] !== dish[f('DishId')] &&
      d[f('DishCategoryId')] === catId &&
      (d[f('Name')] || '').trim().toLowerCase() === name.toLowerCase()
  );
  if (duplicate) errors[f('Name')] = 'validation_name_duplicate';

  return errors;
}