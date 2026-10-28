// Auth identities retain approval authors. Credentials, invitations and messages stay local.
export default {
 product: 'proposals/platter',
 includeTables: ['oa_operators','oa_bootstrap','oa_invitation_cancellations'],
 excludeTables: ['p_archive_dispatch_lock','p_archive_authority','p_archive_job_authority','p_rest_keys','p_webhook_secrets','p_tracking_challenges','p_tracking_transport','p_tracking_authority','p_collaboration_authority','p_collaboration_routes','p_replaced_links','p_watcher_authority','p_sms_authority','p_crm_outcome_authority','p_sender_notice_authority','p_notification_outbox','p_notification_authority','p_notification_route_authority','p_reminder_authority','p_reminder_transport','p_mail_reply_keys','p_mailbox_oauth','p_member_invitations','p_connection_secrets','p_withdrawn_links','p_question_reply_keys','p_expiry_clock','p_guard','p_agent_keys','p_shares','p_mail','p_delivery_events','p_bounce_notice_transport','p_report_mail','rer_mail_event_receipts','rer_mail_event_states'],
 requiredConfiguration: ['OWNER_EMAIL','SESSION_SECRET','SETUP_TOKEN','AUTH_ORIGIN','MAIL_PROVIDER','MAIL_FROM'],
}
