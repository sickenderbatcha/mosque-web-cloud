
-- Locations table with the 5 predefined locations
CREATE TABLE public.asset_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_tamil text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view locations" ON public.asset_locations FOR SELECT USING (true);
CREATE POLICY "Admins can manage locations" ON public.asset_locations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed the 5 locations
INSERT INTO public.asset_locations (name, name_tamil) VALUES
  ('Tholukai Medai Pallivasal', 'தொழுகை மேடை பள்ளிவாசல்'),
  ('Jummah Pallivasal', 'ஜும்மா பள்ளிவாசல்'),
  ('Marriage Hall', 'திருமண மண்டபம்'),
  ('Library', 'நூலகம்'),
  ('Office', 'அலுவலகம்');

-- Assets table
CREATE TABLE public.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  serial_number text,
  location_id uuid NOT NULL REFERENCES public.asset_locations(id) ON DELETE RESTRICT,
  purchase_date date,
  value numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  warranty_expiry_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assets" ON public.assets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view assets" ON public.assets FOR SELECT USING (auth.uid() IS NOT NULL);

-- Maintenance log table
CREATE TABLE public.asset_maintenance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL,
  description text,
  cost numeric DEFAULT 0,
  performed_by text,
  maintenance_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage maintenance logs" ON public.asset_maintenance_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view maintenance logs" ON public.asset_maintenance_logs FOR SELECT USING (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX idx_assets_location ON public.assets(location_id);
CREATE INDEX idx_assets_category ON public.assets(category);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_maintenance_asset ON public.asset_maintenance_logs(asset_id);

-- Triggers for updated_at
CREATE TRIGGER update_asset_locations_updated_at BEFORE UPDATE ON public.asset_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
