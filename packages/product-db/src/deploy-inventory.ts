import { closeInventory, migrateInventory } from "./inventory";

try {
  await migrateInventory();
} finally {
  await closeInventory();
}
