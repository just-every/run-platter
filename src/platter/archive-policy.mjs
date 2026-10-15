// Auth identities retain approval authors. Credentials, invitations and messages stay local.
export default {
 product: 'proposals/platter',
 includeTables: ['oa_operators','oa_bootstrap','oa_invitation_cancellations'],
 excludeTables: ['p_guard','p_agent_keys','p_shares','p_mail'],
 requiredConfiguration: ['OWNER_EMAIL','SESSION_SECRET','SETUP_TOKEN','AUTH_ORIGIN','MAIL_PROVIDER','MAIL_FROM'],
}
