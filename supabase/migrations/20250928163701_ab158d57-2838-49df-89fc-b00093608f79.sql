-- Add OpenAI and ElevenLabs API key fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN openai_api_key text,
ADD COLUMN elevenlabs_api_key text;