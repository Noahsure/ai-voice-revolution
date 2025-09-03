-- Add campaign script and knowledge base columns
ALTER TABLE campaigns 
ADD COLUMN custom_script TEXT,
ADD COLUMN custom_knowledge_base TEXT;