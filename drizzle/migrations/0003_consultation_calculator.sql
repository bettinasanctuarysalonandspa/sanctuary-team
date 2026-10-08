-- Consultation Calculator: owner-approved pricing data, private chat history, audit log.
CREATE OR REPLACE FUNCTION public.is_sanctuary_employee() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'employee') OR public.has_role(auth.uid(), 'admin')
$$;
CREATE OR REPLACE FUNCTION public.is_sanctuary_owner() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;
REVOKE ALL ON FUNCTION public.is_sanctuary_employee() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_sanctuary_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_sanctuary_employee() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sanctuary_owner() TO authenticated;

CREATE TABLE public.calc_stylists (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  level text NOT NULL CHECK (level IN ('New Artist','Designer 1','Designer 2','Advanced 1','Advanced 2','Master 1','Master 2','Legacy')),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.calc_services (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('flat','level')),
  flat_price numeric(10,2) CHECK (flat_price IS NULL OR flat_price >= 0),
  unit text,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.calc_service_level_prices (
  service_id bigint NOT NULL REFERENCES public.calc_services(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('New Artist','Designer 1','Designer 2','Advanced 1','Advanced 2','Master 1','Master 2','Legacy')),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  effective_date date NOT NULL DEFAULT current_date,
  PRIMARY KEY (service_id, level)
);
CREATE TABLE public.calc_products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  brand text NOT NULL,
  line text,
  name text NOT NULL,
  size text,
  retail_price numeric(10,2) CHECK (retail_price IS NULL OR retail_price >= 0),
  status text NOT NULL DEFAULT 'needs_review' CHECK (status IN ('approved','needs_review')),
  notes text,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.calc_product_costs (
  product_id bigint PRIMARY KEY REFERENCES public.calc_products(id) ON DELETE CASCADE,
  wholesale_cost numeric(10,2) NOT NULL CHECK (wholesale_cost >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.calc_extension_hair (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  length_in integer NOT NULL CHECK (length_in > 0),
  price_per_section numeric(10,2) NOT NULL CHECK (price_per_section >= 0),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (name, length_in)
);
CREATE TABLE public.calc_extension_costs (
  hair_id bigint PRIMARY KEY REFERENCES public.calc_extension_hair(id) ON DELETE CASCADE,
  full_weft_cost numeric(10,2) NOT NULL,
  cost_per_section numeric(10,2) NOT NULL
);
CREATE TABLE public.calc_aliases (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phrase text NOT NULL UNIQUE,
  meaning text NOT NULL
);
CREATE TABLE public.calc_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor uuid,
  table_name text NOT NULL,
  action text NOT NULL,
  old_row jsonb,
  new_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.consultation_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 20000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consultation_messages_user_idx ON public.consultation_messages(user_id, id);

GRANT SELECT ON public.calc_stylists, public.calc_services, public.calc_service_level_prices, public.calc_products, public.calc_extension_hair, public.calc_aliases TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.calc_stylists, public.calc_services, public.calc_service_level_prices, public.calc_products, public.calc_extension_hair, public.calc_aliases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calc_product_costs, public.calc_extension_costs TO authenticated;
GRANT SELECT ON public.calc_audit_log TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.consultation_messages TO authenticated;
GRANT ALL ON public.calc_stylists, public.calc_services, public.calc_service_level_prices, public.calc_products, public.calc_product_costs, public.calc_extension_hair, public.calc_extension_costs, public.calc_aliases, public.calc_audit_log, public.consultation_messages TO service_role;

ALTER TABLE public.calc_stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_service_level_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_extension_hair ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_extension_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['calc_stylists','calc_services','calc_service_level_prices','calc_products','calc_extension_hair','calc_aliases'] LOOP
    EXECUTE format('CREATE POLICY "Employees read" ON public.%I FOR SELECT TO authenticated USING (public.is_sanctuary_employee())', t);
    EXECUTE format('CREATE POLICY "Owner inserts" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_sanctuary_owner())', t);
    EXECUTE format('CREATE POLICY "Owner updates" ON public.%I FOR UPDATE TO authenticated USING (public.is_sanctuary_owner()) WITH CHECK (public.is_sanctuary_owner())', t);
    EXECUTE format('CREATE POLICY "Owner deletes" ON public.%I FOR DELETE TO authenticated USING (public.is_sanctuary_owner())', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['calc_product_costs','calc_extension_costs'] LOOP
    EXECUTE format('CREATE POLICY "Owner only" ON public.%I FOR ALL TO authenticated USING (public.is_sanctuary_owner()) WITH CHECK (public.is_sanctuary_owner())', t);
  END LOOP;
END $$;
CREATE POLICY "Owner reads audit" ON public.calc_audit_log FOR SELECT TO authenticated USING (public.is_sanctuary_owner());
CREATE POLICY "Read own messages" ON public.consultation_messages FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_sanctuary_employee());
CREATE POLICY "Write own messages" ON public.consultation_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_sanctuary_employee());
CREATE POLICY "Clear own messages" ON public.consultation_messages FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_sanctuary_employee());

-- L'ANZA shelf retail follows the owner rule: CEILING(wholesale x 2) to the whole dollar.
CREATE OR REPLACE FUNCTION public.calc_apply_lanza_retail() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.calc_products SET retail_price = ceil(NEW.wholesale_cost * 2), status = 'approved', updated_at = now()
   WHERE id = NEW.product_id AND brand = 'L''ANZA';
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER calc_product_costs_retail BEFORE INSERT OR UPDATE OF wholesale_cost ON public.calc_product_costs
  FOR EACH ROW EXECUTE FUNCTION public.calc_apply_lanza_retail();

CREATE OR REPLACE FUNCTION public.calc_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.calc_audit_log(actor, table_name, action, old_row, new_row)
  VALUES (auth.uid(), TG_TABLE_NAME, TG_OP,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['calc_stylists','calc_services','calc_service_level_prices','calc_products','calc_product_costs','calc_extension_hair','calc_extension_costs','calc_aliases'] LOOP
    EXECUTE format('CREATE TRIGGER %I AFTER UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.calc_audit()', t || '_audit', t);
  END LOOP;
END $$;

INSERT INTO public.calc_aliases(phrase, meaning) VALUES
('Full balayage or full babylights','Full Head Specialty Blonding'),
('Partial balayage or partial babylights','Partial Head Specialty Blonding'),
('Root retouch + full balayage/babylights','Root Retouch / Full Head Specialty Blonding'),
('Root retouch + partial balayage/babylights','Root Retouch / Partial Head Specialty Blonding'),
('Shadow root','Root Toner / Tap'),
('Root color','Root Retouch'),
('Blowout vs Blowout & Style','Blowout = NO hot tools. Blowout & Style = includes hot tools.');
WITH h AS (INSERT INTO public.calc_extension_hair(name, length_in, price_per_section) VALUES ('Butterfly Weft',14,105.00),('Butterfly Weft',16,115.00) RETURNING id, length_in)
INSERT INTO public.calc_extension_costs(hair_id, full_weft_cost, cost_per_section)
SELECT id, CASE length_in WHEN 14 THEN 100.00 ELSE 110.00 END, CASE length_in WHEN 14 THEN 33.33 ELSE 36.67 END FROM h;
INSERT INTO public.calc_stylists(name,level) VALUES ('Ava Beachum','Advanced 1'),('Bettina Howard','Legacy'),('Hana Lail','Designer 1'),('Jewel Cruz','Advanced 2'),('Kaitlyn Queer','New Artist'),('Kat Starnes','Master 1'),('Katie King','Advanced 2'),('Logan Norman','New Artist'),('Miranda Ferguson','Master 1');
INSERT INTO public.calc_services(name,kind,flat_price,unit) VALUES ('1 Row Tape Weft Removal','flat',50,NULL),('1.5 Row Tape Weft Removal','flat',60,NULL),('2 Rows Tape Weft Removal','flat',70,NULL),('2.5 Tape Weft Removal','flat',80,NULL),('30 min Express Reset / head spa','flat',99,NULL),('60 Min Signature Sanctuary /head spa','flat',189,NULL),('90 Min All The Love/ head spa','flat',249,NULL),('Bang Trim','flat',15,NULL),('Beard Trim Add On','flat',25,NULL),('Bridal Hair Trial (90 min)','flat',150,NULL),('Bridal Makeup on location','flat',110,NULL),('Bridal Makeup trial run','flat',95,NULL),('Bridal party Blowout finish in house','flat',100,NULL),('Bridal party Blowout finish TRAVEL','flat',115,NULL),('Bridal Party Hair Trial','flat',105,NULL),('Bridal Party Makeup Application in house','flat',80,NULL),('Bridal Party Makeup Application TRAVEL','flat',95,NULL),('Bridal Party Special Style extra hair or extentions in house','flat',175,NULL),('Bridal Party Special Style extra hair or extentions TRAVEL','flat',200,NULL),('Bridal Party Special Style in house','flat',125,NULL),('Bridal Party Special Style TRAVEL','flat',145,NULL),('Bride updo style hair in house','flat',200,NULL),('Bride updo style hair TRAVEL','flat',225,NULL),('Bride Makeup in house','flat',110,NULL),('Bride Makeup TRAVEL','flat',125,NULL),('Chin Wax','flat',15,NULL),('Cluster Lash or strip Application','flat',20,NULL),('condition treatment add on','flat',30,NULL),('Extra Styling','flat',15,NULL),('Eye Patches','flat',10,NULL),('Eyebrow Tint','flat',18,NULL),('Eyebrow Wax','flat',18,NULL),('Flower gilr hair TRAVEL','flat',70,NULL),('Flower girl hair in house','flat',60,NULL),('flower girl light make up in house','flat',40,NULL),('flower girl light make up TRAVEL','flat',45,NULL),('Emergency Treatment Add-On','flat',50,NULL),('Full Row Tape Weft','flat',108,NULL),('Half Row Tape Weft','flat',73,NULL),('Hand Tied Full Row','flat',133,NULL),('Butterfly Weft Full Row','flat',133,NULL),('Hand Tied Half Row','flat',88,NULL),('Butterfly Weft Half Row','flat',88,NULL),('Hand Tied Removal','flat',45,NULL),('Butterfly Weft Removal','flat',45,NULL),('Hand Tied Slide Up','flat',58,NULL),('Butterfly Weft Slide Up','flat',58,NULL),('KCMAX Straightener','flat',358,NULL),('Kiss of Sunshine/ bleach around front hair line bump','flat',30,NULL),('Lip Wax','flat',18,NULL),('Luxury Herbal Infusion Add On','flat',30,NULL),('Luxury Ultimate Add-On','flat',30,NULL),('V-Light Extensions','flat',10,'per section'),('Split Ender Add-On','flat',36,NULL),('Spray-on 24hr Straightener','flat',144,NULL),('Tinsel','flat',3,NULL),
('Blowout & Style','level',NULL,NULL),('All over color','level',NULL,NULL),('Blowout','level',NULL,NULL),('Dimensional Blonding Refresh / Express Blonding','level',NULL,NULL),('Dimensional Blonding Refresh','level',NULL,NULL),('Express Blonding','level',NULL,NULL),('Express Cut','level',NULL,NULL),('Express Specialty Cut','level',NULL,NULL),('Full Head Blonding','level',NULL,NULL),('Full Head Specialty Blonding','level',NULL,NULL),('Haircut','level',NULL,NULL),('Partial Head Blonding','level',NULL,NULL),('Partial Head Specialty Blonding','level',NULL,NULL),('Root Retouch / Express Blonding','level',NULL,NULL),('Root Retouch / Full Head Blonding','level',NULL,NULL),('Root Retouch / Full Head Specialty Blonding','level',NULL,NULL),('Root Retouch / Partial Head Blonding','level',NULL,NULL),('Root Retouch / Partial Head Specialty Blonding','level',NULL,NULL),('Root Retouch','level',NULL,NULL),('Root Toner / Tap','level',NULL,NULL),('Speciality Cut','level',NULL,NULL),('Toner / Color Pull Through','level',NULL,NULL),('Up-do Special Style prom only/ prom dry style','level',NULL,NULL);
INSERT INTO public.calc_products(brand,line,name,size,retail_price,status,notes) VALUES ('Davines','Naturaltech','CALMING Shampoo','250 ml',40,'approved','sensitive scalp'),('Davines','Naturaltech','CALMING Superactive','100 ml',47,'approved','soothing scalp serum'),('Davines','Naturaltech','ENERGIZING Shampoo','250 ml',40,'approved','fragile/thinning hair'),('Davines','Naturaltech','ENERGIZING Superactive','100 ml',66,'approved','androgenetic hair-loss support'),('Davines','Naturaltech','NOURISHING Shampoo','250 ml',40,'approved','dehydrated scalp/dry damaged hair'),('Davines','Naturaltech','NOURISHING Vegetarian Miracle Conditioner','250 ml',46,'approved','dry/brittle hair - corrected price'),('Davines','Naturaltech','NOURISHING Vegetarian Miracle Mask','250 ml',50,'approved','extra moisture for dry/brittle hair'),('Davines','Naturaltech','ENERGIZING Gel','150 ml',40,'approved','stimulating gel'),('Davines','Naturaltech','ENERGIZING Thickening Tonic','100 ml',50,'approved','thickening/body'),('Davines','Naturaltech','Detoxifying Scrub Shampoo','250 ml',40,'approved','scalp exfoliation/buildup'),('Pasta & Love',NULL,'Strong Hold Molding Clay',NULL,NULL,'needs_review','Approved recommendation for strong matte hold/texture. Price not yet confirmed.');
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT s.id,v.l,v.p FROM (VALUES ('Blowout & Style','New Artist',44),('Blowout & Style','Designer 1',50),('Blowout & Style','Designer 2',56),('Blowout & Style','Advanced 1',60),('Blowout & Style','Advanced 2',66),('Blowout & Style','Master 1',73),('Blowout & Style','Master 2',83),('Blowout & Style','Legacy',44),('All over color','New Artist',87),('All over color','Designer 1',93),('All over color','Designer 2',102),('All over color','Advanced 1',112),('All over color','Advanced 2',121),('All over color','Master 1',126),('All over color','Master 2',138),('All over color','Legacy',144),('Blowout','New Artist',30),('Blowout','Designer 1',39),('Blowout','Designer 2',44),('Blowout','Advanced 1',52),('Blowout','Advanced 2',54),('Blowout','Master 1',56),('Blowout','Master 2',60),('Blowout','Legacy',70),('Dimensional Blonding Refresh / Express Blonding','New Artist',94),('Dimensional Blonding Refresh / Express Blonding','Designer 1',139),('Dimensional Blonding Refresh / Express Blonding','Designer 2',144),('Dimensional Blonding Refresh / Express Blonding','Advanced 1',159),('Dimensional Blonding Refresh / Express Blonding','Advanced 2',169),('Dimensional Blonding Refresh / Express Blonding','Master 1',179),('Dimensional Blonding Refresh / Express Blonding','Master 2',189),('Dimensional Blonding Refresh / Express Blonding','Legacy',210),('Dimensional Blonding Refresh','New Artist',58),('Dimensional Blonding Refresh','Designer 1',68),('Dimensional Blonding Refresh','Designer 2',78),('Dimensional Blonding Refresh','Advanced 1',88),('Dimensional Blonding Refresh','Advanced 2',98),('Dimensional Blonding Refresh','Master 1',108),('Dimensional Blonding Refresh','Master 2',118),('Dimensional Blonding Refresh','Legacy',123),('Express Blonding','New Artist',68),('Express Blonding','Designer 1',78),('Express Blonding','Designer 2',84),('Express Blonding','Advanced 1',98),('Express Blonding','Advanced 2',108),('Express Blonding','Master 1',114),('Express Blonding','Master 2',124),('Express Blonding','Legacy',127),('Express Cut','New Artist',37),('Express Cut','Designer 1',43),('Express Cut','Designer 2',48),('Express Cut','Advanced 1',53),('Express Cut','Advanced 2',58),('Express Cut','Master 1',63),('Express Cut','Master 2',68),('Express Cut','Legacy',73),('Express Specialty Cut','New Artist',52),('Express Specialty Cut','Designer 1',58),('Express Specialty Cut','Designer 2',68),('Express Specialty Cut','Advanced 1',73),('Express Specialty Cut','Advanced 2',93),('Express Specialty Cut','Master 1',98),('Express Specialty Cut','Master 2',118),('Express Specialty Cut','Legacy',123),('Full Head Blonding','New Artist',109),('Full Head Blonding','Designer 1',133),('Full Head Blonding','Designer 2',154),('Full Head Blonding','Advanced 1',169),('Full Head Blonding','Advanced 2',189),('Full Head Blonding','Master 1',196),('Full Head Blonding','Master 2',210),('Full Head Blonding','Legacy',219),('Full Head Specialty Blonding','New Artist',154),('Full Head Specialty Blonding','Designer 1',183),('Full Head Specialty Blonding','Designer 2',209),('Full Head Specialty Blonding','Advanced 1',229),('Full Head Specialty Blonding','Advanced 2',254),('Full Head Specialty Blonding','Master 1',266),('Full Head Specialty Blonding','Master 2',285),('Full Head Specialty Blonding','Legacy',299),('Haircut','New Artist',45),('Haircut','Designer 1',61),('Haircut','Designer 2',73),('Haircut','Advanced 1',78),('Haircut','Advanced 2',83),('Haircut','Master 1',93),('Haircut','Master 2',103),('Haircut','Legacy',113),('Partial Head Blonding','New Artist',94),('Partial Head Blonding','Designer 1',108),('Partial Head Blonding','Designer 2',124),('Partial Head Blonding','Advanced 1',134),('Partial Head Blonding','Advanced 2',148),('Partial Head Blonding','Master 1',154),('Partial Head Blonding','Master 2',167),('Partial Head Blonding','Legacy',174),('Partial Head Specialty Blonding','New Artist',134),('Partial Head Specialty Blonding','Designer 1',158),('Partial Head Specialty Blonding','Designer 2',179),('Partial Head Specialty Blonding','Advanced 1',194),('Partial Head Specialty Blonding','Advanced 2',213),('Partial Head Specialty Blonding','Master 1',224),('Partial Head Specialty Blonding','Master 2',242),('Partial Head Specialty Blonding','Legacy',254),('Root Retouch / Express Blonding','New Artist',126),('Root Retouch / Express Blonding','Designer 1',142),('Root Retouch / Express Blonding','Designer 2',156),('Root Retouch / Express Blonding','Advanced 1',180),('Root Retouch / Express Blonding','Advanced 2',194),('Root Retouch / Express Blonding','Master 1',203),('Root Retouch / Express Blonding','Master 2',217),('Root Retouch / Express Blonding','Legacy',227),('Root Retouch / Full Head Blonding','New Artist',167),('Root Retouch / Full Head Blonding','Designer 1',197),('Root Retouch / Full Head Blonding','Designer 2',226),('Root Retouch / Full Head Blonding','Advanced 1',251),('Root Retouch / Full Head Blonding','Advanced 2',275),('Root Retouch / Full Head Blonding','Master 1',285),('Root Retouch / Full Head Blonding','Master 2',303),('Root Retouch / Full Head Blonding','Legacy',319),('Root Retouch / Full Head Specialty Blonding','New Artist',212),('Root Retouch / Full Head Specialty Blonding','Designer 1',247),('Root Retouch / Full Head Specialty Blonding','Designer 2',281),('Root Retouch / Full Head Specialty Blonding','Advanced 1',311),('Root Retouch / Full Head Specialty Blonding','Advanced 2',340),('Root Retouch / Full Head Specialty Blonding','Master 1',355),('Root Retouch / Full Head Specialty Blonding','Master 2',378),('Root Retouch / Full Head Specialty Blonding','Legacy',399),('Root Retouch / Partial Head Blonding','New Artist',152),('Root Retouch / Partial Head Blonding','Designer 1',172),('Root Retouch / Partial Head Blonding','Designer 2',196),('Root Retouch / Partial Head Blonding','Advanced 1',216),('Root Retouch / Partial Head Blonding','Advanced 2',234),('Root Retouch / Partial Head Blonding','Master 1',243),('Root Retouch / Partial Head Blonding','Master 2',269),('Root Retouch / Partial Head Blonding','Legacy',274),('Root Retouch / Partial Head Specialty Blonding','New Artist',192),('Root Retouch / Partial Head Specialty Blonding','Designer 1',222),('Root Retouch / Partial Head Specialty Blonding','Designer 2',251),('Root Retouch / Partial Head Specialty Blonding','Advanced 1',276),('Root Retouch / Partial Head Specialty Blonding','Advanced 2',299),('Root Retouch / Partial Head Specialty Blonding','Master 1',313),('Root Retouch / Partial Head Specialty Blonding','Master 2',335),('Root Retouch / Partial Head Specialty Blonding','Legacy',354),('Root Retouch','New Artist',58),('Root Retouch','Designer 1',64),('Root Retouch','Designer 2',72),('Root Retouch','Advanced 1',82),('Root Retouch','Advanced 2',86),('Root Retouch','Master 1',89),('Root Retouch','Master 2',93),('Root Retouch','Legacy',100),('Root Toner / Tap','New Artist',11),('Root Toner / Tap','Designer 1',17),('Root Toner / Tap','Designer 2',17),('Root Toner / Tap','Advanced 1',27),('Root Toner / Tap','Advanced 2',28),('Root Toner / Tap','Master 1',36),('Root Toner / Tap','Master 2',40),('Root Toner / Tap','Legacy',40),('Speciality Cut','New Artist',60),('Speciality Cut','Designer 1',83),('Speciality Cut','Designer 2',98),('Speciality Cut','Advanced 1',103),('Speciality Cut','Advanced 2',123),('Speciality Cut','Master 1',133),('Speciality Cut','Master 2',168),('Speciality Cut','Legacy',175),('Toner / Color Pull Through','New Artist',29),('Toner / Color Pull Through','Designer 1',29),('Toner / Color Pull Through','Designer 2',32),('Toner / Color Pull Through','Advanced 1',32),('Toner / Color Pull Through','Advanced 2',35),('Toner / Color Pull Through','Master 1',35),('Toner / Color Pull Through','Master 2',39),('Toner / Color Pull Through','Legacy',39),('Up-do Special Style prom only/ prom dry style','New Artist',98),('Up-do Special Style prom only/ prom dry style','Designer 1',70),('Up-do Special Style prom only/ prom dry style','Designer 2',80),('Up-do Special Style prom only/ prom dry style','Advanced 1',87),('Up-do Special Style prom only/ prom dry style','Advanced 2',95),('Up-do Special Style prom only/ prom dry style','Master 1',115),('Up-do Special Style prom only/ prom dry style','Master 2',135),('Up-do Special Style prom only/ prom dry style','Legacy',300)) v(n,l,p) JOIN public.calc_services s ON s.name=v.n;
WITH v(line,name,size,w) AS (VALUES ('Keratin Healing Oil','Shampoo','50 ml',7.50),('Keratin Healing Oil','Shampoo','300 ml',22.25),('Keratin Healing Oil','Shampoo','950 ml',47.50),('Keratin Healing Oil','Conditioner','50 ml',7.50),('Keratin Healing Oil','Conditioner','250 ml',22.25),('Keratin Healing Oil','Conditioner','950 ml',47.50),('Keratin Healing Oil','Hair Treatment','10 ml',5.25),('Keratin Healing Oil','Hair Treatment','50 ml',17.50),('Keratin Healing Oil','Hair Treatment','100 ml',24.25),('Keratin Healing Oil','Hair Treatment','185 ml',39.25),('Keratin Healing Oil','Rapid Bond Reconstructor','100 ml',24.25),('Keratin Healing Oil','Bond Smoothing Styler','140 ml',16.50),('Keratin Healing Oil','Finishing Spray','60 ml',7.25),('Keratin Healing Oil','Finishing Spray','350 ml',16.50),('Keratin Healing Oil','Hair Masque','210 ml',24.25),('Keratin Healing Oil','Brush Thru Hair Spray','350 ml',16.50),('Keratin Healing Oil','Smooth Down Spray','100 ml',16.50),('Keratin Healing Oil','Bounce Up Spray','180 ml',16.50),('Keratin Healing Oil','Shine Spray','100 ml',17.00),('Keratin Healing Oil','Defrizz Cream','140 ml',16.50),('Healing ColorCare','ColorCare Shampoo','50 ml',6.50),('Healing ColorCare','ColorCare Shampoo','300 ml',17.25),('Healing ColorCare','ColorCare Shampoo','950 ml',34.75),('Healing ColorCare','ColorCare Conditioner','50 ml',6.50),('Healing ColorCare','ColorCare Conditioner','250 ml',17.25),('Healing ColorCare','ColorCare Conditioner','950 ml',34.75),('Healing ColorCare','Clarifying Shampoo','300 ml',17.25),('Healing ColorCare','Trauma Treatment','50 ml',8.00),('Healing ColorCare','Trauma Treatment','150 ml',17.50),('Healing ColorCare','Trauma Treatment','950 ml',34.75),('Healing ColorCare','Hair Masque','200 ml',18.00),('Healing ColorCare','Purple Shampoo','300 ml',17.25),('Healing ColorCare','Purple Shampoo','950 ml',34.75),('Scalp Therapy','Balancing Shampoo','300 ml',17.25),('Scalp Therapy','Balancing Shampoo','950 ml',34.75),('Scalp Therapy','Balancing Conditioner','250 ml',17.25),('Scalp Therapy','Balancing Conditioner','950 ml',34.75),('Scalp Therapy','Balancing Pre-Wash Oil','100 ml',24.25),('Scalp Therapy','Balancing Leave-On Serum','100 ml',23.25),('Scalp Therapy','Stimulating Shampoo','300 ml',17.25),('Scalp Therapy','Stimulating Conditioner','250 ml',17.25),('Scalp Therapy','Stimulating Treatment','100 ml',17.50),('Healing Curls','Shampoo','50 ml',6.50),('Healing Curls','Shampoo','300 ml',17.25),('Healing Curls','Shampoo','950 ml',36.25),('Healing Curls','Conditioner','50 ml',6.63),('Healing Curls','Conditioner','250 ml',17.56),('Healing Curls','Conditioner','950 ml',36.25),('Healing Curls','Curl Therapy','160 ml',16.50),('Healing Curls','Curl Whirl Cream','125 ml',15.50),('Healing Curls','Curl Boost','177 ml',15.50),('Healing Curls','Curl Flex','200 ml',15.50),('Healing Curls','Butter Whip','50 ml',6.50),('Healing Curls','Butter Whip','168 ml',15.50),('Healing Moisture','Shampoo','50 ml',6.63),('Healing Moisture','Shampoo','300 ml',17.25),('Healing Moisture','Shampoo','950 ml',34.75),('Healing Moisture','Conditioner','50 ml',6.50),('Healing Moisture','Conditioner','250 ml',17.25),('Healing Moisture','Conditioner','950 ml',34.75),('Healing Moisture','Moisturizing Mist','30 ml',7.00),('Healing Moisture','Moisturizing Mist','200 ml',17.50),('Healing Moisture','Hair Masque','200 ml',18.00),('Healing Strength','Shampoo','300 ml',17.25),('Healing Strength','Shampoo','950 ml',34.75),('Healing Strength','Conditioner','250 ml',17.25),('Healing Strength','Conditioner','950 ml',34.75),('Healing Strength','Silk Serum','30 ml',10.50),('Healing Strength','Silk Serum','100 ml',22.25),('Healing Strength','Detangler Primer','30 ml',7.00),('Healing Strength','Detangler Primer','200 ml',17.50),('Healing Volume','Shampoo','300 ml',17.25),('Healing Volume','Shampoo','950 ml',34.75),('Healing Volume','Conditioner','250 ml',17.25),('Healing Volume','Conditioner','950 ml',34.75),('Healing Volume','Thickening Treatment','100 ml',17.50),('Healing Volume','Zero Weight Gel','200 ml',13.50),('Healing Volume','Root Effects','200 ml',14.25),('Healing Volume','Final Effects','350 ml',14.25),('Healing Style','Air Paste','167 ml',14.25),('Healing Style','Beach Spray','100 ml',14.25),('Healing Style','Clay','100 ml',14.25),('Healing Style','Design Foam','200 ml',14.25),('Healing Style','Dramatic F/X','350 ml',14.25),('Healing Style','Dry Shampoo','242 ml',14.25),('Healing Style','Dry Texture Spray','300 ml',14.25),('Healing Style','Foundation Mousse','150 ml',14.25),('Healing Style','Mega Gel','200 ml',11.75),('Healing Style','Molding Paste','175 ml',14.25),('Healing Style','Sculpting Paste','100 ml',14.25),('Healing Style','Taffy','75 ml',14.25),('Healing Style','Texture Cream','125 ml',14.25),('Healing Style','Thermal Defense Spray','200 ml',14.25),('Healing Style','Smoother Balm','50 ml',5.25),('Healing Style','Smoother Balm','200 ml',14.25)), p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) SELECT 'L''ANZA',line,name,size,ceil(w*2),'approved' FROM v RETURNING id,line,name,size) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT p.id,v.w FROM p JOIN v USING(line,name,size);
