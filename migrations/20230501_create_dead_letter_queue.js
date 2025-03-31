/**
 * Migration to create the Dead Letter Queue table for storing failed events
 */
export async function up(knex) {
  return knex.schema.createTable('event_dead_letter_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.text('event_id').notNullable();
    table.text('event_name').notNullable();
    table.jsonb('event_data').notNullable().defaultTo('{}');
    table.text('handler_id').notNullable();
    table.text('error_message').notNullable();
    table.text('error_stack');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('last_retry_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.text('status').defaultTo('pending');
    table.text('correlation_id');
    table.text('source_id');
    
    // Add indexes for common queries
    table.index('event_name');
    table.index('status');
    table.index('created_at');
  });
}

/**
 * Migration to drop the Dead Letter Queue table
 */
export async function down(knex) {
  return knex.schema.dropTable('event_dead_letter_queue');
} 