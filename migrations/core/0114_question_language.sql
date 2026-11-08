-- Preserve the language actually shown for new questions; historical values stay unknown.
ALTER TABLE p_questions ADD COLUMN language TEXT CHECK(language IN ('en','es','fr','de','pt'));
