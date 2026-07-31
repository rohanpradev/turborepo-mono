export const getSingleSearchParam = (value?: string | Array<string>) =>
  Array.isArray(value) ? value[0] : value;

export const getPositiveIntegerSearchParam = (
  value?: string | Array<string>,
) => {
  const parsedValue = Number(getSingleSearchParam(value));

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 1;
};
