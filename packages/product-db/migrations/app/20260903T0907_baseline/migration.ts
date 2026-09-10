#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a8000c3ac164e1ad0f87693c340a4cf4ce40daae9027550506caa9530a9a1d28/contract';
import endContract from '../../snapshots/a8000c3ac164e1ad0f87693c340a4cf4ce40daae9027550506caa9530a9a1d28/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'OutboxStatus',
        members: ['PENDING', 'PUBLISHING', 'PUBLISHED'],
      }),
      this.createTable({
        schema: 'public',
        table: 'Category',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Category_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Product',
        columns: [
          col('categorySlug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('colors', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('images', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('shortDescription', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sizes', 'text[]', { notNull: true, codecRef: { codecId: 'pg/text@1', many: true } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Product_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProductOutboxEvent',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('availableAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('eventKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('leaseUntil', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('payload', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('publishedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('status', '"OutboxStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'OutboxStatus' } },
          }),
          col('topic', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'ProductOutboxEvent_pkey' })],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Category',
        constraint: 'Category_slug_key',
        columns: ['slug'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Product',
        index: 'Product_categorySlug_createdAt_idx',
        columns: ['categorySlug', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Product',
        index: 'Product_categorySlug_price_idx',
        columns: ['categorySlug', 'price'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Product',
        index: 'Product_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Product',
        index: 'Product_price_idx',
        columns: ['price'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductOutboxEvent',
        index: 'ProductOutboxEvent_status_availableAt_createdAt_idx',
        columns: ['status', 'availableAt', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Product',
        foreignKey: {
          name: 'Product_categorySlug_fkey',
          columns: ['categorySlug'],
          references: { schema: 'public', table: 'Category', columns: ['slug'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
