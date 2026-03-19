#!/usr/bin/env node
import process from 'node:process';
import admin from 'firebase-admin';

const VALID_ROLES = new Set(['admin', 'editor', 'viewer']);

function printUsage() {
  console.log(`
Usage:
  node scripts/set-firebase-role.mjs --uid <UID> --role <admin|editor|viewer>
  node scripts/set-firebase-role.mjs --email <EMAIL> --role <admin|editor|viewer>

Examples:
  node scripts/set-firebase-role.mjs --uid abc123 --role admin
  node scripts/set-firebase-role.mjs --email user@example.com --role editor

Environment:
  GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account-json>
  FIREBASE_PROJECT_ID=<optional-project-id>
`);
}

function parseArgs(argv) {
  const args = { uid: '', email: '', role: '', help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token === '--uid') {
      args.uid = String(argv[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (token === '--email') {
      args.email = String(argv[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (token === '--role') {
      args.role = String(argv[i + 1] || '').trim().toLowerCase();
      i += 1;
      continue;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const hasUid = Boolean(args.uid);
  const hasEmail = Boolean(args.email);
  if ((!hasUid && !hasEmail) || (hasUid && hasEmail)) {
    console.error('Error: اختر --uid أو --email فقط.');
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!VALID_ROLES.has(args.role)) {
    console.error('Error: role غير صالح. القيم المسموحة: admin | editor | viewer');
    process.exitCode = 1;
    return;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || undefined
    });
  }

  const auth = admin.auth();
  const userRecord = hasUid
    ? await auth.getUser(args.uid)
    : await auth.getUserByEmail(args.email);

  const nextClaims = {
    ...(userRecord.customClaims || {}),
    role: args.role
  };

  await auth.setCustomUserClaims(userRecord.uid, nextClaims);
  console.log(`Success: role="${args.role}" set for uid="${userRecord.uid}" email="${userRecord.email || ''}"`);
}

main().catch((error) => {
  console.error('Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
