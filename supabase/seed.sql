-- ZimRoots Alpha v0 — Seed Data
-- Sample Harare listings for demo and testing
-- Run AFTER schema.sql in the Supabase SQL Editor
-- Note: Embeddings must be generated separately via the admin tool or API

-- ============================================
-- SAMPLE USERS
-- ============================================
insert into users (id, phone, name, verified) values
  ('a1111111-1111-1111-1111-111111111111', '+263771000001', 'Chipo Moyo', true),
  ('a2222222-2222-2222-2222-222222222222', '+263772000002', 'Tendai Ncube', true),
  ('a3333333-3333-3333-3333-333333333333', '+263773000003', 'Rumbidzai Mhaka', true),
  ('a4444444-4444-4444-4444-444444444444', '+263774000004', 'Blessing Chikwanha', true),
  ('a5555555-5555-5555-5555-555555555555', '+263775000005', 'Farai Mutasa', true);

-- ============================================
-- SAMPLE BUSINESSES
-- ============================================
insert into businesses (id, user_id, name, description, category, location, hours, contact) values
  ('b1111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111',
   'Chipo''s Tailoring',
   'Custom dresses, alterations, and traditional wear. Specialising in African print designs and wedding attire.',
   'Fashion & Tailoring',
   'Mbare, Harare',
   'Mon-Sat 8am-5pm',
   '+263771000001'),

  ('b2222222-2222-2222-2222-222222222222',
   'a2222222-2222-2222-2222-222222222222',
   'TechFix Solutions',
   'Phone repairs, laptop servicing, and screen replacements. Same-day service for most devices.',
   'Electronics Repair',
   'Avondale, Harare',
   'Mon-Fri 8am-6pm, Sat 9am-1pm',
   '+263772000002'),

  ('b3333333-3333-3333-3333-333333333333',
   'a3333333-3333-3333-3333-333333333333',
   'Rumbi''s Kitchen',
   'Home-cooked Zimbabwean meals for delivery. Sadza, nyama, muriwo, and more. Catering for events available.',
   'Food & Catering',
   'Borrowdale, Harare',
   'Mon-Sun 10am-8pm',
   '+263773000003');

-- ============================================
-- SAMPLE PRODUCTS
-- ============================================
insert into products (id, user_id, business_id, name, description, category, price_range) values
  ('c1111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111',
   'b1111111-1111-1111-1111-111111111111',
   'Custom African Print Dress',
   'Made-to-measure dress in your choice of African print fabric. Takes 3-5 days.',
   'Clothing',
   '$25-60 USD'),

  ('c2222222-2222-2222-2222-222222222222',
   'a4444444-4444-4444-4444-444444444444',
   null,
   'Fresh Organic Honey',
   'Raw honey from Nyanga. 500ml and 1L jars available. Delivery in Harare.',
   'Food & Groceries',
   '$8-15 USD'),

  ('c3333333-3333-3333-3333-333333333333',
   'a5555555-5555-5555-5555-555555555555',
   null,
   'Hand-carved Wooden Sculptures',
   'Traditional Shona stone and wood carvings. Various sizes. Great for gifts and home decor.',
   'Arts & Crafts',
   '$15-100 USD');

-- ============================================
-- SAMPLE SERVICES
-- ============================================
insert into services (id, user_id, business_id, name, description, category) values
  ('d1111111-1111-1111-1111-111111111111',
   'a2222222-2222-2222-2222-222222222222',
   'b2222222-2222-2222-2222-222222222222',
   'Phone Screen Replacement',
   'Samsung and iPhone screen replacements. Original and aftermarket options. 1-hour turnaround.',
   'Electronics Repair'),

  ('d2222222-2222-2222-2222-222222222222',
   'a4444444-4444-4444-4444-444444444444',
   null,
   'Plumbing Services',
   'Residential plumbing — burst pipes, geyser repairs, bathroom installations. Available weekends.',
   'Home Services'),

  ('d3333333-3333-3333-3333-333333333333',
   'a5555555-5555-5555-5555-555555555555',
   null,
   'Graphic Design & Branding',
   'Logos, flyers, social media graphics, business cards. Quick turnaround. WhatsApp-friendly proofs.',
   'Creative Services');

-- ============================================
-- SAMPLE EVENTS
-- ============================================
insert into events (id, user_id, business_id, name, description, category, event_date, event_location) values
  ('e1111111-1111-1111-1111-111111111111',
   'a3333333-3333-3333-3333-333333333333',
   'b3333333-3333-3333-3333-333333333333',
   'Borrowdale Food Market',
   'Weekly outdoor food market with local vendors. Fresh produce, street food, and homemade treats.',
   'Market',
   '2026-04-05 09:00:00+02',
   'Borrowdale Village, Harare'),

  ('e2222222-2222-2222-2222-222222222222',
   'a1111111-1111-1111-1111-111111111111',
   null,
   'Harare Fashion Pop-Up',
   'Local designers showcasing new collections. African print, streetwear, and accessories.',
   'Exhibition',
   '2026-04-12 10:00:00+02',
   'Newlands Shopping Centre, Harare');

-- ============================================
-- SAMPLE JOBS
-- ============================================
insert into jobs (id, user_id, business_id, title, description, category, job_type) values
  ('f1111111-1111-1111-1111-111111111111',
   'a2222222-2222-2222-2222-222222222222',
   'b2222222-2222-2222-2222-222222222222',
   'Phone Repair Technician',
   'Looking for an experienced phone repair technician. Must know Samsung and iPhone. Tools provided.',
   'Technical',
   'full-time'),

  ('f2222222-2222-2222-2222-222222222222',
   'a3333333-3333-3333-3333-333333333333',
   'b3333333-3333-3333-3333-333333333333',
   'Delivery Driver',
   'Delivery driver needed for food orders in Borrowdale and surrounding areas. Must have own vehicle.',
   'Delivery',
   'part-time');
