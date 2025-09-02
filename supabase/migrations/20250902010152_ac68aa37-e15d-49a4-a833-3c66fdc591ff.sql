-- Fix security issue by setting proper search_path on the function
CREATE OR REPLACE FUNCTION calculate_next_retry(retry_count integer)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Exponential backoff: 1min, 2min, 4min, 8min, 16min, max 30min
  RETURN now() + (LEAST(POWER(2, retry_count), 30) || ' minutes')::interval;
END;
$$;