/**
 * Copia buckets e arquivos do Supabase atual para o Supabase novo.
 *
 * Uso:
 *   export SOURCE_SUPABASE_URL=... SOURCE_SERVICE_KEY=...
 *   export TARGET_SUPABASE_URL=... TARGET_SERVICE_KEY=...
 *   bun docs/migracao-supabase-externo/scripts/copy-storage.ts
 */
import { createClient } from '@supabase/supabase-js';

const need = (n: string) => {
  const v = process.env[n];
  if (!v) throw new Error(`Variavel de ambiente ausente: ${n}`);
  return v;
};

const source = createClient(need('SOURCE_SUPABASE_URL'), need('SOURCE_SERVICE_KEY'), {
  auth: { persistSession: false },
});
const target = createClient(need('TARGET_SUPABASE_URL'), need('TARGET_SERVICE_KEY'), {
  auth: { persistSession: false },
});

async function listAll(bucket: string, prefix = ''): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await source.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...(await listAll(bucket, path)));
      else out.push(path);
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

async function main() {
  const { data: buckets, error } = await source.storage.listBuckets();
  if (error) throw error;

  for (const b of buckets ?? []) {
    console.log(`\n== bucket: ${b.name} (public=${b.public})`);
    const created = await target.storage.createBucket(b.name, {
      public: b.public,
      fileSizeLimit: b.file_size_limit ?? undefined,
      allowedMimeTypes: b.allowed_mime_types ?? undefined,
    });
    if (created.error && !/exists/i.test(created.error.message)) {
      console.warn(`  aviso ao criar bucket: ${created.error.message}`);
    }

    const paths = await listAll(b.name);
    console.log(`  ${paths.length} arquivos`);

    let ok = 0;
    let fail = 0;
    for (const path of paths) {
      const dl = await source.storage.from(b.name).download(path);
      if (dl.error || !dl.data) {
        console.warn(`  [erro download] ${path}: ${dl.error?.message}`);
        fail++;
        continue;
      }
      const buf = new Uint8Array(await dl.data.arrayBuffer());
      const up = await target.storage.from(b.name).upload(path, buf, {
        upsert: true,
        contentType: dl.data.type || 'application/octet-stream',
      });
      if (up.error) {
        console.warn(`  [erro upload] ${path}: ${up.error.message}`);
        fail++;
      } else {
        ok++;
      }
    }
    console.log(`  copiados: ${ok} | falhas: ${fail}`);
  }
  console.log('\nConcluido.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
