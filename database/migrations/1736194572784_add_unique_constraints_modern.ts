import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up() {
    // Agregar constraints únicos usando raw SQL con IF NOT EXISTS para evitar errores
    await this.schema.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'category_products_unique_constraint'
        ) THEN
          ALTER TABLE category_products
          ADD CONSTRAINT category_products_unique_constraint
          UNIQUE (product_id, category_id);
        END IF;
      END $$;
    `)

    await this.schema.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'option_of_products_unique_constraint'
        ) THEN
          ALTER TABLE option_of_products
          ADD CONSTRAINT option_of_products_unique_constraint
          UNIQUE (option_id, product_id);
        END IF;
      END $$;
    `)

    await this.schema.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'variants_unique_constraint'
        ) THEN
          ALTER TABLE variants
          ADD CONSTRAINT variants_unique_constraint
          UNIQUE (id);
        END IF;
      END $$;
    `)

    // Agregar índices para mejorar performance (también con verificación)
    await this.schema.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'category_products_product_id_index'
        ) THEN
          CREATE INDEX category_products_product_id_index ON category_products(product_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'category_products_category_id_index'
        ) THEN
          CREATE INDEX category_products_category_id_index ON category_products(category_id);
        END IF;
      END $$;
    `)

    await this.schema.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'option_of_products_product_id_index'
        ) THEN
          CREATE INDEX option_of_products_product_id_index ON option_of_products(product_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'option_of_products_option_id_index'
        ) THEN
          CREATE INDEX option_of_products_option_id_index ON option_of_products(option_id);
        END IF;
      END $$;
    `)

    await this.schema.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'variants_product_id_index'
        ) THEN
          CREATE INDEX variants_product_id_index ON variants(product_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'variants_sku_index'
        ) THEN
          CREATE INDEX variants_sku_index ON variants(sku);
        END IF;
      END $$;
    `)
  }

  public async down() {
    // Revertir constraints únicos usando raw SQL con IF EXISTS para evitar errores
    await this.schema.raw(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'category_products_unique_constraint'
        ) THEN
          ALTER TABLE category_products
          DROP CONSTRAINT category_products_unique_constraint;
        END IF;
      END $$;
    `)

    await this.schema.raw(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'option_of_products_unique_constraint'
        ) THEN
          ALTER TABLE option_of_products
          DROP CONSTRAINT option_of_products_unique_constraint;
        END IF;
      END $$;
    `)

    await this.schema.raw(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'variants_unique_constraint'
        ) THEN
          ALTER TABLE variants
          DROP CONSTRAINT variants_unique_constraint;
        END IF;
      END $$;
    `)

    // Revertir índices usando raw SQL con IF EXISTS
    await this.schema.raw(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'category_products_product_id_index'
        ) THEN
          DROP INDEX category_products_product_id_index;
        END IF;

        IF EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'category_products_category_id_index'
        ) THEN
          DROP INDEX category_products_category_id_index;
        END IF;
      END $$;
    `)

    await this.schema.raw(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'option_of_products_product_id_index'
        ) THEN
          DROP INDEX option_of_products_product_id_index;
        END IF;

        IF EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'option_of_products_option_id_index'
        ) THEN
          DROP INDEX option_of_products_option_id_index;
        END IF;
      END $$;
    `)

    await this.schema.raw(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'variants_product_id_index'
        ) THEN
          DROP INDEX variants_product_id_index;
        END IF;

        IF EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'variants_sku_index'
        ) THEN
          DROP INDEX variants_sku_index;
        END IF;
      END $$;
    `)
  }
}
