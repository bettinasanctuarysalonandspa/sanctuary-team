ALTER TABLE public.calc_stylists DROP CONSTRAINT calc_stylists_level_check;
ALTER TABLE public.calc_service_level_prices DROP CONSTRAINT calc_service_level_prices_level_check;
UPDATE public.calc_stylists SET level='New Stylist' WHERE level='New Artist';
UPDATE public.calc_service_level_prices SET level='New Stylist' WHERE level='New Artist';
UPDATE public.growth_level_targets SET level='New Stylist' WHERE level='New Artist';
ALTER TABLE public.calc_stylists ADD CONSTRAINT calc_stylists_level_check CHECK (level = ANY (ARRAY['New Stylist','Designer 1','Designer 2','Advanced 1','Advanced 2','Master 1','Master 2','Legacy']));
ALTER TABLE public.calc_service_level_prices ADD CONSTRAINT calc_service_level_prices_level_check CHECK (level = ANY (ARRAY['New Stylist','Designer 1','Designer 2','Advanced 1','Advanced 2','Master 1','Master 2','Legacy']));
ALTER TABLE public.growth_items ADD COLUMN IF NOT EXISTS follow_up_date date;