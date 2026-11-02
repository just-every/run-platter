import { ownerDeploy } from '@runeditrun/rer/deploy';
import { RerError } from '@runeditrun/rer/errors';

// Platter's first hosting door explains the account inputs before the shared
// runner builds or contacts Cloudflare. Secret custody stays with that runner.
export function platterDeploy(lifecycle) {
 const deploy = ownerDeploy('deploy.json', lifecycle);
 return Object.assign(async context => {
  const { options, root } = context;
  const credentials = [
   ['CLOUDFLARE_ACCOUNT_ID', 'selects your Cloudflare account; copy its account ID from the dashboard'],
   ['CLOUDFLARE_API_TOKEN', 'authorizes Worker uploads and D1 creation and migrations; create an account token with Workers Scripts: Edit and D1: Edit'],
  ];
  const absent = credentials.filter(([name]) => !process.env[name]?.trim());
  if (absent.length) {
   // Account access is a required Platter preflight, including dry runs. Keep
   // it distinct from the runner's deferrable owner/setup missing_input error.
   throw new RerError('hosting_inputs_missing', [
    'Hosting preflight stopped: Cloudflare account access is missing. Nothing was built or uploaded.',
    ...absent.map(([name, purpose]) => `  - ${name} — ${purpose}.`),
    'For a new installation, also prepare:',
    '  - MAIL_PROVIDER and MAIL_FROM in deploy.json: choose your mail service and a real sender on its verified domain.',
    '  - MAIL_API_KEY in your private environment: authorizes sign-in and proposal email through that service.',
    '  - OWNER_EMAIL: identifies the first owner; rer uses the local setup owner when omitted.',
    '  - SESSION_SECRET and SETUP_TOKEN — protect sessions and the initial owner claim; rer generates these when omitted and keeps deployment secrets privately.',
    'Keep credentials in your environment or an owned mode-0600 file passed with --env-file. Never commit them.',
    'Next, supply the missing account inputs and run rer deploy --dry-run again with the same --environment and --env-file options.',
   ].join('\n'), 3);
  }
  return deploy(context);
 }, { declaration: deploy.declaration, managesHostedOwner: deploy.managesHostedOwner });
}
