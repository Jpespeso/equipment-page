-- Sample data for testing. Run after 01_schema.sql.

insert into public.equipment
    (equipment_code, name, category, quantity, location, condition_status, availability_status)
values
    ('CISTM-PC-001', 'Desktop Computer',         'Computers',    1, 'Computer Lab 1', 'good', 'available'),
    ('CISTM-PC-002', 'Desktop Computer',         'Computers',    1, 'Computer Lab 1', 'good', 'in_use'),
    ('CISTM-PC-003', 'Desktop Computer',         'Computers',    1, 'Computer Lab 1', 'fair', 'available'),
    ('CISTM-LT-001', 'Laptop',                   'Computers',    1, 'Storage Room',   'good', 'available'),
    ('CISTM-LT-002', 'Laptop',                   'Computers',    1, 'Storage Room',   'fair', 'under_repair'),
    ('CISTM-NW-001', 'Network Switch (24-port)', 'Networking',   1, 'Networking Lab', 'good', 'available'),
    ('CISTM-NW-002', 'Wireless Router',          'Networking',   1, 'Networking Lab', 'good', 'in_use'),
    ('CISTM-NW-003', 'Cable Tester',             'Networking',   2, 'Networking Lab', 'fair', 'available'),
    ('CISTM-PR-001', 'LCD Projector',            'Presentation', 1, 'Storage Room',   'good', 'available'),
    ('CISTM-PR-002', 'LCD Projector',            'Presentation', 1, 'Storage Room',   'poor', 'defective'),
    ('CISTM-PH-001', 'Webcam',                   'Peripherals',  5, 'Storage Room',   'good', 'available'),
    ('CISTM-UP-001', 'UPS (650VA)',              'Power',        1, 'Computer Lab 1', 'poor', 'defective')
on conflict (equipment_code) do nothing;

-- First admin: sign up in the system, then run
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';

-- Optional sample transaction and report (needs at least one account)
insert into public.transactions (equipment_id, user_id, borrowed_at, remarks)
select e.equipment_id, p.id, now() - interval '1 day', 'Sample transaction (borrowed, not yet returned)'
from public.equipment e
cross join (select id from public.profiles order by created_at limit 1) p
where e.equipment_code = 'CISTM-PC-002';

insert into public.maintenance_reports (equipment_id, reported_by, issue_description)
select e.equipment_id, p.id, 'Screen flickers and the laptop shuts down after a few minutes.'
from public.equipment e
cross join (select id from public.profiles order by created_at limit 1) p
where e.equipment_code = 'CISTM-LT-002';
