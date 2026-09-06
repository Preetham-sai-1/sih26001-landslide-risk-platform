-- Seed Initial Users (Passwords BCrypt hashed: 'password123')
INSERT INTO users (id, username, password_hash, full_name, role, created_at) VALUES
('USR-001', 'admin', '$2a$10$8.UnVuG9HHgffUDAlk8qfOUVGkqRzgVym502lgg.L.g.Y552LqV8C', 'System Administrator', 'ADMIN', CURRENT_TIMESTAMP),
('USR-002', 'authority', '$2a$10$8.UnVuG9HHgffUDAlk8qfOUVGkqRzgVym502lgg.L.g.Y552LqV8C', 'Disaster Management Officer', 'AUTHORITY', CURRENT_TIMESTAMP),
('USR-003', 'field_officer', '$2a$10$8.UnVuG9HHgffUDAlk8qfOUVGkqRzgVym502lgg.L.g.Y552LqV8C', 'Field Inspector Roy', 'FIELD_OFFICER', CURRENT_TIMESTAMP),
('USR-004', 'viewer', '$2a$10$8.UnVuG9HHgffUDAlk8qfOUVGkqRzgVym502lgg.L.g.Y552LqV8C', 'Public Portal Guest', 'VIEWER', CURRENT_TIMESTAMP);

INSERT INTO zones (grid_id, name, state, district, villages, population, latitude, longitude, elevation_m, slope_deg, aspect_deg, curvature, risk_level, risk_score) VALUES
('ner_grid_056061', 'Haflong Hill Sector', 'Assam', 'Dima Hasao', 14, 28400, 25.188, 93.019, 870.1, 34.2, 182.5, 312.4, 'VERY HIGH', 92.4),
('ner_grid_010010', 'Tawang Ridge Pass', 'Arunachal Pradesh', 'Tawang', 9, 18500, 27.586, 91.866, 2840.0, 38.6, 210.0, 410.0, 'HIGH', 76.8);
