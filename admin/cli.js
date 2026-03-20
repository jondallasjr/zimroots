#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const __dirname = dirname(fileURLToPath(import.meta.url));

const TABLES = ['users', 'businesses', 'products', 'services', 'events', 'jobs', 'sessions'];
const ENTITY_TABLES = ['businesses', 'products', 'services', 'events', 'jobs'];

const [command, ...args] = process.argv.slice(2);

const commands = {
  async list() {
    const table = args[0];
    if (table && !TABLES.includes(table)) {
      console.log(`Unknown table: ${table}. Options: ${TABLES.join(', ')}`);
      return;
    }

    const tables = table ? [table] : ENTITY_TABLES;

    for (const t of tables) {
      const { data, error } = await supabase
        .from(t)
        .select('id, name, category, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error(`Error fetching ${t}:`, error.message);
        continue;
      }

      console.log(`\n=== ${t.toUpperCase()} (${data.length}) ===`);
      if (data.length === 0) {
        console.log('  (none)');
        continue;
      }
      for (const row of data) {
        console.log(`  ${row.id.slice(0, 8)}  ${row.name || '(unnamed)'}  [${row.category || 'uncategorized'}]`);
      }
    }
  },

  async users() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error.message);
      return;
    }

    console.log(`\n=== USERS (${data.length}) ===`);
    for (const u of data) {
      console.log(`  ${u.id.slice(0, 8)}  ${u.name || '(no name)'}  ${u.phone}  verified=${u.verified}`);
    }
  },

  async remove() {
    const [table, id] = args;
    if (!table || !id) {
      console.log('Usage: npm run admin remove <table> <id>');
      return;
    }
    if (!TABLES.includes(table)) {
      console.log(`Unknown table: ${table}`);
      return;
    }

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error('Error:', error.message);
      return;
    }
    console.log(`Deleted ${id} from ${table}`);
  },

  async sessions() {
    const { data, error } = await supabase
      .from('sessions')
      .select('phone, state, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error:', error.message);
      return;
    }

    console.log(`\n=== SESSIONS (${data.length}) ===`);
    for (const s of data) {
      console.log(`  ${s.phone}  state=${s.state}  last=${s.updated_at}`);
    }
  },

  async stats() {
    console.log('\n=== ZIMROOTS STATS ===');
    for (const t of [...ENTITY_TABLES, 'users', 'sessions']) {
      const { count, error } = await supabase
        .from(t)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ${t}: error`);
      } else {
        console.log(`  ${t}: ${count}`);
      }
    }
  },

  async help() {
    console.log(`
ZimRoots Admin CLI

Commands:
  list [table]          List entities (default: all entity tables)
  users                 List all registered users
  sessions              List active sessions
  stats                 Show entity counts
  remove <table> <id>   Delete an entity by ID
  help                  Show this help
    `);
  },
};

const fn = commands[command];
if (!fn) {
  console.log(`Unknown command: ${command || '(none)'}`);
  commands.help();
} else {
  fn().catch(console.error);
}
