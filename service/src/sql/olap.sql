CREATE TABLE IF NOT EXISTS login_fact (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    successful_login BOOLEAN,
    session_id INTEGER NOT NULL,
    time_id INTEGER NOT NULL,
    device_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions_dim (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    created_at TIMESTAMP,
    expired_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_dim (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP,
    month INTEGER,
    year INTEGER,
    quarter INTEGER,
    day_of_week INTEGER,
    hash VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS devices_dim (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(100),
    device_type VARCHAR(50),
    os_name VARCHAR(50),
    os_version VARCHAR(50),
    hash VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS locations_dim (
    id SERIAL PRIMARY KEY,
    country VARCHAR(50),
    region VARCHAR(50),
    city VARCHAR(50),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    hash VARCHAR(50) NOT NULL UNIQUE
);
