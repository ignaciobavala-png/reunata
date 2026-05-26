CREATE TABLE newsletter_suscriptores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_suscriptores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internos leen newsletter" ON newsletter_suscriptores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol IN ('master', 'empleado')
    )
  );

CREATE POLICY "cualquiera puede suscribirse" ON newsletter_suscriptores
  FOR INSERT WITH CHECK (true);
