-- Constructo Database Initialization
-- Seeds service categories and admin user

USE constructo;

-- Seed service categories
INSERT INTO service_categories (name, slug, description, icon, base_hourly_rate, overtime_hourly_rate, emergency_fee, reservation_fee, is_active, sort_order, created_at, updated_at) VALUES
('Earthmoving & Excavation', 'earthmoving-excavation', 'Professional earthmoving and excavation services including JCB, backhoe loaders, and mini excavators for foundation work, trenching, and land clearing.', 'Shovel', 2500.00, 3000.00, 500.00, 200.00, 1, 1, NOW(), NOW()),
('Crane Services', 'crane-services', 'Heavy-duty crane services for lifting, construction, and industrial applications. Mobile cranes, tower cranes, and specialized lifting equipment.', 'CraneIcon', 5000.00, 6000.00, 1000.00, 500.00, 1, 2, NOW(), NOW()),
('Transportation & Haulage', 'transportation-haulage', 'Material transportation, tipper trucks, trailer services, and heavy equipment haulage across Kerala.', 'Truck', 1800.00, 2200.00, 400.00, 200.00, 1, 3, NOW(), NOW()),
('Environmental Services', 'environmental-services', 'Environmental management including soil testing, waste assessment, erosion control, and environmental compliance services.', 'TreePine', 2000.00, 2500.00, 500.00, 200.00, 1, 4, NOW(), NOW()),
('Waste Management', 'waste-management', 'Construction waste removal, debris clearing, recycling services, and site cleanup operations.', 'Recycle', 1500.00, 1800.00, 300.00, 150.00, 1, 5, NOW(), NOW());

-- Seed admin user (password: Admin@123456)
INSERT INTO users (name, email, phone, password_hash, role, is_phone_verified, status, created_at, updated_at) VALUES
('Admin', 'admin@constructo.in', '+919999999999', '$2b$12$LJ3RCzDvEJhcGYjHxvKN8eQ7jWUdlTqTqN5yN1CqXKxqGqRq8XFXK', 'admin', 1, 'active', NOW(), NOW());
