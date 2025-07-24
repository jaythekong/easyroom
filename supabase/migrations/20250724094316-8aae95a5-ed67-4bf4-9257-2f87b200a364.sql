-- Remove user sapayanysokry@gmail.com completely from the system
-- User ID: cc732805-5920-4b88-b5d9-989982a17294

-- First, delete the unauthorized access attempt log
DELETE FROM public.unauthorized_access_attempts 
WHERE user_id = 'cc732805-5920-4b88-b5d9-989982a17294';

-- Then, delete the user from the auth system
DELETE FROM auth.users 
WHERE id = 'cc732805-5920-4b88-b5d9-989982a17294';