import type { OrderRecord } from "./api";

export type OrderType = OrderRecord;

export type OrderChartType = {
  month: string;
  total: number;
  successful: number;
};
