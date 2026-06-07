-- Update robot settings for the scheduled PlayStation 5 Pro auction
-- The user mentioned 300 minutes, so we set stop_after_minutes to 300
-- We also enable inner_dispute for robot vs robot action
UPDATE public.robot_settings
SET 
    stop_after_minutes = 300,
    dispute_duration_minutes = 300,
    inner_dispute_enabled = true,
    active = true
WHERE auction_id = 'c8edcc50-9477-4db4-9020-defb60ba082b';
