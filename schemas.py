from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class LandParcelBase(BaseModel):
    section_name: str
    lot_number: str
    area_m2: float
    zoning_type: str
    announced_value: float
    legal_coverage_rate: Optional[float] = 0.0
    legal_floor_area_rate: Optional[float] = 0.0
    district: Optional[str] = None

class LandParcelCreate(LandParcelBase):
    pass

class LandParcelUpdate(BaseModel):
    section_name: Optional[str] = None
    lot_number: Optional[str] = None
    area_m2: Optional[float] = None
    zoning_type: Optional[str] = None
    announced_value: Optional[float] = None
    legal_coverage_rate: Optional[float] = None
    legal_floor_area_rate: Optional[float] = None
    district: Optional[str] = None

class LandParcel(LandParcelBase):
    id: int
    project_id: int

    class Config:
        orm_mode = True

class ProjectBase(BaseModel):
    name: str
    location_city: Optional[str] = None
    location_dist: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    bonus_central: Optional[float] = None
    bonus_local: Optional[float] = None
    bonus_other: Optional[float] = None
    bonus_soil_mgmt: Optional[float] = None
    bonus_chloride: Optional[float] = None
    bonus_tod: Optional[float] = None
    bonus_tod_reward: Optional[float] = None
    bonus_tod_increment: Optional[float] = None
    bonus_public_exemption: Optional[float] = None
    bonus_cap: Optional[float] = None
    massing_design_coverage: Optional[float] = None
    massing_exemption_coef: Optional[float] = None
    massing_public_ratio: Optional[float] = None
    massing_me_rate: Optional[float] = None
    massing_stair_rate: Optional[float] = None
    massing_balcony_rate: Optional[float] = None
    basement_legal_parking: Optional[int] = None
    basement_bonus_parking: Optional[int] = None
    basement_excavation_rate: Optional[float] = None
    basement_parking_space_area: Optional[float] = None
    basement_floor_height: Optional[float] = None
    usage_residential_rate: Optional[float] = None
    usage_commercial_rate: Optional[float] = None
    usage_agency_rate: Optional[float] = None
    basement_motorcycle_unit_area: Optional[float] = None
    basement_legal_motorcycle: Optional[int] = None

class Project(ProjectBase):
    id: int
    total_area_m2: float
    total_area_ping: float  # Calculated field
    
    bonus_central: float
    bonus_local: float
    bonus_other: float
    bonus_soil_mgmt: float
    bonus_chloride: float
    bonus_tod: float
    bonus_tod_reward: float
    bonus_tod_increment: float
    bonus_public_exemption: float
    bonus_cap: float
    massing_design_coverage: float
    massing_exemption_coef: float
    massing_public_ratio: float
    massing_me_rate: float
    massing_stair_rate: float
    massing_balcony_rate: float
    basement_legal_parking: int
    basement_bonus_parking: int
    basement_excavation_rate: float
    basement_parking_space_area: float
    basement_floor_height: float
    usage_residential_rate: float
    usage_commercial_rate: float
    usage_agency_rate: float
    basement_motorcycle_unit_area: float
    basement_legal_motorcycle: int

    created_at: datetime
    land_parcels: List[LandParcel] = []

    class Config:
        orm_mode = True
