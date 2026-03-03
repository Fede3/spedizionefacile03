-- CREAZIONE TABELLA PUDO
CREATE TABLE IF NOT EXISTS pudo_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pudo_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    province VARCHAR(2) NOT NULL,
    country VARCHAR(2) DEFAULT 'IT',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    phone VARCHAR(20),
    opening_hours TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INSERIMENTO PUDO ROMA (5 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_RM_001', 'Tabaccheria Centrale Roma', 'Via del Corso 120', 'Roma', '00186', 'RM', 41.9028, 12.4964, '06-12345678', 'Lun-Sab 8:00-20:00'),
('PUDO_RM_002', 'Edicola Termini', 'Via Marsala 5', 'Roma', '00185', 'RM', 41.9010, 12.5015, '06-23456789', 'Lun-Dom 7:00-22:00'),
('PUDO_RM_003', 'Cartolibreria Prati', 'Via Cola di Rienzo 45', 'Roma', '00192', 'RM', 41.9065, 12.4625, '06-34567890', 'Lun-Sab 9:00-19:30'),
('PUDO_RM_004', 'Tabacchi Trastevere', 'Viale Trastevere 89', 'Roma', '00153', 'RM', 41.8866, 12.4698, '06-45678901', 'Lun-Sab 8:30-20:00'),
('PUDO_RM_005', 'Edicola EUR', 'Viale Europa 50', 'Roma', '00144', 'RM', 41.8345, 12.4686, '06-56789012', 'Lun-Sab 7:30-19:30');

-- INSERIMENTO PUDO MILANO (5 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_MI_001', 'Tabaccheria Duomo', 'Piazza Duomo 15', 'Milano', '20121', 'MI', 45.4642, 9.1900, '02-12345678', 'Lun-Sab 8:00-20:00'),
('PUDO_MI_002', 'Edicola Centrale', 'Piazza della Repubblica 8', 'Milano', '20124', 'MI', 45.4812, 9.2014, '02-23456789', 'Lun-Dom 7:00-22:00'),
('PUDO_MI_003', 'Cartolibreria Navigli', 'Ripa di Porta Ticinese 30', 'Milano', '20143', 'MI', 45.4502, 9.1770, '02-34567890', 'Lun-Sab 9:00-19:30'),
('PUDO_MI_004', 'Tabacchi Porta Venezia', 'Corso Buenos Aires 55', 'Milano', '20124', 'MI', 45.4778, 9.2058, '02-45678901', 'Lun-Sab 8:30-20:00'),
('PUDO_MI_005', 'Edicola Brera', 'Via Brera 12', 'Milano', '20121', 'MI', 45.4719, 9.1881, '02-56789012', 'Lun-Sab 7:30-19:30');

-- INSERIMENTO PUDO TORINO (4 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_TO_001', 'Tabaccheria Porta Nuova', 'Corso Vittorio Emanuele II 50', 'Torino', '10123', 'TO', 45.0677, 7.6824, '011-1234567', 'Lun-Sab 8:00-20:00'),
('PUDO_TO_002', 'Edicola Piazza Castello', 'Piazza Castello 10', 'Torino', '10121', 'TO', 45.0703, 7.6869, '011-2345678', 'Lun-Dom 7:00-21:00'),
('PUDO_TO_003', 'Cartolibreria San Salvario', 'Via Nizza 45', 'Torino', '10126', 'TO', 45.0581, 7.6824, '011-3456789', 'Lun-Sab 9:00-19:00'),
('PUDO_TO_004', 'Tabacchi Crocetta', 'Corso Galileo Ferraris 30', 'Torino', '10128', 'TO', 45.0625, 7.6625, '011-4567890', 'Lun-Sab 8:30-19:30');

-- INSERIMENTO PUDO NAPOLI (4 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_NA_001', 'Tabaccheria Centrale', 'Via Toledo 150', 'Napoli', '80134', 'NA', 40.8418, 14.2486, '081-1234567', 'Lun-Sab 8:00-20:00'),
('PUDO_NA_002', 'Edicola Stazione', 'Piazza Garibaldi 20', 'Napoli', '80142', 'NA', 40.8527, 14.2681, '081-2345678', 'Lun-Dom 7:00-22:00'),
('PUDO_NA_003', 'Cartolibreria Vomero', 'Via Scarlatti 80', 'Napoli', '80127', 'NA', 40.8467, 14.2167, '081-3456789', 'Lun-Sab 9:00-19:30'),
('PUDO_NA_004', 'Tabacchi Chiaia', 'Via Chiaia 45', 'Napoli', '80121', 'NA', 40.8359, 14.2456, '081-4567890', 'Lun-Sab 8:30-20:00');

-- INSERIMENTO PUDO FIRENZE (3 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_FI_001', 'Tabaccheria Duomo', 'Via dei Calzaiuoli 30', 'Firenze', '50122', 'FI', 43.7717, 11.2558, '055-123456', 'Lun-Sab 8:00-20:00'),
('PUDO_FI_002', 'Edicola Santa Maria Novella', 'Piazza della Stazione 5', 'Firenze', '50123', 'FI', 43.7766, 11.2486, '055-234567', 'Lun-Dom 7:00-21:00'),
('PUDO_FI_003', 'Cartolibreria Oltrarno', 'Via Maggio 25', 'Firenze', '50125', 'FI', 43.7659, 11.2486, '055-345678', 'Lun-Sab 9:00-19:00');

-- INSERIMENTO PUDO BOLOGNA (3 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_BO_001', 'Tabaccheria Piazza Maggiore', 'Piazza Maggiore 8', 'Bologna', '40124', 'BO', 44.4938, 11.3387, '051-123456', 'Lun-Sab 8:00-20:00'),
('PUDO_BO_002', 'Edicola Stazione', 'Piazza delle Medaglie d''Oro 2', 'Bologna', '40121', 'BO', 44.5058, 11.3431, '051-234567', 'Lun-Dom 7:00-22:00'),
('PUDO_BO_003', 'Cartolibreria Santo Stefano', 'Via Santo Stefano 40', 'Bologna', '40125', 'BO', 44.4908, 11.3497, '051-345678', 'Lun-Sab 9:00-19:30');

-- INSERIMENTO PUDO GENOVA (3 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_GE_001', 'Tabaccheria De Ferrari', 'Piazza De Ferrari 10', 'Genova', '16121', 'GE', 44.4072, 8.9340, '010-123456', 'Lun-Sab 8:00-20:00'),
('PUDO_GE_002', 'Edicola Brignole', 'Piazza Verdi 5', 'Genova', '16122', 'GE', 44.4047, 8.9478, '010-234567', 'Lun-Dom 7:00-21:00'),
('PUDO_GE_003', 'Cartolibreria Carignano', 'Via Assarotti 20', 'Genova', '16122', 'GE', 44.4058, 8.9389, '010-345678', 'Lun-Sab 9:00-19:00');

-- INSERIMENTO PUDO PALERMO (3 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_PA_001', 'Tabaccheria Politeama', 'Via Ruggero Settimo 50', 'Palermo', '90139', 'PA', 38.1257, 13.3615, '091-123456', 'Lun-Sab 8:00-20:00'),
('PUDO_PA_002', 'Edicola Stazione', 'Piazza Giulio Cesare 10', 'Palermo', '90127', 'PA', 38.1228, 13.3536, '091-234567', 'Lun-Dom 7:00-21:00'),
('PUDO_PA_003', 'Cartolibreria Vucciria', 'Via Roma 100', 'Palermo', '90133', 'PA', 38.1184, 13.3615, '091-345678', 'Lun-Sab 9:00-19:00');

-- INSERIMENTO PUDO BARI (3 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_BA_001', 'Tabaccheria Corso Cavour', 'Corso Cavour 50', 'Bari', '70122', 'BA', 41.1171, 16.8719, '080-123456', 'Lun-Sab 8:00-20:00'),
('PUDO_BA_002', 'Edicola Stazione', 'Piazza Aldo Moro 5', 'Bari', '70121', 'BA', 41.1156, 16.8686, '080-234567', 'Lun-Dom 7:00-21:00'),
('PUDO_BA_003', 'Cartolibreria Murat', 'Via Sparano 80', 'Bari', '70121', 'BA', 41.1227, 16.8697, '080-345678', 'Lun-Sab 9:00-19:00');

-- INSERIMENTO PUDO VERONA (2 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_VR_001', 'Tabaccheria Arena', 'Via Mazzini 20', 'Verona', '37121', 'VR', 45.4408, 10.9916, '045-123456', 'Lun-Sab 8:00-20:00'),
('PUDO_VR_002', 'Edicola Porta Nuova', 'Piazzale XXV Aprile 3', 'Verona', '37138', 'VR', 45.4281, 10.9825, '045-234567', 'Lun-Dom 7:00-21:00');

-- INSERIMENTO PUDO PADOVA (2 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_PD_001', 'Tabaccheria Prato della Valle', 'Prato della Valle 50', 'Padova', '35123', 'PD', 45.3983, 11.8753, '049-123456', 'Lun-Sab 8:00-20:00'),
('PUDO_PD_002', 'Edicola Stazione', 'Piazza Stazione 5', 'Padova', '35131', 'PD', 45.4167, 11.8808, '049-234567', 'Lun-Dom 7:00-21:00');

-- INSERIMENTO PUDO CATANIA (2 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_CT_001', 'Tabaccheria Duomo', 'Via Etnea 100', 'Catania', '95124', 'CT', 37.5024, 15.0875, '095-123456', 'Lun-Sab 8:00-20:00'),
('PUDO_CT_002', 'Edicola Stazione', 'Piazza Papa Giovanni XXIII 5', 'Catania', '95129', 'CT', 37.5067, 15.0833, '095-234567', 'Lun-Dom 7:00-21:00');

-- INSERIMENTO PUDO VENEZIA (3 punti)
INSERT OR IGNORE INTO pudo_points (pudo_id, name, address, city, postal_code, province, latitude, longitude, phone, opening_hours) VALUES
('PUDO_VE_001', 'Tabaccheria Rialto', 'Ruga Vecchia San Giovanni 500', 'Venezia', '30125', 'VE', 45.4380, 12.3358, '041-123456', 'Lun-Sab 8:00-19:30'),
('PUDO_VE_002', 'Edicola Santa Lucia', 'Fondamenta Santa Lucia 10', 'Venezia', '30121', 'VE', 45.4419, 12.3211, '041-234567', 'Lun-Dom 7:00-21:00'),
('PUDO_VE_003', 'Cartolibreria Mestre', 'Via Piave 50', 'Venezia', '30171', 'VE', 45.4897, 12.2436, '041-345678', 'Lun-Sab 9:00-19:00');
