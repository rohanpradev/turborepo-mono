import {
  ensureTopics,
  Topics,
  type ProductCreatedMessage,
} from "@repo/kafka";
import {
  connectProductDB,
  disconnectProductDB,
  type Product,
  prisma,
} from "@repo/product-db";
import { toUsdCents } from "@repo/types";
import { kafkaClient, producer } from "../utils/kafka";

type SeedCategory = {
  name: string;
  slug: string;
};

type SeedProduct = {
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  sizes: string[];
  colors: string[];
  images: Record<string, string>;
  categorySlug: string;
};

const categories: SeedCategory[] = [
  { name: "T-Shirts", slug: "t-shirts" },
  { name: "Outerwear", slug: "outerwear" },
  { name: "Shoes", slug: "shoes" },
  { name: "Denim", slug: "denim" },
];

const products: SeedProduct[] = [
  {
    name: "Adidas CoreFit T-Shirt",
    shortDescription: "Breathable training tee with a clean athletic cut.",
    description:
      "A lightweight performance tee built for daily training, travel, and off-duty wear. The CoreFit T-Shirt keeps the fit close without feeling restrictive and pairs easily with shorts, joggers, or denim.",
    price: toUsdCents(39.9),
    sizes: ["s", "m", "l", "xl", "xxl"],
    colors: ["gray", "purple", "green"],
    images: {
      gray: "/products/1g.png",
      purple: "/products/1p.png",
      green: "/products/1gr.png",
    },
    categorySlug: "t-shirts",
  },
  {
    name: "Puma Ultra Warm Zip",
    shortDescription: "Soft zip layer designed for colder starts and late nights.",
    description:
      "The Ultra Warm Zip is an easy outer layer with a structured fit and soft interior. It works as a gym warmup top, a commuter jacket, or a clean weekend layer when the weather drops.",
    price: toUsdCents(59.9),
    sizes: ["s", "m", "l", "xl"],
    colors: ["gray", "green"],
    images: {
      gray: "/products/2g.png",
      green: "/products/2gr.png",
    },
    categorySlug: "outerwear",
  },
  {
    name: "Nike Air Essentials Pullover",
    shortDescription: "Everyday pullover with a heavyweight feel and soft finish.",
    description:
      "A relaxed pullover made for layering, travel, and everyday wear. The Air Essentials Pullover balances warmth and structure, with bold color options that work well across the rest of the seeded catalog.",
    price: toUsdCents(69.9),
    sizes: ["s", "m", "l"],
    colors: ["green", "blue", "black"],
    images: {
      green: "/products/3gr.png",
      blue: "/products/3b.png",
      black: "/products/3bl.png",
    },
    categorySlug: "outerwear",
  },
  {
    name: "Nike Dri Flex T-Shirt",
    shortDescription: "A minimal performance tee with quick-dry comfort.",
    description:
      "Built for warm sessions and fast movement, the Dri Flex T-Shirt keeps the silhouette simple and the fabric light. It is the most versatile core tee in the demo lineup.",
    price: toUsdCents(29.9),
    sizes: ["s", "m", "l"],
    colors: ["white", "pink"],
    images: {
      white: "/products/4w.png",
      pink: "/products/4p.png",
    },
    categorySlug: "t-shirts",
  },
  {
    name: "Under Armour StormFleece",
    shortDescription: "Weather-ready fleece built for movement and layering.",
    description:
      "StormFleece delivers insulation without a bulky silhouette. It is designed for colder training days and casual layering, with bold accent colors that read well in the storefront cards.",
    price: toUsdCents(49.9),
    sizes: ["s", "m", "l"],
    colors: ["red", "orange", "black"],
    images: {
      red: "/products/5r.png",
      orange: "/products/5o.png",
      black: "/products/5bl.png",
    },
    categorySlug: "outerwear",
  },
  {
    name: "Nike Air Max 270",
    shortDescription: "Everyday runner with cushioned comfort and a clean upper.",
    description:
      "A versatile sneaker with easy cushioning and strong casual styling. The Air Max 270 gives the seeded catalog a footwear option that works for both product browsing and checkout testing.",
    price: toUsdCents(59.9),
    sizes: ["40", "42", "43", "44"],
    colors: ["gray", "white"],
    images: {
      gray: "/products/6g.png",
      white: "/products/6w.png",
    },
    categorySlug: "shoes",
  },
  {
    name: "Nike Ultraboost Pulse",
    shortDescription: "A lighter running shoe with an expressive color mix.",
    description:
      "Ultraboost Pulse is the brighter footwear option in the showcase set. It gives the seeded storefront another strong image group and adds variety to cart and checkout testing.",
    price: toUsdCents(69.9),
    sizes: ["40", "42", "43"],
    colors: ["gray", "pink"],
    images: {
      gray: "/products/7g.png",
      pink: "/products/7p.png",
    },
    categorySlug: "shoes",
  },
  {
    name: "Levi's Classic Denim",
    shortDescription: "A classic denim piece with two versatile colorways.",
    description:
      "Classic Denim rounds out the seeded catalog with a casual staple. It gives the filters and category rail a non-sportswear option while still fitting the visual tone of the storefront.",
    price: toUsdCents(59.9),
    sizes: ["s", "m", "l"],
    colors: ["blue", "green"],
    images: {
      blue: "/products/8b.png",
      green: "/products/8gr.png",
    },
    categorySlug: "denim",
  },
];

const toProductCreatedMessage = (product: Product): ProductCreatedMessage => ({
  id: product.id.toString(),
  name: product.name,
  description: product.description,
  price: product.price,
  categorySlug: product.categorySlug,
  stock: 0,
  createdAt: product.createdAt.toISOString(),
});

const seedCategories = async () => {
  await Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: { name: category.name },
      }),
    ),
  );
};

const seedProducts = async () => {
  const existingProducts = await prisma.product.findMany({
    where: {
      name: {
        in: products.map((product) => product.name),
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const existingByName = new Map(
    existingProducts.map((product) => [product.name, product.id]),
  );
  const storedProducts: Product[] = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const seedProduct of products) {
    const existingId = existingByName.get(seedProduct.name);

    if (existingId) {
      const updatedProduct = await prisma.product.update({
        where: { id: existingId },
        data: seedProduct,
      });
      storedProducts.push(updatedProduct);
      updatedCount += 1;
      continue;
    }

    const createdProduct = await prisma.product.create({
      data: seedProduct,
    });
    storedProducts.push(createdProduct);
    createdCount += 1;
  }

  return {
    createdCount,
    updatedCount,
    storedProducts,
  };
};

const publishProductEvents = async (storedProducts: Product[]) => {
  try {
    await ensureTopics(kafkaClient, [
      Topics.PRODUCT_CREATED,
      Topics.PRODUCT_DELETED,
    ]);
    await producer.start();
    await producer.sendBatch(
      storedProducts.map((product) => ({
        topic: Topics.PRODUCT_CREATED,
        key: product.id.toString(),
        message: toProductCreatedMessage(product),
      })),
    );

    console.log(
      `Published ${storedProducts.length} product.created events for seeded catalog sync.`,
    );
  } catch (error) {
    console.warn(
      "Seed completed but Kafka publish failed. Products exist in Postgres; rerun the seed after Kafka is healthy if you need catalog replay.",
      error,
    );
  } finally {
    await producer.shutdown().catch((shutdownError) => {
      console.warn("Failed to close Kafka producer after seeding.", shutdownError);
    });
  }
};

const main = async () => {
  await connectProductDB();

  try {
    await seedCategories();
    const result = await seedProducts();
    await publishProductEvents(result.storedProducts);

    console.log(
      `Seeded ${result.storedProducts.length} products across ${categories.length} categories (${result.createdCount} created, ${result.updatedCount} updated).`,
    );
  } finally {
    await disconnectProductDB();
  }
};

void main().catch((error) => {
  console.error("Product seed failed.", error);
  process.exit(1);
});
