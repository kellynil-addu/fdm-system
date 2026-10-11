-- Migration: Add civil_status, spouse_name, and gender to public.client
ALTER TABLE public.client
    ADD COLUMN IF NOT EXISTS civil_status VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NULL;

DO $$ BEGIN
    ALTER TABLE public.client
        ADD CONSTRAINT check_client_civil_status
        CHECK (civil_status IS NULL OR civil_status IN ('Single', 'Married', 'Widowed', 'Separated'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.client
        ADD CONSTRAINT check_client_gender
        CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.client.civil_status IS 'Civil status of the client (Single, Married, Widowed, Separated).';
COMMENT ON COLUMN public.client.spouse_name IS 'Full legal name of spouse. Mandatory when civil_status is Married.';
COMMENT ON COLUMN public.client.gender IS 'Gender identity of the client (Male, Female, Other), used for legal document pronoun inference.';
