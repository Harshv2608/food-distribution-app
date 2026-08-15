-- Enable PostGIS extension for location queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('DONOR', 'NGO', 'VOLUNTEER', 'ADMIN');
CREATE TYPE donation_status AS ENUM ('CREATED', 'AVAILABLE', 'CLAIMED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED');
CREATE TYPE claim_status AS ENUM ('PENDING', 'APPROVED', 'CANCELLED');
CREATE TYPE pickup_type AS ENUM ('NGO_PICKUP', 'DONOR_DELIVERY', 'VOLUNTEER_PICKUP');

-- 2. TABLES

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE donor_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    location geometry(Point, 4326) NOT NULL,
    default_prep_time VARCHAR(100),
    default_storage VARCHAR(100),
    preferred_pickup pickup_type
);

CREATE TABLE ngo_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    location geometry(Point, 4326) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    max_pickup_radius_km INTEGER DEFAULT 10,
    
    -- NGO Needs (Phase 3B)
    capacity_kg DECIMAL CHECK (capacity_kg > 0),
    food_categories TEXT[],
    needs_description TEXT
);

CREATE TABLE volunteer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    location geometry(Point, 4326),
    vehicle_type VARCHAR(100),
    is_available BOOLEAN DEFAULT false
);

CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES donor_profiles(user_id),
    status donation_status NOT NULL DEFAULT 'CREATED',
    food_category VARCHAR(100) NOT NULL,
    description TEXT,
    quantity_kg DECIMAL(10, 2) NOT NULL,
    storage_condition VARCHAR(255),
    location geometry(Point, 4326),
    
    -- Risk Assessment
    risk_level VARCHAR(50),
    risk_reasons JSONB,
    
    -- Time Tracking
    prepared_at TIMESTAMP WITH TIME ZONE NOT NULL,
    usable_until TIMESTAMP WITH TIME ZONE NOT NULL,
    available_from TIMESTAMP WITH TIME ZONE NOT NULL,
    available_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINTS
    CONSTRAINT quantity_positive CHECK (quantity_kg > 0),
    CONSTRAINT time_usable_after_prep CHECK (usable_until > prepared_at),
    CONSTRAINT time_available_valid CHECK (available_until > available_from)
);

CREATE TABLE donation_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    ngo_id UUID NOT NULL REFERENCES ngo_profiles(user_id),
    status claim_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Crucial constraint for atomic claiming: Only ONE claim per donation
    CONSTRAINT unique_donation_claim UNIQUE (donation_id)
);

CREATE TABLE pickup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    type pickup_type NOT NULL,
    volunteer_id UUID REFERENCES volunteer_profiles(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_claim_pickup UNIQUE (claim_id)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT no_self_rating CHECK (rater_id != rated_user_id),
    CONSTRAINT one_rating_per_user_per_donation UNIQUE (donation_id, rater_id)
);

-- 3. TRIGGERS / FUNCTIONS for extra safety
-- Trigger: Update updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_donations_modtime BEFORE UPDATE ON donations FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


