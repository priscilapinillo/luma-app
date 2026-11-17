-- Luma Emprende: activar la skin en TU cuenta de terapeuta.
-- Cambiá TU-SLUG por tu slug real (el que aparece en /p/TU-SLUG/...).

UPDATE therapist_profiles
SET template = 'emprende', template_modo = 'claro'
WHERE slug = 'TU-SLUG';

-- Control: tiene que devolver 1 fila con template = emprende
SELECT slug, template, template_modo
FROM therapist_profiles
WHERE slug = 'TU-SLUG';
