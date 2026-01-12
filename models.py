from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    location_city = Column(String)
    location_dist = Column(String)
    total_area_m2 = Column(Float, default=0.0)
    bcr = Column(Float, default=0.0)  # Building Coverage Ratio Cap (%)
    far = Column(Float, default=0.0)  # Floor Area Ratio Cap (%)
    
    # Project Management Fields
    is_pinned = Column(Integer, default=0) # Boolean 0/1
    archived_at = Column(DateTime(timezone=True), nullable=True)
    last_opened_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Volume Bonus Fields
    bonus_central = Column(Float, default=30.0)
    bonus_local = Column(Float, default=20.0)
    bonus_other = Column(Float, default=0.0)
    bonus_chloride = Column(Float, default=0.0)
    bonus_soil_mgmt = Column(Float, default=0.0)
    bonus_tod = Column(Float, default=0.0)
    bonus_tod_reward = Column(Float, default=0.0)
    bonus_tod_increment = Column(Float, default=0.0)
    bonus_public_exemption = Column(Float, default=7.98)
    bonus_cap = Column(Float, default=100.0)

    # Bonus Details (JSON)
    central_bonus_details = Column(JSON, default={})
    local_bonus_details = Column(JSON, default={})
    disaster_bonus_details = Column(JSON, default={})
    chloride_bonus_details = Column(JSON, default={})
    tod_reward_bonus_details = Column(JSON, default={})
    tod_increment_bonus_details = Column(JSON, default={})

    # Site Config
    site_config = Column(JSON, default={})

    # Massing Assessment Fields
    massing_design_coverage = Column(Float, default=45.0)
    massing_exemption_coef = Column(Float, default=1.15)
    massing_public_ratio = Column(Float, default=33.0)
    massing_me_rate = Column(Float, default=15.0)
    massing_stair_rate = Column(Float, default=10.0)
    massing_balcony_rate = Column(Float, default=5.0)

    # Basement Assessment Fields
    basement_legal_parking = Column(Integer, default=0)
    basement_bonus_parking = Column(Integer, default=0)
    basement_excavation_rate = Column(Float, default=70.0)
    basement_parking_space_area = Column(Float, default=40.0)
    basement_floor_height = Column(Float, default=3.3)

    # Usage Mix Fields
    usage_residential_rate = Column(Float, default=60.0)
    usage_commercial_rate = Column(Float, default=30.0)
    usage_agency_rate = Column(Float, default=10.0)

    # Motorcycle Assessment Fields
    basement_motorcycle_unit_area = Column(Float, default=4.0)
    basement_legal_motorcycle = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    land_parcels = relationship("LandParcel", back_populates="project")

class LandParcel(Base):
    __tablename__ = "land_parcels"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    section_name = Column(String)
    lot_number = Column(String)
    area_m2 = Column(Float)
    zoning_type = Column(String)
    announced_value = Column(Float)
    legal_coverage_rate = Column(Float, default=0.0)
    legal_floor_area_rate = Column(Float, default=0.0)
    district = Column(String)
    tenure = Column(String, default="未確認")  # Tenure status (Unconfirmed, Private, Public, Mixed)
    is_verified = Column(Integer, default=0) # Boolean flag stored as Integer (0=False, 1=True)

    # Mixed Use Fields
    bcr_limit = Column(Float, nullable=True)
    far_limit = Column(Float, nullable=True)
    ownership_status = Column(String, default="未確認")
    integration_risk = Column(String, default="unknown")
    include_in_site = Column(Integer, default=1)

    project = relationship("Project", back_populates="land_parcels")
