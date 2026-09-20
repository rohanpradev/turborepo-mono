import { connectOrderDB, disconnectOrderDB } from "./connection";
import { verifyOrderIndexes } from "./indexes";
import { Order } from "./order-model";

try {
  await connectOrderDB();
  // Add missing indexes without dropping existing indexes or modifying orders.
  // Duplicate order IDs intentionally fail deployment and require remediation.
  await Order.createIndexes();
  await verifyOrderIndexes();
  console.log("Order database indexes verified.");
} catch (error) {
  console.error("Order database index deployment failed:", error);
  process.exitCode = 1;
} finally {
  await disconnectOrderDB();
}
