import "server-only";

import {
  getOrderServiceUrl,
  getPaymentServiceUrl,
  getProductServiceUrl,
} from "./index";

export const getProductServiceServerUrl = () =>
  process.env.PRODUCT_SERVICE_INTERNAL_URL ?? getProductServiceUrl();

export const getOrderServiceServerUrl = () =>
  process.env.ORDER_SERVICE_INTERNAL_URL ?? getOrderServiceUrl();

export const getPaymentServiceServerUrl = () =>
  process.env.PAYMENT_SERVICE_INTERNAL_URL ?? getPaymentServiceUrl();
