from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
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

    project = relationship("Project", back_populates="land_parcels")
