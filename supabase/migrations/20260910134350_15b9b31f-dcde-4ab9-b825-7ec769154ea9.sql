CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  start_lat double precision NOT NULL,
  start_lng double precision NOT NULL,
  start_label text,
  end_lat double precision,
  end_lng double precision,
  end_label text,
  distance_m double precision NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trips insert own" ON public.trips FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_staff(auth.uid()));
CREATE POLICY "trips update own" ON public.trips FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "trips read self or admin" ON public.trips FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "trips delete self or admin" ON public.trips FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trips_touch BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.trip_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.trip_positions TO authenticated;
GRANT ALL ON public.trip_positions TO service_role;
ALTER TABLE public.trip_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip positions insert own" ON public.trip_positions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));
CREATE POLICY "trip positions read self or admin" ON public.trip_positions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "trip positions delete self or admin" ON public.trip_positions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE INDEX trip_positions_trip_idx ON public.trip_positions (trip_id, recorded_at);
CREATE INDEX trips_user_started_idx ON public.trips (user_id, started_at DESC);