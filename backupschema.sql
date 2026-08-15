-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  phone_verified boolean DEFAULT false,
  verification_code text,
  verification_expires timestamp with time zone,
  banned boolean DEFAULT false,
  ban_reason text,
  avatar_url text,
  email text,
  auth_user_id uuid,
  verified_via text,
  meta jsonb DEFAULT '{}': :jsonb,
  id_verified boolean DEFAULT false,
  first_listing_at timestamp with time zone,
  id_verification_reminder_count integer DEFAULT 0,
  last_id_verification_reminder_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  location text,
  hours text,
  contact text,
  embedding USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending': :text,
  images ARRAY DEFAULT '{}': :text[],
  meta jsonb DEFAULT '{}': :jsonb,
  slug text UNIQUE,
  website_html text,
  CONSTRAINT businesses_pkey PRIMARY KEY (id),
  CONSTRAINT businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.manufacturers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  what_they_make text,
  category text,
  location text,
  capacity text,
  contact text,
  embedding USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending': :text,
  images ARRAY DEFAULT '{}': :text[],
  meta jsonb DEFAULT '{}': :jsonb,
  slug text UNIQUE,
  website_html text,
  CONSTRAINT manufacturers_pkey PRIMARY KEY (id),
  CONSTRAINT manufacturers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid,
  manufacturer_id uuid,
  name text NOT NULL,
  description text,
  category text,
  price_range text,
  embedding USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending': :text,
  images ARRAY DEFAULT '{}': :text[],
  meta jsonb DEFAULT '{}': :jsonb,
  slug text UNIQUE,
  website_html text,
  in_stock boolean DEFAULT true,
  image_url text,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT products_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id),
  CONSTRAINT products_manufacturer_id_fkey FOREIGN KEY (manufacturer_id) REFERENCES public.manufacturers(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid,
  name text NOT NULL,
  description text,
  category text,
  event_date timestamp with time zone,
  event_location text,
  embedding USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending': :text,
  images ARRAY DEFAULT '{}': :text[],
  meta jsonb DEFAULT '{}': :jsonb,
  slug text UNIQUE,
  website_html text,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT events_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  what_they_need text,
  description text,
  category text,
  budget_range text,
  urgency text,
  contact text,
  embedding USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending': :text,
  images ARRAY DEFAULT '{}': :text[],
  meta jsonb DEFAULT '{}': :jsonb,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_phone text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  resolved boolean DEFAULT false,
  resolved_by text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT flags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user': :text, 'assistant': :text
])),
  content text NOT NULL,
  image_url text,
  meta jsonb DEFAULT '{}': :jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text,
  status text DEFAULT 'pending_verification': :text,
  embedding USER-DEFINED,
  meta jsonb DEFAULT '{}': :jsonb,
  created_at timestamp with time zone DEFAULT now(),
  business_id uuid,
  bookable boolean DEFAULT false,
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT services_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text,
  status text DEFAULT 'pending_verification': :text,
  embedding USER-DEFINED,
  meta jsonb DEFAULT '{}': :jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.config (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT config_pkey PRIMARY KEY (key)
);
CREATE TABLE public.api_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_phone text,
  entity_id uuid,
  entity_type text,
  phase text NOT NULL DEFAULT 'conversation': :text,
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  cost_usd numeric NOT NULL,
  content text,
  tool_calls jsonb,
  meta jsonb DEFAULT '{}': :jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_costs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.errors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text,
  user_phone text,
  context text NOT NULL,
  error_message text NOT NULL,
  stack text,
  resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT errors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.searches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text,
  user_phone text,
  query text NOT NULL,
  entity_type text DEFAULT 'all': :text,
  location text,
  result_count integer DEFAULT 0,
  source text DEFAULT 'chat': :text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT searches_pkey PRIMARY KEY (id)
);
CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_user_id uuid NOT NULL,
  service_id uuid,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'pending': :text,
  confirmed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  meta jsonb DEFAULT '{}': :jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id),
  CONSTRAINT appointments_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES public.users(id),
  CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.business_settings (
  business_id uuid NOT NULL,
  cancellation_notice_minutes integer,
  no_response_timeout_hours integer,
  business_response_followup_hours integer,
  reminder_offsets_hours ARRAY,
  default_slot_duration_minutes integer,
  accepts_appointments boolean DEFAULT false,
  meta jsonb DEFAULT '{}': :jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_settings_pkey PRIMARY KEY (business_id),
  CONSTRAINT business_settings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);
CREATE TABLE public.admin_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.portal_sessions (
  token text NOT NULL,
  user_id uuid NOT NULL,
  issued_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now(),
  meta jsonb DEFAULT '{}': :jsonb,
  CONSTRAINT portal_sessions_pkey PRIMARY KEY (token),
  CONSTRAINT portal_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.portal_otps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  issued_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  attempt_count integer DEFAULT 0,
  meta jsonb DEFAULT '{}': :jsonb,
  CONSTRAINT portal_otps_pkey PRIMARY KEY (id)
);
CREATE TABLE public.apm_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  archived boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}': :jsonb,
  CONSTRAINT apm_projects_pkey PRIMARY KEY (id),
  CONSTRAINT sf_projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.apm_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'inbox': :text CHECK (status = ANY (ARRAY['inbox': :text, 'todo': :text, 'in_progress': :text, 'waiting': :text, 'done': :text, 'archived': :text
])),
  priority text NOT NULL DEFAULT 'p3': :text CHECK (priority = ANY (ARRAY['p1': :text, 'p2': :text, 'p3': :text, 'p4': :text
])),
  due_date date,
  scheduled_date date,
  parent_task_id uuid,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  meta jsonb NOT NULL DEFAULT '{}': :jsonb,
  CONSTRAINT apm_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT sf_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT sf_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.apm_projects(id),
  CONSTRAINT sf_tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.apm_tasks(id)
);
CREATE TABLE public.apm_settings (
  user_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT apm_settings_pkey PRIMARY KEY (user_id, key),
  CONSTRAINT sf_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.apm_instructions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'process_note': :text CHECK (category = ANY (ARRAY['user_preference': :text, 'process_note': :text, 'triage_rule': :text, 'project_alias': :text, 'vocab': :text
])),
  body text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT apm_instructions_pkey PRIMARY KEY (id),
  CONSTRAINT sf_instructions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.apm_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}': :jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT apm_activity_pkey PRIMARY KEY (id),
  CONSTRAINT sf_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.apm_tool_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}': :jsonb,
  status text NOT NULL DEFAULT 'new': :text CHECK (status = ANY (ARRAY['new': :text, 'reviewed': :text, 'built': :text, 'rejected': :text
])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT apm_tool_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT sf_tool_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);