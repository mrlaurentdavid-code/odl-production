-- Table pour stocker les scores de Tetris
CREATE TABLE IF NOT EXISTS public.tetris_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  lines INTEGER NOT NULL,
  duration_seconds INTEGER, -- Durée de la partie en secondes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index pour accélérer les requêtes
  CONSTRAINT tetris_scores_score_positive CHECK (score >= 0),
  CONSTRAINT tetris_scores_level_positive CHECK (level >= 1),
  CONSTRAINT tetris_scores_lines_positive CHECK (lines >= 0)
);

-- Index pour optimiser les requêtes de classement
CREATE INDEX idx_tetris_scores_user_id ON public.tetris_scores(user_id);
CREATE INDEX idx_tetris_scores_score_desc ON public.tetris_scores(score DESC);
CREATE INDEX idx_tetris_scores_created_at ON public.tetris_scores(created_at DESC);

-- RLS Policies
ALTER TABLE public.tetris_scores ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir tous les scores (pour le classement)
CREATE POLICY "Anyone can view all scores"
  ON public.tetris_scores
  FOR SELECT
  USING (true);

-- Les utilisateurs ne peuvent insérer que leurs propres scores
CREATE POLICY "Users can insert their own scores"
  ON public.tetris_scores
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs ne peuvent pas modifier les scores
-- (pas de policy UPDATE)

-- Les utilisateurs ne peuvent pas supprimer de scores
-- (pas de policy DELETE, sauf admin si nécessaire)

-- Vue pour le classement des meilleurs scores
CREATE OR REPLACE VIEW public.tetris_leaderboard AS
SELECT
  ts.id,
  ts.score,
  ts.level,
  ts.lines,
  ts.created_at,
  p.first_name,
  p.last_name,
  p.email,
  ROW_NUMBER() OVER (ORDER BY ts.score DESC, ts.created_at ASC) as rank
FROM public.tetris_scores ts
JOIN public.profiles p ON ts.user_id = p.id
ORDER BY ts.score DESC, ts.created_at ASC
LIMIT 100;

-- Fonction pour obtenir les stats d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_tetris_stats(p_user_id UUID)
RETURNS TABLE (
  total_games BIGINT,
  best_score INTEGER,
  best_level INTEGER,
  total_lines BIGINT,
  average_score NUMERIC,
  user_rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_games,
    MAX(score) as best_score,
    MAX(level) as best_level,
    SUM(lines)::BIGINT as total_lines,
    ROUND(AVG(score), 0)::NUMERIC as average_score,
    (
      SELECT COUNT(DISTINCT ts2.user_id)::INTEGER + 1
      FROM public.tetris_scores ts2
      WHERE ts2.score > COALESCE(MAX(ts1.score), 0)
    ) as user_rank
  FROM public.tetris_scores ts1
  WHERE ts1.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.tetris_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tetris_stats(UUID) TO authenticated;
