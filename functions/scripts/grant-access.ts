#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Script interativo para conceder admin
// ---------------------------------------------------------------------------
//
// Uso:
//   cd functions
//   node scripts/grant-access.ts
//
// Requisitos:
//   - Service account key em functions/scripts/service-account.json
//     OU variável GOOGLE_APPLICATION_CREDENTIALS
//     OU `gcloud auth application-default login` configurado
//
// O que faz:
//   1. Pergunta o email do usuário (ou múltiplos separados por vírgula)
//   2. Busca o usuário no Firebase Auth por email
//   3. Aplica o custom claim `admin: true`
//   4. Reporta resultado
// ---------------------------------------------------------------------------

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Inicialização do Firebase Admin SDK
// ---------------------------------------------------------------------------

function initializeFirebaseAdmin(): void {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const serviceAccountPath = resolve(__dirname, 'service-account.json');

  // Prioridade: service-account.json local > env var > ADC (gcloud)
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
    initializeApp({ credential: cert(serviceAccount) });
    console.log('✅ Firebase Admin inicializado com service account local');
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: applicationDefault() });
    console.log('✅ Firebase Admin inicializado com GOOGLE_APPLICATION_CREDENTIALS');
    return;
  }

  // Fallback: Application Default Credentials (gcloud auth application-default login)
  initializeApp({ credential: applicationDefault() });
  console.log('✅ Firebase Admin inicializado com Application Default Credentials');
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ActionResult {
  email: string;
  uid: string;
  admin?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Lógica principal
// ---------------------------------------------------------------------------

async function grantAdminAccess(email: string): Promise<ActionResult> {
  const auth = getAuth();

  // 1. Buscar usuário por email
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch {
    return { email, uid: '', error: `Usuário não encontrado: ${email}` };
  }

  const uid = userRecord.uid;
  const result: ActionResult = { email, uid };

  // 2. Preservar claims existentes e adicionar admin
  try {
    const existingClaims = userRecord.customClaims ?? {};
    await auth.setCustomUserClaims(uid, { ...existingClaims, admin: true });
    result.admin = true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    result.error = msg;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Interface interativa
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Grant Access — Script Master Admin Tool       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // Inicializar Firebase
  try {
    initializeFirebaseAdmin();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erro ao inicializar Firebase Admin:', msg);
    console.error('');
    console.error('Soluções:');
    console.error('  1. Coloque service-account.json em functions/scripts/');
    console.error('  2. Ou defina GOOGLE_APPLICATION_CREDENTIALS no .env');
    console.error('  3. Ou rode: gcloud auth application-default login');
    process.exit(1);
  }

  const rlp = createInterface({ input, output });

  try {
    console.log('Ação: conceder custom claim admin=true');

    // Perguntar emails
    console.log('\nDigite o(s) email(s) do(s) usuário(s).');
    console.log('Para múltiplos, separe por vírgula: user1@email.com, user2@email.com');
    console.log('');

    const emailsInput = await rlp.question('Email(s): ');
    const emails = emailsInput
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      console.error('❌ Nenhum email informado.');
      process.exit(1);
    }

    // Confirmação
    console.log(`\n⚠️  Confirma a operação para ${emails.length} usuário(s)?`);
    for (const email of emails) {
      console.log(`   → ${email}`);
    }
    console.log('');

    const confirm = await rlp.question('Confirmar? (s/N): ');
    if (confirm.trim().toLowerCase() !== 's') {
      console.log('🚫 Operação cancelada.');
      process.exit(0);
    }

    // Executar
    console.log('\n⏳ Processando...\n');

    const results: ActionResult[] = [];
    for (const email of emails) {
      const result = await grantAdminAccess(email);
      results.push(result);
    }

    // Reportar resultados
    console.log('═══════════════════════════════════════════════════');
    console.log('  Resultados');
    console.log('═══════════════════════════════════════════════════\n');

    let successCount = 0;
    let errorCount = 0;

    for (const r of results) {
      if (r.error) {
        console.log(`  ❌ ${r.email}`);
        console.log(`     Erro: ${r.error}`);
        errorCount++;
      } else {
        console.log(`  ✅ ${r.email}`);
        console.log(`     UID: ${r.uid}`);
        if (r.admin) console.log('     → Admin: sim (custom claim)');
        successCount++;
      }
      console.log('');
    }

    console.log('───────────────────────────────────────────────────');
    console.log(`  Total: ${results.length} | Sucesso: ${successCount} | Erro: ${errorCount}`);
    console.log('───────────────────────────────────────────────────');

    if (successCount > 0) {
      console.log('');
      console.log('💡 Nota: Se o usuário já estiver logado, ele precisa fazer');
      console.log('   logout e login novamente para que os claims atualizem.');
      console.log('   Ou chame currentUser.getIdToken(true) no frontend.');
    }
  } finally {
    rlp.close();
  }
}

main().catch((err: unknown) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
