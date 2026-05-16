-- Petsitter initial schema
-- Run via npm run migrate (idempotent)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL CHECK (role IN ('owner','sitter')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  name                 text NOT NULL,
  host_household_name  text,
  start_date           date,
  end_date             date,
  address              text,
  wifi_ssid            text,
  wifi_password        text,
  notes_markdown       text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS allowed_emails (
  email                  text PRIMARY KEY,
  role                   text NOT NULL CHECK (role IN ('owner','sitter')),
  pre_assigned_trip_id   uuid REFERENCES trips(id) ON DELETE SET NULL,
  invited_by             uuid REFERENCES users(id) ON DELETE SET NULL,
  invited_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_sitters (
  trip_id  uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS pets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name              text NOT NULL,
  species           text NOT NULL CHECK (species IN ('cat','dog','other')),
  breed             text,
  age_years         numeric(4,1),
  color             text,
  photo_url         text,
  quirks_markdown   text,
  sort_order        integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pets_trip ON pets(trip_id);

CREATE TABLE IF NOT EXISTS care_instructions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  time_of_day     text NOT NULL CHECK (time_of_day IN ('morning','night','anytime')),
  body_markdown   text NOT NULL,
  sort_order      integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_care_pet ON care_instructions(pet_id);

CREATE TABLE IF NOT EXISTS house_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category        text NOT NULL CHECK (category IN ('house','emergency','wifi','trash','other')),
  title           text NOT NULL,
  body_markdown   text NOT NULL,
  sort_order      integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notes_trip ON house_notes(trip_id);

CREATE TABLE IF NOT EXISTS task_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  time_of_day           text NOT NULL CHECK (time_of_day IN ('morning','night')),
  title                 text NOT NULL,
  description_markdown  text,
  sort_order            integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tasks_trip ON task_templates(trip_id);

CREATE TABLE IF NOT EXISTS task_completions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id   uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day                date NOT NULL,
  completed_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_template_id, user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_completions_user_day ON task_completions(user_id, day);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    text UNIQUE NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS reminders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id     uuid REFERENCES trips(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text,
  fire_at     timestamptz NOT NULL,
  recurrence  text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly')),
  sent_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(fire_at) WHERE sent_at IS NULL;

CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user','assistant')),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_user_created ON chat_messages(user_id, created_at);
