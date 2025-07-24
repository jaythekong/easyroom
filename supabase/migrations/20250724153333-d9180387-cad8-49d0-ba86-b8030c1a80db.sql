-- Clean up the audit logs blocking jay@joonaak.com deletion
DELETE FROM invitation_audit_log 
WHERE user_id = '15178b91-26c7-45f8-99b1-e26b7efd3616';