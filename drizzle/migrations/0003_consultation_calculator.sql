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
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',44),('Designer 1',50),('Designer 2',56),('Advanced 1',60),('Advanced 2',66),('Master 1',73),('Master 2',83),('Legacy',44)) v(level,price) WHERE s.name='Blowout & Style';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',87),('Designer 1',93),('Designer 2',102),('Advanced 1',112),('Advanced 2',121),('Master 1',126),('Master 2',138),('Legacy',144)) v(level,price) WHERE s.name='All over color';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',30),('Designer 1',39),('Designer 2',44),('Advanced 1',52),('Advanced 2',54),('Master 1',56),('Master 2',60),('Legacy',70)) v(level,price) WHERE s.name='Blowout';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',94),('Designer 1',139),('Designer 2',144),('Advanced 1',159),('Advanced 2',169),('Master 1',179),('Master 2',189),('Legacy',210)) v(level,price) WHERE s.name='Dimensional Blonding Refresh / Express Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',58),('Designer 1',68),('Designer 2',78),('Advanced 1',88),('Advanced 2',98),('Master 1',108),('Master 2',118),('Legacy',123)) v(level,price) WHERE s.name='Dimensional Blonding Refresh';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',68),('Designer 1',78),('Designer 2',84),('Advanced 1',98),('Advanced 2',108),('Master 1',114),('Master 2',124),('Legacy',127)) v(level,price) WHERE s.name='Express Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',37),('Designer 1',43),('Designer 2',48),('Advanced 1',53),('Advanced 2',58),('Master 1',63),('Master 2',68),('Legacy',73)) v(level,price) WHERE s.name='Express Cut';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',52),('Designer 1',58),('Designer 2',68),('Advanced 1',73),('Advanced 2',93),('Master 1',98),('Master 2',118),('Legacy',123)) v(level,price) WHERE s.name='Express Specialty Cut';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',109),('Designer 1',133),('Designer 2',154),('Advanced 1',169),('Advanced 2',189),('Master 1',196),('Master 2',210),('Legacy',219)) v(level,price) WHERE s.name='Full Head Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',154),('Designer 1',183),('Designer 2',209),('Advanced 1',229),('Advanced 2',254),('Master 1',266),('Master 2',285),('Legacy',299)) v(level,price) WHERE s.name='Full Head Specialty Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',45),('Designer 1',61),('Designer 2',73),('Advanced 1',78),('Advanced 2',83),('Master 1',93),('Master 2',103),('Legacy',113)) v(level,price) WHERE s.name='Haircut';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',94),('Designer 1',108),('Designer 2',124),('Advanced 1',134),('Advanced 2',148),('Master 1',154),('Master 2',167),('Legacy',174)) v(level,price) WHERE s.name='Partial Head Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',134),('Designer 1',158),('Designer 2',179),('Advanced 1',194),('Advanced 2',213),('Master 1',224),('Master 2',242),('Legacy',254)) v(level,price) WHERE s.name='Partial Head Specialty Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',126),('Designer 1',142),('Designer 2',156),('Advanced 1',180),('Advanced 2',194),('Master 1',203),('Master 2',217),('Legacy',227)) v(level,price) WHERE s.name='Root Retouch / Express Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',167),('Designer 1',197),('Designer 2',226),('Advanced 1',251),('Advanced 2',275),('Master 1',285),('Master 2',303),('Legacy',319)) v(level,price) WHERE s.name='Root Retouch / Full Head Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',212),('Designer 1',247),('Designer 2',281),('Advanced 1',311),('Advanced 2',340),('Master 1',355),('Master 2',378),('Legacy',399)) v(level,price) WHERE s.name='Root Retouch / Full Head Specialty Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',152),('Designer 1',172),('Designer 2',196),('Advanced 1',216),('Advanced 2',234),('Master 1',243),('Master 2',269),('Legacy',274)) v(level,price) WHERE s.name='Root Retouch / Partial Head Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',192),('Designer 1',222),('Designer 2',251),('Advanced 1',276),('Advanced 2',299),('Master 1',313),('Master 2',335),('Legacy',354)) v(level,price) WHERE s.name='Root Retouch / Partial Head Specialty Blonding';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',58),('Designer 1',64),('Designer 2',72),('Advanced 1',82),('Advanced 2',86),('Master 1',89),('Master 2',93),('Legacy',100)) v(level,price) WHERE s.name='Root Retouch';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',11),('Designer 1',17),('Designer 2',17),('Advanced 1',27),('Advanced 2',28),('Master 1',36),('Master 2',40),('Legacy',40)) v(level,price) WHERE s.name='Root Toner / Tap';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',60),('Designer 1',83),('Designer 2',98),('Advanced 1',103),('Advanced 2',123),('Master 1',133),('Master 2',168),('Legacy',175)) v(level,price) WHERE s.name='Speciality Cut';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',29),('Designer 1',29),('Designer 2',32),('Advanced 1',32),('Advanced 2',35),('Master 1',35),('Master 2',39),('Legacy',39)) v(level,price) WHERE s.name='Toner / Color Pull Through';
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT id,v.level,v.price FROM public.calc_services s, (VALUES ('New Artist',98),('Designer 1',70),('Designer 2',80),('Advanced 1',87),('Advanced 2',95),('Master 1',115),('Master 2',135),('Legacy',300)) v(level,price) WHERE s.name='Up-do Special Style prom only/ prom dry style';
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Shampoo','50 ml',15.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,7.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Shampoo','300 ml',45.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,22.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Shampoo','950 ml',95.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,47.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Conditioner','50 ml',15.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,7.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Conditioner','250 ml',45.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,22.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Conditioner','950 ml',95.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,47.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Hair Treatment','10 ml',11.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,5.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Hair Treatment','50 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Hair Treatment','100 ml',49.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,24.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Hair Treatment','185 ml',79.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,39.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Rapid Bond Reconstructor','100 ml',49.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,24.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Bond Smoothing Styler','140 ml',33.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,16.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Finishing Spray','60 ml',15.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,7.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Finishing Spray','350 ml',33.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,16.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Hair Masque','210 ml',49.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,24.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Brush Thru Hair Spray','350 ml',33.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,16.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Smooth Down Spray','100 ml',33.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,16.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Bounce Up Spray','180 ml',33.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,16.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Shine Spray','100 ml',34.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.00 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Keratin Healing Oil','Defrizz Cream','140 ml',33.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,16.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','ColorCare Shampoo','50 ml',13.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,6.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','ColorCare Shampoo','300 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','ColorCare Shampoo','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','ColorCare Conditioner','50 ml',13.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,6.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','ColorCare Conditioner','250 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','ColorCare Conditioner','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','Clarifying Shampoo','300 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','Trauma Treatment','50 ml',16.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,8.00 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','Trauma Treatment','150 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','Trauma Treatment','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','Hair Masque','200 ml',36.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,18.00 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','Purple Shampoo','300 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing ColorCare','Purple Shampoo','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Scalp Therapy','Balancing Shampoo','300 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Scalp Therapy','Balancing Shampoo','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Scalp Therapy','Balancing Conditioner','250 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Scalp Therapy','Balancing Conditioner','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Scalp Therapy','Balancing Pre-Wash Oil','100 ml',49.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,24.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Scalp Therapy','Balancing Leave-On Serum','100 ml',47.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,23.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Scalp Therapy','Stimulating Shampoo','300 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Scalp Therapy','Stimulating Conditioner','250 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Scalp Therapy','Stimulating Treatment','100 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Shampoo','50 ml',13.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,6.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Shampoo','300 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Shampoo','950 ml',73.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,36.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Conditioner','50 ml',14.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,6.63 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Conditioner','250 ml',36.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.56 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Conditioner','950 ml',73.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,36.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Curl Therapy','160 ml',33.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,16.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Curl Whirl Cream','125 ml',31.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,15.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Curl Boost','177 ml',31.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,15.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Curl Flex','200 ml',31.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,15.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Butter Whip','50 ml',13.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,6.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Curls','Butter Whip','168 ml',31.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,15.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Moisture','Shampoo','50 ml',14.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,6.63 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Moisture','Shampoo','300 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Moisture','Shampoo','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Moisture','Conditioner','50 ml',13.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,6.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Moisture','Conditioner','250 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Moisture','Conditioner','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Moisture','Moisturizing Mist','30 ml',14.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,7.00 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Moisture','Moisturizing Mist','200 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Moisture','Hair Masque','200 ml',36.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,18.00 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Strength','Shampoo','300 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Strength','Shampoo','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Strength','Conditioner','250 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Strength','Conditioner','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Strength','Silk Serum','30 ml',21.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,10.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Strength','Silk Serum','100 ml',45.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,22.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Strength','Detangler Primer','30 ml',14.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,7.00 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Strength','Detangler Primer','200 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Volume','Shampoo','300 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Volume','Shampoo','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Volume','Conditioner','250 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Volume','Conditioner','950 ml',70.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,34.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Volume','Thickening Treatment','100 ml',35.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,17.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Volume','Zero Weight Gel','200 ml',27.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,13.50 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Volume','Root Effects','200 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Volume','Final Effects','350 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Air Paste','167 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Beach Spray','100 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Clay','100 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Design Foam','200 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Dramatic F/X','350 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Dry Shampoo','242 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Dry Texture Spray','300 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Foundation Mousse','150 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Mega Gel','200 ml',24.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,11.75 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Molding Paste','175 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Sculpting Paste','100 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Taffy','75 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Texture Cream','125 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Thermal Defense Spray','200 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Smoother Balm','50 ml',11.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,5.25 FROM p;
WITH p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) VALUES ('L''ANZA','Healing Style','Smoother Balm','200 ml',29.00,'approved') RETURNING id) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT id,14.25 FROM p;
INSERT INTO public.calc_products(brand,line,name,size,retail_price,status,notes) VALUES ('Davines','Naturaltech','CALMING Shampoo','250 ml',40,'approved','sensitive scalp'),('Davines','Naturaltech','CALMING Superactive','100 ml',47,'approved','soothing scalp serum'),('Davines','Naturaltech','ENERGIZING Shampoo','250 ml',40,'approved','fragile/thinning hair'),('Davines','Naturaltech','ENERGIZING Superactive','100 ml',66,'approved','androgenetic hair-loss support'),('Davines','Naturaltech','NOURISHING Shampoo','250 ml',40,'approved','dehydrated scalp/dry damaged hair'),('Davines','Naturaltech','NOURISHING Vegetarian Miracle Conditioner','250 ml',46,'approved','dry/brittle hair - corrected price'),('Davines','Naturaltech','NOURISHING Vegetarian Miracle Mask','250 ml',50,'approved','extra moisture for dry/brittle hair'),('Davines','Naturaltech','ENERGIZING Gel','150 ml',40,'approved','stimulating gel'),('Davines','Naturaltech','ENERGIZING Thickening Tonic','100 ml',50,'approved','thickening/body'),('Davines','Naturaltech','Detoxifying Scrub Shampoo','250 ml',40,'approved','scalp exfoliation/buildup'),('Pasta & Love',NULL,'Strong Hold Molding Clay',NULL,NULL,'needs_review','Approved recommendation for strong matte hold/texture. Price not yet confirmed.');
