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
INSERT INTO public.calc_services(name,kind,flat_price) VALUES ('1 Row Tape Weft Removal','flat',50),('1.5 Row Tape Weft Removal','flat',60),('2 Rows Tape Weft Removal','flat',70),('2.5 Tape Weft Removal','flat',80),('30 min Express Reset / head spa','flat',99),('60 Min Signature Sanctuary /head spa','flat',189),('90 Min All The Love/ head spa','flat',249),('Bang Trim','flat',15),('Beard Trim Add On','flat',25),('Bridal Hair Trial (90 min)','flat',150),('Bridal Makeup on location','flat',110),('Bridal Makeup trial run','flat',95),('Bridal party Blowout finish in house','flat',100),('Bridal party Blowout finish TRAVEL','flat',115),('Bridal Party Hair Trial','flat',105),('Bridal Party Makeup Application in house','flat',80),('Bridal Party Makeup Application TRAVEL','flat',95),('Bridal Party Special Style extra hair or extentions in house','flat',175),('Bridal Party Special Style extra hair or extentions TRAVEL','flat',200),('Bridal Party Special Style in house','flat',125),('Bridal Party Special Style TRAVEL','flat',145),('Bride updo style hair in house','flat',200),('Bride updo style hair TRAVEL','flat',225),('Bride Makeup in house','flat',110),('Bride Makeup TRAVEL','flat',125),('Chin Wax','flat',15),('Cluster Lash or strip Application','flat',20),('condition treatment add on','flat',30),('Extra Styling','flat',15),('Eye Patches','flat',10),('Eyebrow Tint','flat',18),('Eyebrow Wax','flat',18),('Flower gilr hair TRAVEL','flat',70),('Flower girl hair in house','flat',60),('flower girl light make up in house','flat',40),('flower girl light make up TRAVEL','flat',45),('Emergency Treatment Add-On','flat',50),('Full Row Tape Weft','flat',108),('Half Row Tape Weft','flat',73),('Hand Tied Full Row','flat',133),('Butterfly Weft Full Row','flat',133),('Hand Tied Half Row','flat',88),('Butterfly Weft Half Row','flat',88),('Hand Tied Removal','flat',45),('Butterfly Weft Removal','flat',45),('Hand Tied Slide Up','flat',58),('Butterfly Weft Slide Up','flat',58),('KCMAX Straightener','flat',358),('Kiss of Sunshine/ bleach around front hair line bump','flat',30),('Lip Wax','flat',18),('Luxury Herbal Infusion Add On','flat',30),('Luxury Ultimate Add-On','flat',30),('V-Light Extensions','flat',10),('Split Ender Add-On','flat',36),('Spray-on 24hr Straightener','flat',144),('Tinsel','flat',3),
UPDATE public.calc_services SET unit='per section' WHERE name='V-Light Extensions';
('Blowout & Style','level',NULL,NULL),('All over color','level',NULL,NULL),('Blowout','level',NULL,NULL),('Dimensional Blonding Refresh / Express Blonding','level',NULL,NULL),('Dimensional Blonding Refresh','level',NULL,NULL),('Express Blonding','level',NULL,NULL),('Express Cut','level',NULL,NULL),('Express Specialty Cut','level',NULL,NULL),('Full Head Blonding','level',NULL,NULL),('Full Head Specialty Blonding','level',NULL,NULL),('Haircut','level',NULL,NULL),('Partial Head Blonding','level',NULL,NULL),('Partial Head Specialty Blonding','level',NULL,NULL),('Root Retouch / Express Blonding','level',NULL,NULL),('Root Retouch / Full Head Blonding','level',NULL,NULL),('Root Retouch / Full Head Specialty Blonding','level',NULL,NULL),('Root Retouch / Partial Head Blonding','level',NULL,NULL),('Root Retouch / Partial Head Specialty Blonding','level',NULL,NULL),('Root Retouch','level',NULL,NULL),('Root Toner / Tap','level',NULL,NULL),('Speciality Cut','level',NULL,NULL),('Toner / Color Pull Through','level',NULL,NULL),('Up-do Special Style prom only/ prom dry style','level',NULL,NULL);
INSERT INTO public.calc_service_level_prices(service_id,level,price) SELECT s.id,(ARRAY['New Artist','Designer 1','Designer 2','Advanced 1','Advanced 2','Master 1','Master 2','Legacy'])[u.o],u.p FROM (VALUES ('Blowout & Style','{44,50,56,60,66,73,83,44}'),('All over color','{87,93,102,112,121,126,138,144}'),('Blowout','{30,39,44,52,54,56,60,70}'),('Dimensional Blonding Refresh / Express Blonding','{94,139,144,159,169,179,189,210}'),('Dimensional Blonding Refresh','{58,68,78,88,98,108,118,123}'),('Express Blonding','{68,78,84,98,108,114,124,127}'),('Express Cut','{37,43,48,53,58,63,68,73}'),('Express Specialty Cut','{52,58,68,73,93,98,118,123}'),('Full Head Blonding','{109,133,154,169,189,196,210,219}'),('Full Head Specialty Blonding','{154,183,209,229,254,266,285,299}'),('Haircut','{45,61,73,78,83,93,103,113}'),('Partial Head Blonding','{94,108,124,134,148,154,167,174}'),('Partial Head Specialty Blonding','{134,158,179,194,213,224,242,254}'),('Root Retouch / Express Blonding','{126,142,156,180,194,203,217,227}'),('Root Retouch / Full Head Blonding','{167,197,226,251,275,285,303,319}'),('Root Retouch / Full Head Specialty Blonding','{212,247,281,311,340,355,378,399}'),('Root Retouch / Partial Head Blonding','{152,172,196,216,234,243,269,274}'),('Root Retouch / Partial Head Specialty Blonding','{192,222,251,276,299,313,335,354}'),('Root Retouch','{58,64,72,82,86,89,93,100}'),('Root Toner / Tap','{11,17,17,27,28,36,40,40}'),('Speciality Cut','{60,83,98,103,123,133,168,175}'),('Toner / Color Pull Through','{29,29,32,32,35,35,39,39}'),('Up-do Special Style prom only/ prom dry style','{98,70,80,87,95,115,135,300}')) v(n,a) JOIN public.calc_services s ON s.name=v.n CROSS JOIN LATERAL unnest(v.a::numeric[]) WITH ORDINALITY u(p,o);
WITH v(line,name,size,w) AS (VALUES ('Keratin Healing Oil','Shampoo','50 ml',7.50),('Keratin Healing Oil','Shampoo','300 ml',22.25),('Keratin Healing Oil','Shampoo','950 ml',47.50),('Keratin Healing Oil','Conditioner','50 ml',7.50),('Keratin Healing Oil','Conditioner','250 ml',22.25),('Keratin Healing Oil','Conditioner','950 ml',47.50),('Keratin Healing Oil','Hair Treatment','10 ml',5.25),('Keratin Healing Oil','Hair Treatment','50 ml',17.50),('Keratin Healing Oil','Hair Treatment','100 ml',24.25),('Keratin Healing Oil','Hair Treatment','185 ml',39.25),('Keratin Healing Oil','Rapid Bond Reconstructor','100 ml',24.25),('Keratin Healing Oil','Bond Smoothing Styler','140 ml',16.50),('Keratin Healing Oil','Finishing Spray','60 ml',7.25),('Keratin Healing Oil','Finishing Spray','350 ml',16.50),('Keratin Healing Oil','Hair Masque','210 ml',24.25),('Keratin Healing Oil','Brush Thru Hair Spray','350 ml',16.50),('Keratin Healing Oil','Smooth Down Spray','100 ml',16.50),('Keratin Healing Oil','Bounce Up Spray','180 ml',16.50),('Keratin Healing Oil','Shine Spray','100 ml',17.00),('Keratin Healing Oil','Defrizz Cream','140 ml',16.50),('Healing ColorCare','ColorCare Shampoo','50 ml',6.50),('Healing ColorCare','ColorCare Shampoo','300 ml',17.25),('Healing ColorCare','ColorCare Shampoo','950 ml',34.75),('Healing ColorCare','ColorCare Conditioner','50 ml',6.50),('Healing ColorCare','ColorCare Conditioner','250 ml',17.25),('Healing ColorCare','ColorCare Conditioner','950 ml',34.75),('Healing ColorCare','Clarifying Shampoo','300 ml',17.25),('Healing ColorCare','Trauma Treatment','50 ml',8.00),('Healing ColorCare','Trauma Treatment','150 ml',17.50),('Healing ColorCare','Trauma Treatment','950 ml',34.75),('Healing ColorCare','Hair Masque','200 ml',18.00),('Healing ColorCare','Purple Shampoo','300 ml',17.25),('Healing ColorCare','Purple Shampoo','950 ml',34.75),('Scalp Therapy','Balancing Shampoo','300 ml',17.25),('Scalp Therapy','Balancing Shampoo','950 ml',34.75),('Scalp Therapy','Balancing Conditioner','250 ml',17.25),('Scalp Therapy','Balancing Conditioner','950 ml',34.75),('Scalp Therapy','Balancing Pre-Wash Oil','100 ml',24.25),('Scalp Therapy','Balancing Leave-On Serum','100 ml',23.25),('Scalp Therapy','Stimulating Shampoo','300 ml',17.25),('Scalp Therapy','Stimulating Conditioner','250 ml',17.25),('Scalp Therapy','Stimulating Treatment','100 ml',17.50),('Healing Curls','Shampoo','50 ml',6.50),('Healing Curls','Shampoo','300 ml',17.25),('Healing Curls','Shampoo','950 ml',36.25),('Healing Curls','Conditioner','50 ml',6.63),('Healing Curls','Conditioner','250 ml',17.56),('Healing Curls','Conditioner','950 ml',36.25),('Healing Curls','Curl Therapy','160 ml',16.50),('Healing Curls','Curl Whirl Cream','125 ml',15.50),('Healing Curls','Curl Boost','177 ml',15.50),('Healing Curls','Curl Flex','200 ml',15.50),('Healing Curls','Butter Whip','50 ml',6.50),('Healing Curls','Butter Whip','168 ml',15.50),('Healing Moisture','Shampoo','50 ml',6.63),('Healing Moisture','Shampoo','300 ml',17.25),('Healing Moisture','Shampoo','950 ml',34.75),('Healing Moisture','Conditioner','50 ml',6.50),('Healing Moisture','Conditioner','250 ml',17.25),('Healing Moisture','Conditioner','950 ml',34.75),('Healing Moisture','Moisturizing Mist','30 ml',7.00),('Healing Moisture','Moisturizing Mist','200 ml',17.50),('Healing Moisture','Hair Masque','200 ml',18.00),('Healing Strength','Shampoo','300 ml',17.25),('Healing Strength','Shampoo','950 ml',34.75),('Healing Strength','Conditioner','250 ml',17.25),('Healing Strength','Conditioner','950 ml',34.75),('Healing Strength','Silk Serum','30 ml',10.50),('Healing Strength','Silk Serum','100 ml',22.25),('Healing Strength','Detangler Primer','30 ml',7.00),('Healing Strength','Detangler Primer','200 ml',17.50),('Healing Volume','Shampoo','300 ml',17.25),('Healing Volume','Shampoo','950 ml',34.75),('Healing Volume','Conditioner','250 ml',17.25),('Healing Volume','Conditioner','950 ml',34.75),('Healing Volume','Thickening Treatment','100 ml',17.50),('Healing Volume','Zero Weight Gel','200 ml',13.50),('Healing Volume','Root Effects','200 ml',14.25),('Healing Volume','Final Effects','350 ml',14.25),('Healing Style','Air Paste','167 ml',14.25),('Healing Style','Beach Spray','100 ml',14.25),('Healing Style','Clay','100 ml',14.25),('Healing Style','Design Foam','200 ml',14.25),('Healing Style','Dramatic F/X','350 ml',14.25),('Healing Style','Dry Shampoo','242 ml',14.25),('Healing Style','Dry Texture Spray','300 ml',14.25),('Healing Style','Foundation Mousse','150 ml',14.25),('Healing Style','Mega Gel','200 ml',11.75),('Healing Style','Molding Paste','175 ml',14.25),('Healing Style','Sculpting Paste','100 ml',14.25),('Healing Style','Taffy','75 ml',14.25),('Healing Style','Texture Cream','125 ml',14.25),('Healing Style','Thermal Defense Spray','200 ml',14.25),('Healing Style','Smoother Balm','50 ml',5.25),('Healing Style','Smoother Balm','200 ml',14.25)), p AS (INSERT INTO public.calc_products(brand,line,name,size,retail_price,status) SELECT 'L''ANZA',line,name,size,ceil(w*2),'approved' FROM v RETURNING id,line,name,size) INSERT INTO public.calc_product_costs(product_id,wholesale_cost) SELECT p.id,v.w FROM p JOIN v USING(line,name,size);
