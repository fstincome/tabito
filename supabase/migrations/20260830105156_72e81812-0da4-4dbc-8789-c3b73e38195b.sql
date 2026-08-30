ALTER TABLE public.points
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS municipality text,
  ADD COLUMN IF NOT EXISTS management text,
  ADD COLUMN IF NOT EXISTS access_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS access_notes text,
  ADD COLUMN IF NOT EXISTS dist_dest_km numeric,
  ADD COLUMN IF NOT EXISTS dist_dest_hours numeric,
  ADD COLUMN IF NOT EXISTS dist_buja_km numeric,
  ADD COLUMN IF NOT EXISTS dist_buja_hours numeric,
  ADD COLUMN IF NOT EXISTS site_code text,
  ADD COLUMN IF NOT EXISTS narrative_general text,
  ADD COLUMN IF NOT EXISTS narrative_seasonal text,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS merchant_code text,
  ADD COLUMN IF NOT EXISTS restrictions text,
  ADD COLUMN IF NOT EXISTS weather_sensors boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS local_contacts text;

INSERT INTO public.categories (slug, name, icon, is_live, sort_order) VALUES
  ('natural-site', 'Natural Site', '🏞️', false, 10),
  ('cultural-heritage', 'Tangible Cultural / Historical Property', '🏛️', false, 20),
  ('intangible-heritage', 'Intangible Heritage', '🎭', false, 30),
  ('human-interest-group', 'Human Group of Interest', '🧑🏾‍🤝‍🧑🏾', false, 40)
ON CONFLICT (slug) DO NOTHING;