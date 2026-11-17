-- Luma Emprende · todo en uno para la cuenta priscilapinillo400@gmail.com
-- Antes: esa cuenta tiene que haber entrado al menos una vez a Luma (así existe su perfil y su prueba).
-- Correr por partes en Supabase → SQL Editor.

-- 1) Acceso completo (Premium) por 5 años
update subscriptions
set status = 'active', plan = 'premium',
    current_period_ends_at = now() + interval '5 years'
where user_id = (select id from auth.users where email = 'priscilapinillo400@gmail.com');

-- 2) Slug de la cuenta + skin Luma Emprende
update therapist_profiles
set slug = 'postres-en-vaso', template = 'emprende', template_modo = 'claro'
where user_id = (select id from auth.users where email = 'priscilapinillo400@gmail.com');

-- 3) Pasar el curso de la cuenta oficial a la nueva
update courses
set user_id = (select id from auth.users where email = 'priscilapinillo400@gmail.com')
where slug = 'postres-en-vaso'
  and user_id = (select id from auth.users where email = 'priscilapinillo78@gmail.com');

-- CONTROL: tiene que dar premium/active, slug postres-en-vaso, template emprende, y el curso a nombre de la cuenta nueva
select s.plan, s.status, p.slug, p.template, c.titulo as curso, c.slug as curso_slug
from auth.users u
left join subscriptions s on s.user_id = u.id
left join therapist_profiles p on p.user_id = u.id
left join courses c on c.user_id = u.id
where u.email = 'priscilapinillo400@gmail.com';
