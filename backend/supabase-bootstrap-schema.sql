-- Idempotent bootstrap for the current FaceGlow schema snapshot.
create table if not exists users (
    id uuid primary key,
    email character varying(320) not null,
    is_admin boolean not null default false,
    created_at timestamp with time zone not null default now()
);

create unique index if not exists ix_users_email on users (email);

create table if not exists skin_analysis (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    skin_type character varying(100) not null,
    acne_level integer not null default 0,
    sensitivity_level integer not null default 0,
    has_dark_circles boolean not null default false,
    has_spots boolean not null default false,
    created_at timestamp with time zone not null default now()
);

create index if not exists ix_skin_analysis_user_id on skin_analysis(user_id);
create index if not exists ix_skin_analysis_user_id_created_at on skin_analysis(user_id, created_at desc);

alter table analysis
    add column if not exists hydration_score integer not null default 0;

alter table products
    add column if not exists skin_type character varying(100) not null default '',
    add column if not exists skin_types text[] not null default array[]::text[],
    add column if not exists concerns text[] not null default array[]::text[],
    add column if not exists actives text[] not null default array[]::text[],
    add column if not exists period text[] not null default array[]::text[],
    add column if not exists price_range text not null default 'medium',
    add column if not exists price_avg numeric,
    add column if not exists priority integer not null default 100,
    add column if not exists is_active boolean not null default true,
    add column if not exists is_user_product boolean not null default false,
    add column if not exists user_id uuid null,
    add column if not exists created_at timestamp with time zone not null default now();

create index if not exists ix_products_brand_name on products(brand, name);
create index if not exists ix_products_category on products(category);
create index if not exists ix_products_price_range on products(price_range);
create index if not exists ix_products_user_id on products(user_id);
create index if not exists ix_products_user_id_is_user_product on products(user_id, is_user_product);
create index if not exists idx_products_skin_types_gin on products using gin(skin_types);
create index if not exists idx_products_concerns_gin on products using gin(concerns);
create index if not exists idx_products_actives_gin on products using gin(actives);
create index if not exists idx_products_period_gin on products using gin(period);

create table if not exists product_rules (
    id uuid primary key,
    product_id uuid not null references products(id) on delete cascade,
    skin_types text[] not null default array[]::text[],
    concerns text[] not null default array[]::text[],
    actives text[] not null default array[]::text[],
    step_types text[] not null default array[]::text[],
    periods text[] not null default array[]::text[],
    strength_level character varying(20) not null default 'leve',
    priority integer not null default 0,
    reasoning character varying(500) null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index if not exists ix_product_rules_product_id on product_rules(product_id);
create index if not exists ix_product_rules_priority on product_rules(priority);
create index if not exists idx_product_rules_skin_types_gin on product_rules using gin(skin_types);
create index if not exists idx_product_rules_concerns_gin on product_rules using gin(concerns);
create index if not exists idx_product_rules_step_types_gin on product_rules using gin(step_types);
create index if not exists idx_product_rules_periods_gin on product_rules using gin(periods);

create table if not exists user_products (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    product_id uuid not null references products(id) on delete restrict,
    custom_name character varying(200) null,
    notes character varying(1000) null,
    created_at timestamp with time zone not null default now()
);

create unique index if not exists ix_user_products_user_id_product_id on user_products(user_id, product_id);
create index if not exists ix_user_products_user_id on user_products(user_id);
create index if not exists ix_user_products_product_id on user_products(product_id);

create table if not exists user_recommendations_cache (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    recommendation_hash text not null,
    skin_type text not null,
    concerns text[] not null default array[]::text[],
    periods text[] not null default array[]::text[],
    recommended_product_ids uuid[] not null default array[]::uuid[],
    scores numeric[] not null default array[]::numeric[],
    created_at timestamp with time zone not null default now(),
    expires_at timestamp with time zone not null,
    hit_count integer not null default 0
);

create unique index if not exists ix_user_recommendations_cache_user_id_recommendation_hash
    on user_recommendations_cache(user_id, recommendation_hash);
create index if not exists ix_user_recommendations_cache_expires_at
    on user_recommendations_cache(expires_at);

create table if not exists recommendation_logs (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    analysis_id uuid null references analysis(id) on delete set null,
    input_skin_type text not null,
    input_concerns text[] not null default array[]::text[],
    input_periods text[] not null default array[]::text[],
    recommended_product_ids uuid[] not null default array[]::uuid[],
    recommendation_scores numeric[] not null default array[]::numeric[],
    selected_product_ids uuid[] null,
    feedback_rating integer null,
    feedback_comment text null,
    ai_engine text not null default 'gemini',
    routine_type text null,
    recommendation_count integer not null default 0,
    highest_score numeric not null default 0,
    created_at timestamp with time zone not null default now(),
    feedback_provided_at timestamp with time zone null
);

create index if not exists ix_recommendation_logs_user_id on recommendation_logs(user_id);
create index if not exists ix_recommendation_logs_analysis_id on recommendation_logs(analysis_id);
create index if not exists ix_recommendation_logs_created_at_desc on recommendation_logs(created_at desc);
create index if not exists ix_recommendation_logs_feedback_provided_at on recommendation_logs(feedback_provided_at);
create index if not exists ix_recommendation_logs_user_id_feedback_provided_at on recommendation_logs(user_id, feedback_provided_at desc);

create index if not exists ix_recommendations_analysis_id on recommendations(analysis_id);

create table if not exists routine (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    based_on_analysis_id uuid not null references skin_analysis(id) on delete restrict,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now()
);

create table if not exists routine_step (
    id uuid primary key,
    routine_id uuid not null references routine(id) on delete cascade,
    step_type character varying(50) not null,
    product_id uuid not null references products(id) on delete restrict,
    is_user_product boolean not null default false,
    created_at timestamp with time zone not null default now()
);

create index if not exists ix_routine_user_id on routine(user_id);
create index if not exists ix_routine_based_on_analysis_id on routine(based_on_analysis_id);
create index if not exists ix_routine_user_id_is_active on routine(user_id, is_active) where is_active = true;
create index if not exists ix_routine_step_routine_id on routine_step(routine_id);
create index if not exists ix_routine_step_product_id on routine_step(product_id);

create index if not exists ix_analysis_user_id on analysis(user_id);
create index if not exists ix_analysis_created_at_utc on analysis(created_at_utc desc);
