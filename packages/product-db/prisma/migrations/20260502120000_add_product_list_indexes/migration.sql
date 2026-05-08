-- CreateIndex
CREATE INDEX "Product_categorySlug_createdAt_idx" ON "Product"("categorySlug", "createdAt");

-- CreateIndex
CREATE INDEX "Product_categorySlug_price_idx" ON "Product"("categorySlug", "price");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "Product"("price");
