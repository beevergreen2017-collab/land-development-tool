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
