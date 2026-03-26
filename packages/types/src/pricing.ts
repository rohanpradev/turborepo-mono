const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const toUsdCents = (amountInDollars: number) =>
  Math.round(amountInDollars * 100);

export const formatUsdFromCents = (amountInCents: number) =>
  usdFormatter.format(amountInCents / 100);
